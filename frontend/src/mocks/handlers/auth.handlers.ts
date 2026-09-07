import { http, HttpResponse } from 'msw';
import { UserRole } from '@/shared/types/user';

interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

// Base de datos en memoria para MSW
const mockUsers: Map<string, MockUser> = new Map([
  [
    'miembro@coworking.local',
    {
      id: 'u_member_01',
      name: 'Ana Torres (Miembro)',
      email: 'miembro@coworking.local',
      password: 'Miembro123!',
      role: 'MEMBER',
    },
  ],
  [
    'admin@coworking.local',
    {
      id: 'u_admin_01',
      name: 'Carlos Mendoza (Admin Sede)',
      email: 'admin@coworking.local',
      password: 'Admin123!',
      role: 'SITE_ADMIN',
    },
  ],
  [
    'recepcion@coworking.local',
    {
      id: 'u_rec_01',
      name: 'Laura Gómez (Recepción)',
      email: 'recepcion@coworking.local',
      password: 'Recepcion123!',
      role: 'RECEPTIONIST',
    },
  ],
]);

// Registro de intentos fallidos para simular RN-AUTH.6 (ACCOUNT_LOCKED)
const failedLoginAttempts: Map<string, { count: number; lockedUntil?: number }> = new Map();

// Registro de refresh tokens activos para simular rotación (RN-AUTH.3)
const activeRefreshTokens: Map<string, { userId: string; email: string }> = new Map([
  ['rt_01', { userId: 'u_member_01', email: 'miembro@coworking.local' }],
  ['rt_admin_01', { userId: 'u_admin_01', email: 'admin@coworking.local' }],
  ['rt_rec_01', { userId: 'u_rec_01', email: 'recepcion@coworking.local' }],
]);

// Tokens válidos para recuperación de contraseña
const validResetTokens = new Set(['rst_01']);

// Mapeo simple de access tokens en mock
const activeAccessTokens: Map<string, MockUser> = new Map();

