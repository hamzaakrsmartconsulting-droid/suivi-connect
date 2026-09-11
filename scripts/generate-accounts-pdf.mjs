import PDFDocument from '../backend/node_modules/pdfkit/js/pdfkit.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'guides')
const OUT_FILE = path.join(OUT_DIR, 'Comptes-Demo-SuiviConnect.pdf')

// Adaptez cette URL si votre domaine Cloudflare Pages est different, puis relancez le script.
const APP_URL = 'https://suivi-medicale.pages.dev'
const API_URL = 'https://suivi-medicale-api.onrender.com'

const PW = 595.28
const PH = 841.89
const M = 50
const W = PW - M * 2

const accounts = [
  {
    group: 'Administrateur',
    color: '#7C3AED',
    bg: '#F5F3FF',
    items: [
      {
        role: 'ADMIN',
        name: 'Compte administrateur',
        meta: "Accès à la vue d'ensemble globale et à la gestion des utilisateurs",
        email: 'admin@suivi-connect.fr',
        password: 'Admin@SuiviConnect2024!',
        note: "Redirigé vers « Vue d'ensemble » à la connexion. Ce compte possède un mot de passe distinct des autres.",
      },
    ],
  },
  {
    group: 'Médecin',
    color: '#059669',
    bg: '#ECFDF5',
    items: [
      {
        role: 'MÉDECIN',
        name: 'Dr. Martin Dubois',
        meta: 'Cardiologie — suit les trois patients de démonstration',
        email: 'dr.martin@suivi.fr',
        password: 'Demo1234!',
        note: "Accès aux dossiers patients, prescriptions, ordonnances électroniques, agenda et messagerie.",
      },
    ],
  },
  {
    group: 'Patients',
    color: '#2563EB',
    bg: '#EFF6FF',
    items: [
      {
        role: 'PATIENT',
        name: 'Jean Dupont',
        meta: '62 ans — Ingénieur retraité — Risque FAIBLE (score 22)',
        email: 'jean.dupont@suivi.fr',
        password: 'Demo1234!',
        note: 'Bonne récupération : tension contrôlée, activité physique régulière, 4 médicaments actifs.',
      },
      {
        role: 'PATIENT',
        name: 'Marie Bernard',
        meta: '58 ans — Enseignante — Risque MODÉRÉ (score 41)',
        email: 'marie.bernard@suivi.fr',
        password: 'Demo1234!',
        note: 'Diabète de type 2, LDL légèrement élevé, adhésion médicamenteuse partielle. Alertes de niveau moyen non lues.',
      },
      {
        role: 'PATIENT',
        name: 'Pierre Leroy',
        meta: '71 ans — Commerçant retraité — Risque ÉLEVÉ (score 64)',
        email: 'pierre.leroy@suivi.fr',
        password: 'Demo1234!',
        note: "Hypertension non contrôlée, LDL élevé, sédentarité. Contient une alerte CRITIQUE : idéal pour tester le circuit d'alerte.",
      },
    ],
  },
]

const doc = new PDFDocument({ size: 'A4', margins: { top: M, bottom: M, left: M, right: M }, bufferPages: true })
doc.pipe(fs.createWriteStream(OUT_FILE))

function ensure(h) {
  if (doc.y + h > PH - 70) {
    doc.addPage()
    doc.x = M
    doc.y = M
  }
}

// ── Header ──────────────────────────────────────────────────────────────────
const grad = doc.linearGradient(0, 0, PW, 128)
grad.stop(0, '#0F172A').stop(1, '#1E40AF')
doc.rect(0, 0, PW, 128).fill(grad)
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
  .text('SUIVICONNECT', M, 32, { characterSpacing: 2.4 })
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(26).text('Comptes de démonstration', M, 52)
doc.fillColor('#CBD5E1').font('Helvetica').fontSize(10.5)
  .text('Identifiants de connexion pour tester la plateforme', M, 90, { width: W })
doc.x = M
doc.y = 152

// `reserve` keeps the heading on the same page as the block that follows it.
function h2(text, color, reserve = 0) {
  ensure(60 + reserve)
  doc.y += 8
  const y = doc.y
  doc.rect(M, y + 3, 4, 15).fill(color)
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(15).text(text, M + 14, y, { width: W - 14 })
  doc.y += 7
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).lineWidth(1).stroke('#E2E8F0')
  doc.y += 12
  doc.x = M
}

function callout(label, text, kind) {
  const map = {
    warn: { bg: '#FEF2F2', br: '#FECACA', fg: '#B91C1C' },
    info: { bg: '#EFF6FF', br: '#BFDBFE', fg: '#1E40AF' },
  }
  const { bg, br, fg } = map[kind]
  const padX = 16, padY = 13
  const tw = W - padX * 2
  doc.font('Helvetica').fontSize(9.5)
  const boxH = doc.heightOfString(label + text, { width: tw, lineGap: 2.5 }) + padY * 2
  ensure(boxH + 10)
  const y = doc.y
  doc.roundedRect(M, y, W, boxH, 9).fillAndStroke(bg, br)
  doc.fillColor(fg).font('Helvetica-Bold').fontSize(9.5)
    .text(label, M + padX, y + padY, { width: tw, lineGap: 2.5, continued: true })
  doc.font('Helvetica').text(text)
  doc.y = y + boxH + 11
  doc.x = M
}

