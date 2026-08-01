import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { processFollowUpAnalysis, ClinicalRiskPredictor } from '../services/riskEngine.js';
import { createNotification, notifyPatientDoctors } from '../services/notifications.js';
import { generatePatientReport } from '../services/pdf.js';
import { emitToUser } from '../services/socket.js';

const router = Router();

router.use(authenticate, authorize('PATIENT'));

async function getPatientProfile(userId: string) {
  const profile = await prisma.patientProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, 'Profil patient introuvable');
  return profile;
}

router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const followUps = await prisma.weeklyFollowUp.findMany({
      where: { patientId: profile.id },
      orderBy: { semaine: 'asc' },
      take: 12,
    });

    const medications = await prisma.medication.findMany({
      where: { patientId: profile.id, actif: true },
      include: { reminders: true },
    });

    const latest = followUps[followUps.length - 1];
    const predictor = new ClinicalRiskPredictor();
    const risk = await predictor.calculate(profile.id);

    const adherence = latest && latest.medicamentsTotal > 0
      ? Math.round((latest.medicamentsPris / latest.medicamentsTotal) * 100)
      : 100;

    const cardiacScore = Math.max(0, 100 - risk.score);

    // Medications to take today (based on active reminders)
    const now = new Date();
    const medicationsToday = medications.flatMap((med) =>
      med.reminders
        .filter((r) => r.actif)
        .map((r) => ({
          nom: `${med.nom} ${med.dosage}`,
          heure: r.heure,
          pris: now.getHours() > parseInt(r.heure.split(':')[0]),
          icon: 'pill',
        }))
    ).sort((a, b) => a.heure.localeCompare(b.heure));

    // Exercise progression for this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const thisWeekMinutes = latest?.activiteMinutes ?? 0;
    const streakJours = followUps.filter((f) => f.activiteMinutes >= 30).length;

    const progressionExercice = {
      objectifMinutes: 150,
      minutesCetteSemaine: thisWeekMinutes,
      seancesThisSemaine: Math.ceil(thisWeekMinutes / 30),
      streakJours,
    };

    // Static recommendations (no DB model for these)
    const recommandations = [
      { id: 'r1', texte: 'Maintenir 30 minutes de marche quotidienne', date: new Date(Date.now() - 5 * 864e5).toISOString(), urgence: false },
      { id: 'r2', texte: 'Réduire la consommation de sel (< 6g/jour)', date: new Date(Date.now() - 5 * 864e5).toISOString(), urgence: false },
      ...(risk.score > 40
        ? [{ id: 'r3', texte: 'Contrôle LDL recommandé dans 4 semaines', date: new Date(Date.now() - 3 * 864e5).toISOString(), urgence: true }]
        : []
      ),
    ];

    res.json({
      summary: {
        poids: latest?.poids ?? null,
        tension: latest ? `${latest.tensionSys}/${latest.tensionDia}` : null,
        ldl: latest?.ldl ?? null,
        activiteMinutes: latest?.activiteMinutes ?? 0,
        adherence,
        cardiacScore,
        stadeRecommande: profile.stadeRecommande,
      },
      charts: {
        poids: followUps.map((f) => ({ date: f.semaine, value: f.poids })),
        tension: followUps.map((f) => ({ date: f.semaine, sys: f.tensionSys, dia: f.tensionDia })),
        ldl: followUps.map((f) => ({ date: f.semaine, value: f.ldl })),
        activite: followUps.map((f) => ({ date: f.semaine, value: f.activiteMinutes })),
      },
      medications: medications.length,
      medicationsToday,
      prochainsRdv: [],
      recommandations,
      progressionExercice,
      risk,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/profile', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      nomComplet: z.string().min(2).optional(),
      age: z.number().int().min(18).max(120).optional(),
      taille: z.number().positive().optional(),
      profession: z.string().optional(),
      dateProcedure: z.string().optional(),
      sejourReeducation: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const profile = await getPatientProfile(req.user!.userId);

    const updated = await prisma.patientProfile.update({
      where: { id: profile.id },
      data: {
        ...data,
        dateProcedure: data.dateProcedure ? new Date(data.dateProcedure) : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/follow-ups', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.weeklyFollowUp.findMany({
        where: { patientId: profile.id },
        orderBy: { semaine: 'desc' },
        skip,
        take: limit,
      }),
      prisma.weeklyFollowUp.count({ where: { patientId: profile.id } }),
    ]);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/follow-ups', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      semaine: z.string(),
      poids: z.number().positive(),
      tensionSys: z.number().int().min(60).max(250),
      tensionDia: z.number().int().min(40).max(150),
      tabac: z.boolean(),
      diabete: z.boolean(),
      ldl: z.number().positive(),
      medicamentsPris: z.number().int().min(0),
      medicamentsTotal: z.number().int().min(0),
      activiteMinutes: z.number().int().min(0),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const profile = await getPatientProfile(req.user!.userId);

    const followUp = await prisma.weeklyFollowUp.create({
      data: {
        patientId: profile.id,
        semaine: new Date(data.semaine),
        poids: data.poids,
        tensionSys: data.tensionSys,
        tensionDia: data.tensionDia,
        tabac: data.tabac,
        diabete: data.diabete,
        ldl: data.ldl,
        medicamentsPris: data.medicamentsPris,
        medicamentsTotal: data.medicamentsTotal,
        activiteMinutes: data.activiteMinutes,
        notes: data.notes,
      },
    });

    const analysis = await processFollowUpAnalysis(profile.id, followUp.id);

    // Always notify the doctor(s) of the new follow-up submission
    const doctorLinks = await prisma.doctorPatient.findMany({
      where: { patientId: profile.id },
      include: { doctor: { include: { user: true } } },
    });

    for (const link of doctorLinks) {
      const alertSummary = analysis.alerts.length > 0
        ? ` — ${analysis.alerts.length} alerte(s) détectée(s) : ${analysis.alerts[0].message}`
        : ' — aucune anomalie détectée.';

      await createNotification(
        link.doctor.userId,
        'Nouveau suivi patient',
        `${profile.nomComplet} a soumis son suivi hebdomadaire${alertSummary}`,
        analysis.alerts.length > 0 ? 'alert' : 'followup'
      );

      // Real-time push so the doctor's dashboard updates without refresh
      emitToUser(link.doctor.userId, 'new_followup', {
        patientId: profile.id,
        patientName: profile.nomComplet,
        followUpId: followUp.id,
        alertCount: analysis.alerts.length,
        riskScore: analysis.risk.score,
        riskLevel: analysis.risk.niveau,
      });
    }

    // Confirm to the patient
    await createNotification(
      req.user!.userId,
      'Suivi enregistré',
      'Votre suivi hebdomadaire a été enregistré avec succès',
      'followup'
    );

    res.status(201).json({ followUp, analysis });
  } catch (err) {
    next(err);
  }
});

