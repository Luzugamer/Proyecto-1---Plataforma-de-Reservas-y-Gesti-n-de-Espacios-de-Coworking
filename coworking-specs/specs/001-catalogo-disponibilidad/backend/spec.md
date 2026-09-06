# Especificación: Catálogo y Disponibilidad — Backend

**Feature**: 001-catalogo-disponibilidad | **Tipo**: Backend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Implementa**: `specs/00-api-contracts.md` (Épica 1)

## Resumen
Servicio de lectura de catálogo (sedes, recursos) y cálculo de disponibilidad en bloques de 30 min, más la operación administrativa de bloqueo por mantenimiento con cancelación en cascada y reembolso íntegro.

## Reglas de negocio que gobiernan esta spec
- **RN-REC.1** — Tipos de recurso: `HOT_DESK` (día/medio día), `DEDICATED_DESK` (mínimo 1 mes), `MEETING_ROOM` (bloques mínimos de 30 min).
- **RN-REC.2** — No se permiten reservas fuera del horario operativo configurado por sede.
- **RN-REC.3** — Bloqueo por mantenimiento cancela automáticamente las reservas activas en el rango, con reembolso del 100% y notificación.

## Criterios de aceptación (EARS)
- CUANDO se consulta disponibilidad de un recurso para una fecha, EL SISTEMA DEBERÁ devolver slots de 30 min cubriendo todo el horario operativo de la sede ese día, con estado `AVAILABLE`, `HELD`, `BOOKED` o `BLOCKED`.
- SI se solicita disponibilidad de un recurso inexistente, ENTONCES EL SISTEMA DEBERÁ responder `404 RESOURCE_NOT_FOUND`.
- CUANDO un administrador crea un bloqueo de mantenimiento que se solapa con reservas en estado `CONFIRMED` o `CHECKED_IN`, EL SISTEMA DEBERÁ, dentro de la misma transacción: (a) cancelar esas reservas, (b) acreditar el 100% de los créditos deducidos a cada usuario afectado, (c) registrar el bloqueo, y (d) devolver la lista de reservas afectadas con su reembolso.
- SI el rango de bloqueo cae fuera del horario operativo de la sede, ENTONCES EL SISTEMA DEBERÁ igualmente aceptarlo (un bloqueo puede exceder el horario operativo; no se valida contra RN-REC.2, que solo aplica a reservas de usuario).

## Contrato de API que implementa
`GET /sites`, `GET /sites/{siteId}/resources`, `GET /resources/{resourceId}/availability`, `POST /admin/resources/{resourceId}/blocks` — ver `00-api-contracts.md` para forma exacta de payloads y errores.

## Entidades clave
- **Site**: id, name, address, operatingHours[] (dayOfWeek, opensAt, closesAt).
- **Resource**: id, siteId, type (`HOT_DESK`|`DEDICATED_DESK`|`MEETING_ROOM`), name, capacity, creditCost.
- **AvailabilitySlot**: derivado (no persistido tal cual) — calculado a partir de `Resource` + `Reservation` + `ResourceBlock` para un rango dado.
- **ResourceBlock**: id, resourceId, startsAt, endsAt, reason, createdBy, createdAt.

## Requisitos no funcionales
- El cálculo de disponibilidad debe resolverse con una sola consulta indexada por recurso+rango de fechas (usar `tsrange`/`btree_gist` de PostgreSQL para el solapamiento, no cálculo en memoria por cada slot).
- La cancelación en cascada por bloqueo de mantenimiento debe ser atómica: si falla el reembolso de un usuario, toda la operación revierte.

## Fuera de alcance
- Envío efectivo de la notificación (email/push) — este spec solo garantiza que el evento/dato queda disponible para que otro servicio la dispare.
- Gestión de tarifas directas (pago sin créditos) — pertenece a un flujo de pagos fuera de esta épica.

## Casos borde
- Bloqueo que se solapa parcialmente con una reserva `PENDING` (aún no confirmada, en hold): no aplica cancelación con reembolso porque no hay créditos deducidos todavía; el hold simplemente se invalida.
- Dos administradores creando bloqueos simultáneos y solapados sobre el mismo recurso: el segundo debe poder crearse igual (los bloqueos no compiten entre sí como los holds de reserva).

## Supuestos
- `DEDICATED_DESK` no tiene "disponibilidad por slot de 30 min" en el sentido estricto (reserva mínima de 1 mes); para efectos de este endpoint se representa como un único slot que cubre el mes completo. Ver pregunta abierta.

## Preguntas abiertas
- [ ] ¿Cómo se debe representar exactamente `DEDICATED_DESK` en `GET /resources/{id}/availability`? El documento fuente no lo define y el endpoint actual asume granularidad de 30 min pensada para `MEETING_ROOM`/`HOT_DESK`.

## Métricas de éxito
- Todas las respuestas de este servicio validan contra el esquema publicado en `00-api-contracts.md` mediante contract tests automatizados antes de integrarse con el frontend.
