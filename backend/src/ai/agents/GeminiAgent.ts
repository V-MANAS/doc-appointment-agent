import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import logger from '../../logger';
import PromptManager from '../prompts/PromptManager';
import ToolRegistry from '../tools/ToolRegistry';
import ToolExecutor from '../tools/ToolExecutor';
import ConversationMemory from '../memory/ConversationMemory';

export interface AgentResponse {
  text: string;
  tokensUsed?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class GeminiAgent {
  private static genAI: GoogleGenerativeAI | null = null;

  private static getClient(): GoogleGenerativeAI | null {
    if (!GeminiAgent.genAI && env.GEMINI_API_KEY && !env.USE_MOCK_GEMINI && !env.GEMINI_API_KEY.includes('YourGeminiAPIKey')) {
      try {
        GeminiAgent.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      } catch (err) {
        logger.error('Failed to initialize GoogleGenerativeAI client:', err);
      }
    }
    return GeminiAgent.genAI;
  }

  /**
   * Main entrypoint to send message to the receptionist agent.
   */
  public static async sendMessage(whatsappNumber: string, userMessage: string): Promise<AgentResponse> {
    logger.info(`AI Agent: Received message from ${whatsappNumber}: "${userMessage}"`);

    // 1. Save user message to memory
    await ConversationMemory.saveMessage(whatsappNumber, 'user', userMessage);

    // 2. Fetch recent history for context
    const dbHistory = await ConversationMemory.getHistory(whatsappNumber, 15);

    // Check if we should run mock agent (e.g. key missing or explicitly enabled)
    const client = GeminiAgent.getClient();
    if (!client || env.USE_MOCK_GEMINI) {
      logger.info('🤖 AI Agent: Running in MOCK Mode.');
      const mockReply = await GeminiAgent.getMockResponse(whatsappNumber, userMessage, dbHistory);
      await ConversationMemory.saveMessage(whatsappNumber, 'model', mockReply);
      return { text: mockReply, tokensUsed: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
    }

    try {
      // 3. Compile system prompt with date context
      const today = new Date();
      const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', hour12: false };
      const todayDate = today.toLocaleDateString('en-CA', options); // YYYY-MM-DD
      const todayDay = today.toLocaleDateString('en-US', { ...options, weekday: 'long' });
      const currentTime = today.toLocaleTimeString('en-US', { ...options, hour: '2-digit', minute: '2-digit' });

      const systemPrompt = PromptManager.getInstance().getPrompt('receptionist', {
        TODAY_DATE: todayDate,
        TODAY_DAY: todayDay,
        CURRENT_TIME: currentTime,
      });

      // 4. Initialize model with tools schema
      const registry = ToolRegistry.getInstance();
      const model = client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: registry.getDeclarations() as any }],
      });

