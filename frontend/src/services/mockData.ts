function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function weeksAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  return d.toISOString()
}

const chartWeeks = Array.from({ length: 12 }, (_, i) => 11 - i)

// ─── Patient dashboard ────────────────────────────────────────────────────────
export const mockPatientDashboard = {
  summary: {
    poids: 78.2,
    tension: '128/82',
    ldl: 1.24,
    activiteMinutes: 165,
    adherence: 92,
    cardiacScore: 78,
    stadeRecommande: 'Stade III',
  },
  charts: {
    poids: chartWeeks.map((w) => ({ date: weeksAgo(w), value: +(82 - w * 0.35).toFixed(1) })),
    tension: chartWeeks.map((w) => ({ date: weeksAgo(w), sys: Math.round(145 - w * 1.5), dia: Math.round(90 - w * 0.8) })),
    ldl: chartWeeks.map((w) => ({ date: weeksAgo(w), value: +(1.8 - w * 0.05).toFixed(2) })),
    activite: chartWeeks.map((w) => ({ date: weeksAgo(w), value: 60 + w * 10 })),
  },
  medications: 3,
  risk: {
    score: 22,
    niveau: 'LOW',
    facteurs: ['Bonne adhésion médicamenteuse'],
    stadeRecommande: 'Stade III',
  },
  // Extended fields
  medicationsToday: [
    { nom: 'Bisoprolol 5mg', heure: '08:00', pris: true, icon: 'mdi-pill' },
    { nom: 'Atorvastatine 20mg', heure: '08:00', pris: true, icon: 'mdi-pill' },
    { nom: 'Aspirine 75mg', heure: '12:00', pris: false, icon: 'mdi-pill' },
  ],
  prochainsRdv: [
    { titre: 'Consultation cardiologie', date: daysAgo(-7), medecin: 'Dr. Martin Dubois', type: 'Consultation' },
    { titre: 'ECG de contrôle', date: daysAgo(-21), medecin: 'Dr. Martin Dubois', type: 'Examen' },
  ],
  recommandations: [
    { id: 'r1', texte: 'Maintenir 30 min de marche quotidienne', date: daysAgo(5), urgence: false },
    { id: 'r2', texte: 'Réduire la consommation de sel (<6g/jour)', date: daysAgo(5), urgence: false },
    { id: 'r3', texte: 'Contrôle LDL dans 4 semaines', date: daysAgo(3), urgence: true },
  ],
  progressionExercice: {
    objectifMinutes: 150,
    minutesCetteSemaine: 165,
    seancesThisSemaine: 5,
    streakJours: 12,
  },
}

// ─── Doctor dashboard ─────────────────────────────────────────────────────────
export const mockDoctorDashboard = {
  stats: { totalPatients: 3, activeAlerts: 2, highRiskCount: 1, rdvAujourdhui: 2 },
  highRiskPatients: [
    { id: 'demo-p3', nomComplet: 'Pierre Leroy', risk: { niveau: 'HIGH', score: 58 }, age: 71 },
  ],
  recentAlerts: [
    {
      id: 'a1',
      message: 'Tension artérielle élevée : 148/94 mmHg',
      severite: 'HIGH',
      type: 'BLOOD_PRESSURE',
      createdAt: new Date().toISOString(),
      patient: { nomComplet: 'Pierre Leroy', id: 'demo-p3' },
    },
    {
      id: 'a2',
      message: 'Adhésion médicamenteuse faible : 65%',
      severite: 'MEDIUM',
      type: 'MEDICATION',
      createdAt: daysAgo(1),
      patient: { nomComplet: 'Marie Bernard', id: 'demo-p2' },
    },
  ],
  recentActivities: [
    { id: 'act1', type: 'followup', patient: 'Jean Dupont', message: 'Nouveau suivi hebdomadaire enregistré', time: daysAgo(0) },
    { id: 'act2', type: 'alert', patient: 'Pierre Leroy', message: 'Alerte tension artérielle générée', time: daysAgo(0) },
    { id: 'act3', type: 'message', patient: 'Marie Bernard', message: 'Nouveau message envoyé', time: daysAgo(1) },
    { id: 'act4', type: 'followup', patient: 'Pierre Leroy', message: 'Suivi semaine 12 enregistré', time: daysAgo(2) },
  ],
}

