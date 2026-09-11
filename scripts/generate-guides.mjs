import PDFDocument from '../backend/node_modules/pdfkit/js/pdfkit.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'guides')

const PW = 595.28
const PH = 841.89
const M = 50
const W = PW - M * 2

const patientBlocks = [
  { t: 'h2', text: 'Premiers pas' },
  { t: 'step', n: 1, title: 'Connexion à votre espace', text: "Accédez à l'application avec l'email et le mot de passe fournis par votre médecin lors de votre inscription. Si vous avez oublié votre mot de passe, cliquez sur « Oublié ? » sur la page de connexion." },
  { t: 'step', n: 2, title: 'Compléter votre profil', text: "Allez dans « Mon profil » (menu de gauche) pour vérifier que vos informations personnelles sont correctes : âge, profession, date de procédure." },
  { t: 'step', n: 3, title: 'Activer les notifications', text: "Si votre navigateur vous demande l'autorisation pour les notifications, acceptez. Cela vous permettra de recevoir les alertes de votre médecin en temps réel." },
  { t: 'note', text: "Votre espace est 100 % confidentiel. Seul votre médecin assigné peut consulter vos données de santé." },

  { t: 'h2', text: 'Tableau de bord' },
  { t: 'p', text: "Le tableau de bord est votre page d'accueil. Il résume votre état de santé en un coup d'oeil." },
  { t: 'bullet', title: 'Score de risque', text: "Calculé automatiquement à partir de vos données. Plus il est bas, mieux c'est." },
  { t: 'bullet', title: 'Médicaments du jour', text: "Affiche vos médicaments actifs et l'heure de prise." },
  { t: 'bullet', title: 'Prochain rendez-vous', text: 'Votre prochaine consultation planifiée par votre médecin.' },
  { t: 'bullet', title: 'Objectifs de santé', text: 'Les objectifs définis par votre médecin : poids cible, tension, activité physique.' },

  { t: 'h2', text: 'Suivi hebdomadaire' },
  { t: 'p', text: 'Chaque semaine, vous devez renseigner vos données de santé. Votre médecin les consulte et réagit si nécessaire.' },
  { t: 'step', n: 1, title: 'Accéder au formulaire', text: "Cliquez sur « Suivi hebdomadaire » dans le menu de gauche." },
  { t: 'step', n: 2, title: 'Remplir les données', text: "Saisissez : le poids (en kg), la tension artérielle (systolique / diastolique), le LDL cholestérol, les minutes d'activité physique réalisées dans la semaine, ainsi que le nombre de médicaments pris sur le total prescrit." },
  { t: 'step', n: 3, title: 'Soumettre', text: "Cliquez sur « Soumettre ». Votre médecin reçoit une notification instantanée et peut vous laisser une note en retour." },
  { t: 'warn', text: 'Essayez de soumettre votre suivi chaque lundi. Un rappel automatique vous est envoyé si vous oubliez.' },

  { t: 'h2', text: 'Médicaments' },
  { t: 'p', text: 'Gérez vos traitements et téléchargez vos ordonnances depuis cette page.' },
  { t: 'bullet', title: 'Médicaments actifs', text: 'Liste de tous vos traitements en cours, avec le dosage et la fréquence de prise.' },
  { t: 'bullet', title: 'Ordonnances reçues', text: "Quand votre médecin valide une ordonnance, elle apparaît ici. Cliquez sur « Télécharger PDF » pour l'enregistrer ou l'imprimer." },
  { t: 'bullet', title: 'Ajouter un médicament', text: 'Vous pouvez ajouter vos propres médicaments (hors prescription) afin de les suivre également.' },

  { t: 'h2', text: 'Rendez-vous' },
  { t: 'p', text: 'Votre agenda de consultations. Les rendez-vous sont créés par votre médecin.' },
  { t: 'step', n: 1, title: 'Voir votre agenda', text: "Cliquez sur « Rendez-vous » dans le menu. Un calendrier mensuel s'affiche, avec des points colorés sur les jours où vous avez une consultation." },
  { t: 'step', n: 2, title: 'Confirmer un rendez-vous', text: "Quand votre médecin propose un rendez-vous, vous recevez une notification. Cliquez sur le jour concerné dans le calendrier, puis sur le bouton « Confirmer »." },
  { t: 'step', n: 3, title: 'Téléconsultation', text: "Si un lien vidéo est fourni, un bouton « Rejoindre la téléconsultation » apparaît le jour du rendez-vous." },
  { t: 'note', text: 'Vous recevez une notification instantanée dès que votre médecin ajoute ou modifie un rendez-vous.' },

  { t: 'h2', text: 'Messages' },
  { t: 'p', text: 'Communiquez directement avec votre médecin, en temps réel.' },
  { t: 'bullet', title: 'Envoyer un message', text: "Tapez votre message dans le champ en bas de l'écran, puis appuyez sur Entrée ou cliquez sur l'icône d'envoi." },
  { t: 'bullet', title: "Indicateur « en train d'écrire »", text: "Vous verrez « Dr. X est en train d'écrire... » lorsque votre médecin rédige une réponse." },
  { t: 'bullet', title: 'Appel audio et vidéo', text: "Cliquez sur l'icône téléphone ou caméra pour lancer un appel direct avec votre médecin." },

  { t: 'h2', text: 'Alertes' },
  { t: 'p', text: 'Les alertes sont générées automatiquement lorsque vos données dépassent les seuils normaux.' },
  { t: 'bullet', title: 'CRITIQUE', text: 'Valeurs très dangereuses. Contactez votre médecin immédiatement.' },
  { t: 'bullet', title: 'HIGH (élevé)', text: 'Valeurs élevées. Une consultation rapide est recommandée.' },
  { t: 'bullet', title: 'MEDIUM (moyen)', text: 'À surveiller. Mentionnez-le lors de votre prochain suivi.' },
  { t: 'bullet', title: 'LOW (faible)', text: "Information simple. Aucune action urgente n'est requise." },

  { t: 'h2', text: 'Rapports et ordonnances' },
  { t: 'bullet', title: 'Rapport médical PDF', text: "Dans « Rapports », cliquez sur « Télécharger mon rapport PDF » pour obtenir un document complet reprenant vos suivis, vos médicaments et vos risques." },
  { t: 'bullet', title: 'Ordonnances', text: "Dans « Médicaments », section « Ordonnances reçues », téléchargez le PDF de chaque ordonnance signée par votre médecin." },
]

