import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '../..')
const outPath = path.join(root, 'docs', 'RAPPORT_GUIDE_UTILISATEUR.pdf')
fs.mkdirSync(path.join(root, 'docs'), { recursive: true })

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 65, bottom: 55, left: 60, right: 60 },
  autoFirstPage: false,
  info: { Title: 'SuiviConnect — Guide utilisateur', Author: 'SuiviConnect' },
})

doc.pipe(fs.createWriteStream(outPath))

const PAGE_W = 595.28   // A4 width in points
const PAGE_H = 841.89   // A4 height in points
const W  = PAGE_W - 120
const ML = 60
const S  = 9.5   // base font size
const SB = 10    // bold font size
const LG = 1.8   // line gap

function footer(n) {
  const fy = PAGE_H - 44
  doc.save()
  doc.moveTo(ML, fy).lineTo(ML + W, fy).strokeColor('#aaa').lineWidth(0.4).stroke()
  doc.font('Helvetica').fontSize(7.5).fillColor('#888')
    .text('SuiviConnect — Guide utilisateur officiel — v1.0', ML, fy + 7, { width: W / 2, lineBreak: false })
  doc.font('Helvetica').fontSize(7.5).fillColor('#888')
    .text(`Page ${n} / 3`, ML, fy + 7, { width: W, align: 'right', lineBreak: false })
  doc.restore()
}

function section(text) {
  doc.moveDown(0.5)
  doc.font('Helvetica-Bold').fontSize(SB).fillColor('#000')
    .text(text.toUpperCase(), ML, doc.y, { width: W, characterSpacing: 0.3 })
  doc.moveDown(0.1)
  doc.moveTo(ML, doc.y).lineTo(ML + W, doc.y).strokeColor('#000').lineWidth(0.8).stroke()
  doc.moveDown(0.4)
}

function h2(text) {
  doc.font('Helvetica-Bold').fontSize(S).fillColor('#000')
    .text(text, ML, doc.y, { width: W })
  doc.moveDown(0.15)
}

function body(text, bold = false) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(S).fillColor('#111')
    .text(text, ML, doc.y, { width: W, lineGap: LG })
  doc.moveDown(0.25)
}

function bullet(items) {
  items.forEach(item => {
    const y = doc.y
    doc.moveTo(ML + 7, y + 4.5).lineTo(ML + 12, y + 4.5)
      .strokeColor('#000').lineWidth(0.8).stroke()
    doc.font('Helvetica').fontSize(S).fillColor('#111')
      .text(item, ML + 18, y, { width: W - 18, lineGap: LG })
    doc.moveDown(0.1)
  })
  doc.moveDown(0.2)
}

function row(label, value) {
  const y = doc.y
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#555')
    .text(label, ML, y, { width: 105, lineBreak: false })
  doc.font('Helvetica').fontSize(8.5).fillColor('#111')
    .text(value, ML + 110, y, { width: W - 110 })
  doc.moveDown(0.18)
}

function tbl(headers, rows, ratios) {
  const colW = ratios.map(r => W * r)
  const rh = 17
  let x = ML, y = doc.y
  headers.forEach((h, i) => {
    doc.rect(x, y, colW[i], rh).stroke('#bbb')
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000')
      .text(h, x + 5, y + 5, { width: colW[i] - 10, lineBreak: false })
    x += colW[i]
  })
  y += rh
  rows.forEach(row => {
    x = ML
    row.forEach((cell, i) => {
      doc.rect(x, y, colW[i], rh).stroke('#ddd')
      doc.font('Helvetica').fontSize(8).fillColor('#111')
        .text(String(cell), x + 5, y + 5, { width: colW[i] - 10, lineBreak: false })
      x += colW[i]
    })
    y += rh
  })
  doc.y = y + 8
}

// ══════════════════════════════════════════
// PAGE 1 — COUVERTURE + PRÉSENTATION
// ══════════════════════════════════════════
doc.addPage()

doc.rect(0, 0, PAGE_W, 100).fill('#111')
doc.font('Helvetica-Bold').fontSize(26).fillColor('#fff')
  .text('SuiviConnect', 0, 25, { align: 'center', width: PAGE_W })
doc.font('Helvetica').fontSize(11).fillColor('#ccc')
  .text('Guide utilisateur — Espace Patient & Espace Médecin', 0, 62, { align: 'center', width: PAGE_W })

doc.y = 118
row('Document',    'Guide utilisateur officiel')
row('Application', 'SuiviConnect — Suivi médical connecté')
row('Version',     '1.0')
row('Public',      'Patients et professionnels de santé')

section('1. Objet du document')
body('Le présent guide accompagne les utilisateurs de la plateforme SuiviConnect dans leur utilisation quotidienne. Il s\'adresse aux patients en programme de suivi médical et aux médecins chargés du suivi et de la prise en charge clinique.')

section('2. Présentation générale')
bullet([
  'Collecte régulière des données de santé par le patient ;',
  'Pilotage clinique et analyse par le médecin ;',
  'Détection précoce des anomalies via un système d\'alertes automatiques ;',
  'Communication sécurisée patient ↔ professionnel de santé ;',
  'Suivi de l\'observance thérapeutique et de l\'évolution clinique.',
])