// ─── Doctor alerts (full list) ────────────────────────────────────────────────
export const mockDoctorAlerts = [
  { id: 'a1', type: 'BLOOD_PRESSURE', severite: 'HIGH', message: 'Tension artérielle élevée : 148/94 mmHg', lu: false, createdAt: daysAgo(0), patient: { id: 'demo-p3', nomComplet: 'Pierre Leroy', age: 71 } },
  { id: 'a2', type: 'MEDICATION', severite: 'MEDIUM', message: 'Adhésion médicamenteuse faible : 65%', lu: false, createdAt: daysAgo(1), patient: { id: 'demo-p2', nomComplet: 'Marie Bernard', age: 58 } },
  { id: 'a3', type: 'LDL', severite: 'MEDIUM', message: 'LDL au-dessus de l\'objectif : 1.72 g/L', lu: true, createdAt: daysAgo(3), patient: { id: 'demo-p3', nomComplet: 'Pierre Leroy', age: 71 } },
  { id: 'a4', type: 'ACTIVITY', severite: 'LOW', message: 'Activité physique insuffisante : 45 min cette semaine', lu: true, createdAt: daysAgo(5), patient: { id: 'demo-p2', nomComplet: 'Marie Bernard', age: 58 } },
  { id: 'a5', type: 'BLOOD_PRESSURE', severite: 'CRITICAL', message: 'Hypertension sévère détectée : 168/102 mmHg', lu: true, createdAt: daysAgo(7), patient: { id: 'demo-p3', nomComplet: 'Pierre Leroy', age: 71 } },
  { id: 'a6', type: 'WEIGHT', severite: 'LOW', message: 'Prise de poids significative : +2.4 kg', lu: true, createdAt: daysAgo(10), patient: { id: 'demo-p1', nomComplet: 'Jean Dupont', age: 62 } },
]

// ─── Doctor analytics ─────────────────────────────────────────────────────────
export const mockDoctorAnalytics = {
  adherenceMoyenne: 82,
  scoreMoyen: 71,
  alertesParSemaine: chartWeeks.map((w) => ({ date: weeksAgo(w), value: Math.floor(Math.random() * 4) + 1 })),
  adherenceEvolution: chartWeeks.map((w) => ({ date: weeksAgo(w), value: Math.round(65 + w * 1.5) })),
  repartitionRisque: [
    { niveau: 'Faible', count: 1, color: '#10B981' },
    { niveau: 'Modéré', count: 1, color: '#F59E0B' },
    { niveau: 'Élevé', count: 1, color: '#EF4444' },
  ],
  stadeRepartition: [
    { stade: 'Stade I', count: 0 },
    { stade: 'Stade II', count: 2 },
    { stade: 'Stade III', count: 1 },
    { stade: 'Stade IV', count: 0 },
  ],
  tauxReussite: 78,
}