export const authHandlers = [
  // POST */api/v1/auth/register
  http.post('*/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Todos los campos son requeridos.',
            details: { name: !name, email: !email, password: !password },
          },
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (mockUsers.has(normalizedEmail)) {
      return HttpResponse.json(
        {
          error: {
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'El correo electrónico ya tiene una cuenta asociada.',
          },
        },
        { status: 409 }
      );
    }

    const newUser: MockUser = {
      id: `u_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'MEMBER',
    };

    mockUsers.set(normalizedEmail, newUser);

    return HttpResponse.json(
      {
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      { status: 201 }
    );
  }),

  // POST */api/v1/auth/login
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email y contraseña requeridos.',
          },
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const attempts = failedLoginAttempts.get(normalizedEmail) || { count: 0 };

    // Verificar si está bloqueado por intentos fallidos
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      return HttpResponse.json(
        {
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Cuenta bloqueada temporalmente por superar los 5 intentos fallidos permitidos.',
          },
        },
        { status: 423 }
      );
    }

    const user = mockUsers.get(normalizedEmail);

    if (!user || user.password !== password) {
      const newCount = attempts.count + 1;
      if (newCount >= 5) {
        failedLoginAttempts.set(normalizedEmail, {
          count: newCount,
          lockedUntil: Date.now() + 15 * 60 * 1000, // 15 minutos
        });
        return HttpResponse.json(
          {
            error: {
              code: 'ACCOUNT_LOCKED',
              message: 'Cuenta bloqueada temporalmente tras 5 intentos fallidos consecutivos.',
            },
          },
          { status: 423 }
        );
      } else {
        failedLoginAttempts.set(normalizedEmail, { count: newCount });
        return HttpResponse.json(
          {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Email o contraseña incorrectos.',
            },
          },
          { status: 401 }
        );
      }
    }

    // Login exitoso: reiniciar contador
    failedLoginAttempts.delete(normalizedEmail);

    // Generar tokens
    const accessToken = `mock_at_${user.id}_${Date.now()}`;
    const refreshToken = `mock_rt_${user.id}_${Date.now()}`;

    activeRefreshTokens.set(refreshToken, { userId: user.id, email: user.email });
    activeAccessTokens.set(accessToken, user);

    return HttpResponse.json(
      {
        accessToken,
        refreshToken,
        expiresIn: 900,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );
  }),

  // POST */api/v1/auth/refresh
  http.post('*/api/v1/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };
    const { refreshToken } = body;

    if (!refreshToken || !activeRefreshTokens.has(refreshToken)) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'El refresh token es inválido, ya fue usado o fue revocado.',
          },
        },
        { status: 401 }
      );
    }

    const tokenData = activeRefreshTokens.get(refreshToken)!;
    const user = mockUsers.get(tokenData.email);

    if (!user) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Usuario no encontrado.',
          },
        },
        { status: 401 }
      );
    }

    // ROTACIÓN: Invalida el token anterior
    activeRefreshTokens.delete(refreshToken);

    const newAccessToken = `mock_at_${user.id}_${Date.now()}`;
    const newRefreshToken = `mock_rt_${user.id}_${Date.now()}`;

    activeRefreshTokens.set(newRefreshToken, { userId: user.id, email: user.email });
    activeAccessTokens.set(newAccessToken, user);

    return HttpResponse.json(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      },
      { status: 200 }
    );
  }),

  // POST */api/v1/auth/logout
  http.post('*/api/v1/auth/logout', async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };
    const { refreshToken } = body;

    if (!refreshToken || !activeRefreshTokens.has(refreshToken)) {
      return HttpResponse.json(
        { error: { code: 'INVALID_REFRESH_TOKEN', message: 'El refresh token es inválido o ya fue revocado.' } },
        { status: 401 }
      );
    }
    activeRefreshTokens.delete(refreshToken);

    return new HttpResponse(null, { status: 204 });
  }),

  // POST */api/v1/auth/password/forgot
  http.post('*/api/v1/auth/password/forgot', async () => {
    // Respuesta neutral 202 indistintamente de si el email existe
    return HttpResponse.json(
      {
        message: 'Si el email existe, se enviaron instrucciones.',
      },
      { status: 202 }
    );
  }),

  // POST */api/v1/auth/password/reset
  http.post('*/api/v1/auth/password/reset', async ({ request }) => {
    const body = (await request.json()) as { token?: string; newPassword?: string };
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token y nueva contraseña requeridos.',
          },
        },
        { status: 400 }
      );
    }

    if (!validResetTokens.has(token) && token !== 'rst_01') {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_OR_EXPIRED_RESET_TOKEN',
            message: 'El token de recuperación de contraseña es inválido o venció.',
          },
        },
        { status: 400 }
      );
    }

    // Actualizar contraseña de demostración
    const memberUser = mockUsers.get('miembro@coworking.local');
    if (memberUser) {
      memberUser.password = newPassword;
    }
    validResetTokens.delete(token);

    return HttpResponse.json(
      {
        message: 'Contraseña actualizada.',
      },
      { status: 200 }
    );
  }),

  // GET */api/v1/auth/me
  http.get('*/api/v1/auth/me', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token ausente o inválido.',
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const user = activeAccessTokens.get(token);

    if (!user) {
      // Fallback para permitir pruebas con tokens estructurados
      if (token.includes('u_admin_01')) {
        return HttpResponse.json(mockUsers.get('admin@coworking.local')!);
      }
      if (token.includes('u_rec_01')) {
        return HttpResponse.json(mockUsers.get('recepcion@coworking.local')!);
      }
      if (token.includes('u_member_01')) {
        return HttpResponse.json(mockUsers.get('miembro@coworking.local')!);
      }

      // Si no se encuentra en el mapa
      const firstUser = Array.from(mockUsers.values())[0];
      return HttpResponse.json({
        id: firstUser.id,
        name: firstUser.name,
        email: firstUser.email,
        role: firstUser.role,
      });
    }

    return HttpResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }),
];
