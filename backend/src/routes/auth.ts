import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshExpiry } from '../lib/jwt.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { AppError } from '../middleware/errorHandler.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Trop de tentatives, réessayez plus tard' },
});

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  role: z.enum(['PATIENT', 'DOCTOR']),
  nomComplet: z.string().min(2),
  age: z.number().int().min(18).max(120).optional(),
  taille: z.number().positive().optional(),
  profession: z.string().optional(),
  dateProcedure: z.string().optional(),
  specialite: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Cet email est déjà utilisé');

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role as Role,
        ...(data.role === 'PATIENT'
          ? {
              patientProfile: {
                create: {
                  nomComplet: data.nomComplet,
                  age: data.age || 50,
                  taille: data.taille || 170,
                  profession: data.profession,
                  dateProcedure: data.dateProcedure ? new Date(data.dateProcedure) : new Date(),
                },
              },
            }
          : {
              doctorProfile: {
                create: {
                  nomComplet: data.nomComplet,
                  specialite: data.specialite || 'Cardiologie',
                },
              },
            }),
      },
      include: { patientProfile: true, doctorProfile: true },
    });

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getRefreshExpiry() },
    });

    // Auto-assign new patient to the doctor with the fewest patients
    if (data.role === 'PATIENT' && user.patientProfile) {
      const doctors = await prisma.doctorProfile.findMany({
        include: { _count: { select: { patients: true } } },
        orderBy: { createdAt: 'asc' },
      });

      if (doctors.length > 0) {
        // Pick the doctor with the smallest patient load
        const leastLoaded = doctors.reduce((a, b) =>
          a._count.patients <= b._count.patients ? a : b
        );

        await prisma.doctorPatient.create({
          data: { doctorId: leastLoaded.id, patientId: user.patientProfile.id },
        });

        // Notify the assigned doctor
        const { createNotification } = await import('../services/notifications.js');
        await createNotification(
          leastLoaded.userId,
          'Nouveau patient assigné',
          `${data.nomComplet} vient de rejoindre votre liste de patients.`,
          'patient'
        );
      }
    }

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.patientProfile || user.doctorProfile,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { patientProfile: true, doctorProfile: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'Email ou mot de passe incorrect');
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getRefreshExpiry() },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.patientProfile || user.doctorProfile,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpires },
      });

      await sendPasswordResetEmail(email, resetToken);
    }

    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = z
      .object({ token: z.string(), password: z.string().min(8) })
      .parse(req.body);

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
    });

    if (!user) throw new AppError(400, 'Token invalide ou expiré');

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpires: null },
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Refresh token invalide');
    }

    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken(payload);

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    res.json({ message: 'Déconnexion réussie' });
  } catch (err) {
    next(err);
  }
});

export default router;