// ─── Global overview dashboard ────────────────────────────────────────────────
export const mockGlobalDashboard = {
  kpis: {
    totalPatients: 124,
    patientsActifs: 98,
    totalMedecins: 12,
    consultationsTotal: 1847,
    adherenceMoyenne: 84,
    scoreMoyenCardiaque: 72,
    alertesGenerees: 213,
    programmesTermines: 67,
  },
  evolutionPatients: chartWeeks.map((w) => ({ date: weeksAgo(w), value: 80 + w * 4 })),
  activiteHebdo: chartWeeks.map((w) => ({ date: weeksAgo(w), value: Math.round(120 + w * 8 + (w % 2) * 10) })),
  scoreDistribution: [
    { label: '0–25', count: 8 },
    { label: '26–50', count: 22 },
    { label: '51–75', count: 54 },
    { label: '76–100', count: 40 },
  ],
  repartitionRisque: {
    faible: 52,
    modere: 36,
    eleve: 24,
    critique: 12,
  },
  alertesRecentes: [
    { id: 'ga1', patient: 'Pierre Leroy', medecin: 'Dr. Martin', type: 'Tension élevée', severite: 'HIGH', date: daysAgo(0) },
    { id: 'ga2', patient: 'Marie Bernard', medecin: 'Dr. Martin', type: 'Adhésion faible', severite: 'MEDIUM', date: daysAgo(1) },
    { id: 'ga3', patient: 'Lucie Moreau', medecin: 'Dr. Petit', type: 'LDL élevé', severite: 'MEDIUM', date: daysAgo(2) },
    { id: 'ga4', patient: 'Ahmed Benlali', medecin: 'Dr. Lefèvre', type: 'Activité insuffisante', severite: 'LOW', date: daysAgo(3) },
    { id: 'ga5', patient: 'Nadia Rousseau', medecin: 'Dr. Martin', type: 'Poids en hausse', severite: 'LOW', date: daysAgo(4) },
  ],
  inscriptionsRecentes: [
    { id: 'p1', nom: 'François Garnier', age: 67, medecin: 'Dr. Petit', date: daysAgo(2), stade: 'Stade I' },
    { id: 'p2', nom: 'Isabelle Chevalier', age: 54, medecin: 'Dr. Martin', date: daysAgo(5), stade: 'Stade II' },
    { id: 'p3', nom: 'Marc Girard', age: 72, medecin: 'Dr. Lefèvre', date: daysAgo(8), stade: 'Stade I' },
    { id: 'p4', nom: 'Sophie Lambert', age: 61, medecin: 'Dr. Martin', date: daysAgo(12), stade: 'Stade III' },
  ],
  activiteSysteme: [
    { id: 's1', type: 'patient', message: 'Nouvel patient inscrit : François Garnier', time: daysAgo(2) },
    { id: 's2', type: 'alert', message: '5 nouvelles alertes générées', time: daysAgo(1) },
    { id: 's3', type: 'rapport', message: '8 rapports PDF téléchargés', time: daysAgo(1) },
    { id: 's4', type: 'followup', message: '14 suivis hebdomadaires enregistrés', time: daysAgo(3) },
    { id: 's5', type: 'message', message: '23 messages échangés', time: daysAgo(4) },
    { id: 's6', type: 'patient', message: 'Mise à jour stade rééducation : 3 patients', time: daysAgo(5) },
  ],
}

// ─── Patient reports mock ─────────────────────────────────────────────────────
export const mockPatientReports = {
  rapports: [
    { id: 'r1', titre: 'Rapport mensuel — Juin 2026', date: daysAgo(1), type: 'Mensuel', pages: 4 },
    { id: 'r2', titre: 'Rapport mensuel — Mai 2026', date: daysAgo(32), type: 'Mensuel', pages: 4 },
    { id: 'r3', titre: 'Rapport bilan — 3 mois', date: daysAgo(45), type: 'Bilan', pages: 8 },
    { id: 'r4', titre: 'Rapport mensuel — Avril 2026', date: daysAgo(62), type: 'Mensuel', pages: 4 },
  ],
  recommandations: [
    { id: 'reco1', auteur: 'Dr. Martin Dubois', date: daysAgo(3), texte: 'Augmenter progressivement la durée des marches à 45 min/jour.', priorite: 'normal' },
    { id: 'reco2', auteur: 'Dr. Martin Dubois', date: daysAgo(3), texte: 'Contrôle LDL dans 4 semaines — objectif < 1.3 g/L.', priorite: 'urgent' },
    { id: 'reco3', auteur: 'Dr. Martin Dubois', date: daysAgo(10), texte: 'Régime méditerranéen recommandé. Éviter charcuteries et fritures.', priorite: 'normal' },
    { id: 'reco4', auteur: 'Dr. Martin Dubois', date: daysAgo(20), texte: 'Prise de poids autorisée jusqu\'à 1 kg/semaine. Au-delà, contact immédiat.', priorite: 'normal' },
  ],
}

// ─── Notifications ────────────────────────────────────────────────────────────
export const mockNotifications = [
  { id: 'n1', titre: 'Rappel médicament', message: 'Bisoprolol 5mg à prendre ce soir', type: 'medication', lu: false, createdAt: new Date().toISOString() },
  { id: 'n2', titre: 'Suivi enregistré', message: 'Votre suivi hebdomadaire a été enregistré avec succès', type: 'followup', lu: false, createdAt: daysAgo(0) },
  { id: 'n3', titre: 'Nouvelle recommandation', message: 'Dr. Martin a envoyé une recommandation', type: 'recommendation', lu: true, createdAt: daysAgo(3) },
]

// ─── Static mocks ─────────────────────────────────────────────────────────────
export const mockPatientProfile = {
  id: 'demo-p1', nomComplet: 'Jean Dupont', age: 62, taille: 175,
  profession: 'Ingénieur retraité', dateProcedure: '2025-12-15',
  sejourReeducation: '2 semaines', stadeRecommande: 'Stade III',
}

