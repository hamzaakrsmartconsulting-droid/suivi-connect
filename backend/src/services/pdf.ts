import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';
import { ClinicalRiskPredictor } from './riskEngine.js';

export async function generatePatientReport(patientId: string): Promise<Buffer> {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: patientId },
    include: {
      user: { select: { email: true } },
      followUps: { orderBy: { semaine: 'desc' }, take: 12 },
      medications: { where: { actif: true } },
    },
  });

  if (!patient) throw new Error('Patient introuvable');

  const predictor = new ClinicalRiskPredictor();
  const risk = await predictor.calculate(patientId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#1565C0').text('Rapport de Suivi Cardiaque', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).fillColor('#1565C0').text('Informations Patient');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Nom : ${patient.nomComplet}`);
    doc.text(`Âge : ${patient.age} ans`);
    doc.text(`Taille : ${patient.taille} cm`);
    doc.text(`Profession : ${patient.profession || 'Non renseignée'}`);
    doc.text(`Date de procédure : ${patient.dateProcedure.toLocaleDateString('fr-FR')}`);
    doc.text(`Stade de rééducation : ${patient.stadeRecommande}`);
    doc.moveDown();

    doc.fontSize(14).fillColor('#1565C0').text('Score de Santé Cardiaque');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Score global : ${risk.score.toFixed(0)}/100`);
    doc.text(`Niveau de risque : ${risk.niveau}`);
    if (risk.facteurs.length > 0) {
      doc.text('Facteurs de risque :');
      risk.facteurs.forEach((f) => doc.text(`  • ${f}`));
    }
    doc.moveDown();

    if (patient.followUps.length > 0) {
      doc.fontSize(14).fillColor('#1565C0').text('Historique des Mesures');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333');

      const headers = ['Semaine', 'Poids', 'TA', 'LDL', 'Activité'];
      const colWidths = [90, 65, 80, 65, 75];
      const colX = colWidths.map((_, i) => 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0));

      // Header row — all columns share the same y so text sits on one line
      const headerY = doc.y;
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold').text(h, colX[i], headerY, { width: colWidths[i], lineBreak: false });
      });
      doc.font('Helvetica');
      doc.moveDown(1.2);

      patient.followUps.slice(0, 8).forEach((f) => {
        const row = [
          f.semaine.toLocaleDateString('fr-FR'),
          `${f.poids} kg`,
          `${f.tensionSys}/${f.tensionDia}`,
          `${f.ldl} g/L`,
          `${f.activiteMinutes} min`,
        ];
        const rowY = doc.y;
        row.forEach((cell, i) => {
          doc.text(cell, colX[i], rowY, { width: colWidths[i], lineBreak: false });
        });
        doc.moveDown(0.9);
      });
      doc.moveDown();
    }

    if (patient.medications.length > 0) {
      doc.fontSize(14).fillColor('#1565C0').text('Médicaments Actifs');
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#333');
      patient.medications.forEach((m) => {
        doc.text(`• ${m.nom} - ${m.dosage} (${m.frequence})`);
      });
    }

    doc.end();
  });
}
