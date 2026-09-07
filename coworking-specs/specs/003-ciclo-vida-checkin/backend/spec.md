# Especificación: Ciclo de Vida, Cancelación y Check-in — Backend

**Feature**: 003-ciclo-vida-checkin | **Tipo**: Backend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Implementa**: `specs/00-api-contracts.md` (Épica 3)

## Resumen
Transiciones de estado de la máquina de reservas: cancelación con reembolso escalado según anticipación, check-in dentro de ventana, y transición automática a `NO_SHOW` vía worker programado.

## Reglas de negocio que gobiernan esta spec
- **RN-CAN.1-3** — Reembolso escalado: ≥24h → 100%, entre menos de 24h y 2h inclusive → 50%, <2h o posterior a `T_inicio` → 0%.
- **RN-CHK.1** — Ventana de check-in: `T_inicio - 15min` hasta `T_inicio + 15min`.
- **RN-CHK.2** — Sin check-in dentro de ventana → transición automática a `NO_SHOW`, libera el recurso, sin reembolso.

## Criterios de aceptación (EARS)
- CUANDO se solicita cancelar una reserva `CONFIRMED` con 24h o más de anticipación a `startsAt`, EL SISTEMA DEBERÁ reembolsar el 100% de los créditos deducidos y transicionar a `CANCELLED`.
- CUANDO se solicita cancelar entre 24h y 2h antes, EL SISTEMA DEBERÁ reembolsar exactamente el 50% (redondeo: hacia abajo al entero más cercano) y transicionar a `CANCELLED`.
- CUANDO se solicita cancelar con menos de 2h de anticipación o después de `startsAt`, EL SISTEMA DEBERÁ transicionar a `CANCELLED` sin generar reembolso.
- SI se intenta cancelar una reserva que no está en estado `CONFIRMED` o `CHECKED_IN`, ENTONCES EL SISTEMA DEBERÁ responder `409 RESERVATION_NOT_CANCELLABLE`.
- CUANDO se solicita check-in y la hora actual está entre `startsAt - 15min` y `startsAt + 15min`, EL SISTEMA DEBERÁ transicionar la reserva a `CHECKED_IN`.
- SI se solicita check-in fuera de esa ventana, ENTONCES EL SISTEMA DEBERÁ responder `409 CHECKIN_WINDOW_CLOSED`.
- CUANDO el worker programado detecta una reserva `CONFIRMED` cuyo `startsAt + 15min` ya pasó sin check-in, EL SISTEMA DEBERÁ transicionarla a `NO_SHOW`, liberar el recurso para nuevas reservas, y **no** generar ninguna entrada de reembolso en `CreditLedger`.

## Contrato de API que implementa
`GET /reservations`, `POST /reservations/{id}/cancel`, `POST /reservations/{id}/checkin` — ver `00-api-contracts.md`. El job de `NO_SHOW` es interno, no expone endpoint público.

## Entidades clave
- **Reservation**: ver spec 002-backend. Transiciones válidas: `CONFIRMED→CHECKED_IN`, `CONFIRMED→CANCELLED`, `CONFIRMED→NO_SHOW`, `CHECKED_IN→COMPLETED`, `CHECKED_IN→CANCELLED`.
- **CreditLedger**: entrada `REFUND` generada solo en cancelaciones con `refundPercentage > 0`.

## Requisitos no funcionales
- El worker de `NO_SHOW` corre cada 60 segundos (según el documento fuente) y debe ser idempotente: correrlo dos veces sobre la misma reserva vencida no debe duplicar liberaciones ni tocar una reserva ya transicionada.
- El cálculo del porcentaje de reembolso debe vivir en una única función pura, testeada con los 3 umbrales exactos (24h, 2h) incluyendo los casos límite (exactamente 24h00m, exactamente 2h00m).

## Fuera de alcance
- Transición `CHECKED_IN → COMPLETED` (el documento fuente no especifica el disparador; se asume otra spec futura, ej. al finalizar el horario de la reserva).
- Notificaciones efectivas al usuario sobre el resultado del `NO_SHOW`.

## Casos borde
- Cancelación solicitada en el instante exacto del umbral (ej. 24:00:00 antes de `startsAt`): tratar como el límite inclusive superior (100% si es ≥24h, no <24h) — debe fijarse como regla determinística y testeada, no ambigua.
- Un `CHECKED_IN` que se intenta cancelar: RN-CAN no lo prohíbe explícitamente; este spec lo permite con el mismo cálculo de reembolso escalado (ver pregunta abierta si esto es correcto).

## Supuestos
- El worker de `NO_SHOW` corre sobre todas las sedes sin distinción de zona horaria, comparando siempre en UTC contra `startsAt`.

## Decisión v1.1
- Una reserva `CHECKED_IN` se puede cancelar y usa el mismo cálculo escalado; normalmente resulta en 0% porque el inicio ya ocurrió.

## Métricas de éxito
- Suite de tests cubre los 3 tramos de reembolso más sus límites exactos, y un test de integración confirma que el worker de `NO_SHOW` libera el recurso correctamente sin generar reembolso.