export const mockDoctorPatients = {
  items: [
    {
      id: 'demo-p1', nomComplet: 'Jean Dupont', age: 62, stadeRecommande: 'Stade III',
      alerts: [], riskPredictions: [{ niveau: 'LOW', score: 22 }],
      user: { id: 'demo-u1', email: 'jean.dupont@suivi.fr' },
      followUps: [{ poids: 78.2, tensionSys: 128 }],
    },
    {
      id: 'demo-p2', nomComplet: 'Marie Bernard', age: 58, stadeRecommande: 'Stade II',
      alerts: [{ id: 'a2' }], riskPredictions: [{ niveau: 'MODERATE', score: 35 }],
      user: { id: 'demo-u2', email: 'marie.bernard@suivi.fr' },
      followUps: [{ poids: 64.5, tensionSys: 134 }],
    },
    {
      id: 'demo-p3', nomComplet: 'Pierre Leroy', age: 71, stadeRecommande: 'Stade II',
      alerts: [{ id: 'a1' }], riskPredictions: [{ niveau: 'HIGH', score: 58 }],
      user: { id: 'demo-u3', email: 'pierre.leroy@suivi.fr' },
      followUps: [{ poids: 88.0, tensionSys: 148 }],
    },
  ],
  total: 3, page: 1, totalPages: 1,
}

// ─── Patient detail helper ────────────────────────────────────────────────────
function mockPatientDetail(id: string, nom: string, age: number, taille: number, profession: string, riskScore: number, niveau: string, stade: string) {
  const weeks = Array.from({ length: 8 }, (_, i) => 7 - i)
  return {
    patient: {
      id,
      nomComplet: nom,
      age,
      taille,
      profession,
      dateProcedure: '2025-12-15T00:00:00.000Z',
      sejourReeducation: '2 semaines',
      stadeRecommande: stade,
      user: { email: `${nom.toLowerCase().replace(' ', '.')  }@suivi.fr` },
      followUps: weeks.map((w) => ({
        semaine: weeksAgo(w),
        poids: +(78 + (w - 4) * 0.3).toFixed(1),
        tensionSys: Math.round(128 + (w - 4) * 2),
        tensionDia: Math.round(82 + (w - 4) * 1),
        ldl: +(1.3 - w * 0.02).toFixed(2),
        activiteMinutes: 100 + w * 12,
      })),
      medications: [
        { nom: 'Bisoprolol', dosage: '5mg', frequence: '1x/jour' },
        { nom: 'Atorvastatine', dosage: '20mg', frequence: '1x/jour' },
        { nom: 'Aspirine', dosage: '75mg', frequence: '1x/jour' },
      ],
      alerts: [
        { id: 'pa1', type: 'BLOOD_PRESSURE', severite: 'MEDIUM', message: 'Tension à surveiller : 138/88 mmHg', lu: false, createdAt: daysAgo(2) },
        { id: 'pa2', type: 'ACTIVITY', severite: 'LOW', message: 'Activité physique en dessous de l\'objectif', lu: true, createdAt: daysAgo(7) },
      ],
    },
    currentRisk: {
      score: riskScore,
      niveau,
      facteurs: niveau === 'HIGH'
        ? ['Hypertension non contrôlée', 'LDL élevé', 'Sédentarité']
        : niveau === 'MODERATE'
        ? ['LDL légèrement élevé', 'Adhésion partielle']
        : ['Bonne adhésion médicamenteuse', 'Activité physique régulière'],
      stadeRecommande: stade,
    },
  }
}

// ─── In-memory state for demo writes ─────────────────────────────────────────
let demoMedications = [
  { id: 'm1', nom: 'Bisoprolol', dosage: '5mg', frequence: '1x/jour', dateDebut: '2025-12-15', actif: true, reminders: [] },
  { id: 'm2', nom: 'Atorvastatine', dosage: '20mg', frequence: '1x/jour', dateDebut: '2025-12-15', actif: true, reminders: [] },
  { id: 'm3', nom: 'Aspirine', dosage: '75mg', frequence: '1x/jour', dateDebut: '2025-12-15', actif: true, reminders: [] },
]

let demoFollowUps: unknown[] = []