      // 5. Format history for startChat
      // Note: Gemini startChat history expects format: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
      // Remove the last message from history if it is the current user message
      const chatHistory = dbHistory.slice(0, dbHistory.length - 1).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.message }],
      }));

      const chat = model.startChat({ history: chatHistory });

      // 6. Send message to chat and check for tool execution requests
      let responseResult = await chat.sendMessage(userMessage);

      let turnsLimit = 5; // Prevent infinite tool loops
      while (turnsLimit > 0) {
        const functionCalls = responseResult.response.functionCalls();
        if (!functionCalls || functionCalls.length === 0) {
          break;
        }

        logger.info("🤖 Gemini requested function call(s): " + JSON.stringify(functionCalls));
        
        // Execute tool call
        const call = functionCalls[0]; // Process calls sequentially
        const toolResult = await ToolExecutor.executeTool(call.name, call.args);

        // Send tool results back to Gemini
        responseResult = await chat.sendMessage([
          {
            functionResponse: {
              name: call.name,
              response: { result: toolResult },
            },
          },
        ]);

        turnsLimit--;
      }

      const textReply = responseResult.response.text();
      const metadata = (responseResult as any).response?.usageMetadata;

      // 7. Save model reply to memory
      await ConversationMemory.saveMessage(whatsappNumber, 'model', textReply);

      return {
        text: textReply,
        tokensUsed: metadata ? {
          inputTokens: metadata.promptTokenCount || 0,
          outputTokens: metadata.candidatesTokenCount || 0,
          totalTokens: metadata.totalTokenCount || 0,
        } : undefined,
      };

    } catch (err: any) {
      logger.error('❌ Error executing Gemini Agent loop:', err);
      // Fallback response
      const errReply = 'Sorry, our clinic assistant is experiencing some temporary connection issues. Let me try again shortly. How can I help you?';
      await ConversationMemory.saveMessage(whatsappNumber, 'model', errReply);
      return { text: errReply };
    }
  }

  /**
   * Rule-based fallback conversational simulator to run the application fully offline.
   */
  private static async getMockResponse(whatsappNumber: string, userMessage: string, history: any[]): Promise<string> {
    const textLower = userMessage.toLowerCase();
    
    // Check if greeting or reset
    if (history.length <= 1 || textLower.includes('hello') || textLower.includes('hi') || textLower.includes('menu') || textLower.includes('restart')) {
      return `Hello, Welcome to Doctor Clinic!\n\nPlease choose an option (reply with number):\n\n1. New Booking\n2. My Upcoming Bookings\n3. Reschedule Booking\n4. Cancel Booking`;
    }

    // Load registered patients, appointments, etc.
    const registry = ToolRegistry.getInstance();
    
    // Simple state parser based on recent conversational messages
    const lastBotMsg = history.filter(h => h.role === 'model').slice(-1)[0]?.message || '';
    const lastBotMsgLower = lastBotMsg.toLowerCase();

    // 1. MAIN MENU CHOICE
    if (lastBotMsgLower.includes('please choose an option')) {
      if (userMessage.includes('1') || textLower.includes('new') || textLower.includes('book')) {
        // Run get_patients_list tool
        const patients = await registry.executeTool('get_patients_list', { whatsapp_number: whatsappNumber });
        if (patients && patients.length > 0) {
          let listStr = patients.map((p: any, idx: number) => `${idx + 1}. Name: ${p.name} (Age: ${p.age}, Gender: ${p.gender})`).join('\n');
          return `I found the following registered patients for you:\n\n${listStr}\n\nReply with the patient number to book, or reply with "new" to add a new patient.`;
        } else {
          return `It looks like you don't have any patients registered under your number yet. Let's create one!\n\nPlease reply with the patient's Name, Age, and Gender (e.g. John Doe, 30, Male).`;
        }
      }
      
      if (userMessage.includes('2') || textLower.includes('upcoming') || textLower.includes('bookings')) {
        const appts = await registry.executeTool('get_user_appointments', { whatsapp_number: whatsappNumber });
        if (appts && appts.length > 0) {
          const list = appts.map((a: any) => `- Appt ID: ${a.id.slice(0, 8)} | Patient ID: ${a.patientId.slice(0, 8)} | Date: ${a.date} | Time: ${a.time} | Status: ${a.status} | Payment: ${a.paymentStatus}`).join('\n');
          return `Here are your upcoming appointments:\n\n${list}\n\nReply "menu" to return.`;
        }
        return `You have no upcoming appointments booked. Reply "menu" to return.`;
      }

      if (userMessage.includes('3') || textLower.includes('reschedule')) {
        const appts = await registry.executeTool('get_user_appointments', { whatsapp_number: whatsappNumber });
        const confirmed = appts ? appts.filter((a: any) => a.status === 'CONFIRMED') : [];
        if (confirmed.length > 0) {
          const list = confirmed.map((a: any, idx: number) => `${idx + 1}. ID: ${a.id.slice(0, 8)} | Date: ${a.date} | Time: ${a.time}`).join('\n');
          return `Which appointment would you like to reschedule?\n\n${list}\n\nReply with the option number.`;
        }
        return `You don't have any active confirmed appointments to reschedule. Reply "menu" to return.`;
      }

      if (userMessage.includes('4') || textLower.includes('cancel')) {
        const appts = await registry.executeTool('get_user_appointments', { whatsapp_number: whatsappNumber });
        const confirmed = appts ? appts.filter((a: any) => a.status === 'CONFIRMED') : [];
        if (confirmed.length > 0) {
          const list = confirmed.map((a: any, idx: number) => `${idx + 1}. ID: ${a.id.slice(0, 8)} | Date: ${a.date} | Time: ${a.time}`).join('\n');
          return `Which appointment would you like to cancel?\n\n${list}\n\nReply with the option number.`;
        }
        return `You don't have any active confirmed appointments to cancel. Reply "menu" to return.`;
      }
    }

    // 2. NEW PATIENT ADDITION STATE
    if (lastBotMsgLower.includes("please reply with the patient's name, age, and gender") || lastBotMsgLower.includes('reply with "new" to add')) {
      if (textLower === 'new' || lastBotMsgLower.includes("please reply with the patient's name, age, and gender")) {
        if (textLower !== 'new') {
          const parts = userMessage.split(',');
          if (parts.length >= 3) {
            const name = parts[0].trim();
            const age = parseInt(parts[1].trim()) || 25;
            const gender = parts[2].trim();
            const pResult = await registry.executeTool('add_patient', { whatsapp_number: whatsappNumber, name, age, gender });
            
            const patients = await registry.executeTool('get_patients_list', { whatsapp_number: whatsappNumber });
            const listStr = patients.map((p: any, idx: number) => `${idx + 1}. Name: ${p.name} (Age: ${p.age}, Gender: ${p.gender})`).join('\n');
            return `Patient registered successfully!\n\nHere is your patient registry:\n\n${listStr}\n\nPlease select the patient number you wish to use.`;
          }
        }
        return `Please reply with the patient's Name, Age, and Gender (separated by commas). Example: Jane Doe, 24, Female`;
      }
    }

    // 3. SELECT PATIENT STATE -> PROMPT FOR DATE
    if (lastBotMsgLower.includes('i found the following registered patients') || lastBotMsgLower.includes('patient registered successfully')) {
      const patients = await registry.executeTool('get_patients_list', { whatsapp_number: whatsappNumber });
      const optionIdx = parseInt(userMessage.trim()) - 1;
      if (patients && optionIdx >= 0 && optionIdx < patients.length) {
        const patient = patients[optionIdx];
        // Cache patient choice in memory by replying
        // Let's generate dates list
        const today = new Date();
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
        }
        const datesList = dates.map((d, idx) => `${idx + 1}. ${d}`).join('\n');
        return `Great! Booking for Patient: ${patient.name} (ID: ${patient.id.slice(0, 8)})\n\nWhich date would you like to book?\n\n${datesList}`;
      }
    }

    // 4. SELECT DATE STATE -> PROMPT FOR TIME SLOT
    if (lastBotMsgLower.includes('which date would you like to book')) {
      const optionIdx = parseInt(userMessage.trim()) - 1;
      const today = new Date();
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      }
      if (optionIdx >= 0 && optionIdx < dates.length) {
        const selectedDate = dates[optionIdx];
        
        // Return some standard mock slots: e.g. 10:00, 11:30, 14:00, 15:30
        return `You selected date: ${selectedDate}.\n\nHere are the available time slots for this date:\n1. 10:00\n2. 10:30\n3. 11:00\n4. 11:30\n5. 14:00\n6. 14:30\n7. 15:00\n8. 15:30\n\nPlease reply with the option number.`;
      }
    }

    // 5. SELECT TIME SLOT STATE -> PROMPT FOR PAYMENT METHOD
    if (lastBotMsgLower.includes('here are the available time slots')) {
      const slots = ['10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'];
      const optionIdx = parseInt(userMessage.trim()) - 1;
      if (optionIdx >= 0 && optionIdx < slots.length) {
        const selectedSlot = slots[optionIdx];
        
        // Extract selected date from history
        const prevBotMsg = history.filter(h => h.role === 'model').slice(-2)[0]?.message || '';
        const dateMatch = prevBotMsg.match(/date: (\d{4}-\d{2}-\d{2})/);
        const selectedDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-CA');

        return `Selected Time: ${selectedSlot} on Date: ${selectedDate}\n\nHow would you like to pay?\n\n1. Online (Stripe)\n2. Cash at Clinic`;
      }
    }

    // 6. SELECT PAYMENT METHOD STATE -> BOOK APPOINTMENT
    if (lastBotMsgLower.includes('how would you like to pay')) {
      let method = '';
      if (userMessage.includes('1') || textLower.includes('online') || textLower.includes('stripe')) {
        method = 'STRIPE';
      } else if (userMessage.includes('2') || textLower.includes('cash')) {
        method = 'CASH';
      }

      if (method) {
        // Resolve patient, date, slot from history
        const slotsMsg = history.filter(h => h.role === 'model').slice(-2)[0]?.message || '';
        const timeMatch = slotsMsg.match(/Selected Time: (\d{2}:\d{2})/);
        const dateMatch = slotsMsg.match(/Date: (\d{4}-\d{2}-\d{2})/);
        const time = timeMatch ? timeMatch[1] : '10:00';
        const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-CA');

        const patients = await registry.executeTool('get_patients_list', { whatsapp_number: whatsappNumber });
        const patient = patients && patients.length > 0 ? patients[0] : { id: 'mock-p-id', name: 'John Doe' };

        // Save appointment
        const appt = await registry.executeTool('add_appointment', {
          patient_id: patient.id,
          whatsapp_number: whatsappNumber,
          date,
          time,
          payment_method: method,
        });

        if (method === 'STRIPE') {
          return `Appointment Booked!\n\nPatient Name: ${patient.name}\nDate: ${date}\nTime: ${time}\nPayment Method: Stripe\nPayment Status: Pending\nStatus: Confirmed\n\nPlease click this link to pay: http://localhost:5000/api/v1/payments/checkout-session (A payment session has been created for appointment ID: ${appt.id})`;
        } else {
          return `Appointment Booked!\n\nPatient Name: ${patient.name}\nDate: ${date}\nTime: ${time}\nPayment Method: Cash at Clinic\nPayment Status: Pending\nStatus: Confirmed\n\nYour appointment is confirmed. Thank you!`;
        }
      }
    }

    // 7. HANDLE RESCHEDULE CHOICES
    if (lastBotMsgLower.includes('which appointment would you like to reschedule')) {
      const optionIdx = parseInt(userMessage.trim()) - 1;
      const appts = await registry.executeTool('get_user_appointments', { whatsapp_number: whatsappNumber });
      const confirmed = appts ? appts.filter((a: any) => a.status === 'CONFIRMED') : [];
      if (confirmed && optionIdx >= 0 && optionIdx < confirmed.length) {
        const appt = confirmed[optionIdx];
        // Prompt for date
        const today = new Date();
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
        }
        const datesList = dates.map((d, idx) => `${idx + 1}. ${d}`).join('\n');
        return `Rescheduling Appointment ID: ${appt.id.slice(0, 8)}\n\nWhich new date would you like to select?\n\n${datesList}`;
      }
    }

    if (lastBotMsgLower.includes('rescheduling appointment id:')) {
      // Option chosen, date select
      const optionIdx = parseInt(userMessage.trim()) - 1;
      const today = new Date();
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      }
      if (optionIdx >= 0 && optionIdx < dates.length) {
        const selectedDate = dates[optionIdx];
        return `Rescheduling to Date: ${selectedDate}\n\nSelect a new time slot:\n1. 10:00\n2. 10:30\n3. 11:00\n4. 11:30\n5. 14:00\n6. 14:30\n7. 15:00\n8. 15:30\n\nPlease reply with the slot number.`;
      }
    }

    if (lastBotMsgLower.includes('rescheduling to date:')) {
      const slots = ['10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'];
      const optionIdx = parseInt(userMessage.trim()) - 1;
      if (optionIdx >= 0 && optionIdx < slots.length) {
        const selectedSlot = slots[optionIdx];
        
        // Extract appointment ID and date
        const apptIdMatch = lastBotMsg.match(/Appointment ID: ([a-f0-9-]+)/);
        const dateMatch = lastBotMsg.match(/Rescheduling to Date: (\d{4}-\d{2}-\d{2})/);
        
        // Find appointment id in history
        const prevMsg = history.filter(h => h.role === 'model').slice(-2)[0]?.message || '';
        const apptIdMatch2 = prevMsg.match(/Appointment ID: ([a-f0-9-]+)/);
        
        const apptId = apptIdMatch ? apptIdMatch[1] : (apptIdMatch2 ? apptIdMatch2[1] : '');
        const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-CA');

        if (apptId) {
          // Trigger reschedule
          const appts = await registry.executeTool('get_user_appointments', { whatsapp_number: whatsappNumber });
          const appt = appts.find((a: any) => a.id.startsWith(apptId) || a.id === apptId);
          if (appt) {
            await registry.executeTool('reschedule_appointment', {
              appointment_id: appt.id,
              date,
              time: selectedSlot
            });
            return `Success! Appointment rescheduled.\n\nNew Schedule:\nDate: ${date}\nTime: ${selectedSlot}\nAppointment ID: ${appt.id.slice(0, 8)}`;
          }
        }
        return `Failed to find your original appointment. Please start over by replying "menu".`;
      }
    }

    // 8. HANDLE CANCEL CHOICES
    if (lastBotMsgLower.includes('which appointment would you like to cancel')) {
      const optionIdx = parseInt(userMessage.trim()) - 1;
      const appts = await registry.executeTool('get_user_appointments', { whatsapp_number: whatsappNumber });
      const confirmed = appts ? appts.filter((a: any) => a.status === 'CONFIRMED') : [];
      if (confirmed && optionIdx >= 0 && optionIdx < confirmed.length) {
        const appt = confirmed[optionIdx];
        await registry.executeTool('cancel_appointment', { appointment_id: appt.id });
        return `Your appointment on date ${appt.date} at ${appt.time} (ID: ${appt.id.slice(0, 8)}) has been cancelled successfully.`;
      }
    }

    return `I didn't quite understand that. Please reply "menu" to see the main menu options, or type one of the list numbers.`;
  }
}
export default GeminiAgent;
