import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '../..')
const outPath = path.join(root, 'docs', 'GUIDE_UTILISATEUR.pdf')

fs.mkdirSync(path.join(root, 'docs'), { recursive: true })

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 60, bottom: 60, left: 60, right: 60 },
  info: {
    Title: 'SuiviConnect — Guide utilisateur',
    Author: 'SuiviConnect',
    Subject: 'Guide utilisateur Patient & Médecin',
    Keywords: 'suivi médical, patient, médecin, guide',
  },
})

doc.pipe(fs.createWriteStream(outPath))

let pageNum = 1
function addFooter() {
  const fy = doc.page.height - 38
  doc.save()
  doc.moveTo(ML, fy).lineTo(ML + W, fy).strokeColor(BORDER).lineWidth(0.5).stroke()
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text('SuiviConnect — Guide utilisateur officiel — v1.0', ML, fy + 8, { width: W / 2, lineBreak: false })
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text(`Page ${pageNum}`, ML, fy + 8, { width: W, align: 'right', lineBreak: false })
  doc.restore()
}

function newPage() {
  addFooter()
  pageNum++
  doc.addPage()
}

const W = doc.page.width - 120   // usable width
const ML = 60                     // margin left
const PRIMARY   = '#2563EB'
const PRIMARY_D = '#1D4ED8'
const DARK      = '#0F172A'
const BODY      = '#1E293B'
const MUTED     = '#64748B'
const BORDER    = '#E2E8F0'
const BG_HEAD   = '#EFF6FF'
const BG_ROW    = '#F8FAFC'
const WHITE     = '#FFFFFF'
const GREEN     = '#059669'

/* ── helpers ── */
function needSpace(n = 50) {
  if (doc.y + n > doc.page.height - 70) doc.addPage()
}

function hr(color = BORDER, lw = 0.5) {
  doc.moveTo(ML, doc.y).lineTo(ML + W, doc.y).strokeColor(color).lineWidth(lw).stroke()
  doc.moveDown(0.4)
}

function sectionTitle(num, text) {
  needSpace(60)
  // Blue left bar
  doc.rect(ML, doc.y, 4, 26).fill(PRIMARY)
  doc.font('Helvetica-Bold').fontSize(16).fillColor(PRIMARY)
    .text(`${num}. ${text}`, ML + 12, doc.y, { width: W - 12 })
  doc.moveDown(0.6)
  hr(BORDER, 0.5)
}

function h3(text) {
  needSpace(36)
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
    .text(text, ML, doc.y, { width: W })
  doc.moveDown(0.3)
}

function badge(text, color = PRIMARY) {
  const bw = doc.widthOfString(text, { fontSize: 8 }) + 14
  const bh = 14
  const bx = ML
  const by = doc.y
  doc.roundedRect(bx, by, bw, bh, 3).fill(color + '18')
  doc.font('Helvetica-Bold').fontSize(8).fillColor(color)
    .text(text, bx + 7, by + 3, { width: bw - 14 })
  doc.y = by + bh + 6
}

function path_label(text) {
  needSpace(20)
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED)
    .text(`Chemin d'accès : ${text}`, ML, doc.y, { width: W })
  doc.moveDown(0.35)
}

function bodyText(text, opts = {}) {
  needSpace(22)
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || 10).fillColor(opts.color || BODY)
    .text(text, ML, doc.y, { width: W, lineGap: 2.5, align: opts.align || 'left' })
  doc.moveDown(opts.gap ?? 0.4)
}

function bullets(items, indent = 12) {
  for (const item of items) {
    needSpace(18)
    const y = doc.y
    doc.circle(ML + indent - 5, y + 5, 2).fill(PRIMARY)
    doc.font('Helvetica').fontSize(10).fillColor(BODY)
      .text(item, ML + indent, y, { width: W - indent, lineGap: 2 })
    doc.moveDown(0.2)
  }
  doc.moveDown(0.25)
}

