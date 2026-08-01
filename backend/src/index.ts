import 'dotenv/config';
import { createServer } from 'http';
import cron from 'node-cron';
import app from './app.js';
import { initSocket } from './services/socket.js';
import { prisma } from './lib/prisma.js';
import { createNotification } from './services/notifications.js';
import { sendReminderEmail } from './services/email.js';

const PORT = parseInt(process.env.PORT || '3000');

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

// ─── Weekly follow-up reminder ────────────────────────────────────────────────
// Runs every Monday at 08:00 (server time)
// Notifies patients who haven't submitted a follow-up in the past 8 days
cron.schedule('0 8 * * 1', async () => {
  console.log('[Cron] Running weekly follow-up reminder…');
  try {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    const patients = await prisma.patientProfile.findMany({
      include: {
        user: { select: { email: true } },
        followUps: { orderBy: { semaine: 'desc' }, take: 1 },
      },
    });

    let reminded = 0;
    for (const patient of patients) {
      const lastFollowUp = patient.followUps[0];
      const needsReminder = !lastFollowUp || new Date(lastFollowUp.semaine) < eightDaysAgo;

      if (needsReminder) {
        await createNotification(
          patient.userId,
          'Rappel : suivi hebdomadaire',
          'N\'oubliez pas de saisir votre suivi hebdomadaire. Cela prend moins de 2 minutes et aide votre médecin à adapter votre traitement.',
          'reminder'
        );

        // Also send email if configured
        if (patient.user.email && process.env.SMTP_HOST) {
          try {
            await sendReminderEmail(patient.user.email, patient.nomComplet);
          } catch { /* email optional */ }
        }

        reminded++;
      }
    }
    console.log(`[Cron] Sent reminders to ${reminded} patient(s).`);
  } catch (err) {
    console.error('[Cron] Weekly reminder failed:', err);
  }
});
