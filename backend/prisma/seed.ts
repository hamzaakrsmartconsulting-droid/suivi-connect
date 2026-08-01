import { PrismaClient, Role, AlertSeverity, AlertType, RiskLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function weeksAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clean all tables
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.riskPrediction.deleteMany();
  await prisma.medicationReminder.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.weeklyFollowUp.deleteMany();
  await prisma.doctorPatient.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  const adminHash    = await bcrypt.hash('Admin@SuiviConnect2024!', 12);

  // ── Admin ─────────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'admin@suivi-connect.fr',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  // ── Doctor ────────────────────────────────────────────────────────────────
  const doctorUser = await prisma.user.create({
    data: {
      email: 'dr.martin@suivi.fr',
      passwordHash,
      role: Role.DOCTOR,
      doctorProfile: {
        create: {
          nomComplet: 'Dr. Martin Dubois',
          specialite: 'Cardiologie',
        },
      },
    },
    include: { doctorProfile: true },
  });

  const doctorId = doctorUser.doctorProfile!.id;
  const doctorUserId = doctorUser.id;

  // ── Patient definitions ───────────────────────────────────────────────────
  const patientsConfig = [
    {
      email: 'jean.dupont@suivi.fr',
      nomComplet: 'Jean Dupont',
      age: 62,
      taille: 175,
      profession: 'Ingénieur retraité',
      dateProcedure: new Date('2025-12-15'),
      sejourReeducation: '2 semaines',
      stade: 'Stade III',
      // Health profile: good recovery, low risk
      poidsBase: 78,
      tensionSysBase: 130,
      tensionDiaBase: 82,
      ldlBase: 1.4,
      activiteBase: 120,
      tabac: false,
      diabete: false,
      riskScore: 22,
      riskLevel: RiskLevel.LOW,
      riskFacteurs: ['Bonne adhésion médicamenteuse', 'Activité physique régulière', 'Tension contrôlée'],
      medications: [
        { nom: 'Bisoprolol', dosage: '5mg', frequence: '1x/jour matin', heure: '08:00' },
        { nom: 'Atorvastatine', dosage: '20mg', frequence: '1x/jour soir', heure: '21:00' },
        { nom: 'Aspirine', dosage: '75mg', frequence: '1x/jour matin', heure: '08:00' },
        { nom: 'Ramipril', dosage: '5mg', frequence: '1x/jour matin', heure: '08:00' },
      ],
      alerts: [
        { type: AlertType.ACTIVITY, severite: AlertSeverity.LOW, message: 'Activité physique légèrement en dessous de l\'objectif cette semaine : 95 min (objectif : 150 min)', lu: true, daysAgo: 5 },
        { type: AlertType.LDL, severite: AlertSeverity.LOW, message: 'LDL stable à 1.38 g/L — objectif maintenu', lu: true, daysAgo: 14 },
      ],
    },
    {
      email: 'marie.bernard@suivi.fr',
      nomComplet: 'Marie Bernard',
      age: 58,
      taille: 162,
      profession: 'Enseignante',
      dateProcedure: new Date('2026-01-20'),
      sejourReeducation: '3 semaines',
      stade: 'Stade II',
      // Health profile: moderate risk, diabetic, LDL issues
      poidsBase: 67,
      tensionSysBase: 138,
      tensionDiaBase: 88,
      ldlBase: 1.72,
      activiteBase: 75,
      tabac: false,
      diabete: true,
      riskScore: 41,
      riskLevel: RiskLevel.MODERATE,
      riskFacteurs: ['Diabète de type 2', 'LDL légèrement élevé', 'Adhésion médicamenteuse partielle'],
      medications: [
        { nom: 'Bisoprolol', dosage: '2.5mg', frequence: '1x/jour matin', heure: '08:00' },
        { nom: 'Atorvastatine', dosage: '40mg', frequence: '1x/jour soir', heure: '21:00' },
        { nom: 'Metformine', dosage: '1000mg', frequence: '2x/jour', heure: '08:00' },
        { nom: 'Aspirine', dosage: '75mg', frequence: '1x/jour matin', heure: '08:00' },
        { nom: 'Perindopril', dosage: '4mg', frequence: '1x/jour matin', heure: '08:00' },
      ],
      alerts: [
        { type: AlertType.LDL, severite: AlertSeverity.MEDIUM, message: 'LDL au-dessus de l\'objectif : 1.72 g/L (objectif : < 1.4 g/L)', lu: false, daysAgo: 2 },
        { type: AlertType.MEDICATION, severite: AlertSeverity.MEDIUM, message: 'Adhésion médicamenteuse faible cette semaine : 14/21 prises (67%)', lu: false, daysAgo: 3 },
        { type: AlertType.BLOOD_PRESSURE, severite: AlertSeverity.MEDIUM, message: 'Tension artérielle élevée : 142/90 mmHg — à surveiller', lu: true, daysAgo: 7 },
        { type: AlertType.ACTIVITY, severite: AlertSeverity.LOW, message: 'Activité physique insuffisante : 45 min cette semaine (objectif : 150 min)', lu: true, daysAgo: 10 },
      ],
    },
    {
      email: 'pierre.leroy@suivi.fr',
      nomComplet: 'Pierre Leroy',
      age: 71,
      taille: 180,
      profession: 'Commerçant retraité',
      dateProcedure: new Date('2025-11-01'),
      sejourReeducation: '3 semaines',
      stade: 'Stade II',
      // Health profile: high risk, ex-smoker, hypertension
      poidsBase: 88,
      tensionSysBase: 152,
      tensionDiaBase: 94,
      ldlBase: 1.85,
      activiteBase: 50,
      tabac: false, // stopped smoking
      diabete: false,
      riskScore: 64,
      riskLevel: RiskLevel.HIGH,
      riskFacteurs: ['Hypertension non contrôlée', 'LDL élevé', 'Sédentarité', 'Antécédent tabagique (arrêt récent)', 'Âge > 70 ans'],
      medications: [
        { nom: 'Bisoprolol', dosage: '10mg', frequence: '1x/jour matin', heure: '08:00' },
        { nom: 'Atorvastatine', dosage: '80mg', frequence: '1x/jour soir', heure: '21:00' },
        { nom: 'Aspirine', dosage: '100mg', frequence: '1x/jour matin', heure: '08:00' },
        { nom: 'Amlodipine', dosage: '5mg', frequence: '1x/jour matin', heure: '08:00' },
        { nom: 'Furosémide', dosage: '40mg', frequence: '1x/jour matin', heure: '07:00' },
        { nom: 'Spironolactone', dosage: '25mg', frequence: '1x/jour matin', heure: '08:00' },
      ],
      alerts: [
        { type: AlertType.BLOOD_PRESSURE, severite: AlertSeverity.CRITICAL, message: 'Hypertension sévère détectée : 168/102 mmHg — consultation urgente recommandée', lu: false, daysAgo: 0 },
        { type: AlertType.BLOOD_PRESSURE, severite: AlertSeverity.HIGH, message: 'Tension artérielle élevée : 158/96 mmHg', lu: false, daysAgo: 3 },
        { type: AlertType.LDL, severite: AlertSeverity.HIGH, message: 'LDL dangereusement élevé : 1.98 g/L (objectif : < 1.0 g/L)', lu: false, daysAgo: 5 },
        { type: AlertType.WEIGHT, severite: AlertSeverity.MEDIUM, message: 'Prise de poids significative : +2.8 kg en 2 semaines', lu: true, daysAgo: 7 },
        { type: AlertType.MEDICATION, severite: AlertSeverity.HIGH, message: 'Adhésion médicamenteuse très faible : 9/42 prises (21%) — risque élevé', lu: true, daysAgo: 8 },
        { type: AlertType.ACTIVITY, severite: AlertSeverity.MEDIUM, message: 'Aucune activité physique enregistrée cette semaine', lu: true, daysAgo: 10 },
      ],
    },
  ];

  const createdPatients: { userId: string; patientId: string; name: string }[] = [];

  for (const p of patientsConfig) {
    // Create user + patient profile
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash,
        role: Role.PATIENT,
        patientProfile: {
          create: {
            nomComplet: p.nomComplet,
            age: p.age,
            taille: p.taille,
            profession: p.profession,
            dateProcedure: p.dateProcedure,
            sejourReeducation: p.sejourReeducation,
            stadeRecommande: p.stade,
          },
        },
      },
      include: { patientProfile: true },
    });

    const patientId = user.patientProfile!.id;
    createdPatients.push({ userId: user.id, patientId, name: p.nomComplet });

    // Link to doctor
    await prisma.doctorPatient.create({
      data: { doctorId, patientId },
    });

    // ── Medications ──────────────────────────────────────────────────────────
    for (const med of p.medications) {
      const medication = await prisma.medication.create({
        data: {
          patientId,
          nom: med.nom,
          dosage: med.dosage,
          frequence: med.frequence,
          dateDebut: p.dateProcedure,
          actif: true,
        },
      });
      await prisma.medicationReminder.create({
        data: {
          medicationId: medication.id,
          heure: med.heure,
          joursSemaine: '1,2,3,4,5,6,7',
          actif: true,
        },
      });
    }

    // ── Weekly follow-ups (16 weeks of realistic data) ────────────────────────
    for (let week = 0; week < 16; week++) {
      const progress = week / 16;
      const noise = () => (Math.random() - 0.5) * 2;

      // Each patient has a unique evolution curve
      const tensionImprovement = p.riskLevel === RiskLevel.HIGH ? progress * 10 : progress * 20;
      const ldlImprovement = progress * 0.3;
      const poidsEvolution = p.nomComplet === 'Pierre Leroy' ? -progress * 3 : -progress * 2;
      const activiteGrowth = p.riskLevel === RiskLevel.HIGH ? progress * 40 : progress * 80;

      const medPris = p.riskLevel === RiskLevel.HIGH
        ? Math.round(p.medications.length * 7 * (0.4 + progress * 0.4))
        : Math.round(p.medications.length * 7 * (0.75 + progress * 0.25));

      await prisma.weeklyFollowUp.create({
        data: {
          patientId,
          semaine: weeksAgo(16 - week),
          poids: parseFloat((p.poidsBase + poidsEvolution + noise() * 0.3).toFixed(1)),
          tensionSys: Math.round(p.tensionSysBase - tensionImprovement + noise() * 4),
          tensionDia: Math.round(p.tensionDiaBase - tensionImprovement * 0.5 + noise() * 2),
          tabac: p.tabac && week < 4,
          diabete: p.diabete,
          ldl: parseFloat((p.ldlBase - ldlImprovement + noise() * 0.05).toFixed(2)),
          medicamentsPris: Math.min(medPris, p.medications.length * 7),
          medicamentsTotal: p.medications.length * 7,
          activiteMinutes: Math.round(Math.max(0, p.activiteBase + activiteGrowth + noise() * 10)),
          notes: week === 15
            ? `Semaine ${week + 1} : ${p.riskLevel === RiskLevel.LOW ? 'Excellente progression, patient motivé' : p.riskLevel === RiskLevel.MODERATE ? 'Progression satisfaisante, continuer les efforts' : 'Progression lente, renforcer le suivi'}`
            : week === 7 ? `Mi-parcours — bilan intermédiaire avec le Dr. Dubois` : undefined,
        },
      });
    }

    // ── Alerts ────────────────────────────────────────────────────────────────
    for (const alert of p.alerts) {
      await prisma.alert.create({
        data: {
          patientId,
          type: alert.type,
          severite: alert.severite,
          message: alert.message,
          lu: alert.lu,
          createdAt: daysAgo(alert.daysAgo),
        },
      });
    }

    // ── Risk predictions ──────────────────────────────────────────────────────
    // 4 historical predictions showing evolution
    for (let i = 3; i >= 0; i--) {
      const scoreVariation = i * 8;
      await prisma.riskPrediction.create({
        data: {
          patientId,
          score: Math.min(100, p.riskScore + scoreVariation),
          niveau: i === 0 ? p.riskLevel : (p.riskScore + scoreVariation > 60 ? RiskLevel.HIGH : p.riskScore + scoreVariation > 35 ? RiskLevel.MODERATE : RiskLevel.LOW),
          facteurs: p.riskFacteurs,
          createdAt: weeksAgo(i * 4),
        },
      });
    }

    // ── Notifications for patient ─────────────────────────────────────────────
    await prisma.notification.createMany({
      data: [
        { userId: user.id, titre: 'Rappel médicament', message: `${p.medications[0].nom} ${p.medications[0].dosage} à prendre ce matin`, type: 'medication', lu: false, createdAt: daysAgo(0) },
        { userId: user.id, titre: 'Suivi hebdomadaire', message: 'N\'oubliez pas de renseigner votre suivi hebdomadaire', type: 'followup', lu: false, createdAt: daysAgo(1) },
        { userId: user.id, titre: 'Message du médecin', message: 'Dr. Martin Dubois vous a envoyé un message', type: 'message', lu: true, createdAt: daysAgo(3) },
        { userId: user.id, titre: 'Rapport disponible', message: 'Votre rapport mensuel est disponible', type: 'report', lu: true, createdAt: daysAgo(7) },
      ],
    });
  }

  // ── Messages between doctor and each patient ──────────────────────────────
  const messageThreads = [
    {
      patientName: 'Jean Dupont',
      messages: [
        { from: 'doctor', text: 'Bonjour Jean, comment vous sentez-vous cette semaine ? Vos dernières mesures sont encourageantes.', daysAgo: 5 },
        { from: 'patient', text: 'Bonjour Docteur, je me sens beaucoup mieux ! La tension est plus stable et je marche 30 minutes par jour.', daysAgo: 5 },
        { from: 'doctor', text: 'Excellent ! Continuez ainsi. Pensez à bien prendre votre Ramipril le matin. Prochain bilan dans 2 semaines.', daysAgo: 4 },
        { from: 'patient', text: 'Bien reçu Docteur. J\'ai une question : puis-je augmenter la durée de mes marches à 45 minutes ?', daysAgo: 3 },
        { from: 'doctor', text: 'Oui, vous pouvez progresser à 45 min. Augmentez progressivement et si vous ressentez une gêne, revenez à 30 min.', daysAgo: 3 },
        { from: 'patient', text: 'Merci beaucoup Docteur, je vais essayer demain matin.', daysAgo: 2 },
      ],
    },
    {
      patientName: 'Marie Bernard',
      messages: [
        { from: 'doctor', text: 'Bonjour Marie, j\'ai vu que votre LDL est toujours un peu élevé. Avez-vous suivi le régime alimentaire recommandé ?', daysAgo: 4 },
        { from: 'patient', text: 'Bonjour Docteur, j\'essaie de suivre le régime méditerranéen mais c\'est parfois difficile avec mon emploi du temps.', daysAgo: 4 },
        { from: 'doctor', text: 'Je comprends. Essayons d\'augmenter la dose d\'Atorvastatine à 40mg. Je vous envoie une ordonnance. Prenez rendez-vous rapidement.', daysAgo: 3 },
        { from: 'patient', text: 'D\'accord Docteur. J\'ai aussi oublié quelques prises de médicaments cette semaine, je suis désolée.', daysAgo: 2 },
        { from: 'doctor', text: 'Pas de panique, mais c\'est important de ne pas manquer les prises. Activez les rappels dans l\'application pour vous aider.', daysAgo: 2 },
        { from: 'patient', text: 'Bonne idée, je vais le faire ce soir. Merci pour votre patience Docteur.', daysAgo: 1 },
      ],
    },
    {
      patientName: 'Pierre Leroy',
      messages: [
        { from: 'doctor', text: 'Bonjour Pierre, vos mesures de tension de cette semaine m\'inquiètent : 168/102 mmHg. C\'est très élevé. Pouvez-vous me rappeler ce matin ?', daysAgo: 1 },
        { from: 'patient', text: 'Bonjour Docteur, je vois le message. Je vous rappelle dans 1 heure. Je me sens un peu fatigué ces derniers jours.', daysAgo: 1 },
        { from: 'doctor', text: 'Bien reçu. En attendant, reposez-vous et évitez tout effort. Si vous ressentez une douleur thoracique, appelez le 15 immédiatement.', daysAgo: 1 },
        { from: 'patient', text: 'Je comprends, je reste à la maison. J\'ai aussi grossi de presque 3 kg ce mois-ci...', daysAgo: 0 },
        { from: 'doctor', text: 'Je vois ça sur votre suivi. Nous allons ajuster le traitement. Venez en consultation demain matin à 9h.', daysAgo: 0 },
      ],
    },
  ];

  for (const thread of messageThreads) {
    const patient = createdPatients.find(p => p.name === thread.patientName)!;

    for (const msg of thread.messages) {
      const expediteurId = msg.from === 'doctor' ? doctorUserId : patient.userId;
      const destinataireId = msg.from === 'doctor' ? patient.userId : doctorUserId;

      await prisma.message.create({
        data: {
          expediteurId,
          destinataireId,
          contenu: msg.text,
          lu: msg.daysAgo > 1,
          createdAt: daysAgo(msg.daysAgo),
        },
      });
    }
  }

  // ── Doctor notifications ──────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: doctorUserId, titre: 'Alerte critique — Pierre Leroy', message: 'Hypertension sévère : 168/102 mmHg — action urgente requise', type: 'alert', lu: false, createdAt: daysAgo(0) },
      { userId: doctorUserId, titre: 'Nouveau suivi hebdomadaire', message: 'Jean Dupont a soumis son suivi de la semaine', type: 'followup', lu: false, createdAt: daysAgo(1) },
      { userId: doctorUserId, titre: 'Alerte LDL — Marie Bernard', message: 'LDL au-dessus de l\'objectif : 1.72 g/L', type: 'alert', lu: true, createdAt: daysAgo(2) },
      { userId: doctorUserId, titre: 'Nouveau message', message: 'Pierre Leroy vous a répondu', type: 'message', lu: false, createdAt: daysAgo(0) },
      { userId: doctorUserId, titre: 'Rapport généré', message: 'Rapport mensuel de Jean Dupont disponible', type: 'report', lu: true, createdAt: daysAgo(5) },
    ],
  });

  console.log('\n✅ Seed completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 ADMIN');
  console.log('   admin@suivi-connect.fr  /  Admin@SuiviConnect2024!');
  console.log('   → Accès exclusif : /apercu (Vue d\'ensemble)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🩺 DOCTOR');
  console.log('   dr.martin@suivi.fr  /  Demo1234!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧑‍⚕️ PATIENTS (all password: Demo1234!)');
  console.log('   jean.dupont@suivi.fr     → Risque LOW    — Stade III');
  console.log('   marie.bernard@suivi.fr   → Risque MODERATE — Stade II');
  console.log('   pierre.leroy@suivi.fr    → Risque HIGH   — Stade II');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Data seeded per patient:');
  console.log('   - 16 weekly follow-ups');
  console.log('   - 4-6 medications with reminders');
  console.log('   - 2-6 alerts (realistic severities)');
  console.log('   - 4 risk predictions (history)');
  console.log('   - 4 notifications');
  console.log('   - Full message thread with doctor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