function noteBox(text, color = PRIMARY) {
  needSpace(44)
  const bx = ML, by = doc.y, bw = W, bh = 34
  doc.roundedRect(bx, by, bw, bh, 6).fill(color + '10')
  doc.moveTo(bx, by).lineTo(bx, by + bh).strokeColor(color).lineWidth(2.5).stroke()
  doc.font('Helvetica-Bold').fontSize(9).fillColor(color).text('Recommandation', bx + 12, by + 7, { width: bw - 24 })
  doc.font('Helvetica').fontSize(9).fillColor(BODY).text(text, bx + 12, by + 18, { width: bw - 24, lineGap: 2 })
  doc.y = by + bh + 10
}

function table(headers, rows, colRatios) {
  const colW = colRatios.map(r => W * r)
  const rh = 20
  needSpace(rh * (rows.length + 2) + 10)

  let x = ML, y = doc.y
  // header row
  headers.forEach((h, i) => {
    doc.rect(x, y, colW[i], rh).fill(BG_HEAD)
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
      .text(h, x + 7, y + 6, { width: colW[i] - 14, lineBreak: false })
    x += colW[i]
  })
  // header bottom border
  doc.moveTo(ML, y + rh).lineTo(ML + W, y + rh).strokeColor(PRIMARY).lineWidth(1).stroke()
  y += rh

  rows.forEach((row, ri) => {
    x = ML
    const bg = ri % 2 === 0 ? WHITE : BG_ROW
    row.forEach((cell, ci) => {
      doc.rect(x, y, colW[ci], rh).fill(bg)
      doc.font('Helvetica').fontSize(9).fillColor(BODY)
        .text(String(cell), x + 7, y + 6, { width: colW[ci] - 14, lineBreak: false })
      x += colW[ci]
    })
    // row bottom border
    doc.moveTo(ML, y + rh).lineTo(ML + W, y + rh).strokeColor(BORDER).lineWidth(0.4).stroke()
    y += rh
  })

  // outer border
  doc.rect(ML, doc.y, W, rh * (rows.length + 1)).stroke(BORDER)
  doc.y = y + 10
}

/* ═══════════════════════════════════════════════
   PAGE DE COUVERTURE
═══════════════════════════════════════════════ */
// Top blue band
doc.rect(0, 0, doc.page.width, 200).fill(PRIMARY)

doc.font('Helvetica-Bold').fontSize(36).fillColor(WHITE)
  .text('SuiviConnect', 0, 55, { align: 'center', width: doc.page.width })

doc.font('Helvetica').fontSize(14).fillColor('rgba(255,255,255,0.85)')
  .text('Guide utilisateur', 0, 102, { align: 'center', width: doc.page.width })

doc.font('Helvetica').fontSize(11).fillColor('rgba(255,255,255,0.65)')
  .text('Espace Patient & Espace Médecin', 0, 122, { align: 'center', width: doc.page.width })

// White card
doc.rect(ML, 220, W, 150).roundedRect(ML, 220, W, 150, 10).fill(WHITE)
doc.rect(ML, 220, W, 150).roundedRect(ML, 220, W, 150, 10).stroke(BORDER)

const cardPad = 28
doc.font('Helvetica-Bold').fontSize(10).fillColor(MUTED)
  .text('DOCUMENT', ML + cardPad, 240)
doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK)
  .text('Guide utilisateur officiel', ML + cardPad, 254)

doc.moveTo(ML + cardPad, 275).lineTo(ML + W - cardPad, 275).strokeColor(BORDER).lineWidth(0.5).stroke()

const fields = [
  ['Application', 'SuiviConnect — Plateforme de suivi médical connecté'],
  ['Version', '1.0'],
  ['Public', 'Patients et professionnels de santé (médecins)'],
  ['Langue', 'Français'],
]
fields.forEach(([label, val], i) => {
  const fy = 285 + i * 18
  doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text(label, ML + cardPad, fy, { width: 90 })
  doc.font('Helvetica').fontSize(9).fillColor(DARK).text(val, ML + cardPad + 96, fy, { width: W - cardPad - 100 })
})

doc.y = 390
newPage()

/* ═══════════════════════════════════════════════
   SOMMAIRE
═══════════════════════════════════════════════ */
needSpace(40)
doc.font('Helvetica-Bold').fontSize(18).fillColor(DARK).text('Sommaire', ML, doc.y, { width: W })
doc.moveDown(0.4)
hr(PRIMARY, 1.5)

