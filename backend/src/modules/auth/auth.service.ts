import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Prisma, PlanTier } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { addCalendarMonth } from '../../shared/utils/dateTime.js';
import { AppError } from '../../shared/utils/errors.js';
import { generateAccessToken, generateRefreshToken } from '../../shared/utils/jwt.js';
import { RegisterInput, LoginInput, RefreshTokenInput, ForgotPasswordInput, ResetPasswordInput } from './auth.schemas.js';

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60_000;
const BCRYPT_COST = 12;
// Hash válido usado para igualar aproximadamente el costo temporal cuando el email no existe.
const DUMMY_PASSWORD_HASH = '$2a$12$hZrxYFyuB3WLm.AWok7F2OH7tDnBjlWzHwLGNu7P3yFI.xS8CPrje';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function lockLoginEmail(tx: Prisma.TransactionClient, email: string) {
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(hashtextextended(${`login:${email}`}, 0))`;
}

export class AuthService {
  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) throw new AppError('EMAIL_ALREADY_REGISTERED', 'El correo ya se encuentra registrado.', 409);

      const periodStart = new Date();
      const periodEnd = addCalendarMonth(periodStart);
      const user = await tx.user.create({
        data: {
          name: input.name.trim(),
          email,
          passwordHash,
          role: 'MEMBER',
          wallet: { create: { balance: 10 } },
          subscription: {
            create: {
              planId: PlanTier.STARTER,
              status: 'ACTIVE',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              autoRenew: true,
            },
          },
        },
        include: { wallet: true },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: user.wallet!.id,
          userId: user.id,
          type: 'GRANT',
          amount: 10,
          balanceAfter: 10,
          description: 'Asignación inicial — Plan Starter',
        },
      });
      return { userId: user.id, name: user.name, email: user.email, role: user.role };
    });
  }

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    const now = new Date();
    const initialAttempt = await prisma.loginAttempt.findUnique({ where: { normalizedEmail: email } });
    if (initialAttempt?.lockedUntil && initialAttempt.lockedUntil > now) {
      throw new AppError('ACCOUNT_LOCKED', 'La cuenta está bloqueada temporalmente.', 423, {
        lockedUntil: initialAttempt.lockedUntil.toISOString(),
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) {
      const attempt = await prisma.$transaction(async (tx) => {
        await lockLoginEmail(tx, email);
        const current = await tx.loginAttempt.findUnique({ where: { normalizedEmail: email } });
        const windowExpired = !current || current.windowStartedAt.getTime() + ATTEMPT_WINDOW_MS <= now.getTime();
        const failedCount = windowExpired ? 1 : current.failedCount + 1;
        const lockedUntil = failedCount >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + ATTEMPT_WINDOW_MS) : null;
        return tx.loginAttempt.upsert({
          where: { normalizedEmail: email },
          create: { normalizedEmail: email, failedCount, windowStartedAt: now, lockedUntil },
          update: {
            failedCount,
            windowStartedAt: windowExpired ? now : current!.windowStartedAt,
            lockedUntil,
          },
        });
      });
      if (attempt.lockedUntil) {
        throw new AppError('ACCOUNT_LOCKED', 'La cuenta fue bloqueada por 15 minutos tras 5 intentos fallidos.', 423, {
          lockedUntil: attempt.lockedUntil.toISOString(),
        });
      }
      throw new AppError('INVALID_CREDENTIALS', 'Correo electrónico o contraseña incorrectos.', 401);
    }

    await prisma.$transaction(async (tx) => {
      await lockLoginEmail(tx, email);
      const attempt = await tx.loginAttempt.findUnique({ where: { normalizedEmail: email } });
      if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
        throw new AppError('ACCOUNT_LOCKED', 'La cuenta está bloqueada temporalmente.', 423, {
          lockedUntil: attempt.lockedUntil.toISOString(),
        });
      }
      await tx.loginAttempt.deleteMany({ where: { normalizedEmail: email } });
    });

    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    const refreshToken = generateRefreshToken({ userId: user.id });
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 30 * 86_400_000) },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refreshToken(input: RefreshTokenInput) {
    const tokenHash = hashToken(input.refreshToken);

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM refresh_tokens WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
      const existing = await tx.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
      if (!existing || existing.revokedAt || existing.expiresAt <= new Date()) {
        if (existing?.revokedAt) {
          await tx.refreshToken.updateMany({ where: { userId: existing.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        }
        return null;
      }

      await tx.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
      const accessToken = generateAccessToken({
        userId: existing.user.id,
        email: existing.user.email,
        role: existing.user.role,
        name: existing.user.name,
      });
      const refreshToken = generateRefreshToken({ userId: existing.user.id });
      await tx.refreshToken.create({
        data: {
          userId: existing.user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt: new Date(Date.now() + 30 * 86_400_000),
        },
      });
      return { accessToken, refreshToken, expiresIn: 900 };
    });
    if (!result) throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token inválido, reutilizado o revocado.', 401);
    return result;
  }

  async logout(input: RefreshTokenInput) {
    const tokenHash = hashToken(input.refreshToken);
    const result = await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) throw new AppError('INVALID_REFRESH_TOKEN', 'El refresh token es inválido o ya fue revocado.', 401);
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw new AppError('UNAUTHORIZED', 'La sesión ya no corresponde a un usuario válido.', 401);
    return user;
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60_000),
        },
      });
      // El envío de rawToken pertenece al proveedor de correo, fuera del alcance actual.
    }
    return { message: 'Si el email existe, se enviaron instrucciones.' };
  }

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashToken(input.token);
    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM password_reset_tokens WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
      const resetToken = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
        throw new AppError('INVALID_OR_EXPIRED_RESET_TOKEN', 'El token de recuperación es inválido o venció.', 400);
      }
      await tx.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
      await tx.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });
      await tx.refreshToken.updateMany({ where: { userId: resetToken.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      const email = await tx.user.findUnique({ where: { id: resetToken.userId }, select: { email: true } });
      if (email) await tx.loginAttempt.deleteMany({ where: { normalizedEmail: email.email } });
    });
    return { message: 'Contraseña actualizada.' };
  }
}
