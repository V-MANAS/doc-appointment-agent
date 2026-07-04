import { prisma } from './infrastructure/database';
import SchedulingService from './modules/scheduling/service';
import AppointmentsService from './modules/appointments/services';
import PatientsService from './modules/patients/services';
import DoctorsService from './modules/doctors/services';
import ToolRegistry from './ai/tools/ToolRegistry';
import logger from './logger';

async function runTests() {
  logger.info('🧪 Starting automated self-audit verification suite...');
  let testsFailed = 0;

  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      logger.error(`❌ ASSERTION FAILED: ${message}`);
      testsFailed++;
    } else {
      logger.info(`✅ PASS: ${message}`);
    }
  };

  try {
    // 1. Verify Seed Doctor Gregory House exists
    const doctor = await prisma.doctor.findUnique({
      where: { email: 'house@clinic.com' },
    });
    assert(!!doctor, 'Default doctor House should exist in seeded database.');
    if (!doctor) return;

    // Reset doctor configuration for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Clear existing config states for tomorrow to isolate testing
    const configKeys = [
      `doctor_leaves_${doctor.id}`,
      `doctor_blocked_slots_${doctor.id}`,
      'clinic_holidays'
    ];
    await prisma.config.deleteMany({ where: { key: { in: configKeys } } });
    await prisma.appointment.deleteMany({
      where: { doctorId: doctor.id, date: tomorrowStr },
    });

    // 2. Test Available Slots Generation (10:00 - 18:00, lunch 13:00-14:00, 30-min intervals)
    const slots = await SchedulingService.getAvailableSlots(doctor.id, tomorrowStr);
    assert(slots.length > 0, 'Should generate available slots for tomorrow.');
    assert(!slots.includes('13:00'), 'Lunch hour slot 13:00 should be excluded.');
    assert(!slots.includes('13:30'), 'Lunch hour slot 13:30 should be excluded.');
    assert(slots.includes('10:00'), 'Standard work start slot 10:00 should be available.');
    assert(slots.includes('17:30'), 'Standard work end slot 17:30 should be available.');

    // 3. Test Booking & Double-Booking Prevention
    // Create mock patient
    const patientPhone = '9999999999';
    await prisma.patient.deleteMany({ where: { whatsappNumber: patientPhone } });
    const patient = await PatientsService.registerPatient({
      whatsappNumber: patientPhone,
      name: 'Test Bob',
      age: 40,
      gender: 'Male',
    });

    // Book tomorrow at 10:00
    const appt = await AppointmentsService.createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      whatsappNumber: patientPhone,
      date: tomorrowStr,
      time: '10:00',
      paymentMethod: 'CASH',
    });
    assert(appt.status === 'CONFIRMED', 'New booking should be Confirmed.');

    // Try booking the exact same slot again (should fail)
    try {
      await AppointmentsService.createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        whatsappNumber: patientPhone,
        date: tomorrowStr,
        time: '10:00',
        paymentMethod: 'CASH',
      });
      assert(false, 'Should not allow double-booking the exact same slot.');
    } catch (err: any) {
      assert(err.message.includes('not available'), 'Double-booking was correctly blocked.');
    }

    // Try booking at 10:30 (should fail due to 10-minute buffer time constraint)
    // Slot 10:00 is busy [10:00 - 10:30]. With a 10-min buffer, the busy range is [09:50 - 10:40].
    // Slot 10:30 is [10:30 - 11:00] which starts at 10:30 (before 10:40) - meaning it overlaps the buffer!
    try {
      await AppointmentsService.createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        whatsappNumber: patientPhone,
        date: tomorrowStr,
        time: '10:30',
        paymentMethod: 'CASH',
      });
      assert(false, 'Should not allow booking at 10:30 due to 10-min buffer conflict.');
    } catch (err: any) {
      assert(err.message.includes('not available'), 'Buffer time conflict was correctly blocked.');
    }

    // Booking at 11:00 should succeed (starts after 10:40 buffer threshold)
    const appt2 = await AppointmentsService.createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      whatsappNumber: patientPhone,
      date: tomorrowStr,
      time: '11:00',
      paymentMethod: 'CASH',
    });
    assert(!!appt2, 'Booking at 11:00 (outside buffer range) should succeed.');

    // 4. Test Doctor Leaves Configuration
    await DoctorsService.addDoctorLeave(doctor.id, tomorrowStr);
    const slotsOnLeaveDay = await SchedulingService.getAvailableSlots(doctor.id, tomorrowStr);
    assert(slotsOnLeaveDay.length === 0, 'No slots should be generated on doctor leave days.');
    
    // Clear leave
    await DoctorsService.removeDoctorLeave(doctor.id, tomorrowStr);

    // 5. Test Blocked Slots Configuration
    await DoctorsService.blockSlot(doctor.id, tomorrowStr, '14:00');
    const slotsWithBlock = await SchedulingService.getAvailableSlots(doctor.id, tomorrowStr);
    assert(!slotsWithBlock.includes('14:00'), 'Blocked slot 14:00 should not be returned.');

    // 6. Test AI Tools registry
    const registry = ToolRegistry.getInstance();
    const patientsToolResult = await registry.executeTool('get_patients_list', { whatsapp_number: patientPhone });
    assert(patientsToolResult.length > 0 && patientsToolResult[0].name === 'Test Bob', 'AI tool get_patients_list should fetch registrations.');

    // Clean up test data
    await prisma.appointment.deleteMany({
      where: { doctorId: doctor.id, date: tomorrowStr },
    });
    await prisma.patient.deleteMany({ where: { whatsappNumber: patientPhone } });

    if (testsFailed > 0) {
      logger.error(`❌ Test Suite Failed: ${testsFailed} assertions failed.`);
      process.exit(1);
    } else {
      logger.info('🎉 All tests passed successfully! Project is robust and verified.');
      process.exit(0);
    }
  } catch (error) {
    logger.error('Unexpected error during tests execution:', error);
    process.exit(1);
  }
}

runTests();