const toc = [
  ['1', 'Objet du document'],
  ['2', 'Présentation générale'],
  ['3', 'Conditions d\'accès'],
  ['4', 'Espace Patient — Guide d\'utilisation'],
  ['5', 'Espace Médecin — Guide d\'utilisation'],
  ['6', 'Niveaux de risque'],
  ['7', 'Types d\'alertes'],
  ['8', 'Bonnes pratiques'],
  ['9', 'Confidentialité et sécurité'],
  ['10', 'Support et assistance'],
]
toc.forEach(([num, title]) => {
  needSpace(18)
  const y = doc.y
  doc.font('Helvetica').fontSize(10.5).fillColor(BODY).text(`${num}.  ${title}`, ML, y, { width: W - 30 })
  doc.y = y + 16
})

doc.addPage()

/* ═══════════════════════════════════════════════
   SECTION 1
═══════════════════════════════════════════════ */
sectionTitle(1, 'Objet du document')
bodyText('Le présent guide a pour objectif de présenter les fonctionnalités de la plateforme SuiviConnect et d\'accompagner les utilisateurs dans leur utilisation quotidienne.')
bodyText('Il s\'adresse :')
bullets([
  'aux patients participant à un programme de suivi médical ;',
  'aux médecins chargés du suivi, de l\'analyse et de la prise en charge des patients.',
])
bodyText('Ce document décrit les principales fonctionnalités, les parcours d\'utilisation, les bonnes pratiques et les règles d\'usage recommandées.')

/* ═══════════════════════════════════════════════
   SECTION 2
═══════════════════════════════════════════════ */
sectionTitle(2, 'Présentation générale de la solution')
bodyText('SuiviConnect est une solution web de télésuivi médical permettant :')
bullets([
  'la collecte régulière des données de santé par le patient ;',
  'le pilotage clinique par le médecin ;',
  'la détection précoce des anomalies via un système d\'alertes automatiques ;',
  'la communication sécurisée entre patient et professionnel de santé ;',
  'le suivi de l\'observance thérapeutique et de l\'évolution clinique.',
])
bodyText('La plateforme est organisée en deux espaces distincts : Espace Patient et Espace Médecin. Chaque utilisateur accède uniquement aux fonctionnalités correspondant à son rôle.')

/* ═══════════════════════════════════════════════
   SECTION 3
═══════════════════════════════════════════════ */
sectionTitle(3, 'Conditions d\'accès')
h3('3.1 Accès à la plateforme')
table(
  ['Fonction', 'Adresse URL'],
  [
    ['Connexion', '/connexion'],
    ['Inscription', '/inscription'],
    ['Mot de passe oublié', '/mot-de-passe-oublie'],
  ],
  [0.35, 0.65]
)

h3('3.2 Authentification')
bodyText('L\'accès à la plateforme est protégé par un identifiant (adresse e-mail) et un mot de passe personnel. Chaque compte est associé à un rôle unique : Patient ou Médecin.')

h3('3.3 Mode démonstration')
bodyText('Un mode démonstration est disponible depuis l\'écran de connexion. Il permet de découvrir l\'interface et les fonctionnalités sans connexion à un environnement de production.')

/* ═══════════════════════════════════════════════
   SECTION 4
═══════════════════════════════════════════════ */
newPage()
sectionTitle(4, 'Espace Patient — Guide d\'utilisation')

h3('4.1 Tableau de bord')
path_label('/patient/tableau-de-bord')
bodyText('Objectif : offrir une vue synthétique et personnalisée de l\'état de santé du patient.')
bullets([
  'Indicateurs clés : poids, tension artérielle, LDL, activité physique ;',
  'Score cardiaque et niveau de risque calculé automatiquement ;',
  'Recommandations personnalisées et prochains rendez-vous ;',
  'Rappel des médicaments à prendre dans la journée.',
])

h3('4.2 Suivi hebdomadaire')
path_label('/patient/suivi-hebdomadaire')
bodyText('Objectif : permettre la saisie régulière et structurée des données de santé.')
bodyText('Données à renseigner chaque semaine :')
bullets([
  'Poids (kg) ;',
  'Tension artérielle systolique et diastolique ;',
  'LDL cholestérol (g/L) ;',
  'Activité physique (minutes) ;',
  'Observance médicamenteuse (prises effectuées / total prescrit) ;',
  'Facteurs de risque : tabac, diabète ;',
  'Notes complémentaires libres.',
])
noteBox('Le formulaire doit être complété une fois par semaine, de préférence le même jour, afin d\'assurer un suivi régulier et une analyse cohérente par le médecin.')

