import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/utils/errors.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/jwt.js';
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas.js';
import { PlanTier } from '@prisma/client';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos de bloqueo

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError(
        'EMAIL_ALREADY_REGISTERED',
        'El correo electrónico ya se encuentra registrado en el sistema.',
        409
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: 'MEMBER',
        wallet: {
          create: {
            balance: 10,
          },
        },
        subscription: {
          create: {
            planId: PlanTier.STARTER,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenew: true,
          },
        },
      },
      include: {
        wallet: true,
      },
    });

    if (user.wallet) {
      await prisma.walletTransaction.create({
        data: {
          walletId: user.wallet.id,
          userId: user.id,
          type: 'MONTHLY_ALLOWANCE',
          amount: 10,
          balanceAfter: 10,
          description: 'Bolsa de bienvenida inicial — Plan Starter (10 créditos)',
        },
      });
    }

    // Auto-login generando tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const rawRefreshToken = generateRefreshToken({ userId: user.id });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        'Correo electrónico o contraseña incorrectos.',
        401
      );
    }

    // Verificar si la cuenta está bloqueada
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      throw new AppError(
        'ACCOUNT_LOCKED',
        `La cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente en ${minutesRemaining} minutos.`,
        423,
        { lockedUntil: user.lockedUntil.toISOString() }
      );
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);

    if (!isMatch) {
      const newAttempts = user.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCK_TIME_MS);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        throw new AppError(
          'ACCOUNT_LOCKED',
          'Has alcanzado el límite de 5 intentos fallidos. Tu cuenta ha sido bloqueada por 15 minutos.',
          423,
          { lockedUntil: lockedUntil?.toISOString() }
        );
      }

      throw new AppError(
        'INVALID_CREDENTIALS',
        `Correo electrónico o contraseña incorrectos. Intentos restantes: ${MAX_FAILED_ATTEMPTS - newAttempts}`,
        401,
        { attemptsRemaining: MAX_FAILED_ATTEMPTS - newAttempts }
      );
    }

    // Reset de intentos fallidos al tener éxito
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const rawRefreshToken = generateRefreshToken({ userId: user.id });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async refreshToken(input: RefreshTokenInput) {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new AppError('INVALID_REFRESH_TOKEN', 'El refresh token es inválido o expiró.', 401);
    }

    const tokenHash = hashToken(input.refreshToken);
    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existingToken || existingToken.revokedAt || existingToken.expiresAt < new Date()) {
      // Si el token ya fue revocado o no existe -> Posible intento de reutilización maliciosa
      if (existingToken && existingToken.revokedAt) {
        // Revocar todos los tokens del usuario por seguridad
        await prisma.refreshToken.updateMany({
          where: { userId: payload.userId },
          data: { revokedAt: new Date() },
        });
      }
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token inválido, reutilizado o revocado.', 401);
    }

    // Rotación: Revocar el token actual
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    });

    const user = existingToken.user;
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const newRawRefreshToken = generateRefreshToken({ userId: user.id });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRawRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Sesión cerrada correctamente.' };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Usuario no encontrado.', 404);
    }

    return user;
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    // Respuesta neutral para evitar enumeración de cuentas
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora de validez
        },
      });

      // En un entorno productivo se enviaría el correo por SMTP/Resend
    }

    return {
      message: 'Si el correo electrónico existe en nuestra plataforma, recibirás instrucciones para restablecer tu contraseña.',
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashToken(input.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new AppError(
        'INVALID_OR_EXPIRED_RESET_TOKEN',
        'El enlace de recuperación de contraseña es inválido o ha expirado.',
        400
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.newPassword, salt);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revocar todos los refresh tokens existentes tras cambio de contraseña
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Tu contraseña ha sido actualizada con éxito.' };
  }
}
