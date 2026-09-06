# Contrato de API — Plataforma de Coworking

**Versión**: v1.0.0 (congelada) | **Base URL**: `/api/v1` | **Autenticación**: Bearer token (fuera de alcance de este documento; asumir header `Authorization: Bearer <token>` en todas las rutas salvo las públicas de catálogo)

> Este documento es la **única fuente de verdad** que frontend y backend implementan. El frontend lo consume vía mocks (MSW) hasta que el backend exista; el backend lo implementa literalmente. Ningún campo, ruta o código de error se agrega/quita/renombra sin versionar este archivo.

---

## Convenciones globales

- Todas las fechas/horas: string ISO 8601 en UTC (`"2026-09-15T14:00:00Z"`).
- Todas las cantidades de crédito: entero (no se manejan fracciones de crédito).
- Paginación (donde aplique): query params `?page=1&pageSize=20`, respuesta con `{ items: [...], page, pageSize, total }`.

### Envelope de error estándar

Todo error HTTP 4xx/5xx responde con este cuerpo:

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "El slot solicitado ya no está disponible.",
    "details": {}
  }
}
```

### Catálogo de códigos de error del sistema

| Código | HTTP | Cuándo ocurre |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Payload inválido o incompleto |
| `UNAUTHORIZED` | 401 | Token ausente o inválido |
| `FORBIDDEN` | 403 | Usuario sin permiso (ej. acción de admin) |
| `RESOURCE_NOT_FOUND` | 404 | Sede, recurso o reserva inexistente |
| `OUT_OF_OPERATING_HOURS` | 409 | Rango solicitado fuera del horario operativo de la sede |
| `SLOT_UNAVAILABLE` | 409 | El intervalo ya está `HELD`, `BOOKED` o `BLOCKED` |
| `HOLD_EXPIRED` | 410 | El hold referenciado ya venció (>300s) |
| `HOLD_NOT_FOUND` | 404 | El `holdId` no existe o ya se usó |
| `INSUFFICIENT_CREDITS` | 402 | Saldo de créditos menor al costo de la reserva |
| `RESERVATION_NOT_CANCELLABLE` | 409 | La reserva no está en un estado cancelable |
| `CHECKIN_WINDOW_CLOSED` | 409 | Se intenta check-in fuera de la ventana ±15 min |
| `EMAIL_ALREADY_REGISTERED` | 409 | El email ya tiene una cuenta asociada |
| `INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos (mensaje genérico, no se indica cuál falló) |
| `ACCOUNT_LOCKED` | 423 | Cuenta bloqueada temporalmente por intentos fallidos |
| `INVALID_REFRESH_TOKEN` | 401 | El refresh token es inválido, ya fue usado o fue revocado |
| `INVALID_OR_EXPIRED_RESET_TOKEN` | 400 | El token de recuperación de contraseña es inválido o venció |

---

## Épica 0 — Autenticación y Sesión

### `POST /auth/register`
Body → `{ "name": "Ana Torres", "email": "ana@correo.com", "password": "..." }`
**201** →
```json
{ "userId": "u_01", "name": "Ana Torres", "email": "ana@correo.com", "role": "MEMBER" }
```
**Errores**: `VALIDATION_ERROR`, `EMAIL_ALREADY_REGISTERED`

### `POST /auth/login`
Body → `{ "email": "ana@correo.com", "password": "..." }`
**200** →
```json
{
  "accessToken": "eyJ...", "refreshToken": "rt_01",
  "expiresIn": 900,
  "user": { "id": "u_01", "name": "Ana Torres", "email": "ana@correo.com", "role": "MEMBER" }
}
```
**Errores**: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`

### `POST /auth/refresh`
Body → `{ "refreshToken": "rt_01" }`
**200** → `{ "accessToken": "eyJ...", "refreshToken": "rt_02", "expiresIn": 900 }`
> El `refreshToken` rota en cada uso: `rt_01` queda invalidado tras esta llamada (RN-AUTH.3).
**Errores**: `INVALID_REFRESH_TOKEN`

### `POST /auth/logout`
Body → `{ "refreshToken": "rt_02" }`
**204** sin cuerpo (revoca el refresh token; el access token vigente expira solo naturalmente).
**Errores**: `INVALID_REFRESH_TOKEN`

### `POST /auth/password/forgot`
Body → `{ "email": "ana@correo.com" }`
**202** → `{ "message": "Si el email existe, se enviaron instrucciones." }`
> Responde 202 siempre, exista o no el email, para no filtrar qué correos están registrados.

### `POST /auth/password/reset`
Body → `{ "token": "rst_01", "newPassword": "..." }`
**200** → `{ "message": "Contraseña actualizada." }`
**Errores**: `INVALID_OR_EXPIRED_RESET_TOKEN`, `VALIDATION_ERROR`

### `GET /auth/me` *(requiere Authorization: Bearer)*
**200** → `{ "id": "u_01", "name": "Ana Torres", "email": "ana@correo.com", "role": "MEMBER" }`
**Errores**: `UNAUTHORIZED`

---

## Épica 1 — Catálogo y Disponibilidad

### `GET /sites`
Lista las sedes.
**200** →
```json
[{
  "id": "site_01", "name": "Coworking Miraflores", "address": "...",
  "operatingHours": [{ "dayOfWeek": "MON", "opensAt": "08:00", "closesAt": "20:00" }]
}]
```

### `GET /sites/{siteId}/resources?type=HOT_DESK|DEDICATED_DESK|MEETING_ROOM`
**200** →
```json
[{
  "id": "res_01", "siteId": "site_01", "type": "MEETING_ROOM",
  "name": "Sala Andes", "capacity": 6,
  "creditCost": { "amount": 2, "unit": "HOUR", "minBlockMinutes": 30 }
}]
```

### `GET /resources/{resourceId}/availability?date=YYYY-MM-DD`
Slots en bloques fijos de 30 minutos.
**200** →
```json
{
  "resourceId": "res_01", "date": "2026-09-15",
  "slots": [
    { "startsAt": "2026-09-15T13:00:00Z", "endsAt": "2026-09-15T13:30:00Z", "status": "AVAILABLE" },
    { "startsAt": "2026-09-15T13:30:00Z", "endsAt": "2026-09-15T14:00:00Z", "status": "HELD" }
  ]
}
```
`status` ∈ `AVAILABLE | HELD | BOOKED | BLOCKED`
**Errores**: `RESOURCE_NOT_FOUND`

### `POST /admin/resources/{resourceId}/blocks` *(rol: admin)*
Body → `{ "startsAt": "...", "endsAt": "...", "reason": "Mantenimiento HVAC" }`
**201** →
```json
{
  "blockId": "blk_01", "resourceId": "res_01",
  "startsAt": "...", "endsAt": "...", "reason": "...",
  "cancelledReservations": [{ "reservationId": "resv_05", "refundedCredits": 4 }]
}
```
**Errores**: `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `FORBIDDEN`

