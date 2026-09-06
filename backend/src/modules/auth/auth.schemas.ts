import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  email: z.string().email('El correo electrónico no es válido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula.')
    .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula.')
    .regex(/[0-9]/, 'Debe incluir al menos un número.')
    .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un carácter especial (!@#$%^&*).'),
});

export const loginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token de recuperación es requerido.'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula.')
    .regex(/[0-9]/, 'Debe incluir al menos un número.')
    .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un carácter especial.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