const doctorBlocks = [
  { t: 'h2', text: 'Premiers pas' },
  { t: 'step', n: 1, title: 'Connexion médecin', text: 'Connectez-vous avec vos identifiants médecin. Votre espace est distinct de celui des patients et vous donne accès à votre patientèle complète.' },
  { t: 'step', n: 2, title: 'Compléter votre profil médecin', text: "Avant d'émettre votre première ordonnance, allez dans « Mon profil » pour renseigner votre numéro RPPS, votre spécialité, l'adresse du cabinet et votre téléphone. Ces informations figurent sur chaque ordonnance PDF générée." },
  { t: 'step', n: 3, title: 'Ajouter des patients', text: "Via « Gestion des utilisateurs » (espace administration). Chaque patient reçoit automatiquement ses identifiants par email." },
  { t: 'note', text: 'Toutes les données de vos patients sont chiffrées et ne sont accessibles que par vous.' },

  { t: 'h2', text: 'Tableau de bord' },
  { t: 'p', text: "Vue d'ensemble de toute votre patientèle." },
  { t: 'bullet', title: 'Total patients', text: 'Nombre de patients actifs actuellement sous votre suivi.' },
  { t: 'bullet', title: 'Alertes critiques', text: 'Patients dont les valeurs nécessitent votre attention immédiate.' },
  { t: 'bullet', title: 'Suivis récents', text: 'Derniers suivis hebdomadaires soumis par vos patients.' },
  { t: 'bullet', title: 'Prochains rendez-vous', text: 'Vos consultations à venir dans la semaine.' },

  { t: 'h2', text: 'Gestion des patients' },
  { t: 'step', n: 1, title: 'Liste des patients', text: "Cliquez sur « Patients » dans le menu. Vous voyez tous vos patients avec leur score de risque et leur statut. Cliquez sur un patient pour ouvrir son dossier complet." },
  { t: 'step', n: 2, title: 'Fiche patient', text: "La fiche regroupe les informations générales, l'historique des suivis avec graphiques, les médicaments, les alertes, les objectifs de santé, les prédictions de risque et les ordonnances." },
  { t: 'step', n: 3, title: 'Laisser une note médicale', text: "Depuis la fiche patient, section « Note du médecin », ajoutez vos observations. Le patient reçoit une notification." },
  { t: 'step', n: 4, title: 'Gérer les objectifs de santé', text: "Définissez des objectifs personnalisés (poids cible, LDL cible, minutes d'activité) que le patient visualise et suit depuis son tableau de bord." },

  { t: 'h2', text: 'Suivis hebdomadaires' },
  { t: 'bullet', title: 'Notification en temps réel', text: "Vous êtes notifié instantanément dès qu'un patient soumet son suivi. La cloche en haut à droite s'illumine." },
  { t: 'bullet', title: "Graphiques d'évolution", text: "Dans la fiche patient, visualisez l'évolution du poids, de la tension, du LDL et de l'activité physique sur les dernières semaines." },
  { t: 'bullet', title: 'Note sur un suivi', text: 'Pour chaque suivi soumis, vous pouvez consulter le détail et laisser une note médicale directement associée à ce suivi.' },
  { t: 'bullet', title: 'Prédiction de risque automatique', text: "L'algorithme calcule un score de risque cardiovasculaire à chaque nouveau suivi et génère des alertes si des seuils sont dépassés." },

  { t: 'h2', text: 'Prescriptions médicamenteuses' },
  { t: 'step', n: 1, title: 'Ajouter un médicament', text: "Depuis la fiche patient, onglet « Médicaments », cliquez sur « + Ajouter ». Renseignez le nom, le dosage, la fréquence et la date de fin si applicable." },
  { t: 'step', n: 2, title: 'Arrêter un traitement', text: "Cliquez sur le bouton « Stop » à côté du médicament concerné. Il bascule dans les médicaments inactifs mais reste conservé dans l'historique." },
  { t: 'step', n: 3, title: 'Générer une ordonnance', text: "Cliquez sur le bouton « Ordonnance » à côté des médicaments actifs pour ouvrir l'aperçu et procéder à la signature." },

  { t: 'h2', text: 'Ordonnances électroniques' },
  { t: 'step', n: 1, title: "Ouvrir l'aperçu de l'ordonnance", text: "Depuis la fiche patient, ajoutez les médicaments puis cliquez sur « Ordonnance ». Un aperçu s'affiche avec vos informations : RPPS, adresse, spécialité." },
  { t: 'step', n: 2, title: 'Choisir le mode de signature', text: 'Mode dessin : tracez votre signature à la souris ou au tactile dans le cadre prévu. Mode texte : votre nom en cursive est utilisé automatiquement, tel que défini dans Mon profil.' },
  { t: 'step', n: 3, title: 'Valider et envoyer', text: "Cliquez sur « Valider et envoyer au patient ». Le système génère un PDF signé et le patient reçoit immédiatement une notification pour le télécharger." },
  { t: 'warn', text: "Assurez-vous d'avoir renseigné votre numéro RPPS dans Mon profil : il est obligatoire sur toute ordonnance valide." },

  { t: 'h2', text: 'Agenda et rendez-vous' },
  { t: 'step', n: 1, title: 'Vue calendrier', text: "Cliquez sur « Rendez-vous » dans le menu. Un calendrier mensuel s'affiche avec des points colorés indiquant vos consultations." },
  { t: 'step', n: 2, title: 'Créer un rendez-vous', text: "Double-cliquez sur un jour du calendrier, ou cliquez sur « Ajouter ce jour », pour ouvrir le formulaire. Sélectionnez le patient, le type de consultation, l'heure, et ajoutez des notes si besoin." },
  { t: 'step', n: 3, title: 'Notification automatique', text: 'Dès que vous créez ou modifiez un rendez-vous, le patient reçoit une notification instantanée et le rendez-vous apparaît sur son agenda en temps réel.' },
  { t: 'sub', text: 'Types de consultation' },
  { t: 'bullet', title: 'Consultation cabinet', text: 'Rendez-vous physique au cabinet.' },
  { t: 'bullet', title: 'Téléconsultation', text: 'Ajoutez un lien vidéo : le patient peut rejoindre directement depuis son agenda.' },
  { t: 'bullet', title: 'Consultation téléphonique', text: 'Simple appel téléphonique de suivi.' },

  { t: 'h2', text: 'Messagerie sécurisée' },
  { t: 'bullet', title: 'Sélectionner un patient', text: "Dans « Messages », choisissez un patient dans la liste de gauche pour ouvrir la conversation." },
  { t: 'bullet', title: 'Temps réel', text: "Les messages arrivent instantanément des deux côtés. L'indicateur « en train d'écrire » vous avertit quand le patient saisit un message." },
  { t: 'bullet', title: 'Appel audio et vidéo', text: 'Lancez un appel directement depuis la fenêtre de message. Le patient reçoit une sonnerie et peut accepter ou refuser.' },

  { t: 'h2', text: 'Alertes automatiques' },
  { t: 'p', text: "Le système génère des alertes lorsque les valeurs d'un patient dépassent les seuils définis." },
  { t: 'bullet', title: 'Déclenchement automatique', text: "À chaque soumission de suivi, l'algorithme vérifie notamment : tension supérieure ou égale à 140/90, LDL supérieur ou égal à 4,1 mmol/L, observance médicamenteuse inférieure à 70 %." },
  { t: 'bullet', title: 'Notification en temps réel', text: "Vous êtes notifié immédiatement. Cliquez sur l'alerte pour accéder directement à la fiche du patient concerné." },
  { t: 'bullet', title: 'Résoudre une alerte', text: "Depuis la section « Alertes » de la fiche patient, marquez l'alerte comme résolue après avoir pris les mesures nécessaires." },
  { t: 'sub', text: 'Niveaux de gravité' },
  { t: 'bullet', title: 'CRITIQUE', text: 'Valeurs en zone de danger. Intervention immédiate requise.' },
  { t: 'bullet', title: 'HIGH (élevé)', text: 'Valeurs préoccupantes. À traiter dans les 24 à 48 heures.' },
  { t: 'bullet', title: 'MEDIUM (moyen)', text: 'Tendance défavorable. À surveiller lors du prochain suivi.' },
  { t: 'bullet', title: 'LOW (faible)', text: 'Information simple. Aucune action urgente.' },

  { t: 'h2', text: 'Mon profil médecin' },
  { t: 'p', text: 'Ces informations sont reprises sur toutes les ordonnances que vous générez.' },
  { t: 'kv', label: 'Nom complet', text: "Affiché en haut de l'ordonnance (ex. : Dr. Jean Martin)." },
  { t: 'kv', label: 'Spécialité', text: 'Votre discipline médicale (ex. : Cardiologie, Médecine générale).' },
  { t: 'kv', label: 'Numéro RPPS', text: 'Identifiant national obligatoire sur toute ordonnance.' },
  { t: 'kv', label: 'Adresse cabinet', text: "Adresse complète du cabinet, imprimée sur l'ordonnance." },
  { t: 'kv', label: 'Téléphone', text: "Numéro de contact figurant sur l'ordonnance." },
  { t: 'kv', label: 'Signature texte', text: 'Votre nom en cursive, utilisé si vous ne dessinez pas la signature.' },
  { t: 'note', text: "Après modification, cliquez sur « Enregistrer ». Les nouvelles ordonnances utilisent immédiatement les informations mises à jour." },
]