let demoPatientAlerts = [
  { id: 'pa1', type: 'BLOOD_PRESSURE', severite: 'MEDIUM', message: 'Tension à surveiller : 138/88 mmHg', lu: false, createdAt: daysAgo(2) },
  { id: 'pa2', type: 'ACTIVITY', severite: 'LOW', message: 'Activité physique en dessous de l\'objectif cette semaine', lu: true, createdAt: daysAgo(7) },
]

let demoDoctorAlerts = [
  { id: 'a1', type: 'BLOOD_PRESSURE', severite: 'HIGH', message: 'Tension artérielle élevée : 148/94 mmHg', lu: false, createdAt: daysAgo(0), patient: { id: 'demo-p3', nomComplet: 'Pierre Leroy', age: 71 } },
  { id: 'a2', type: 'MEDICATION', severite: 'MEDIUM', message: 'Adhésion médicamenteuse faible : 65%', lu: false, createdAt: daysAgo(1), patient: { id: 'demo-p2', nomComplet: 'Marie Bernard', age: 58 } },
  { id: 'a3', type: 'LDL', severite: 'MEDIUM', message: 'LDL au-dessus de l\'objectif : 1.72 g/L', lu: true, createdAt: daysAgo(3), patient: { id: 'demo-p3', nomComplet: 'Pierre Leroy', age: 71 } },
  { id: 'a4', type: 'ACTIVITY', severite: 'LOW', message: 'Activité physique insuffisante : 45 min cette semaine', lu: true, createdAt: daysAgo(5), patient: { id: 'demo-p2', nomComplet: 'Marie Bernard', age: 58 } },
  { id: 'a5', type: 'BLOOD_PRESSURE', severite: 'CRITICAL', message: 'Hypertension sévère détectée : 168/102 mmHg', lu: true, createdAt: daysAgo(7), patient: { id: 'demo-p3', nomComplet: 'Pierre Leroy', age: 71 } },
  { id: 'a6', type: 'WEIGHT', severite: 'LOW', message: 'Prise de poids significative : +2.4 kg', lu: true, createdAt: daysAgo(10), patient: { id: 'demo-p1', nomComplet: 'Jean Dupont', age: 62 } },
]

let demoMessages = [
  { id: 'msg1', expediteurId: 'demo-doc', contenu: 'Bonjour, comment vous sentez-vous cette semaine ?', createdAt: daysAgo(2), lu: true },
  { id: 'msg2', expediteurId: 'demo-user', contenu: 'Beaucoup mieux, la tension est plus stable.', createdAt: daysAgo(2), lu: true },
  { id: 'msg3', expediteurId: 'demo-doc', contenu: 'Parfait. Continuez les marches quotidiennes.', createdAt: daysAgo(1), lu: true },
]

let demoMsgCounter = 10

function uuid() {
  return 'demo-' + Math.random().toString(36).slice(2, 10)
}

