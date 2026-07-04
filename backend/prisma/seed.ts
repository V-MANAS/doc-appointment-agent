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