function buildGuide({ file, title, subtitle, footer, accent, accent2, noteBg, noteBorder, noteFg, blocks }) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: M, bottom: M, left: M, right: M }, bufferPages: true })
  doc.pipe(fs.createWriteStream(file))

  function ensure(h) {
    if (doc.y + h > PH - 70) {
      doc.addPage()
      doc.x = M
      doc.y = M
    }
  }

  const grad = doc.linearGradient(0, 0, PW, 128)
  grad.stop(0, accent).stop(1, accent2)
  doc.rect(0, 0, PW, 128).fill(grad)
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
    .text('SUIVICONNECT', M, 34, { characterSpacing: 2.4 })
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(27).text(title, M, 54)
  doc.fillColor('#E2E8F0').font('Helvetica').fontSize(10.5).text(subtitle, M, 92, { width: W })
  doc.x = M
  doc.y = 158

  function h2(text) {
    ensure(64)
    doc.y += 10
    const y = doc.y
    doc.rect(M, y + 3, 4, 15).fill(accent)
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(15).text(text, M + 14, y, { width: W - 14 })
    doc.y += 7
    doc.moveTo(M, doc.y).lineTo(M + W, doc.y).lineWidth(1).stroke('#E2E8F0')
    doc.y += 13
    doc.x = M
  }

  function sub(text) {
    ensure(34)
    doc.y += 4
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10.5).text(text, M, doc.y, { width: W })
    doc.y += 8
    doc.x = M
  }

  function para(text) {
    doc.font('Helvetica').fontSize(10)
    ensure(doc.heightOfString(text, { width: W, lineGap: 3 }) + 8)
    doc.fillColor('#475569').text(text, M, doc.y, { width: W, lineGap: 3 })
    doc.y += 10
    doc.x = M
  }

  function step(n, stepTitle, body) {
    const padX = 16, padY = 14, d = 28
    const tx = M + padX + d + 13
    const tw = W - padX * 2 - d - 13
    doc.font('Helvetica-Bold').fontSize(10.5)
    const th = doc.heightOfString(stepTitle, { width: tw })
    doc.font('Helvetica').fontSize(9.5)
    const bh = doc.heightOfString(body, { width: tw, lineGap: 2.5 })
    const boxH = padY * 2 + th + 5 + bh
    ensure(boxH + 10)
    const y = doc.y
    doc.roundedRect(M, y, W, boxH, 10).fillAndStroke('#F8FAFC', '#E2E8F0')
    const cx = M + padX + d / 2, cy = y + padY + d / 2
    doc.circle(cx, cy, d / 2).fill(accent)
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11)
      .text(String(n), cx - d / 2, cy - 5.5, { width: d, align: 'center' })
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10.5).text(stepTitle, tx, y + padY, { width: tw })
    doc.fillColor('#64748B').font('Helvetica').fontSize(9.5)
      .text(body, tx, y + padY + th + 5, { width: tw, lineGap: 2.5 })
    doc.y = y + boxH + 9
    doc.x = M
  }

  function bullet(bTitle, body) {
    const padX = 16, padY = 13, dotX = M + padX + 4
    const tx = M + padX + 18
    const tw = W - padX * 2 - 18
    doc.font('Helvetica-Bold').fontSize(10)
    const th = doc.heightOfString(bTitle, { width: tw })
    doc.font('Helvetica').fontSize(9.5)
    const bh = doc.heightOfString(body, { width: tw, lineGap: 2.5 })
    const boxH = padY * 2 + th + 4 + bh
    ensure(boxH + 8)
    const y = doc.y
    doc.roundedRect(M, y, W, boxH, 10).fillAndStroke('#F8FAFC', '#E2E8F0')
    doc.circle(dotX, y + padY + 5, 3.2).fill(accent)
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text(bTitle, tx, y + padY, { width: tw })
    doc.fillColor('#64748B').font('Helvetica').fontSize(9.5)
      .text(body, tx, y + padY + th + 4, { width: tw, lineGap: 2.5 })
    doc.y = y + boxH + 8
    doc.x = M
  }

  function callout(label, text, kind) {
    const bg = kind === 'warn' ? '#FFFBEB' : noteBg
    const br = kind === 'warn' ? '#FDE68A' : noteBorder
    const fg = kind === 'warn' ? '#92400E' : noteFg
    const padX = 16, padY = 13
    const tw = W - padX * 2
    doc.font('Helvetica').fontSize(9.5)
    const h = doc.heightOfString(label + text, { width: tw, lineGap: 2.5 })
    const boxH = h + padY * 2
    ensure(boxH + 10)
    const y = doc.y
    doc.roundedRect(M, y, W, boxH, 9).fillAndStroke(bg, br)
    doc.fillColor(fg).font('Helvetica-Bold').fontSize(9.5)
      .text(label, M + padX, y + padY, { width: tw, lineGap: 2.5, continued: true })
    doc.font('Helvetica').text(text)
    doc.y = y + boxH + 10
    doc.x = M
  }

  function kv(label, value) {
    const lw = 132
    doc.font('Helvetica-Bold').fontSize(9.5)
    const lh = doc.heightOfString(label, { width: lw - 20 })
    doc.font('Helvetica').fontSize(9.5)
    const vh = doc.heightOfString(value, { width: W - lw - 20, lineGap: 2 })
    const rowH = Math.max(lh, vh) + 18
    ensure(rowH + 2)
    const y = doc.y
    doc.rect(M, y, lw, rowH).fill('#F8FAFC')
    doc.rect(M, y, W, rowH).lineWidth(0.8).stroke('#E2E8F0')
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9.5).text(label, M + 11, y + 9, { width: lw - 20 })
    doc.fillColor('#64748B').font('Helvetica').fontSize(9.5)
      .text(value, M + lw + 11, y + 9, { width: W - lw - 22, lineGap: 2 })
    doc.y = y + rowH
    doc.x = M
  }

  for (const b of blocks) {
    if (b.t === 'h2') h2(b.text)
    else if (b.t === 'sub') sub(b.text)
    else if (b.t === 'p') para(b.text)
    else if (b.t === 'step') step(b.n, b.title, b.text)
    else if (b.t === 'bullet') bullet(b.title, b.text)
    else if (b.t === 'note') callout('À noter : ', b.text, 'info')
    else if (b.t === 'warn') callout('Important : ', b.text, 'warn')
    else if (b.t === 'kv') kv(b.label, b.text)
  }

  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i)
    doc.page.margins.bottom = 0
    doc.moveTo(M, PH - 54).lineTo(PW - M, PH - 54).lineWidth(0.8).stroke('#E2E8F0')
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
      .text(footer, M, PH - 44, { width: W / 2, align: 'left' })
    doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
      .text(`Page ${i + 1} / ${range.count}`, M + W / 2, PH - 44, { width: W / 2, align: 'right' })
  }

  doc.end()
  return new Promise((resolve) => doc.on('end', resolve))
}

fs.mkdirSync(OUT_DIR, { recursive: true })

await buildGuide({
  file: path.join(OUT_DIR, 'Guide-Patient-SuiviConnect.pdf'),
  title: 'Guide Patient',
  subtitle: "Tout ce que vous devez savoir pour utiliser votre espace de suivi médical",
  footer: 'SuiviConnect — Guide Patient',
  accent: '#2563EB',
  accent2: '#7C3AED',
  noteBg: '#EFF6FF',
  noteBorder: '#BFDBFE',
  noteFg: '#1E40AF',
  blocks: patientBlocks,
})

await buildGuide({
  file: path.join(OUT_DIR, 'Guide-Medecin-SuiviConnect.pdf'),
  title: 'Guide Médecin',
  subtitle: 'Maîtrisez toutes les fonctionnalités de la plateforme de suivi médical',
  footer: 'SuiviConnect — Guide Médecin',
  accent: '#059669',
  accent2: '#2563EB',
  noteBg: '#ECFDF5',
  noteBorder: '#A7F3D0',
  noteFg: '#065F46',
  blocks: doctorBlocks,
})

console.log('OK ->', OUT_DIR)
