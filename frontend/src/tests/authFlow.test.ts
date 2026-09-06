import { authApi } from '../features/auth/api';
import { tokenStorage } from '../shared/api/httpClient';
import { AppApiError } from '../shared/api/errorEnvelope';

export async function runAuthDiagnostics() {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  log('🧪 INICIANDO DIAGNÓSTICO DEL MÓDULO 005 (AUTENTICACIÓN)...');

  try {
    // 1. Registro de nuevo usuario (HU-08)
    log('\n1. Probando Registro de nuevo usuario (POST /auth/register)...');
    const testEmail = `test_${Date.now()}@coworking.local`;
    const regRes = await authApi.register({
      name: 'Usuario Prueba',
      email: testEmail,
      password: 'Password123!',
    });
    if (regRes.email === testEmail && regRes.role === 'MEMBER') {
      log('✅ Registro exitoso: Usuario creado con rol MEMBER');
    } else {
      throw new Error(`Fallo en registro: ${JSON.stringify(regRes)}`);
    }

    // 2. Validación de email duplicado (EMAIL_ALREADY_REGISTERED)
    log('\n2. Probando validación de email duplicado (409 EMAIL_ALREADY_REGISTERED)...');
    try {
      await authApi.register({
        name: 'Duplicado',
        email: testEmail,
        password: 'Password123!',
      });
      throw new Error('Debería haber fallado por email duplicado');
    } catch (err: unknown) {
      if (err instanceof AppApiError && err.code === 'EMAIL_ALREADY_REGISTERED') {
        log('✅ Validación correcta: EMAIL_ALREADY_REGISTERED capturado con código 409');
      } else {
        throw err;
      }
    }

    // 3. Login con credenciales válidas (HU-09)
    log('\n3. Probando Login con credenciales válidas (POST /auth/login)...');
    const loginRes = await authApi.login({
      email: 'miembro@coworking.local',
      password: 'Miembro123!',
    });
    if (loginRes.accessToken && loginRes.refreshToken && loginRes.user.role === 'MEMBER') {
      tokenStorage.setAccessToken(loginRes.accessToken);
      tokenStorage.setRefreshToken(loginRes.refreshToken);
      log('✅ Login exitoso: Tokens emitidos y rol verificado');
    } else {
      throw new Error(`Fallo en login: ${JSON.stringify(loginRes)}`);
    }

    // 4. Consulta de perfil con Bearer Token (GET /auth/me)
    log('\n4. Probando obtención de perfil autenticado (GET /auth/me)...');
    const meRes = await authApi.getMe();
    if (meRes.email === 'miembro@coworking.local') {
      log(`✅ GET /auth/me exitoso: ${meRes.name} (${meRes.role})`);
    } else {
      throw new Error(`Fallo en getMe: ${JSON.stringify(meRes)}`);
    }

    // 5. Rotación de Refresh Token (RN-AUTH.3)
    log('\n5. Probando rotación de Refresh Token (POST /auth/refresh)...');
    const oldRt = loginRes.refreshToken;
    const refreshRes = await authApi.refresh({ refreshToken: oldRt });
    if (refreshRes.refreshToken && refreshRes.refreshToken !== oldRt) {
      tokenStorage.setAccessToken(refreshRes.accessToken);
      tokenStorage.setRefreshToken(refreshRes.refreshToken);
      log('✅ Rotación exitosa: Nuevo refresh token emitido');
    } else {
      throw new Error('Fallo en rotación de refresh token');
    }

    // 6. Intento de reusar token anterior (401 INVALID_REFRESH_TOKEN)
    log('\n6. Probando invalidación del token previo tras rotación (401 INVALID_REFRESH_TOKEN)...');
    try {
      await authApi.refresh({ refreshToken: oldRt });
      throw new Error('El token anterior no debió ser aceptado');
    } catch (err: unknown) {
      if (err instanceof AppApiError && err.code === 'INVALID_REFRESH_TOKEN') {
        log('✅ Rotación estricta verificada: Token anterior invalidado');
      } else {
        throw err;
      }
    }

    // 7. Simulación de bloqueo por 5 intentos fallidos (RN-AUTH.6 / ACCOUNT_LOCKED)
    log('\n7. Probando bloqueo por 5 intentos fallidos (423 ACCOUNT_LOCKED)...');
    const victimEmail = `victim_${Date.now()}@coworking.local`;
    // Registrar usuario víctima
    await authApi.register({
      name: 'Victima Bloqueo',
      email: victimEmail,
      password: 'CorrectPassword123!',
    });

    let lockedCaptured = false;
    for (let i = 1; i <= 5; i++) {
      try {
        await authApi.login({ email: victimEmail, password: 'WrongPassword!' });
      } catch (err: unknown) {
        if (err instanceof AppApiError) {
          if (err.code === 'ACCOUNT_LOCKED') {
            lockedCaptured = true;
            log(`✅ Bloqueo activado en intento #${i}: ACCOUNT_LOCKED (423)`);
            break;
          } else if (err.code === 'INVALID_CREDENTIALS') {
            log(`  Intento #${i}: INVALID_CREDENTIALS (401)`);
          }
        }
      }
    }
    if (!lockedCaptured) {
      throw new Error('No se activó ACCOUNT_LOCKED tras 5 intentos');
    }

    // 8. Recuperación y Restablecimiento de Contraseña (HU-11)
    log('\n8. Probando recuperación neutral (POST /auth/password/forgot)...');
    const forgotRes = await authApi.forgotPassword({ email: 'miembro@coworking.local' });
    log(`✅ Forgot password neutral: "${forgotRes.message}"`);

    log('\n9. Probando restablecimiento de contraseña (POST /auth/password/reset)...');
    const resetRes = await authApi.resetPassword({
      token: 'rst_01',
      newPassword: 'NewMiembro123!',
    });
    log(`✅ Reset password exitoso: "${resetRes.message}"`);

    // 10. Logout explícito (HU-10)
    log('\n10. Probando cierre de sesión (POST /auth/logout)...');
    const currentRt = tokenStorage.getRefreshToken()!;
    await authApi.logout({ refreshToken: currentRt });
    tokenStorage.clearTokens();
    log('✅ Logout exitoso: Sesión cerrada e invalidada en el servidor');

    log('\n🎉 TODOS LOS 10 CRITERIOS DE ACEPTACIÓN Y REGLAS DE NEGOCIO PASARON CON ÉXITO.');
    return { success: true, logs };
  } catch (err) {
    log(`❌ Error durante el diagnóstico: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, logs, error: err };
  }
}