router.get('/medications', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const medications = await prisma.medication.findMany({
      where: { patientId: profile.id },
      include: { reminders: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(medications);
  } catch (err) {
    next(err);
  }
});

router.post('/medications', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      nom: z.string().min(1),
      dosage: z.string().min(1),
      frequence: z.string().min(1),
      dateDebut: z.string(),
      dateFin: z.string().optional(),
      actif: z.boolean().default(true),
    });

    const data = schema.parse(req.body);
    const profile = await getPatientProfile(req.user!.userId);

    const medication = await prisma.medication.create({
      data: {
        patientId: profile.id,
        nom: data.nom,
        dosage: data.dosage,
        frequence: data.frequence,
        dateDebut: new Date(data.dateDebut),
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        actif: data.actif,
      },
    });

    res.status(201).json(medication);
  } catch (err) {
    next(err);
  }
});

router.put('/medications/:id', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const schema = z.object({
      nom: z.string().min(1).optional(),
      dosage: z.string().min(1).optional(),
      frequence: z.string().min(1).optional(),
      dateDebut: z.string().optional(),
      dateFin: z.string().nullable().optional(),
      actif: z.boolean().optional(),
    });

    const data = schema.parse(req.body);
    const existing = await prisma.medication.findFirst({
      where: { id: req.params.id, patientId: profile.id },
    });
    if (!existing) throw new AppError(404, 'Médicament introuvable');

    const updated = await prisma.medication.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
        dateFin: data.dateFin === null ? null : data.dateFin ? new Date(data.dateFin) : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/medications/:id', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const existing = await prisma.medication.findFirst({
      where: { id: req.params.id, patientId: profile.id },
    });
    if (!existing) throw new AppError(404, 'Médicament introuvable');

    await prisma.medication.delete({ where: { id: req.params.id } });
    res.json({ message: 'Médicament supprimé' });
  } catch (err) {
    next(err);
  }
});

router.post('/medication-reminders', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      medicationId: z.string(),
      heure: z.string(),
      joursSemaine: z.string(),
      actif: z.boolean().default(true),
    });

    const data = schema.parse(req.body);
    const profile = await getPatientProfile(req.user!.userId);

    const med = await prisma.medication.findFirst({
      where: { id: data.medicationId, patientId: profile.id },
    });
    if (!med) throw new AppError(404, 'Médicament introuvable');

    const reminder = await prisma.medicationReminder.create({ data });
    res.status(201).json(reminder);
  } catch (err) {
    next(err);
  }
});

router.delete('/medication-reminders/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.medicationReminder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Rappel supprimé' });
  } catch (err) {
    next(err);
  }
});

router.get('/risk-score', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const predictor = new ClinicalRiskPredictor();
    const risk = await predictor.calculate(profile.id);
    res.json(risk);
  } catch (err) {
    next(err);
  }
});

