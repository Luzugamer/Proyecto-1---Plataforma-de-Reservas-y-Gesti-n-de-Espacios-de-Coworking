import jwt, { SignOptions } from 'jsonwebtoken';
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
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

import crypto from 'crypto';

export function generateRefreshToken(_payload: { userId: string }): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as JwtUserPayload;
}
