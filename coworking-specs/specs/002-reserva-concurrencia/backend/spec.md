# Especificación: Proceso de Reserva y Concurrencia — Backend

**Feature**: 002-reserva-concurrencia | **Tipo**: Backend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Implementa**: `specs/00-api-contracts.md` (Épica 2)

## Resumen
Motor transaccional de holds temporales persistidos en PostgreSQL (TTL lógico de 300s) y confirmación atómica de reserva con deducción de créditos, garantizando el invariante de no-solapamiento bajo concurrencia.

## Reglas de negocio que gobiernan esta spec
- **RN-RES.1** — Invariante de no solapamiento: no pueden coexistir dos reservas `CONFIRMED`/`CHECKED_IN` del mismo recurso que compartan intervalo `[T_inicio, T_fin)`.
- **RN-RES.2** — Pre-reserva (hold) de 5 minutos; si no se confirma, el slot se libera.
- **RN-MEM.3/4** — Costo en créditos por tipo de recurso; sin saldo suficiente no se puede confirmar vía bolsa de membresía.

## Criterios de aceptación (EARS)
- CUANDO se solicita un hold sobre un slot `AVAILABLE`, EL SISTEMA DEBERÁ crearlo con TTL de exactamente 300 segundos y devolver `expiresAt` calculado en el servidor.
- SI dos solicitudes de hold concurrentes apuntan al mismo intervalo, ENTONCES EL SISTEMA DEBERÁ conceder el hold a una sola de ellas y responder `409 SLOT_UNAVAILABLE` a la otra, sin condición de carrera (advisory lock transaccional por recurso y restricción de exclusión en PostgreSQL como respaldo).
- CUANDO expira un hold sin confirmación, EL SISTEMA DEBERÁ liberar el slot automáticamente sin intervención del cliente mediante `expiresAt` y un job idempotente de barrido cada 60 segundos.
- CUANDO se confirma una reserva con un `holdId` válido y no expirado, EL SISTEMA DEBERÁ, en una sola transacción: (a) verificar saldo suficiente, (b) deducir los créditos, (c) crear la reserva en estado `CONFIRMED`, (d) registrar la entrada `CONSUME` en `CreditLedger`, y (e) invalidar el hold.
- SI el saldo es insuficiente al momento de confirmar, ENTONCES EL SISTEMA DEBERÁ responder `402 INSUFFICIENT_CREDITS` y el hold permanece activo (no se pierde) hasta su TTL natural, permitiendo reintento si el usuario libera créditos de otra forma.
- SI el `holdId` ya expiró, ENTONCES EL SISTEMA DEBERÁ responder `410 HOLD_EXPIRED` sin crear la reserva.

## Contrato de API que implementa
`POST /reservations/holds`, `DELETE /reservations/holds/{holdId}`, `POST /reservations`, `GET /wallet/balance` — ver `00-api-contracts.md`.

## Entidades clave
- **Hold** (PostgreSQL): holdId, resourceId, startsAt, endsAt, userId, creditsRequired, expiresAt, status.
- **Reservation** (Postgres): id, resourceId, userId, startsAt, endsAt, status, creditsDeducted, createdAt.
- **CreditLedger**: id, userId, type (`GRANT|CONSUME|REFUND|EXPIRE`), amount, balanceAfter, reservationId nullable, createdAt.

## Requisitos no funcionales
- El path crítico de concurrencia (hold → confirmación) debe soportar al menos 2 solicitudes simultáneas por el mismo slot sin doble reserva, verificado con test de concurrencia (no solo unitario).
- La confirmación de reserva debe completarse en una única transacción de base de datos; no debe haber ventana donde créditos estén deducidos sin reserva creada, ni viceversa.

## Fuera de alcance
- Compra de paquetes extra de créditos o pago directo cuando el saldo es insuficiente (fuera del alcance del documento fuente).
- Reservas de `DEDICATED_DESK` (mínimo 1 mes) — este flujo de hold de 5 minutos solo cubre `MEETING_ROOM`/`HOT_DESK`.

## Casos borde
- Usuario intenta confirmar un hold que pertenece a otro usuario (holdId robado/compartido): debe fallar con `HOLD_NOT_FOUND` o `FORBIDDEN`, nunca confirmar a nombre de otro usuario.
- Liberación manual (`DELETE /holds/{id}`) sobre un hold ya expirado: debe responder `204` idempotente, no error, para no romper el flujo del cliente.

## Supuestos
- Un usuario no puede tener más de un hold activo sobre el mismo slot exacto (el segundo intento del mismo usuario se trata igual que el de un tercero: `SLOT_UNAVAILABLE`).

## Decisión v1.1
- `DEDICATED_DESK` queda explícitamente fuera del hold horario: el backend rechaza ese intento con `VALIDATION_ERROR` hasta que se versione un flujo mensual dedicado.

## Métricas de éxito
- Cero casos de doble-booking detectados en pruebas de carga concurrente sobre el mismo slot antes de dar la spec por completa.
