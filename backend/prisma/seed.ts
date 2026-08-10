import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Default Admin User
  const adminPhone = '1234567890';
  const existingAdmin = await prisma.user.findUnique({ where: { phoneNumber: adminPhone } });
  
  let adminId = '';
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Clinic Administrator',
        phoneNumber: adminPhone,
        email: 'admin@clinic.com',
        passwordHash,
        role: 'ADMIN',
      },
    });
    adminId = admin.id;
    console.log(`✅ Admin account created. Phone: ${adminPhone} | Password: password123`);
  } else {
    adminId = existingAdmin.id;
    console.log('ℹ️ Admin account already exists.');
  }

  // 1.5 Create Default Doctor User
  const doctorPhone = '9876543211';
  const existingDocUser = await prisma.user.findUnique({ where: { phoneNumber: doctorPhone } });
  if (!existingDocUser) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        name: 'Dr. Gregory House',
        phoneNumber: doctorPhone,
        email: 'house@clinic.com',
        passwordHash,
        role: 'DOCTOR',
      },
    });
    console.log(`✅ Doctor User account created. Phone: ${doctorPhone} | Password: password123`);
  } else {
    console.log('ℹ️ Doctor User account already exists.');
  }

  // 2. Create Default Doctor
  const doctorEmail = 'house@clinic.com';
  const existingDoc = await prisma.doctor.findUnique({ where: { email: doctorEmail } });
  
  let doctorId = '';
  if (!existingDoc) {
    const doctor = await prisma.doctor.create({
      data: {
        name: 'Dr. Gregory House',
        specialty: 'Diagnostic Medicine & Nephrology',
        email: doctorEmail,
        workingHours: '10:00-18:00',
        lunchBreak: '13:00-14:00',
        maxDailyBookings: 12,
      },
    });
    doctorId = doctor.id;
    console.log(`✅ Doctor created: Dr. Gregory House (ID: ${doctor.id})`);
  } else {
    doctorId = existingDoc.id;
    console.log('ℹ️ Doctor already exists.');
  }

  // 3. Create Default Configurations
  const configs = [
    { key: 'clinic_holidays', value: JSON.stringify(['Saturday', 'Sunday']) },
    { key: `doctor_leaves_${doctorId}`, value: JSON.stringify([]) },
    { key: `doctor_blocked_slots_${doctorId}`, value: JSON.stringify([]) },
  ];

  for (const conf of configs) {
    await prisma.config.upsert({
      where: { key: conf.key },
      update: {},
      create: conf,
    });
  }
  console.log('✅ Default configurations seeded.');

  // 4. Seed Completed Patient Consultation History
  const patientPhone = '1111111111';
  let patient = await prisma.patient.findFirst({ where: { whatsappNumber: patientPhone } });
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        name: 'John Doe',
        whatsappNumber: patientPhone,
        age: 35,
        gender: 'Male',
      },
    });
  }

  const apptDate = '2026-07-03';
  let appt = await prisma.appointment.findFirst({
    where: { patientId: patient.id, date: apptDate },
  });

  if (!appt) {
    appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctorId,
        whatsappNumber: patientPhone,
        date: apptDate,
        time: '10:00',
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        status: 'COMPLETED',
      },
    });
  }

  let consultation = await prisma.consultation.findUnique({
    where: { appointmentId: appt.id },
  });

  if (!consultation) {
    consultation = await prisma.consultation.create({
      data: {
        appointmentId: appt.id,
        doctorId: doctorId,
        patientId: patient.id,
        chiefComplaint: 'Severe chronic migraines and occasional blurred vision.',
        diagnosis: 'Tension-type headaches exacerbated by sleep apnea.',
        doctorNotes: 'Advised lifestyle modification, limited screen usage, and 8 hours sleep.',
        followUpDate: '2026-07-15',
      },
    });

    // Seed prescriptions
    await prisma.prescription.create({
      data: {
        consultationId: consultation.id,
        medicineName: 'Sumatriptan',
        dosage: '50mg',
        frequency: '1-0-0',
        duration: '10 days',
        instructions: 'Take at onset of migraine.',
      },
    });

    await prisma.prescription.create({
      data: {
        consultationId: consultation.id,
        medicineName: 'Magnesium Glycinate',
        dosage: '400mg',
        frequency: '0-0-1',
        duration: '30 days',
        instructions: 'Take before sleeping with warm water.',
      },
    });
    console.log('✅ Completed consultation and prescriptions history seeded.');
  }

  console.log('🌱 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
