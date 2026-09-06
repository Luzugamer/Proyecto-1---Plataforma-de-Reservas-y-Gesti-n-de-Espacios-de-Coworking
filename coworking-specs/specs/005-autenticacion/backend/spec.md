# Especificación: Autenticación y Sesión — Backend

**Feature**: 005-autenticacion | **Tipo**: Backend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Implementa**: `specs/00-api-contracts.md` (Épica 0)

## Resumen
Registro, login, rotación de tokens JWT, logout, recuperación de contraseña y rate limiting de intentos fallidos. Es la spec de la que dependen todas las demás (001-004), ya que todos sus endpoints protegidos requieren un `accessToken` válido emitido aquí.

## Reglas de negocio que gobiernan esta spec
- **RN-AUTH.1** — Registro con nombre, email único, contraseña como hash (Argon2id), nunca texto plano.
- **RN-AUTH.2** — Roles: `MEMBER`, `SITE_ADMIN`, `RECEPTIONIST`, exactamente uno por usuario.
- **RN-AUTH.3** — Login devuelve `accessToken` (vida corta) + `refreshToken` (vida larga, un solo uso, rota en cada renovación).
- **RN-AUTH.4** — Renovación de sesión sin volver a pedir credenciales, mientras el refresh token sea válido.
- **RN-AUTH.5** — Logout revoca el refresh token actual; el access token ya emitido sigue vivo hasta su expiración natural.
- **RN-AUTH.6** — Bloqueo de 15 min tras 5 intentos fallidos consecutivos en 15 min, por email.
- **RN-AUTH.7** — Recuperación de contraseña con token de un solo uso, vida de 1 hora.

## Criterios de aceptación (EARS)
- CUANDO se registra un usuario con un email no existente, EL SISTEMA DEBERÁ crear la cuenta con rol `MEMBER` por defecto y almacenar la contraseña únicamente como hash Argon2id.
- SI el email ya existe, ENTONCES EL SISTEMA DEBERÁ responder `409 EMAIL_ALREADY_REGISTERED` sin crear una cuenta duplicada.
- CUANDO se hace login con credenciales correctas y la cuenta no está bloqueada, EL SISTEMA DEBERÁ emitir un `accessToken` JWT firmado (vida corta, ej. 15 min) y un `refreshToken` opaco de un solo uso (vida larga, ej. 30 días), y resetear el contador de intentos fallidos de ese email.
- SI las credenciales son incorrectas, ENTONCES EL SISTEMA DEBERÁ incrementar el contador de intentos fallidos de ese email en Redis (TTL 15 min) y responder `401 INVALID_CREDENTIALS`, con el mismo mensaje sin importar si falló el email o la contraseña.
- CUANDO el contador de intentos fallidos de un email alcanza 5 dentro de la ventana de 15 minutos, EL SISTEMA DEBERÁ rechazar todo intento posterior de login para ese email con `423 ACCOUNT_LOCKED` hasta que expire la ventana, incluso si las credenciales del intento son correctas.
- CUANDO se solicita `POST /auth/refresh` con un refresh token válido y no usado, EL SISTEMA DEBERÁ invalidar ese refresh token de inmediato y emitir un par nuevo (rotación) — un intento posterior de reutilizar el token viejo debe fallar con `401 INVALID_REFRESH_TOKEN`.
- CUANDO se solicita logout, EL SISTEMA DEBERÁ revocar el refresh token recibido de forma que ninguna llamada futura a `/auth/refresh` con ese token tenga éxito.
- CUANDO se solicita recuperación de contraseña, EL SISTEMA DEBERÁ responder siempre `202` con el mismo mensaje, y solo si el email existe generar internamente un token de un solo uso con TTL de 1 hora (sin revelar por la respuesta si el email existía).
- CUANDO se envía `POST /auth/password/reset` con un token válido y no vencido, EL SISTEMA DEBERÁ actualizar la contraseña (nuevo hash), invalidar ese token, y revocar todos los refresh tokens activos del usuario (forzar re-login en todos los dispositivos).
- SI el token de reset ya venció o ya fue usado, ENTONCES EL SISTEMA DEBERÁ responder `400 INVALID_OR_EXPIRED_RESET_TOKEN`.
- CUANDO cualquier endpoint protegido de las specs 001-004 recibe un `accessToken` inválido, vencido o ausente, EL SISTEMA DEBERÁ responder uniformemente `401 UNAUTHORIZED`, y `403 FORBIDDEN` si el token es válido pero el rol no alcanza.

