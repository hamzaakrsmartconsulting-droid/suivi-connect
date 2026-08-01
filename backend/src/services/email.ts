import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export async function sendReminderEmail(email: string, nomComplet: string) {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/suivi-hebdomadaire`;

  if (!process.env.SMTP_USER) {
    console.log(`[DEV] Rappel suivi envoyé à ${email} (${nomComplet})`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@suivi-medicale.fr',
    to: email,
    subject: 'Rappel : votre suivi hebdomadaire vous attend',
    html: `
      <p>Bonjour ${nomComplet},</p>
      <p>C'est l'heure de votre suivi hebdomadaire ! N'oubliez pas de renseigner vos mesures — cela aide votre médecin à adapter votre traitement.</p>
      <p><a href="${dashboardUrl}" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">Saisir mon suivi</a></p>
      <p style="color:#94A3B8;font-size:12px">Cela prend moins de 2 minutes.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.FRONTEND_URL}/reinitialiser-mot-de-passe?token=${token}`;

  if (!process.env.SMTP_USER) {
    console.log(`[DEV] Lien de réinitialisation pour ${email}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@suivi-medicale.fr',
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <p>Bonjour,</p>
      <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Ce lien expire dans 1 heure.</p>
    `,
  });
}