h3('4.3 Gestion des médicaments')
path_label('/patient/medicaments')
bodyText('Objectif : centraliser et suivre les traitements en cours.')
bullets([
  'Consultation des traitements actifs ;',
  'Ajout, modification ou suppression d\'un médicament ;',
  'Configuration de rappels personnalisés (heure, jours de la semaine).',
])

h3('4.4 Alertes')
path_label('/patient/alertes')
bodyText('Objectif : informer le patient des événements nécessitant une attention particulière.')
bullets([
  'Consultation des alertes générées automatiquement par le système ;',
  'Distinction entre alertes lues et non lues ;',
  'Marquage individuel ou global des alertes comme lues.',
])

h3('4.5 Messagerie')
path_label('/patient/messages')
bodyText('Objectif : faciliter les échanges sécurisés avec le médecin référent.')
bullets([
  'Questions relatives au suivi médical ;',
  'Signalement d\'un symptôme ou d\'un événement clinique ;',
  'Demande de clarification sur un traitement ou une recommandation.',
])

h3('4.6 Rapports')
path_label('/patient/rapports')
bodyText('Objectif : permettre la consultation de l\'historique et des documents de suivi générés.')

h3('4.7 Profil patient')
path_label('/patient/profil')
bodyText('Objectif : consulter et mettre à jour les informations personnelles et médicales.')
bullets([
  'Âge, taille, profession ;',
  'Date de la procédure médicale ;',
  'Durée du séjour de rééducation ;',
  'Stade de rééducation recommandé.',
])

/* ═══════════════════════════════════════════════
   SECTION 5
═══════════════════════════════════════════════ */
newPage()
sectionTitle(5, 'Espace Médecin — Guide d\'utilisation')

h3('5.1 Tableau de bord')
path_label('/medecin/tableau-de-bord')
bodyText('Objectif : fournir une vision globale de l\'activité et de l\'état de la patientèle.')
bullets([
  'Nombre total de patients suivis ;',
  'Nombre d\'alertes actives ;',
  'Patients présentant un risque élevé ;',
  'Activités récentes et dernières données des patients.',
])

h3('5.2 Liste des patients')
path_label('/medecin/patients')
bodyText('Objectif : permettre la recherche, le tri et l\'accès rapide aux dossiers patients.')
bullets([
  'Recherche par nom ou stade de rééducation ;',
  'Affichage des informations essentielles : âge, stade, niveau de risque, alertes ;',
  'Accès direct à la fiche détaillée via le bouton Voir.',
])

h3('5.3 Fiche patient')
path_label('/medecin/patients/:id')
bodyText('Objectif : centraliser l\'ensemble des informations cliniques d\'un patient.')
bullets([
  'Profil médical complet (âge, taille, profession, procédure, séjour rééducation) ;',
  'Indicateurs cliniques récents : tension, activité, LDL, poids ;',
  'Évaluation du risque et facteurs associés identifiés ;',
  'Liste des médicaments en cours ;',
  'Alertes récentes ;',
  'Historique complet des suivis hebdomadaires ;',
  'Modification du stade de rééducation (Stade I à IV) ;',
  'Export du rapport patient au format PDF.',
])

h3('5.4 Gestion des alertes')
path_label('/medecin/alertes')
bodyText('Objectif : prioriser et traiter les situations nécessitant une intervention médicale.')
bullets([
  'Filtrage par niveau de gravité (critique, élevé, moyen, faible) ;',
  'Recherche par patient ;',
  'Marquage des alertes comme traitées.',
])
noteBox('Les alertes de gravité élevée ou critique doivent être traitées en priorité afin d\'assurer la sécurité des patients.')

h3('5.5 Module analytique')
path_label('/medecin/analytique')
bodyText('Objectif : analyser les tendances et suivre l\'évolution globale de la patientèle.')
bullets([
  'Taux d\'adhésion médicamenteuse ;',
  'Taux de contrôle tensionnel ;',
  'Pourcentage d\'objectifs thérapeutiques atteints ;',
  'Évolution de la patientèle sur la période.',
])

