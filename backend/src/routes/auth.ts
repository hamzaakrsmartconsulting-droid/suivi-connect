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

const registerSchema = z
  .object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    role: z.enum(['PATIENT', 'DOCTOR']),
    nomComplet: z.string().min(2, 'Le nom complet est requis'),
    age: z.number().int().min(18, 'L\'âge minimum est 18 ans').max(120).optional(),
    taille: z.number().positive('Taille invalide').min(100).max(250).optional(),
    profession: z.string().optional(),
    dateProcedure: z.string().optional(),
    specialite: z.string().min(2).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'PATIENT') {
      if (data.age == null) {
        ctx.addIssue({ code: 'custom', path: ['age'], message: 'L\'âge est requis' });
      }
      if (data.taille == null) {
        ctx.addIssue({ code: 'custom', path: ['taille'], message: 'La taille est requise' });
      }
      if (!data.dateProcedure) {
        ctx.addIssue({ code: 'custom', path: ['dateProcedure'], message: 'La date de procédure est requise' });
      }
    }
    if (data.role === 'DOCTOR' && !data.specialite?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['specialite'], message: 'La spécialité est requise' });
    }
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'Cet email est déjà utilisé');

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: data.role as Role,
        ...(data.role === 'PATIENT'
          ? {
              patientProfile: {
                create: {
                  nomComplet: data.nomComplet.trim(),
                  age: data.age!,
                  taille: data.taille!,
                  profession: data.profession?.trim() || null,
                  dateProcedure: new Date(data.dateProcedure!),
                },
              },
            }
          : {
              doctorProfile: {
                create: {
                  nomComplet: data.nomComplet.trim(),
                  specialite: data.specialite!.trim(),
                },
              },
            }),
      },
      include: { patientProfile: true, doctorProfile: true },
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

    // No auto-login: client must authenticate via /login
    res.status(201).json({
      message: 'Compte créé avec succès. Veuillez vous connecter.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS   = 15 * 60 * 1000; // 15 minutes

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email: rawEmail, password } = loginSchema.parse(req.body);
    const email = rawEmail.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { patientProfile: true, doctorProfile: true },
    });

    const passwordOk = user && await bcrypt.compare(password, user.passwordHash);

    if (!user || !passwordOk) {
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