function urlRow(label, value) {
  const lw = 150
  const rowH = 30
  ensure(rowH + 2)
  const y = doc.y
  doc.rect(M, y, lw, rowH).fill('#F8FAFC')
  doc.rect(M, y, W, rowH).lineWidth(0.8).stroke('#E2E8F0')
  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9.5).text(label, M + 12, y + 10, { width: lw - 24 })
  doc.fillColor('#1D4ED8').font('Courier').fontSize(9.5)
    .text(value, M + lw + 12, y + 10, { width: W - lw - 24, lineBreak: false })
  doc.y = y + rowH
  doc.x = M
}

function badge(x, y, text, color, bg) {
  doc.font('Helvetica-Bold').fontSize(7.5)
  const bw = doc.widthOfString(text, { characterSpacing: 0.9 }) + 20
  doc.roundedRect(x, y, bw, 17, 8.5).fill(bg)
  doc.fillColor(color).font('Helvetica-Bold').fontSize(7.5)
    .text(text, x + 10, y + 5, { characterSpacing: 0.9, lineBreak: false })
  return bw
}

function credRow(x, y, w, label, value) {
  doc.fillColor('#94A3B8').font('Helvetica-Bold').fontSize(7.5)
    .text(label, x, y + 8, { width: 84, characterSpacing: 0.6, lineBreak: false })
  const vx = x + 88
  const vw = w - 88
  doc.roundedRect(vx, y, vw, 25, 6).fillAndStroke('#FFFFFF', '#E2E8F0')
  doc.fillColor('#0F172A').font('Courier-Bold').fontSize(10.5)
    .text(value, vx + 11, y + 7.5, { width: vw - 22, lineBreak: false })
  return 25
}

function measureCard(a) {
  const padY = 15
  const innerW = W - 32
  doc.font('Helvetica').fontSize(8.5)
  const metaH = doc.heightOfString(a.meta, { width: innerW, lineGap: 1.5 })
  const noteH = a.note ? doc.heightOfString(a.note, { width: innerW, lineGap: 2 }) : 0
  return padY * 2 + 17 + 9 + metaH + 12 + 25 + 7 + 25 + (a.note ? 11 + noteH : 0)
}

function accountCard(a, color, bg) {
  const padX = 16, padY = 15
  const innerW = W - padX * 2

  doc.font('Helvetica').fontSize(8.5)
  const metaH = doc.heightOfString(a.meta, { width: innerW, lineGap: 1.5 })
  const boxH = measureCard(a)
  ensure(boxH + 10)

  const y = doc.y
  doc.roundedRect(M, y, W, boxH, 11).fillAndStroke('#F8FAFC', '#E2E8F0')
  doc.roundedRect(M, y, 4, boxH, 2).fill(color)

  let cy = y + padY
  const bw = badge(M + padX, cy, a.role, color, bg)
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11.5)
    .text(a.name, M + padX + bw + 11, cy + 3, { width: innerW - bw - 11, lineBreak: false })
  cy += 17 + 9

  doc.fillColor('#64748B').font('Helvetica').fontSize(8.5)
    .text(a.meta, M + padX, cy, { width: innerW, lineGap: 1.5 })
  cy += metaH + 12

  cy += credRow(M + padX, cy, innerW, 'EMAIL', a.email) + 7
  cy += credRow(M + padX, cy, innerW, 'MOT DE PASSE', a.password)

  if (a.note) {
    cy += 11
    doc.fillColor('#64748B').font('Helvetica').fontSize(8.5)
      .text(a.note, M + padX, cy, { width: innerW, lineGap: 2 })
  }

  doc.y = y + boxH + 10
  doc.x = M
}

// ── Body ────────────────────────────────────────────────────────────────────
callout(
  'Confidentiel : ',
  "Ce document contient des identifiants de connexion. Il est destiné uniquement aux tests et aux démonstrations. Ne le diffusez pas publiquement et modifiez ces mots de passe avant toute mise en production.",
  'warn',
)

h2("Adresses d'accès", '#1E40AF', 96)
urlRow('Application', APP_URL)
urlRow('API backend', API_URL)
urlRow('Développement local', 'http://localhost:5173')
doc.y += 4
callout(
  'À noter : ',
  "L'hébergement gratuit de l'API se met en veille après inactivité. La toute première connexion peut prendre 30 à 60 secondes, le temps que le serveur redémarre.",
  'info',
)

for (const g of accounts) {
  h2(g.group, g.color, measureCard(g.items[0]) + 10)
  for (const a of g.items) accountCard(a, g.color, g.bg)
}

h2('Réinitialiser les données', '#475569', 80)
callout(
  'Commande : ',
  "Pour restaurer l'ensemble des comptes et des données de démonstration, exécutez « npm run seed » depuis le dossier backend. Attention : cette commande efface toutes les données existantes avant de recréer les comptes ci-dessus.",
  'info',
)

// ── Footer ──────────────────────────────────────────────────────────────────
const range = doc.bufferedPageRange()
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i)
  doc.page.margins.bottom = 0
  doc.moveTo(M, PH - 54).lineTo(PW - M, PH - 54).lineWidth(0.8).stroke('#E2E8F0')
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
    .text('SuiviConnect — Comptes de démonstration — Confidentiel', M, PH - 44, { width: W / 2, align: 'left' })
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
    .text(`Page ${i + 1} / ${range.count}`, M + W / 2, PH - 44, { width: W / 2, align: 'right' })
}

fs.mkdirSync(OUT_DIR, { recursive: true })
doc.end()
doc.on('end', () => console.log('OK ->', OUT_FILE))