h3('5.6 Messagerie médicale')
path_label('/medecin/messages')
bodyText('Objectif : assurer un suivi rapproché et sécurisé avec les patients via une messagerie intégrée.')

/* ═══════════════════════════════════════════════
   SECTION 6
═══════════════════════════════════════════════ */
newPage()
sectionTitle(6, 'Niveaux de risque')
bodyText('Le score de risque est calculé automatiquement à partir des données de suivi du patient. Quatre niveaux sont définis :')
doc.moveDown(0.3)
table(
  ['Niveau', 'Interprétation', 'Action recommandée'],
  [
    ['LOW', 'Risque faible', 'Suivi standard'],
    ['MODERATE', 'Risque modéré', 'Surveillance renforcée'],
    ['HIGH', 'Risque élevé', 'Intervention médicale recommandée'],
    ['VERY_HIGH', 'Risque très élevé', 'Action urgente requise'],
  ],
  [0.22, 0.38, 0.40]
)

/* ═══════════════════════════════════════════════
   SECTION 7
═══════════════════════════════════════════════ */
sectionTitle(7, 'Types d\'alertes')
bodyText('Les alertes sont générées automatiquement par le système en fonction des seuils cliniques définis :')
doc.moveDown(0.3)
table(
  ['Type', 'Description'],
  [
    ['Tension artérielle', 'Détection d\'une valeur tensionnelle anormale'],
    ['LDL', 'Cholestérol LDL hors objectif thérapeutique'],
    ['Poids', 'Variation significative du poids corporel'],
    ['Médicaments', 'Faible observance du traitement médicamenteux'],
    ['Activité', 'Activité physique insuffisante par rapport à l\'objectif'],
    ['Général', 'Autre événement clinique nécessitant une attention'],
  ],
  [0.28, 0.72]
)

/* ═══════════════════════════════════════════════
   SECTION 8
═══════════════════════════════════════════════ */
sectionTitle(8, 'Bonnes pratiques d\'utilisation')

h3('8.1 Recommandations pour les patients')
bullets([
  'Compléter le suivi hebdomadaire de manière régulière et rigoureuse ;',
  'Consulter les alertes dès leur apparition et agir en conséquence ;',
  'Maintenir la liste des médicaments à jour avec les dosages exacts ;',
  'Respecter les rappels de prise médicamenteuse configurés ;',
  'Contacter le médecin via la messagerie en cas de symptôme inhabituel.',
])

h3('8.2 Recommandations pour les médecins')
bullets([
  'Traiter en priorité les alertes de gravité critique ou élevée ;',
  'Analyser régulièrement l\'évolution clinique via les graphiques et l\'historique ;',
  'Ajuster le stade de rééducation en fonction de la progression du patient ;',
  'Répondre aux messages patients dans des délais adaptés à la situation clinique ;',
  'Utiliser les rapports PDF pour la documentation et le dossier patient.',
])

/* ═══════════════════════════════════════════════
   SECTION 9
═══════════════════════════════════════════════ */
sectionTitle(9, 'Confidentialité et sécurité')
bodyText('Les données de santé enregistrées sur la plateforme sont strictement confidentielles. L\'accès est sécurisé par authentification et contrôle des rôles.')
bodyText('Chaque utilisateur ne peut accéder qu\'aux informations qui lui sont attribuées.')
bodyText('Il est recommandé de :')
bullets([
  'ne jamais partager ses identifiants de connexion ;',
  'se déconnecter après chaque session sur un poste partagé ;',
  'signaler immédiatement toute activité suspecte à l\'administrateur.',
])

/* ═══════════════════════════════════════════════
   SECTION 10
═══════════════════════════════════════════════ */
sectionTitle(10, 'Support et assistance')
bodyText('En cas de difficulté d\'utilisation :')
bullets([
  'consulter ce guide utilisateur ;',
  'contacter l\'administrateur de la plateforme ;',
  'contacter le support technique de l\'établissement de santé.',
])

addFooter()
doc.end()
console.log(`PDF genere : ${outPath}`)
