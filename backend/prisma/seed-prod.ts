/**
 * Fresh production seed — admin + médecin only (no demo patients).
 * Usage: npx tsx prisma/seed-prod.ts
 * WARNING: deletes ALL existing data first.
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Prod seed (admin + médecin only)…');

  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.riskPrediction.deleteMany();
  await prisma.medicationReminder.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.weeklyFollowUp.deleteMany();
  await prisma.ordonnance.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.healthGoal.deleteMany();
  await prisma.doctorPatient.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash('Admin@SuiviConnect2024!', 12);
  const doctorHash = await bcrypt.hash('Demo1234!', 12);

  await prisma.user.create({
    data: {
      email: 'admin@suivi-connect.fr',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      email: 'dr.martin@suivi.fr',
      passwordHash: doctorHash,
      role: Role.DOCTOR,
      doctorProfile: {
        create: {
          nomComplet: 'Dr. Martin Dubois',
          specialite: 'Cardiologie',
        },
      },
    },
  });

  console.log('\n✅ Prod seed done — 2 users only\n');
  console.log('ADMIN   admin@suivi-connect.fr  /  Admin@SuiviConnect2024!');
  console.log('DOCTOR  dr.martin@suivi.fr      /  Demo1234!');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
