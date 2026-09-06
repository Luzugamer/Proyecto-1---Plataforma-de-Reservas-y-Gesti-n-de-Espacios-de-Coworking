import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';
import { UserRole } from '@prisma/client';

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function generateAccessToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
}

import crypto from 'crypto';

export function generateRefreshToken(payload: { userId: string }): string {
  return jwt.sign(
    {
      userId: payload.userId,
      jti: crypto.randomUUID(),
    },
    ENV.JWT_REFRESH_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as JwtUserPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { userId: string };
}