## Contrato de API que implementa
`POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/password/forgot`, `POST /auth/password/reset`, `GET /auth/me` — ver `00-api-contracts.md`.

## Entidades clave
- **User**: id, name, email (único), passwordHash, role (`MEMBER`|`SITE_ADMIN`|`RECEPTIONIST`), createdAt.
- **RefreshToken**: id/token, userId, expiresAt, revokedAt (nullable), usedAt (nullable) — el uso o la revocación lo excluyen de renovaciones futuras.
- **PasswordResetToken**: token, userId, expiresAt, usedAt (nullable).
- **LoginAttemptCounter** (Redis): key por email, contador con TTL de 15 min.

## Requisitos no funcionales
- El hashing de contraseñas debe usar Argon2id con parámetros de costo apropiados para hardware de producción (no valores de ejemplo/desarrollo).
- La verificación de rol (`SITE_ADMIN`/`RECEPTIONIST`) en los endpoints de las specs 001-004 (ej. `POST /admin/resources/{id}/blocks`, check-in de recepción) depende de que el JWT incluya el rol como claim verificable sin consulta adicional a base de datos en cada request.
- El rate limiting de intentos fallidos debe resolverse en Redis (no en la tabla de usuarios), para no generar contención de escritura sobre la tabla `User` en escenarios de ataque de fuerza bruta.

## Fuera de alcance
- Verificación de email post-registro (queda como pregunta abierta a nivel de producto, no implementada en esta spec).
- Autenticación social/OAuth de terceros.
- Multi-factor authentication (2FA).
- Auditoría detallada de sesiones activas por dispositivo (más allá de poder revocar todos los refresh tokens en un reset de contraseña).

## Casos borde
- Intento de login para un email que no existe: debe comportarse exactamente igual (mismo error, mismo tiempo de respuesta aproximado) que una contraseña incorrecta para un email que sí existe, para no filtrar qué emails están registrados por timing o por mensaje.
- Refresh token usado dos veces en rápida sucesión (posible token robado): la segunda llamada falla con `INVALID_REFRESH_TOKEN`; se recomienda, como medida adicional, revocar toda la familia de tokens del usuario si se detecta reuso de un token ya usado (señal de robo), documentado aquí como comportamiento deseado a implementar.
- Reset de contraseña exitoso mientras el usuario tiene sesiones activas en otros dispositivos: esas sesiones deben quedar invalidadas (ver criterio de aceptación de `password/reset`).

## Supuestos
- El claim de rol en el JWT se confía tal cual fue emitido durante la vida del `accessToken` (15 min); un cambio de rol de un usuario no se refleja hasta su próxima renovación de sesión. Aceptable dado lo corto del TTL.

## Preguntas abiertas
- [ ] ¿Se requiere verificación de email obligatoria antes de permitir reservar (bloquear `POST /reservations/holds` para cuentas no verificadas)? No definido en el documento fuente.
- [ ] ¿Cómo se asigna el rol `SITE_ADMIN`/`RECEPTIONIST`? El endpoint de registro solo contempla alta como `MEMBER`; falta definir el flujo de asignación de roles administrativos (¿invitación, panel interno, seed manual?).

## Métricas de éxito
- Tests de integración cubren: registro duplicado, bloqueo por 5 intentos fallidos, rotación de refresh token (incluyendo el caso de reuso del token viejo), y expiración del token de reset de contraseña — antes de que cualquier otra spec backend (001-004) empiece a depender de estos endpoints en sus propios tests de integración.
