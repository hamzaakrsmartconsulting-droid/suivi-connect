import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { ClinicalRiskPredictor } from '../services/riskEngine.js';
import { createNotification } from '../services/notifications.js';
import { emitToUser } from '../services/socket.js';
import { generatePatientReport } from '../services/pdf.js';
import { generateOrdonnancePdf } from '../services/ordonnancePdf.js';

const router = Router();

router.use(authenticate, authorize('DOCTOR'));

async function getDoctorProfile(userId: string) {
  const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, 'Profil médecin introuvable');
  return profile;
}

router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);

    const patients = await prisma.doctorPatient.findMany({
      where: { doctorId: doctor.id },
      include: {
        patient: {
          include: {
            alerts: { where: { lu: false }, take: 1 },
            riskPredictions: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    const totalPatients = patients.length;
    const activeAlerts = await prisma.alert.count({
      where: {
        patientId: { in: patients.map((p) => p.patientId) },
        lu: false,
      },
    });

    const highRiskPatients = patients.filter((p) => {
      const risk = p.patient.riskPredictions[0];
      return risk && (risk.niveau === 'HIGH' || risk.niveau === 'VERY_HIGH');
    });

    const recentAlerts = await prisma.alert.findMany({
      where: { patientId: { in: patients.map((p) => p.patientId) } },
      include: { patient: { select: { id: true, nomComplet: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Recent activities derived from follow-ups and alerts
    const recentFollowUps = await prisma.weeklyFollowUp.findMany({
      where: { patientId: { in: patients.map((p) => p.patientId) } },
      include: { patient: { select: { nomComplet: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentMessages = await prisma.message.findMany({
      where: { destinataireId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentActivities = [
      ...recentFollowUps.map((f) => ({
        id: f.id,
        type: 'followup',
        patient: f.patient.nomComplet,
        message: `Suivi hebdomadaire — poids ${f.poids} kg, tension ${f.tensionSys}/${f.tensionDia} mmHg`,
        time: f.createdAt.toISOString(),
      })),
      ...recentAlerts.slice(0, 5).map((a) => ({
        id: `alert-${a.id}`,
        type: 'alert',
        patient: a.patient.nomComplet,
        message: a.message,
        time: a.createdAt.toISOString(),
      })),
      ...recentMessages.map((m) => ({
        id: `msg-${m.id}`,
        type: 'message',
        patient: 'Patient',
        message: m.contenu.slice(0, 80),
        time: m.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    res.json({
      stats: {
        totalPatients,
        activeAlerts,
        highRiskCount: highRiskPatients.length,
        rdvAujourdhui: 0, // no appointment model yet
      },
      highRiskPatients: highRiskPatients.map((p) => ({
        id: p.patient.id,
        nomComplet: p.patient.nomComplet,
        risk: p.patient.riskPredictions[0],
      })),
      recentAlerts,
      recentActivities,
    });
  } catch (err) {
    next(err);
  }
});

// ── Doctor own profile ───────────────────────────────────────────────────────

router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    res.json(doctor);
  } catch (err) { next(err); }
});

router.patch('/profile', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const schema = z.object({
      telephone:     z.string().optional(),
      adresse:       z.string().optional(),
      rppsNumber:    z.string().optional(),
      signatureText: z.string().optional(),
      specialite:    z.string().optional(),
    });
    const data = schema.parse(req.body);
    const updated = await prisma.doctorProfile.update({ where: { id: doctor.id }, data });
    res.json(updated);
  } catch (err) { next(err); }
});

router.get('/patients', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const search = (req.query.search as string) || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where = {
      doctorId: doctor.id,
      patient: search
        ? { nomComplet: { contains: search, mode: 'insensitive' as const } }
        : undefined,
    };

    const [links, total] = await Promise.all([
      prisma.doctorPatient.findMany({
        where,
        include: {
          patient: {
            include: {
              user: { select: { id: true, email: true } },
              alerts: { where: { lu: false } },
              riskPredictions: { orderBy: { createdAt: 'desc' }, take: 1 },
              followUps: { orderBy: { semaine: 'desc' }, take: 1 },
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.doctorPatient.count({ where }),
    ]);

    res.json({
      items: links.map((l) => l.patient),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/patients/:id', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);

    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const patient = await prisma.patientProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true } },
        followUps: { orderBy: { semaine: 'asc' } },
        medications: { where: { actif: true }, include: { reminders: true } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 20 },
        riskPredictions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    const predictor = new ClinicalRiskPredictor();
    const currentRisk = await predictor.calculate(req.params.id);

    res.json({ patient, currentRisk, doctor });
  } catch (err) {
    next(err);
  }
});

router.get('/patients/:id/alerts', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const alerts = await prisma.alert.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

router.get('/patients/:id/risk-predictions', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const predictions = await prisma.riskPrediction.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(predictions);
  } catch (err) {
    next(err);
  }
});

router.put('/patients/:id/stage', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const { stadeRecommande } = z.object({ stadeRecommande: z.string() }).parse(req.body);

    const updated = await prisma.patientProfile.update({
      where: { id: req.params.id },
      data: { stadeRecommande },
    });

    const patient = await prisma.patientProfile.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (patient) {
      await createNotification(
        patient.userId,
        'Stade de rééducation mis à jour',
        `Votre médecin a mis à jour votre stade : ${stadeRecommande}`,
        'stage'
      );
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/alerts', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);

    const patientLinks = await prisma.doctorPatient.findMany({
      where: { doctorId: doctor.id },
      select: { patientId: true },
    });
    const patientIds = patientLinks.map((l) => l.patientId);

    const alerts = await prisma.alert.findMany({
      where: { patientId: { in: patientIds } },
      include: { patient: { select: { id: true, nomComplet: true, age: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);

    const patientLinks = await prisma.doctorPatient.findMany({
      where: { doctorId: doctor.id },
      include: {
        patient: {
          include: {
            riskPredictions: { orderBy: { createdAt: 'desc' }, take: 1 },
            followUps: { orderBy: { semaine: 'asc' } },
          },
        },
      },
    });

    const patients = patientLinks.map((l) => l.patient);

    // Adherence moyenne
    const allFollowUps = patients.flatMap((p) => p.followUps);
    const adherenceMoyenne = allFollowUps.length > 0
      ? Math.round(
          allFollowUps.reduce((sum, f) =>
            sum + (f.medicamentsTotal > 0 ? f.medicamentsPris / f.medicamentsTotal : 1), 0
          ) / allFollowUps.length * 100
        )
      : 0;

    // Risk distribution
    const repartitionRisque = [
      { niveau: 'Faible', count: patients.filter((p) => p.riskPredictions[0]?.niveau === 'LOW').length, color: '#10B981' },
      { niveau: 'Modéré', count: patients.filter((p) => p.riskPredictions[0]?.niveau === 'MODERATE').length, color: '#F59E0B' },
      { niveau: 'Élevé', count: patients.filter((p) => p.riskPredictions[0]?.niveau === 'HIGH').length, color: '#EF4444' },
      { niveau: 'Très élevé', count: patients.filter((p) => p.riskPredictions[0]?.niveau === 'VERY_HIGH').length, color: '#7C3AED' },
    ];

    // Stade distribution
    const stades = ['Stade I', 'Stade II', 'Stade III', 'Stade IV'];
    const stadeRepartition = stades.map((stade) => ({
      stade,
      count: patients.filter((p) => p.stadeRecommande === stade).length,
    }));

    // Risk score moyen
    const scoreMoyen = patients.length > 0
      ? Math.round(patients.reduce((sum, p) => sum + (p.riskPredictions[0]?.score ?? 50), 0) / patients.length)
      : 0;

    // Weekly alerts trend (last 12 weeks)
    const alertsData = await prisma.alert.findMany({
      where: {
        patientId: { in: patients.map((p) => p.id) },
        createdAt: { gte: new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const alertesParSemaine = Array.from({ length: 12 }, (_, i) => {
      const weekStart = new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      return {
        date: weekStart.toISOString(),
        value: alertsData.filter((a) => a.createdAt >= weekStart && a.createdAt < weekEnd).length,
      };
    });

    // Adherence evolution (last 12 weeks)
    const adherenceEvolution = Array.from({ length: 12 }, (_, i) => {
      const weekDate = new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
      const weekFollowUps = allFollowUps.filter((f) => {
        const d = new Date(f.semaine);
        return Math.abs(d.getTime() - weekDate.getTime()) < 4 * 24 * 60 * 60 * 1000;
      });
      const avg = weekFollowUps.length > 0
        ? Math.round(weekFollowUps.reduce((s, f) =>
            s + (f.medicamentsTotal > 0 ? f.medicamentsPris / f.medicamentsTotal : 1), 0
          ) / weekFollowUps.length * 100)
        : null;
      return { date: weekDate.toISOString(), value: avg };
    });

    res.json({
      adherenceMoyenne,
      scoreMoyen,
      alertesParSemaine,
      adherenceEvolution,
      repartitionRisque,
      stadeRepartition,
      tauxReussite: Math.round(adherenceMoyenne * 0.9),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/patients/:id/reports/pdf', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const pdf = await generatePatientReport(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport-patient.pdf');
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.get('/messages', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const contactId = req.query.contactId as string;

    if (contactId) {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { expediteurId: userId, destinataireId: contactId },
            { expediteurId: contactId, destinataireId: userId },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

      await prisma.message.updateMany({
        where: { destinataireId: userId, expediteurId: contactId, lu: false },
        data: { lu: true },
      });

      return res.json(messages);
    }

    const messages = await prisma.message.findMany({
      where: { OR: [{ expediteurId: userId }, { destinataireId: userId }] },
      orderBy: { createdAt: 'desc' },
    });

    res.json(messages);
  } catch (err) {
    next(err);
  }
});

router.post('/messages', async (req: AuthRequest, res, next) => {
  try {
    const { destinataireId, contenu } = z
      .object({ destinataireId: z.string(), contenu: z.string().min(1) })
      .parse(req.body);

    const message = await prisma.message.create({
      data: { expediteurId: req.user!.userId, destinataireId, contenu },
    });

    emitToUser(destinataireId, 'new_message', message);
    await createNotification(destinataireId, 'Nouveau message', contenu.slice(0, 100), 'message');

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

router.get('/notifications', async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { lu: true },
    });
    res.json({ message: 'Notification lue' });
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/read-all', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, lu: false },
      data: { lu: true },
    });
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR NOTES ON FOLLOW-UPS
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/patients/:id/follow-ups/:followUpId/note', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const { note } = z.object({ note: z.string().max(1000) }).parse(req.body);

    const updated = await prisma.weeklyFollowUp.update({
      where: { id: req.params.followUpId },
      data: { doctorNote: note },
    });

    // Notify patient that doctor left a note
    const patient = await prisma.patientProfile.findUnique({ where: { id: req.params.id } });
    if (patient) {
      await createNotification(
        patient.userId,
        'Note de votre médecin',
        `Votre médecin a ajouté un commentaire sur votre suivi du ${new Date(updated.semaine).toLocaleDateString('fr-FR')}.`,
        'note'
      );
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTIONS (doctor prescribes medication to a patient)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/patients/:id/prescriptions', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const schema = z.object({
      nom: z.string().min(1),
      dosage: z.string().min(1),
      frequence: z.string().min(1),
      dateDebut: z.string(),
      dateFin: z.string().optional(),
      instructions: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const medication = await prisma.medication.create({
      data: {
        patientId: req.params.id,
        prescribedById: doctor.id,
        nom: data.nom,
        dosage: data.dosage,
        frequence: data.frequence,
        dateDebut: new Date(data.dateDebut),
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        instructions: data.instructions,
        actif: true,
      },
    });

    const patient = await prisma.patientProfile.findUnique({ where: { id: req.params.id } });
    if (patient) {
      await createNotification(
        patient.userId,
        'Nouvelle ordonnance',
        `Dr. ${doctor.nomComplet} vous a prescrit : ${data.nom} ${data.dosage} — ${data.frequence}.`,
        'prescription'
      );
      emitToUser(patient.userId, 'new_prescription', {
        medication,
        doctorName: doctor.nomComplet,
      });
    }

    res.status(201).json(medication);
  } catch (err) {
    next(err);
  }
});

// ── Validate ordonnance: generate PDF + notify patient ────────────────────────
router.post('/patients/:id/ordonnances', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const doctorWithUser = await prisma.doctorProfile.findUnique({
      where: { id: doctor.id },
      include: { user: { select: { email: true } } },
    });

    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const schema = z.object({
      medications:      z.array(z.object({
        nom:          z.string(),
        dosage:       z.string(),
        frequence:    z.string(),
        dateDebut:    z.string(),
        dateFin:      z.string().optional().nullable(),
        instructions: z.string().optional().nullable(),
      })).min(1),
      signatureDataUrl: z.string().optional(), // base64 PNG
    });

    const { medications, signatureDataUrl } = schema.parse(req.body);

    const patient = await prisma.patientProfile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { email: true } } },
    });
    if (!patient) throw new AppError(404, 'Patient introuvable');

    // Generate PDF
    const fileUrl = await generateOrdonnancePdf(
      { ...doctorWithUser!, user: { email: doctorWithUser?.user.email } },
      patient,
      medications,
      signatureDataUrl
    );

    // Save ordonnance record
    const ordonnance = await prisma.ordonnance.create({
      data: {
        patientId:   req.params.id,
        doctorId:    doctor.id,
        fileUrl,
        medications: medications as any,
      },
    });

    // Notify patient
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const downloadUrl = `${backendUrl}${fileUrl}`;

    await createNotification(
      patient.userId,
      'Ordonnance disponible',
      `Dr. ${doctor.nomComplet} vous a envoyé une ordonnance. Cliquez pour télécharger.`,
      'ordonnance'
    );
    emitToUser(patient.userId, 'new_ordonnance', {
      ordonnanceId: ordonnance.id,
      downloadUrl,
      doctorName:   doctor.nomComplet,
      createdAt:    ordonnance.createdAt,
    });

    res.status(201).json({ ...ordonnance, downloadUrl });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/appointments', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      include: { patient: { select: { id: true, nomComplet: true, age: true } } },
      orderBy: { dateTime: 'asc' },
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

router.post('/appointments', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const schema = z.object({
      patientId: z.string().min(1),
      dateTime: z.string().min(1),
      type: z.enum(['consultation', 'urgence', 'bilan', 'suivi']).default('consultation'),
      motif: z.string().optional(),
      videoLink: z.preprocess(v => (v === '' ? undefined : v), z.string().url().optional()),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: data.patientId },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: data.patientId,
        dateTime: new Date(data.dateTime),
        type: data.type,
        motif: data.motif,
        videoLink: data.videoLink || null,
        notes: data.notes,
        status: 'proposed',
      },
      include: { patient: { select: { id: true, nomComplet: true } } },
    });

    const patient = await prisma.patientProfile.findUnique({ where: { id: data.patientId } });
    if (patient) {
      const dateStr = new Date(data.dateTime).toLocaleString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      await createNotification(
        patient.userId,
        'Nouveau rendez-vous',
        `Dr. ${doctor.nomComplet} vous propose un rendez-vous le ${dateStr}${data.motif ? ` — ${data.motif}` : ''}.`,
        'appointment'
      );
      emitToUser(patient.userId, 'new_appointment', { appointment, doctorName: doctor.nomComplet });
    }

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

router.patch('/appointments/:id', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const schema = z.object({
      dateTime: z.string().optional(),
      type: z.string().optional(),
      motif: z.string().optional(),
      videoLink: z.preprocess(v => (v === '' ? undefined : v), z.string().url().optional()),
      notes: z.string().optional(),
      status: z.enum(['proposed', 'confirmed', 'cancelled']).optional(),
    });

    const data = schema.parse(req.body);
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, doctorId: doctor.id },
    });
    if (!existing) throw new AppError(404, 'Rendez-vous introuvable');

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { ...data, dateTime: data.dateTime ? new Date(data.dateTime) : undefined },
      include: { patient: { select: { id: true, nomComplet: true } } },
    });

    const patient = await prisma.patientProfile.findUnique({ where: { id: existing.patientId } });
    if (patient && data.status === 'cancelled') {
      await createNotification(patient.userId, 'Rendez-vous annulé', `Votre rendez-vous a été annulé par le médecin.`, 'appointment');
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/appointments/:id', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, doctorId: doctor.id },
    });
    if (!existing) throw new AppError(404, 'Rendez-vous introuvable');
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Rendez-vous supprimé' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH GOALS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/patients/:id/goals', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const goals = await prisma.healthGoal.findMany({
      where: { patientId: req.params.id, doctorId: doctor.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

router.post('/patients/:id/goals', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    const link = await prisma.doctorPatient.findFirst({
      where: { doctorId: doctor.id, patientId: req.params.id },
    });
    if (!link) throw new AppError(404, 'Patient introuvable');

    const schema = z.object({
      type: z.enum(['tension_sys', 'ldl', 'poids', 'activite', 'adherence']),
      label: z.string().min(1),
      target: z.number().positive(),
      unit: z.string().min(1),
    });

    const data = schema.parse(req.body);

    // Deactivate old goal of same type
    await prisma.healthGoal.updateMany({
      where: { patientId: req.params.id, doctorId: doctor.id, type: data.type, active: true },
      data: { active: false },
    });

    const goal = await prisma.healthGoal.create({
      data: { ...data, patientId: req.params.id, doctorId: doctor.id },
    });

    const patient = await prisma.patientProfile.findUnique({ where: { id: req.params.id } });
    if (patient) {
      await createNotification(
        patient.userId,
        'Nouvel objectif de santé',
        `Dr. ${doctor.nomComplet} a défini un objectif : ${data.label} → ${data.target} ${data.unit}.`,
        'goal'
      );
    }

    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

router.delete('/patients/:id/goals/:goalId', async (req: AuthRequest, res, next) => {
  try {
    const doctor = await getDoctorProfile(req.user!.userId);
    await prisma.healthGoal.deleteMany({
      where: { id: req.params.goalId, doctorId: doctor.id },
    });
    res.json({ message: 'Objectif supprimé' });
  } catch (err) {
    next(err);
  }
});

export default router;
