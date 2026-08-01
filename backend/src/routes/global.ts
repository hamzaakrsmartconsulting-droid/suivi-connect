import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    // ── Core counts ──────────────────────────────────────────────────────────
    const [
      totalPatients,
      totalMedecins,
      totalFollowUps,
      totalAlerts,
      totalAppointments,
      totalPrescriptions,
      totalGoals,
      allPatients,
      recentPatients,
      recentAlerts,
    ] = await Promise.all([
      prisma.patientProfile.count(),
      prisma.doctorProfile.count(),
      prisma.weeklyFollowUp.count(),
      prisma.alert.count(),
      prisma.appointment.count(),
      prisma.medication.count({ where: { prescribedById: { not: null } } }),
      prisma.healthGoal.count({ where: { active: true } }),
      prisma.patientProfile.findMany({
        include: {
          riskPredictions: { orderBy: { createdAt: 'desc' }, take: 1 },
          followUps: { orderBy: { semaine: 'desc' }, take: 4 },
          doctors: { include: { doctor: true } },
        },
      }),
      prisma.patientProfile.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { doctors: { include: { doctor: true } } },
      }),
      prisma.alert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          patient: {
            include: { doctors: { include: { doctor: true } } },
          },
        },
      }),
    ]);

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const allFollowUps = allPatients.flatMap((p) => p.followUps);
    const adherenceMoyenne = allFollowUps.length > 0
      ? Math.round(
          allFollowUps.reduce((sum, f) =>
            sum + (f.medicamentsTotal > 0 ? f.medicamentsPris / f.medicamentsTotal : 1), 0
          ) / allFollowUps.length * 100
        )
      : 0;

    const allRiskScores = allPatients
      .map((p) => p.riskPredictions[0]?.score)
      .filter((s): s is number => s !== undefined);

    const scoreMoyenCardiaque = allRiskScores.length > 0
      ? Math.round(allRiskScores.reduce((a, b) => a + b, 0) / allRiskScores.length)
      : 50;

    // Patients actifs = have at least 1 follow-up in last 4 weeks
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const patientsActifs = allPatients.filter((p) =>
      p.followUps.some((f) => new Date(f.semaine) >= fourWeeksAgo)
    ).length;

    // Programmes terminés = patients with stade III or IV
    const programmesTermines = allPatients.filter(
      (p) => p.stadeRecommande === 'Stade III' || p.stadeRecommande === 'Stade IV'
    ).length;

    // ── Risk distribution ─────────────────────────────────────────────────────
    const riskCounts = { faible: 0, modere: 0, eleve: 0, critique: 0 };
    for (const p of allPatients) {
      const niveau = p.riskPredictions[0]?.niveau;
      if (niveau === 'LOW') riskCounts.faible++;
      else if (niveau === 'MODERATE') riskCounts.modere++;
      else if (niveau === 'HIGH') riskCounts.eleve++;
      else if (niveau === 'VERY_HIGH') riskCounts.critique++;
    }

    // ── Score distribution (from last risk predictions) ───────────────────────
    const scores = allPatients.map((p) => p.riskPredictions[0]?.score ?? 50);
    const scoreDistribution = [
      { label: '0–25', count: scores.filter((s) => s <= 25).length },
      { label: '26–50', count: scores.filter((s) => s > 25 && s <= 50).length },
      { label: '51–75', count: scores.filter((s) => s > 50 && s <= 75).length },
      { label: '76–100', count: scores.filter((s) => s > 75).length },
    ];

    // ── Evolution temporelle (last 12 weeks) ──────────────────────────────────
    const evolutionPatients = Array.from({ length: 12 }, (_, i) => {
      const weekDate = new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
      return { date: weekDate.toISOString(), value: totalPatients }; // simplified: total is constant
    });

    // Average weekly activity per week
    const allWeeklyFollowUps = await prisma.weeklyFollowUp.findMany({
      where: { semaine: { gte: new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { semaine: 'asc' },
    });

    const activiteHebdo = Array.from({ length: 12 }, (_, i) => {
      const weekStart = new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekFUs = allWeeklyFollowUps.filter(
        (f) => new Date(f.semaine) >= weekStart && new Date(f.semaine) < weekEnd
      );
      const avg = weekFUs.length > 0
        ? Math.round(weekFUs.reduce((s, f) => s + f.activiteMinutes, 0) / weekFUs.length)
        : 0;
      return { date: weekStart.toISOString(), value: avg };
    });

    // ── Recent alerts ─────────────────────────────────────────────────────────
    const alertesRecentes = recentAlerts.map((a) => ({
      id: a.id,
      patient: a.patient.nomComplet,
      medecin: a.patient.doctors[0]?.doctor.nomComplet ?? 'N/A',
      type: a.type,
      severite: a.severite,
      date: a.createdAt.toISOString(),
    }));

    // ── Recent registrations ──────────────────────────────────────────────────
    const inscriptionsRecentes = recentPatients.map((p) => ({
      id: p.id,
      nom: p.nomComplet,
      age: p.age,
      medecin: p.doctors[0]?.doctor.nomComplet ?? 'Non assigné',
      date: p.createdAt.toISOString(),
      stade: p.stadeRecommande,
    }));

    // ── System activity ───────────────────────────────────────────────────────
    const activiteSysteme = [
      { id: 's1', type: 'followup',     message: `${totalFollowUps} suivis hebdomadaires enregistrés au total`,      time: new Date().toISOString() },
      { id: 's2', type: 'alert',        message: `${totalAlerts} alertes générées depuis le début`,                   time: new Date(Date.now() - 864e5).toISOString() },
      { id: 's3', type: 'appointment',  message: `${totalAppointments} rendez-vous planifiés sur la plateforme`,      time: new Date(Date.now() - 2 * 864e5).toISOString() },
      { id: 's4', type: 'prescription', message: `${totalPrescriptions} ordonnances émises par les médecins`,         time: new Date(Date.now() - 3 * 864e5).toISOString() },
      { id: 's5', type: 'goal',         message: `${totalGoals} objectifs de santé actifs définis pour les patients`, time: new Date(Date.now() - 4 * 864e5).toISOString() },
      { id: 's6', type: 'patient',      message: `${totalPatients} patients inscrits — ${totalMedecins} médecins actifs`, time: new Date(Date.now() - 5 * 864e5).toISOString() },
    ];

    res.json({
      kpis: {
        totalPatients,
        patientsActifs,
        totalMedecins,
        consultationsTotal: totalFollowUps,
        adherenceMoyenne,
        scoreMoyenCardiaque,
        alertesGenerees: totalAlerts,
        programmesTermines,
        totalAppointments,
        totalPrescriptions,
        totalGoals,
      },
      evolutionPatients,
      activiteHebdo,
      scoreDistribution,
      repartitionRisque: riskCounts,
      alertesRecentes,
      inscriptionsRecentes,
      activiteSysteme,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
