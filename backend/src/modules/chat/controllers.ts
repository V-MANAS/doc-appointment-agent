import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import GeminiAgent from '../../ai/agents/GeminiAgent';
import { broadcastEvent } from '../../infrastructure/websocket';
import ConversationMemory from '../../ai/memory/ConversationMemory';
import logger from '../../logger';

const messageSchema = z.object({
  whatsappNumber: z.string().min(10, 'WhatsApp number must be at least 10 digits'),
  message: z.string().min(1, 'Message cannot be empty'),
});

export class ChatController {
  /**
   * Post a message to the AI reception chatbot.
   */
  public static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { whatsappNumber, message } = messageSchema.parse(req.body);

      // 1. Broadcast the user's message immediately for real-time responsiveness
      broadcastEvent(`chat:${whatsappNumber}:message`, {
        sender: 'user',
        text: message,
        timestamp: new Date().toISOString(),
      });

      // 2. Process message through Gemini Agent loop (handles tool execution and database changes)
      const agentResult = await GeminiAgent.sendMessage(whatsappNumber, message);

      // 3. Broadcast the agent's reply
      broadcastEvent(`chat:${whatsappNumber}:message`, {
        sender: 'model',
        text: agentResult.text,
        tokensUsed: agentResult.tokensUsed,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        response: agentResult.text,
        tokensUsed: agentResult.tokensUsed,
      });
    } catch (error) {
      logger.error('Error in chat controller:', error);
      next(error);
    }
  }

  /**
   * Retrieves chat history for a given phone number.
   */
  public static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const whatsappNumber = req.query.whatsappNumber as string;
      if (!whatsappNumber) {
        return res.status(400).json({ success: false, message: 'whatsappNumber is required' });
      }

      const history = await ConversationMemory.getHistory(whatsappNumber, 30);
      res.status(200).json({ success: true, history });
    } catch (error) {
      next(error);
    }
  }
}
export default ChatController;
