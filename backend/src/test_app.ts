import { prisma } from './infrastructure/database';
import AppointmentsService from './modules/appointments/services';
import PatientsService from './modules/patients/services';
import DoctorsService from './modules/doctors/services';
import GeminiAgent from './ai/agents/GeminiAgent';
import ConversationMemory from './ai/memory/ConversationMemory';
import AdminController from './modules/admin/controllers';
import ConsultationsController from './modules/consultations/controllers';
import logger from './logger';

async function runE2ETests() {
  logger.info('🧪 Starting E2E Chat Conversation Test Suite...');
  let testsFailed = 0;

  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      logger.error(`❌ ASSERTION FAILED: ${message}`);
      testsFailed++;
    } else {
      logger.info(`✅ PASS: ${message}`);
    }
  };

  const testPhone = '9876543210';

  try {
    // Force tool registrations to resolve circular module side-effects
    PatientsService.registerAgentTools();
    AppointmentsService.registerAgentTools();

    // 0. Cleanup existing test data
    await prisma.appointment.deleteMany({ where: { whatsappNumber: testPhone } });
    await prisma.patient.deleteMany({ where: { whatsappNumber: testPhone } });
    await ConversationMemory.clearHistory(testPhone);

    const doctor = await prisma.doctor.findUnique({
      where: { email: 'house@clinic.com' },
    });
    if (!doctor) {
      logger.error('❌ Default doctor House not found. Please run seed script first.');
      process.exit(1);
    }

    // Ensure tomorrow date is not a holiday to make test deterministic
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Clear tomorrow's blocks
    await prisma.config.deleteMany({
      where: {
        key: {
          in: [`doctor_leaves_${doctor.id}`, `doctor_blocked_slots_${doctor.id}`, 'clinic_holidays']
        }
      }
    });

    // 1. Send greeting -> Menu
    logger.info('💬 Step 1: Greeting the chatbot...');
    let reply = await GeminiAgent.sendMessage(testPhone, 'Hi');
    assert(reply.text.includes('Welcome to Doctor Clinic') && reply.text.includes('1. New Booking'), 'Greeting should return Main Menu options.');

    // 2. Choose Option 1 (New Booking) -> Request Patient details
    logger.info('💬 Step 2: Selecting "New Booking"...');
    reply = await GeminiAgent.sendMessage(testPhone, '1');
    assert(reply.text.includes("don't have any patients") || reply.text.includes("please reply with the patient's Name"), 'Should prompt to register a new patient.');

    // 3. Register Patient details -> Success & Select Patient
    logger.info('💬 Step 3: Submitting patient registration details...');
    reply = await GeminiAgent.sendMessage(testPhone, 'Jane E2E, 28, Female');
    assert(reply.text.includes('Patient registered successfully') && reply.text.includes('Jane E2E'), 'Should report patient registration success.');

    // 4. Select Patient Index 1 -> Returns Date Selection list
    logger.info('💬 Step 4: Selecting the registered patient...');
    reply = await GeminiAgent.sendMessage(testPhone, '1');
    assert(reply.text.includes('Which date would you like to book'), 'Should list date options.');

    // 5. Select Date Option 2 (Tomorrow) -> Returns Slots list
    logger.info('💬 Step 5: Selecting Booking Date...');
    reply = await GeminiAgent.sendMessage(testPhone, '2'); // Option 2 = tomorrow
    assert(reply.text.includes('available time slots for this date') && reply.text.includes('1. 10:00'), 'Should list slot times.');

    // 6. Select Slot Option 1 (10:00) -> Prompts for payment
    logger.info('💬 Step 6: Selecting Slot time (10:00)...');
    reply = await GeminiAgent.sendMessage(testPhone, '1'); // 10:00 slot
    assert(reply.text.includes('How would you like to pay') && reply.text.includes('2. Cash at Clinic'), 'Should prompt for payment method.');

    // 7. Choose Option 2 (Cash) -> Persists to Database and confirms
    logger.info('💬 Step 7: Confirming CASH payment...');
    reply = await GeminiAgent.sendMessage(testPhone, '2'); // Cash method
    assert(reply.text.includes('Appointment Booked!') && reply.text.includes('Cash at Clinic'), 'Chatbot should respond with Booking Confirmation.');

    // ================= VERIFICATIONS =================
    logger.info('🔍 Performing database and upcoming appointment checks...');

    // A. Verify Appointment physically exists in SQLite
    const appt = await prisma.appointment.findFirst({
      where: { whatsappNumber: testPhone },
      include: { patient: true },
    });
    assert(!!appt, 'Appointment must be physically stored in the database.');
    if (appt) {
      assert(appt.patient?.name === 'Jane E2E', 'Stored appointment must link to registered patient.');
      assert(appt.time === '10:00', 'Stored slot time must be 10:00.');
      assert(appt.paymentMethod === 'CASH', 'Stored payment method must be CASH.');
      assert(appt.status === 'CONFIRMED', 'Stored status must be CONFIRMED.');
    }

    // B. Verify Upcoming Appointments option returns this booking
    logger.info('💬 Step 8: Returning to Menu and querying "Upcoming Bookings"...');
    await GeminiAgent.sendMessage(testPhone, 'menu');
    reply = await GeminiAgent.sendMessage(testPhone, '2'); // My Upcoming Bookings
    assert(reply.text.includes('upcoming appointments') && reply.text.includes('10:00'), 'Upcoming bookings list must return the newly created appointment.');

    // C. Verify Admin Controller endpoints pull all listings (Option 1)
    logger.info('🔍 Verifying Admin Controller endpoints fetch summaries...');
    const reqMock = {} as any;
    let resJsonData: any = null;
    const resMock = {
      status: (code: number) => {
        assert(code === 200, `Admin endpoint should return 200 status code.`);
        return resMock;
      },
      json: (data: any) => {
        resJsonData = data;
        return resMock;
      }
    } as any;

    await AdminController.getPatients(reqMock, resMock, (err: any) => { throw err; });
    assert(resJsonData && resJsonData.success === true && Array.isArray(resJsonData.patients), 'Admin getPatients endpoint should return list of patients.');

    resJsonData = null;
    await AdminController.getAppointments(reqMock, resMock, (err: any) => { throw err; });
    assert(resJsonData && resJsonData.success === true && Array.isArray(resJsonData.appointments), 'Admin getAppointments endpoint should return list of appointments.');

    resJsonData = null;
    await AdminController.getConfig(reqMock, resMock, (err: any) => { throw err; });
    assert(resJsonData && resJsonData.success === true && Array.isArray(resJsonData.configs), 'Admin getConfig endpoint should return list of configurations.');

    // D. Verify Consultations Controller endpoints
    logger.info('🔍 Verifying Consultations Controller workflow...');
    assert(!!appt, 'Appointments record must be valid to run consultations E2E test.');
    if (appt) {
      let consultationId = '';
      
      // 1. Start Consultation
      const startReqMock = {
        body: { appointmentId: appt.id },
        ip: '127.0.0.1'
      } as any;
      resJsonData = null;
      await ConsultationsController.startConsultation(startReqMock, resMock, (err: any) => { throw err; });
      assert(resJsonData && resJsonData.success === true && resJsonData.appointment?.status === 'IN_PROGRESS', 'Start consultation should set status to IN_PROGRESS.');
      consultationId = resJsonData.consultation?.id;
      assert(!!consultationId, 'Start consultation should return a valid consultation ID.');

      // 2. Save Clinical Notes
      const notesReqMock = {
        body: {
          appointmentId: appt.id,
          chiefComplaint: 'E2E test patient complaint.',
          diagnosis: 'E2E test patient diagnosis.',
          doctorNotes: 'E2E test practitioner notes.',
          followUpDate: '2026-07-10'
        },
        ip: '127.0.0.1'
      } as any;
      resJsonData = null;
      await ConsultationsController.saveNotes(notesReqMock, resMock, (err: any) => { throw err; });
      assert(resJsonData && resJsonData.success === true && resJsonData.consultation?.diagnosis === 'E2E test patient diagnosis.', 'Save notes should store diagnosis details.');

      // 3. Save Prescription
      const prescriptionReqMock = {
        body: {
          consultationId,
          medicines: [
            {
              medicineName: 'Test Pill A',
              dosage: '10mg',
              frequency: '1-0-1',
              duration: '7 days',
              instructions: 'After breakfast.'
            }
          ]
        },
        ip: '127.0.0.1'
      } as any;
      resJsonData = null;
      await ConsultationsController.savePrescription(prescriptionReqMock, resMock, (err: any) => { throw err; });
      assert(resJsonData && resJsonData.success === true && resJsonData.prescriptions?.length === 1, 'Save prescription should create prescription items.');

      // 4. Complete Consultation
      const completeReqMock = {
        body: { appointmentId: appt.id },
        ip: '127.0.0.1'
      } as any;
      resJsonData = null;
      await ConsultationsController.completeConsultation(completeReqMock, resMock, (err: any) => { throw err; });
      assert(resJsonData && resJsonData.success === true && resJsonData.appointment?.status === 'COMPLETED', 'Complete consultation should set status to COMPLETED.');
    }

    // Clean up E2E records
    await prisma.appointment.deleteMany({ where: { whatsappNumber: testPhone } });
    await prisma.patient.deleteMany({ where: { whatsappNumber: testPhone } });
    await ConversationMemory.clearHistory(testPhone);

    if (testsFailed > 0) {
      logger.error(`❌ E2E Audit Failed: ${testsFailed} assertions failed.`);
      process.exit(1);
    } else {
      logger.info('🎉 E2E Chat Booking audit completed successfully with 0 errors!');
      process.exit(0);
    }
  } catch (error) {
    logger.error('Unexpected error during E2E test execution:', error);
    process.exit(1);
  }
}

runE2ETests();