section('3. Conditions d\'accès')
tbl(
  ['Fonction', 'URL'],
  [['Connexion', '/connexion'], ['Inscription', '/inscription'], ['Mot de passe oublié', '/mot-de-passe-oublie']],
  [0.32, 0.68]
)
body('Un mode démonstration est disponible sur l\'écran de connexion pour découvrir la plateforme sans backend actif.')

footer(1)

// ══════════════════════════════════════════
// PAGE 2 — ESPACE PATIENT
// ══════════════════════════════════════════
doc.addPage()

section('4. Espace Patient — Guide d\'utilisation')

h2('4.1 Tableau de bord — /patient/tableau-de-bord')
bullet([
  'Indicateurs clés : poids, tension artérielle, LDL, activité physique ;',
  'Score cardiaque, niveau de risque, recommandations et prochains rendez-vous.',
])

h2('4.2 Suivi hebdomadaire — /patient/suivi-hebdomadaire')
bullet([
  'Poids (kg), tension artérielle (sys./dia.), LDL (g/L), activité physique (min) ;',
  'Observance médicamenteuse (prises / total), tabac, diabète, notes.',
])
body('Recommandation : compléter ce formulaire une fois par semaine, le même jour.', true)

h2('4.3 Médicaments — /patient/medicaments')
bullet([
  'Consultation des traitements actifs ;',
  'Ajout, modification ou suppression d\'un médicament ;',
  'Rappels personnalisés (heure, jours de la semaine).',
])

h2('4.4 Alertes — /patient/alertes')
bullet([
  'Alertes automatiques (tension, LDL, activité, médicaments…) ;',
  'Marquage individuel ou global des alertes comme lues.',
])

h2('4.5 Messagerie — /patient/messages')
body('Échange sécurisé avec le médecin référent : questions, signalement de symptômes, demandes de clarification.')

h2('4.6 Rapports — /patient/rapports')
body('Consultation de l\'historique et des documents de suivi générés par la plateforme.')

h2('4.7 Profil patient — /patient/profil')
bullet([
  'Âge, taille, profession, date de procédure, séjour de rééducation ;',
  'Stade de rééducation recommandé.',
])

section('Bonnes pratiques — Patient')
bullet([
  'Compléter le suivi hebdomadaire de manière régulière et rigoureuse ;',
  'Consulter les alertes et maintenir la liste des médicaments à jour ;',
  'Contacter le médecin en cas de symptôme inhabituel.',
])

footer(2)

// ══════════════════════════════════════════
// PAGE 3 — ESPACE MÉDECIN + ANNEXES
// ══════════════════════════════════════════
doc.addPage()

section('5. Espace Médecin — Guide d\'utilisation')

h2('5.1 Tableau de bord — /medecin/tableau-de-bord')
bullet(['Patients suivis, alertes actives, patients à risque élevé, activités récentes.'])

h2('5.2 Liste des patients — /medecin/patients')
bullet([
  'Recherche par nom ou stade ; affichage âge, stade, risque, alertes ;',
  'Bouton Voir → fiche détaillée du patient.',
])

h2('5.3 Fiche patient — /medecin/patients/:id')
bullet([
  'Profil complet, indicateurs : tension, LDL, poids, activité ;',
  'Évaluation du risque, médicaments, alertes, historique des suivis ;',
  'Modification du stade (I à IV), export PDF du rapport.',
])

h2('5.4 Alertes — /medecin/alertes')
bullet(['Filtrage par gravité, recherche par patient, marquage comme traitées.'])
body('Recommandation : traiter en priorité les alertes critiques et élevées.', true)

h2('5.5 Analytique — /medecin/analytique')
bullet(['Adhésion médicamenteuse, contrôle tensionnel, objectifs atteints, évolution.'])

h2('5.6 Messagerie — /medecin/messages')
body('Communication directe et sécurisée avec les patients.')

section('6. Niveaux de risque & Types d\'alertes')

tbl(
  ['Niveau', 'Interprétation', 'Action'],
  [
    ['LOW', 'Risque faible', 'Suivi standard'],
    ['MODERATE', 'Risque modéré', 'Surveillance renforcée'],
    ['HIGH', 'Risque élevé', 'Intervention recommandée'],
    ['VERY_HIGH', 'Risque très élevé', 'Action urgente'],
  ],
  [0.22, 0.40, 0.38]
)

tbl(
  ['Type d\'alerte', 'Description'],
  [
    ['Tension artérielle', 'Valeur tensionnelle anormale'],
    ['LDL', 'Cholestérol hors objectif'],
    ['Médicaments', 'Faible observance médicamenteuse'],
    ['Activité', 'Activité physique insuffisante'],
  ],
  [0.32, 0.68]
)

section('7. Bonnes pratiques Médecin & Sécurité')
bullet([
  'Traiter en priorité les alertes critiques ; ajuster le stade selon la progression ;',
  'Répondre aux messages dans des délais adaptés à la situation clinique.',
  'Ne jamais partager ses identifiants ; se déconnecter après chaque session ;',
  'Signaler immédiatement toute activité suspecte à l\'administrateur.',
])

footer(3)

doc.end()
console.log(`PDF genere : ${outPath}`)