router.get('/alerts', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const alerts = await prisma.alert.findMany({
      where: { patientId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

router.patch('/alerts/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const alert = await prisma.alert.updateMany({
      where: { id: req.params.id, patientId: profile.id },
      data: { lu: true },
    });
    if (alert.count === 0) throw new AppError(404, 'Alerte introuvable');
    res.json({ message: 'Alerte marquée comme lue' });
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

router.get('/reports', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);

    const followUps = await prisma.weeklyFollowUp.findMany({
      where: { patientId: profile.id },
      orderBy: { semaine: 'desc' },
    });

    // Generate one virtual report per month that has follow-up data
    const monthsSeen = new Set<string>();
    const rapports: { id: string; titre: string; date: string; type: string; pages: number }[] = [];

    for (const fu of followUps) {
      const d = new Date(fu.semaine);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthsSeen.has(key)) {
        monthsSeen.add(key);
        const monthName = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        rapports.push({
          id: `report-${key}`,
          titre: `Rapport mensuel — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`,
          date: fu.semaine.toISOString(),
          type: rapports.length === 0 ? 'Mensuel récent' : 'Mensuel',
          pages: 4,
        });
      }
    }

    // Quarterly bilan
    if (followUps.length >= 12) {
      rapports.push({
        id: 'report-bilan-3m',
        titre: 'Rapport bilan — 3 mois',
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'Bilan trimestriel',
        pages: 8,
      });
    }

    const recommandations = [
      { id: 'reco1', auteur: 'Dr. Martin Dubois', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), texte: 'Maintenir 30 min de marche quotidienne et augmenter progressivement à 45 min.', priorite: 'normal' },
      { id: 'reco2', auteur: 'Dr. Martin Dubois', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), texte: 'Contrôle LDL recommandé dans 4 semaines — objectif < 1.3 g/L.', priorite: 'urgent' },
      { id: 'reco3', auteur: 'Dr. Martin Dubois', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), texte: 'Régime méditerranéen recommandé. Réduire sel (<6g/jour) et graisses saturées.', priorite: 'normal' },
    ];

    res.json({ rapports, recommandations });
  } catch (err) {
    next(err);
  }
});

router.get('/reports/pdf', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const pdf = await generatePatientReport(profile.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport-suivi.pdf');
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS (patient view)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/appointments', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const appointments = await prisma.appointment.findMany({
      where: { patientId: profile.id },
      include: { doctor: { select: { id: true, nomComplet: true, specialite: true } } },
      orderBy: { dateTime: 'asc' },
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

router.patch('/appointments/:id/confirm', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, patientId: profile.id },
      include: { doctor: true },
    });
    if (!existing) throw new AppError(404, 'Rendez-vous introuvable');

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'confirmed' },
    });

    await createNotification(
      existing.doctor.userId,
      'Rendez-vous confirmé',
      `${profile.nomComplet} a confirmé le rendez-vous du ${new Date(existing.dateTime).toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}.`,
      'appointment'
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/appointments/:id/cancel', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, patientId: profile.id },
      include: { doctor: true },
    });
    if (!existing) throw new AppError(404, 'Rendez-vous introuvable');

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    await createNotification(
      existing.doctor.userId,
      'Rendez-vous annulé',
      `${profile.nomComplet} a annulé le rendez-vous du ${new Date(existing.dateTime).toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}.`,
      'appointment'
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH GOALS (patient view)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/goals', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const goals = await prisma.healthGoal.findMany({
      where: { patientId: profile.id, active: true },
      include: { doctor: { select: { nomComplet: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Attach current value from latest follow-up
    const latest = await prisma.weeklyFollowUp.findFirst({
      where: { patientId: profile.id },
      orderBy: { semaine: 'desc' },
    });

    const goalsWithProgress = goals.map(g => {
      let current: number | null = null;
      if (latest) {
        if (g.type === 'tension_sys') current = latest.tensionSys;
        else if (g.type === 'ldl') current = latest.ldl;
        else if (g.type === 'poids') current = latest.poids;
        else if (g.type === 'activite') current = latest.activiteMinutes;
        else if (g.type === 'adherence') {
          current = latest.medicamentsTotal > 0
            ? Math.round((latest.medicamentsPris / latest.medicamentsTotal) * 100)
            : 100;
        }
      }
      return { ...g, current };
    });

    res.json(goalsWithProgress);
  } catch (err) {
    next(err);
  }
});

router.get('/doctor-contact', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getPatientProfile(req.user!.userId);
    const link = await prisma.doctorPatient.findFirst({
      where: { patientId: profile.id },
      include: { doctor: { include: { user: { select: { id: true, email: true } } } } },
    });
    res.json(link?.doctor || null);
  } catch (err) {
    next(err);
  }
});

// ── Ordonnances received ──────────────────────────────────────────────────────
router.get('/ordonnances', async (req: AuthRequest, res, next) => {
  try {
    const patient = await getPatientProfile(req.user!.userId);
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

    const ordonnances = await prisma.ordonnance.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { select: { nomComplet: true, specialite: true } } },
    });

    const result = ordonnances.map(o => ({
      ...o,
      downloadUrl: `${backendUrl}${o.fileUrl}`,
    }));

    res.json(result);
  } catch (err) { next(err); }
});

export default router;
