import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: Number(process.env.PORT || 4000),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_secret_access_key',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
};

if (ENV.NODE_ENV === 'production') {
  if (!ENV.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria en producción.');
  if (ENV.JWT_ACCESS_SECRET === 'dev_secret_access_key' || ENV.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET debe ser un secreto de al menos 32 caracteres en producción.');
  }
}
