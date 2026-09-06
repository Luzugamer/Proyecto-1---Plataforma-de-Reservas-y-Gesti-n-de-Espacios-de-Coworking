# Especificación: Membresías y Billetera de Créditos — Backend

**Feature**: 004-membresias-creditos | **Tipo**: Backend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Implementa**: `specs/00-api-contracts.md` (Épica 4)

## Resumen
Job de renovación cíclica mensual de créditos por plan, con expiración de saldo no consumido y registro auditable en `CreditLedger`, más los endpoints de lectura de saldo/historial/planes consumidos por el frontend.

## Reglas de negocio que gobiernan esta spec
- **RN-MEM.1** — Cada plan otorga una cantidad fija de créditos al inicio del ciclo de facturación mensual (ej. Básico: 10, Pro: 30).
- **RN-MEM.2** — Los créditos no consumidos caducan al cierre del ciclo y no son acumulables.

## Criterios de aceptación (EARS)
- CUANDO se ejecuta la renovación de ciclo para un usuario activo, EL SISTEMA DEBERÁ, en una sola transacción: (a) registrar una entrada `EXPIRE` por el saldo remanente si es mayor a 0, (b) llevar el saldo a 0 antes de otorgar el nuevo cupo, (c) registrar una entrada `GRANT` con el cupo del plan vigente del usuario, y (d) actualizar `cycleEndsAt` al siguiente cierre de ciclo.
- CUANDO se ejecuta la renovación masiva (`POST /admin/billing/cycle-renewal`), EL SISTEMA DEBERÁ procesar únicamente usuarios con membresía activa y devolver el conteo de usuarios procesados y el total de créditos otorgados.
- SI la renovación de un usuario individual falla dentro de un lote, ENTONCES EL SISTEMA DEBERÁ continuar procesando al resto del lote y reportar el/los fallos, sin que un usuario problemático bloquee la renovación de los demás (no atomicidad global del lote, sí atomicidad por usuario).
- CUANDO se consulta `GET /wallet/ledger`, EL SISTEMA DEBERÁ devolver los movimientos ordenados del más reciente al más antiguo, paginados.

## Contrato de API que implementa
`GET /plans`, `GET /wallet/ledger`, `POST /admin/billing/cycle-renewal` — ver `00-api-contracts.md`. (`GET /wallet/balance` se especifica junto con la Épica 2 por ser consumido también en el flujo de reserva, pero su fuente de datos —tabla de saldo— es propiedad de esta spec.)

## Entidades clave
- **Plan**: id, name, monthlyCredits, price, currency.
- **Membership**: userId, planId, status (activo/inactivo), cycleEndsAt.
- **CreditLedger**: ver spec 002-backend — aquí se generan las entradas `GRANT` y `EXPIRE`.

## Requisitos no funcionales
- El job de renovación debe ser re-ejecutable de forma segura (idempotente por usuario+ciclo): correrlo dos veces para el mismo ciclo no debe otorgar créditos duplicados.
- Debe soportar procesamiento por lotes sin bloquear las tablas de reserva/hold activas (evitar contención con el motor transaccional de la Épica 2).

## Fuera de alcance
- Cobro/facturación monetaria real del plan (pasarela de pago) — el documento fuente solo cubre la asignación de créditos, no el cobro.
- Cambio de plan a mitad de ciclo (upgrade/downgrade prorrateado) — no definido en el documento fuente.

## Casos borde
- Usuario cuya membresía se desactiva justo antes de la renovación: no debe recibir `GRANT`, pero si tenía saldo remanente sí debe registrarse su `EXPIRE` (el saldo no puede quedar huérfano sin trazabilidad).
- Usuario nuevo cuyo primer ciclo empieza a mitad de mes: se asume que recibe el cupo completo del plan en su primer `GRANT` (sin prorrateo), salvo que se indique lo contrario.

## Supuestos
- "Ciclo de facturación mensual" se interpreta como 1 mes calendario desde la fecha de alta/última renovación, no necesariamente alineado al día 1 de cada mes.

## Preguntas abiertas
- [ ] ¿El primer ciclo de un usuario nuevo se prorratea según el día de alta, o siempre otorga el cupo completo? El documento fuente no lo especifica.

## Métricas de éxito
- Ejecutar el job de renovación dos veces seguidas sobre el mismo lote de usuarios produce el mismo saldo final que ejecutarlo una sola vez (test de idempotencia).
