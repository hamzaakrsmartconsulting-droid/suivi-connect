import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../../../public/ordonnances');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

interface Doctor {
  nomComplet: string;
  specialite: string;
  telephone?: string | null;
  adresse?: string | null;
  rppsNumber?: string | null;
  user?: { email?: string };
}

interface Patient {
  nomComplet: string;
  age: number;
  profession?: string | null;
}

interface Medication {
  nom: string;
  dosage: string;
  frequence: string;
  dateDebut: string | Date;
  dateFin?: string | Date | null;
  instructions?: string | null;
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export async function generateOrdonnancePdf(
  doctor: Doctor,
  patient: Patient,
  medications: Medication[],
  signatureDataUrl?: string // base64 PNG from canvas
): Promise<string> {
  const filename = `ordonnance-${randomUUID()}.pdf`;
  const filePath = path.join(OUTPUT_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W = 595; // A4 width pt
    const PX = 56; // horizontal padding
    const blue = '#2563EB';
    const darkBlue = '#0F172A';
    const gray = '#64748B';
    const lightGray = '#E2E8F0';
    const purple = '#7C3AED';

    let y = 44;

    // ── HEADER ────────────────────────────────────────────────────────────
    doc.fontSize(17).fillColor(darkBlue).font('Helvetica-Bold')
       .text(`Dr. ${doctor.nomComplet}`, PX, y);
    y += 22;

    doc.fontSize(10).fillColor(blue).font('Helvetica-Bold')
       .text(doctor.specialite, PX, y);
    y += 16;

    doc.fontSize(9).fillColor(gray).font('Helvetica');
    if (doctor.telephone) { doc.text(`Tél : ${doctor.telephone}`, PX, y); y += 13; }
    if (doctor.user?.email) { doc.text(`Email : ${doctor.user.email}`, PX, y); y += 13; }
    if (doctor.adresse)   { doc.text(`Adresse : ${doctor.adresse}`, PX, y); y += 13; }
    if (doctor.rppsNumber){ doc.text(`RPPS : ${doctor.rppsNumber}`, PX, y); y += 13; }

    // Logo top-right
    doc.fontSize(13).fillColor(blue).font('Helvetica-Bold')
       .text('SuiviConnect', W - PX - 80, 44, { width: 80, align: 'right' });

    // Date
    const dateStr = `Fait le ${fmtDate(new Date())}`;
    doc.fontSize(9).fillColor(gray).font('Helvetica')
       .text(dateStr, W - PX - 180, 62, { width: 180, align: 'right' });

    y = Math.max(y, 110) + 10;

    // ── DIVIDER ───────────────────────────────────────────────────────────
    doc.save()
       .moveTo(PX, y).lineTo(W - PX, y)
       .lineWidth(2).strokeColor(blue).stroke()
       .restore();
    y += 14;

    // ── PATIENT BOX ───────────────────────────────────────────────────────
    doc.save()
       .rect(PX, y, W - PX * 2, 50)
       .fillColor('#F8FAFC').fill()
       .rect(PX, y, W - PX * 2, 50)
       .lineWidth(1).strokeColor(lightGray).stroke()
       .restore();

    const pY = y + 10;
    doc.fontSize(10).fillColor(gray).font('Helvetica-Bold').text('Patient :', PX + 12, pY);
    doc.fillColor(darkBlue).font('Helvetica-Bold').text(patient.nomComplet, PX + 80, pY);
    doc.fontSize(10).fillColor(gray).font('Helvetica-Bold').text('Âge :', PX + 12, pY + 16);
    doc.fillColor(darkBlue).font('Helvetica-Bold').text(`${patient.age} ans`, PX + 80, pY + 16);
    if (patient.profession) {
      doc.fontSize(10).fillColor(gray).font('Helvetica-Bold').text('Profession :', PX + 12, pY + 32);
      doc.fillColor(darkBlue).font('Helvetica-Bold').text(patient.profession, PX + 80, pY + 32);
    }

    y += 60;

    // ── Rx SYMBOL ─────────────────────────────────────────────────────────
    doc.fontSize(36).fillColor(blue).font('Helvetica-Bold').text('Rx', PX, y);
    y += 46;

    // ── MEDICATIONS ───────────────────────────────────────────────────────
    for (let i = 0; i < medications.length; i++) {
      const m = medications[i];

      // Number circle
      doc.save()
         .circle(PX + 11, y + 10, 11)
         .fillColor(blue).fill()
         .restore();
      doc.fontSize(9).fillColor('white').font('Helvetica-Bold')
         .text(String(i + 1), PX + 6, y + 5, { width: 11, align: 'center' });

      // Drug name + dosage
      doc.fontSize(14).fillColor(darkBlue).font('Helvetica-Bold')
         .text(m.nom, PX + 28, y, { continued: true });
      doc.fontSize(12).fillColor(blue).font('Helvetica-Bold')
         .text(`  ${m.dosage}`);
      y += 20;

      // Frequency
      doc.fontSize(10).fillColor('#374151').font('Helvetica-Oblique')
         .text(m.frequence, PX + 28, y);
      y += 14;

      // Dates
      let datesStr = `Du ${fmtDate(m.dateDebut)}`;
      datesStr += m.dateFin ? ` au ${fmtDate(m.dateFin)}` : ' — durée continue';
      doc.fontSize(9).fillColor(gray).font('Helvetica').text(datesStr, PX + 28, y);
      y += 13;

      // Instructions
      if (m.instructions) {
        doc.fontSize(9).fillColor(purple).font('Helvetica-Oblique')
           .text(`ℹ ${m.instructions}`, PX + 28, y);
        y += 13;
      }

      // Separator
      if (i < medications.length - 1) {
        doc.save()
           .moveTo(PX + 28, y + 4).lineTo(W - PX, y + 4)
           .lineWidth(0.5).dash(4, { space: 4 }).strokeColor(lightGray).stroke()
           .restore();
        y += 16;
      } else {
        y += 8;
      }
    }

    y += 20;

    // ── FOOTER LINE ───────────────────────────────────────────────────────
    doc.save()
       .moveTo(PX, y).lineTo(W - PX, y)
       .lineWidth(0.5).strokeColor(lightGray).stroke()
       .restore();
    y += 20;

    // ── SIGNATURE ─────────────────────────────────────────────────────────
    const sigX = PX;
    const sigY = y;

    doc.fontSize(8).fillColor(gray).font('Helvetica')
       .text('SIGNATURE DU MÉDECIN', sigX, sigY);

    // Embed drawn signature image (base64 PNG) if provided
    if (signatureDataUrl && signatureDataUrl.startsWith('data:image/png;base64,')) {
      const base64Data = signatureDataUrl.replace('data:image/png;base64,', '');
      const imgBuf = Buffer.from(base64Data, 'base64');
      try {
        doc.image(imgBuf, sigX, sigY + 12, { width: 180, height: 70 });
      } catch { /* silently skip if image fails */ }
      y = sigY + 90;
    } else {
      // Draw a placeholder line
      doc.save()
         .moveTo(sigX, sigY + 80).lineTo(sigX + 180, sigY + 80)
         .lineWidth(1).strokeColor('#94A3B8').stroke()
         .restore();
      y = sigY + 90;
    }

    doc.fontSize(9).fillColor(gray).font('Helvetica')
       .text(`Dr. ${doctor.nomComplet}`, sigX, y);

    // ── STAMP (circular text simulation) ──────────────────────────────────
    const stX = W - PX - 80;
    const stY = sigY;
    const r = 55;
    const cx = stX + r;
    const cy = stY + r;

    doc.save()
       .circle(cx, cy, r)
       .lineWidth(2.5).strokeColor('#1D4ED8').stroke()
       .restore();

    doc.save()
       .circle(cx, cy, r - 6)
       .lineWidth(0.5).strokeColor('#BFDBFE').stroke()
       .restore();

    doc.fontSize(7).fillColor('#1D4ED8').font('Helvetica-Bold')
       .text(doctor.nomComplet.toUpperCase(), stX, cy - 28, { width: r * 2, align: 'center' });
    doc.fontSize(7.5).fillColor('#3B82F6').font('Helvetica-Bold')
       .text(doctor.specialite, stX, cy - 10, { width: r * 2, align: 'center' });
    doc.fontSize(9).fillColor('#2563EB').font('Helvetica-Bold')
       .text('✦', stX, cy + 6, { width: r * 2, align: 'center' });
    doc.fontSize(7).fillColor('#93C5FD').font('Helvetica')
       .text(doctor.rppsNumber ? `RPPS ${doctor.rppsNumber}` : 'Médecin', stX, cy + 20, { width: r * 2, align: 'center' });

    // ── FOOTER NOTE ───────────────────────────────────────────────────────
    const noteY = 800;
    doc.fontSize(7.5).fillColor('#CBD5E1').font('Helvetica')
       .text(
         'Document généré par SuiviConnect — Plateforme de suivi cardiologique. Ce document est confidentiel.',
         PX, noteY, { width: W - PX * 2, align: 'center' }
       );

    doc.end();
    stream.on('finish', () => resolve(`/ordonnances/${filename}`));
    stream.on('error', reject);
  });
}
