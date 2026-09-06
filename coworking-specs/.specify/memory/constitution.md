# Constitución del Proyecto — Plataforma de Coworking

**Última actualización**: 2026-09-01 | **Estado**: Vigente

Reglas que todo spec, plan o agente de IA debe respetar en este proyecto, sin excepción.

## 1. Principio rector: Contract-First

El contrato de API (`specs/00-api-contracts.md`) se congela **antes** de escribir una sola línea de código de frontend o backend. Ningún endpoint cambia de nombre, forma de payload, código de estado o error sin:
1. Actualizar primero `00-api-contracts.md`.
2. Reflejar el cambio en el spec de frontend y de backend afectados.

Esto es lo que permite el orden de construcción descrito abajo sin retrabajo de integración.

## 2. Orden de construcción: Frontend-first

1. Se congela el contrato de API (ya incluido en este paquete).
2. Se construye el **frontend completo** contra un servidor simulado (mocks) que replica el contrato exacto — mismas rutas, mismos payloads, mismos códigos de error.
3. Se construye el **backend** en paralelo o después, validado contra el mismo contrato (contract testing).
4. La integración final consiste **únicamente** en apagar los mocks y apuntar la URL base del cliente HTTP al backend real. Cero cambios en componentes, hooks, tipos o lógica de UI.

Regla dura: si al integrar el backend real hay que modificar un componente de UI (más allá de la URL base), el contrato estaba mal definido o no se respetó — no es un error del frontend.

## 3. Stack tecnológico (decidido, no negociable sin actualizar este documento)

### Backend
- Lenguaje/Framework: **Python + FastAPI**
- Base de datos: **PostgreSQL**, con `tsrange`/`btree_gist` para invariantes de no-solapamiento y `SELECT FOR UPDATE` para bloqueos pesimistas
- Cache / locks de corta duración / rate limiting: **Redis** (TTL de holds, contador de intentos fallidos de login)
- Documentación de API: **OpenAPI 3.0**, generado a partir de `00-api-contracts.md`
- Autenticación: **JWT** (access token de vida corta + refresh token con rotación de un solo uso), hashing de contraseñas con **Argon2id**

### Frontend
- Framework: **React + TypeScript (Vite)**
- Datos de servidor: **TanStack Query** — queries y mutaciones optimistas
- UI: **Tailwind CSS + shadcn/ui**
- Mocking durante desarrollo: **MSW** (Mock Service Worker), con handlers que implementan exactamente `00-api-contracts.md`

## 4. Convenciones obligatorias

- **Estados de reserva**: usar exactamente los literales en mayúsculas de la máquina de estados: `PENDING`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `NO_SHOW`. Nunca traducir ni alterar estos strings en el cliente.
- **Roles de usuario**: literales `MEMBER`, `SITE_ADMIN`, `RECEPTIONIST`. Todo endpoint restringido por rol responde `403 FORBIDDEN` si el rol del token no alcanza, nunca un error genérico.
- **Fechas y horas**: ISO 8601 en UTC en todo payload de API (`startsAt`, `endsAt`, etc.). La conversión a la zona horaria de la sede ocurre solo en la capa de presentación del frontend.
- **Errores**: envelope estándar único, definido en el contrato. El frontend nunca parsea mensajes de error por texto; siempre por `error.code`.
- **Granularidad de slots de disponibilidad**: bloques fijos de 30 minutos en toda la plataforma.
- **Sesión**: el `accessToken` se adjunta en `Authorization: Bearer <token>` en toda ruta protegida. El `accessToken` nunca se persiste en `localStorage`; vive en memoria del cliente. El `refreshToken` se persiste según se defina en la spec de autenticación (005).
- **Testing de contrato**: antes de marcar una spec de backend como "lista", sus respuestas deben validar contra el esquema publicado en `00-api-contracts.md`.

## 5. Restricciones de diseño

- Ninguna regla de negocio (cálculo de créditos, validación de solapamiento, ventanas de check-in/cancelación, política de bloqueo de cuenta) se implementa en el frontend. El frontend solo hace validaciones optimistas de UX (ej. deshabilitar un botón), nunca es la fuente de verdad.
- El control de concurrencia (holds, bloqueos pesimistas) es responsabilidad exclusiva del backend y la base de datos.
- No se introduce WebSockets/SSE en la v1: la "disponibilidad en tiempo real" de HU-01 se resuelve con polling/invalidación de queries desde el cliente.
- No se implementa autenticación social/OAuth de terceros en v1: solo registro con email + contraseña.