// ─── Mock API router ──────────────────────────────────────────────────────────
export function getMockResponse(url: string, method: string, body?: unknown): unknown {
  const path = url.replace(/^\/api/, '')
  const m = method?.toLowerCase()
  const b = body as Record<string, unknown> | undefined

  // ── GET endpoints ──────────────────────────────────────────────────────────
  if (m === 'get' && path === '/patient/dashboard') return mockPatientDashboard
  if (m === 'get' && path === '/doctor/dashboard') return mockDoctorDashboard
  if (m === 'get' && path === '/global/dashboard') return mockGlobalDashboard
  if (m === 'get' && path === '/doctor/analytics') return mockDoctorAnalytics
  if (m === 'get' && path === '/patient/reports') return { ...mockPatientReports }
  if (m === 'get' && (path === '/patient/notifications' || path === '/doctor/notifications')) return [...mockNotifications]

  if (m === 'patch' && (path.startsWith('/patient/notifications/') || path.startsWith('/doctor/notifications/')) && path.endsWith('/read')) {
    const id = path.split('/')[3]
    const n = mockNotifications.find(n => n.id === id)
    if (n) n.lu = true
    return { ok: true }
  }
  if (m === 'get' && path === '/patient/profile') return mockPatientProfile

  if ((m === 'put' || m === 'patch') && path === '/patient/profile') {
    Object.assign(mockPatientProfile, b)
    return { ...mockPatientProfile }
  }

  if (m === 'get' && path === '/patient/doctor-contact') return { nomComplet: 'Dr. Martin Dubois', user: { id: 'demo-doc' } }

  // ── Medications ────────────────────────────────────────────────────────────
  if (m === 'get' && path === '/patient/medications') return [...demoMedications]

  if (m === 'post' && path === '/patient/medications') {
    const newMed = { id: uuid(), actif: true, reminders: [], ...b }
    demoMedications.push(newMed as typeof demoMedications[0])
    return newMed
  }

  if (m === 'put' && path.startsWith('/patient/medications/')) {
    const id = path.split('/').pop()
    demoMedications = demoMedications.map(med =>
      med.id === id ? { ...med, ...b } : med
    )
    return demoMedications.find(med => med.id === id) ?? {}
  }

  if (m === 'delete' && path.startsWith('/patient/medications/')) {
    const id = path.split('/').pop()
    demoMedications = demoMedications.filter(med => med.id !== id)
    return { ok: true }
  }

  // ── Follow-ups ─────────────────────────────────────────────────────────────
  if (m === 'get' && path.startsWith('/patient/follow-ups')) {
    return { items: demoFollowUps, total: demoFollowUps.length, page: 1, totalPages: Math.max(1, Math.ceil(demoFollowUps.length / 10)) }
  }

  if (m === 'post' && path === '/patient/follow-ups') {
    const newFollowUp = { id: uuid(), createdAt: new Date().toISOString(), patientId: 'demo-p1', ...b }
    demoFollowUps.unshift(newFollowUp)
    return newFollowUp
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────
  if (m === 'get' && path === '/patient/alerts') return [...demoPatientAlerts]

  if ((m === 'patch' || m === 'put') && path.startsWith('/patient/alerts/') && path.endsWith('/read')) {
    const id = path.split('/')[3]
    demoPatientAlerts = demoPatientAlerts.map(a => a.id === id ? { ...a, lu: true } : a)
    return { ok: true }
  }

  if ((m === 'patch' || m === 'put') && path === '/patient/alerts/read-all') {
    demoPatientAlerts = demoPatientAlerts.map(a => ({ ...a, lu: true }))
    return { ok: true }
  }

  if (m === 'get' && path === '/doctor/alerts') return [...demoDoctorAlerts]

  if ((m === 'patch' || m === 'put') && path.startsWith('/doctor/alerts/') && path.endsWith('/read')) {
    const id = path.split('/')[3]
    demoDoctorAlerts = demoDoctorAlerts.map(a => a.id === id ? { ...a, lu: true } : a)
    return { ok: true }
  }

  if ((m === 'patch' || m === 'put') && path === '/doctor/alerts/read-all') {
    demoDoctorAlerts = demoDoctorAlerts.map(a => ({ ...a, lu: true }))
    return { ok: true }
  }

  // ── Messages ───────────────────────────────────────────────────────────────
  if (m === 'get' && path.includes('/messages')) return [...demoMessages]

  if (m === 'post' && path.includes('/messages')) {
    const newMsg = {
      id: `msg${++demoMsgCounter}`,
      expediteurId: 'demo-user',
      contenu: (b as { contenu?: string })?.contenu ?? '',
      createdAt: new Date().toISOString(),
      lu: false,
    }
    demoMessages.push(newMsg)
    return newMsg
  }

  // ── Doctor patients ────────────────────────────────────────────────────────
  if (m === 'get' && path === '/doctor/patients') return mockDoctorPatients

  if (m === 'get' && path.startsWith('/doctor/patients/') && !path.endsWith('/reports/pdf') && path !== '/doctor/patients') {
    const id = path.split('/').pop()
    const pMap: Record<string, unknown> = {
      'demo-p1': mockPatientDetail('demo-p1', 'Jean Dupont', 62, 175, 'Ingénieur retraité', 22, 'LOW', 'Stade III'),
      'demo-p2': mockPatientDetail('demo-p2', 'Marie Bernard', 58, 162, 'Enseignante', 41, 'MODERATE', 'Stade II'),
      'demo-p3': mockPatientDetail('demo-p3', 'Pierre Leroy', 71, 180, 'Commerçant', 64, 'HIGH', 'Stade II'),
    }
    return pMap[id!] || pMap['demo-p1']
  }

  if (m === 'put' && path.includes('/doctor/patients/') && path.endsWith('/stage')) return { ok: true }

  // ── PDF export (return empty blob placeholder) ─────────────────────────────
  if (m === 'get' && path.endsWith('/reports/pdf')) return new Blob(['PDF demo'], { type: 'application/pdf' })

  return {}
}
