import { prisma } from '../lib/prisma.js';
import { emitToUser } from '../services/socket.js';

export async function createNotification(
  userId: string,
  titre: string,
  message: string,
  type: string
) {
  const notification = await prisma.notification.create({
    data: { userId, titre, message, type },
  });

  emitToUser(userId, 'notification', notification);
  return notification;
}

export async function notifyPatientDoctors(patientId: string, titre: string, message: string, type: string) {
  const links = await prisma.doctorPatient.findMany({
    where: { patientId },
    include: { doctor: { include: { user: true } } },
  });

  for (const link of links) {
    await createNotification(link.doctor.userId, titre, message, type);
    emitToUser(link.doctor.userId, 'new_alert', { patientId, titre, message });
  }
}
