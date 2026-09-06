# Especificación: Autenticación y Sesión — Frontend

**Feature**: 005-autenticacion | **Tipo**: Frontend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Depende de**: `specs/00-api-contracts.md` (Épica 0)

## Resumen
Pantallas de registro, login, recuperación de contraseña y manejo transparente de sesión (renovación automática de tokens), más el guardado de rutas protegidas según el rol del usuario (`MEMBER`, `SITE_ADMIN`, `RECEPTIONIST`).

## Historias de usuario
- HU-08: Como visitante, quiero registrarme con nombre, email y contraseña, para acceder como usuario miembro.
- HU-09: Como usuario registrado, quiero iniciar sesión y que mi sesión se mantenga activa sin re-loguearme constantemente.
- HU-10: Como usuario con sesión activa, quiero cerrar sesión explícitamente.
- HU-11: Como usuario que olvidó su contraseña, quiero recuperarla vía email de forma segura.

## Criterios de aceptación (EARS)
- CUANDO el usuario envía el formulario de registro con datos válidos, EL SISTEMA DEBERÁ crear la cuenta y llevarlo directamente al login (o auto-loguearlo, ver pregunta abierta).
- SI el email ya está registrado, ENTONCES EL SISTEMA DEBERÁ mostrar el error junto al campo de email, sin bloquear el resto del formulario.
- CUANDO el usuario envía credenciales correctas, EL SISTEMA DEBERÁ guardar el `accessToken` en memoria (nunca en `localStorage`) y redirigir según su rol (`MEMBER` → catálogo, `SITE_ADMIN`/`RECEPTIONIST` → panel operativo).
- SI las credenciales son incorrectas, ENTONCES EL SISTEMA DEBERÁ mostrar un mensaje genérico ("email o contraseña incorrectos"), nunca indicar cuál de los dos campos fue el error.
- SI la cuenta está bloqueada (`ACCOUNT_LOCKED`), ENTONCES EL SISTEMA DEBERÁ explicar que hubo demasiados intentos fallidos y sugerir reintentar más tarde o recuperar la contraseña.
- CUANDO el `accessToken` en memoria está por expirar o ya expiró y hay una petición pendiente, EL SISTEMA DEBERÁ intentar renovarlo con `POST /auth/refresh` de forma transparente antes de reintentar la petición original, sin que el usuario lo perciba.
- SI la renovación falla (`INVALID_REFRESH_TOKEN`), ENTONCES EL SISTEMA DEBERÁ cerrar la sesión localmente y redirigir a login, conservando la ruta a la que el usuario intentaba entrar para volver ahí tras loguearse de nuevo.
- CUANDO el usuario hace logout, EL SISTEMA DEBERÁ invalidar el `refreshToken` en el servidor y limpiar todo estado de sesión en el cliente antes de redirigir a login.
- CUANDO el usuario solicita recuperación de contraseña, EL SISTEMA DEBERÁ mostrar siempre el mismo mensaje de confirmación, exista o no el email, para no filtrar información.
- CUANDO se accede a una ruta protegida sin sesión válida, EL SISTEMA DEBERÁ redirigir a login antes de renderizar cualquier dato de la ruta.
- SI el rol del usuario no alcanza para una ruta (ej. `MEMBER` intentando entrar al panel de `SITE_ADMIN`), ENTONCES EL SISTEMA DEBERÁ mostrar una pantalla de "acceso no autorizado", no un error técnico.

## Inventario de pantallas / componentes
- `RegisterForm`, `LoginForm`, `ForgotPasswordForm`, `ResetPasswordForm`.
- `AuthProvider`: contexto global de sesión (usuario actual, rol, estado de carga inicial).
- `ProtectedRoute`: wrapper de rutas que exige sesión y, opcionalmente, un rol mínimo.
- `SessionExpiredHandler`: intercepta respuestas `401` y dispara el flujo de refresh transparente descrito arriba.
- `UserMenu`: muestra usuario actual y acción de logout.

## Contrato de API que consume
`POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/password/forgot`, `POST /auth/password/reset`, `GET /auth/me` — ver `00-api-contracts.md`.

## Estrategia de mocks
- Handlers de MSW para los 7 endpoints, incluyendo los casos `EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED` e `INVALID_REFRESH_TOKEN`, seedeables para QA manual.
- El mock de `POST /auth/login` debe poder simular `ACCOUNT_LOCKED` tras 5 intentos fallidos seguidos en el propio estado del mock, para probar `RN-AUTH.6` sin backend real.
- El mock de `POST /auth/refresh` debe invalidar el `refreshToken` anterior en su propio estado (rotación), para que el frontend se construya asumiendo rotación real desde el día uno.
- Todas las demás specs (001 a 004) asumen `Authorization: Bearer <accessToken>` en sus llamadas — esta spec debe construirse primero o en paralelo temprano, ya que el resto del frontend depende de `AuthProvider` para saber qué mostrar.

## Requisitos no funcionales
- El `accessToken` nunca se persiste en `localStorage`/`sessionStorage` (mitigar XSS); vive en memoria de la aplicación y se pierde al recargar la página (se recupera renovando con el refresh token, ver supuesto abajo).
- Los formularios de auth deben tener validación de campos en el cliente (formato de email, longitud mínima de contraseña) como UX, sin reemplazar la validación real del backend.

## Fuera de alcance
- Login social/OAuth (Google, GitHub, etc.) — no está en el documento fuente para v1.
- Verificación de email post-registro — ver pregunta abierta.
- Edición de perfil más allá de lo estrictamente necesario para mostrar nombre/email en `UserMenu`.

## Casos borde (UI)
- Usuario recarga la página con sesión activa: como el `accessToken` vive en memoria, se pierde; `AuthProvider` debe intentar un refresh silencioso al arrancar la app usando el refresh token persistido (ver supuesto) antes de decidir si redirige a login.
- Dos pestañas abiertas, logout en una: la otra pestaña debe detectar la sesión inválida en su próxima petición (vía el interceptor de 401), no permanecer con datos obsoletos indefinidamente.

## Supuestos
- El `refreshToken` sí se persiste en el cliente (ej. cookie no-httpOnly o storage) para sobrevivir a un refresh de página, a diferencia del `accessToken`. Cuál mecanismo exacto usar (cookie httpOnly gestionada por el backend vs. almacenamiento explícito en el cliente) es la pregunta abierta más importante de esta spec — afecta configuración de CORS/cookies en el backend, no la forma del resto del contrato.

## Preguntas abiertas
- [ ] ¿El registro (HU-08) autologuea al usuario inmediatamente, o siempre exige un login explícito después de registrarse?
- [ ] ¿Se requiere verificación de email antes de poder reservar, o el registro deja la cuenta usable de inmediato?
- [ ] ¿El `refreshToken` se maneja como cookie `httpOnly` seteada por el backend (más seguro, recomendado) o se persiste explícitamente en el cliente? Definir antes de construir `AuthProvider` a fondo, aunque no bloquea empezar con los formularios.

## Métricas de éxito
- Un usuario puede registrarse, iniciar sesión, navegar rutas protegidas según su rol, y cerrar sesión, completamente contra mocks — y el resto de las specs (001-004) pueden asumir `AuthProvider` ya resuelto al construirse.