---

## Épica 2 — Reserva y Concurrencia

### `POST /reservations/holds`
Body → `{ "resourceId": "res_01", "startsAt": "...", "endsAt": "..." }`
**201** →
```json
{
  "holdId": "hold_01", "resourceId": "res_01",
  "startsAt": "...", "endsAt": "...",
  "expiresAt": "2026-09-15T13:05:00Z", "creditsRequired": 2
}
```
**Errores**: `SLOT_UNAVAILABLE`, `OUT_OF_OPERATING_HOURS`, `VALIDATION_ERROR`

### `DELETE /reservations/holds/{holdId}`
Liberación manual del hold (ej. usuario cancela el flujo).
**204** sin cuerpo. **Errores**: `HOLD_NOT_FOUND`

### `POST /reservations`
Body → `{ "holdId": "hold_01" }`
**201** →
```json
{
  "reservationId": "resv_01", "resourceId": "res_01",
  "startsAt": "...", "endsAt": "...",
  "status": "CONFIRMED", "creditsDeducted": 2
}
```
**Errores**: `HOLD_EXPIRED`, `HOLD_NOT_FOUND`, `INSUFFICIENT_CREDITS`

### `GET /wallet/balance`
**200** → `{ "userId": "u_01", "availableCredits": 18, "cycleEndsAt": "2026-09-30T23:59:59Z" }`

---

## Épica 3 — Ciclo de Vida, Cancelación y Check-in

### `GET /reservations?status=&from=&to=`
**200** → lista paginada de reservas del usuario (o de la sede, si rol admin).
```json
{ "items": [{ "id": "resv_01", "resourceId": "res_01", "startsAt": "...", "endsAt": "...", "status": "CONFIRMED" }], "page": 1, "pageSize": 20, "total": 4 }
```

### `POST /reservations/{id}/cancel`
**200** →
```json
{ "reservationId": "resv_01", "status": "CANCELLED", "refundPercentage": 50, "refundedCredits": 1 }
```
**Errores**: `RESERVATION_NOT_CANCELLABLE`, `RESOURCE_NOT_FOUND`

### `POST /reservations/{id}/checkin`
**200** → `{ "reservationId": "resv_01", "status": "CHECKED_IN", "checkedInAt": "..." }`
**Errores**: `CHECKIN_WINDOW_CLOSED`, `RESOURCE_NOT_FOUND`

> **Job interno (no expuesto al frontend)**: worker cada 60s que transiciona `CONFIRMED → NO_SHOW` cuando pasan 15 min de `startsAt` sin check-in, libera el recurso y no genera reembolso. Documentado aquí porque el frontend debe reflejar este estado sin haberlo disparado él mismo (polling de `GET /reservations`).

---

## Épica 4 — Membresías y Billetera de Créditos

### `GET /plans`
**200** → `[{ "id": "plan_pro", "name": "Pro", "monthlyCredits": 30, "price": 79.00, "currency": "PEN" }]`

### `GET /wallet/ledger?from=&to=`
**200** →
```json
[{ "id": "led_01", "type": "GRANT", "amount": 30, "balanceAfter": 30, "reservationId": null, "createdAt": "..." },
 { "id": "led_02", "type": "CONSUME", "amount": -2, "balanceAfter": 28, "reservationId": "resv_01", "createdAt": "..." }]
```
`type` ∈ `GRANT | CONSUME | REFUND | EXPIRE`

### `POST /admin/billing/cycle-renewal` *(rol: sistema/admin, disparado por cron)*
**200** → `{ "processedUsers": 340, "totalCreditsGranted": 9200 }`

---

## Matriz de trazabilidad Épica → Endpoints

| Épica | Endpoints |
|---|---|
| 0. Autenticación y Sesión | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/password/forgot`, `POST /auth/password/reset`, `GET /auth/me` |
| 1. Catálogo y Disponibilidad | `GET /sites`, `GET /sites/{id}/resources`, `GET /resources/{id}/availability`, `POST /admin/resources/{id}/blocks` |
| 2. Reserva y Concurrencia | `POST /reservations/holds`, `DELETE /reservations/holds/{id}`, `POST /reservations`, `GET /wallet/balance` |
| 3. Ciclo de Vida y Check-in | `GET /reservations`, `POST /reservations/{id}/cancel`, `POST /reservations/{id}/checkin` |
| 4. Membresías y Billetera | `GET /plans`, `GET /wallet/ledger`, `POST /admin/billing/cycle-renewal` |
