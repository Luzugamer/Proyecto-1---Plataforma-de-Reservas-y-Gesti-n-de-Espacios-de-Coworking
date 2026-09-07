# Especificación: Proceso de Reserva y Concurrencia — Frontend

**Feature**: 002-reserva-concurrencia | **Tipo**: Frontend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Depende de**: `specs/00-api-contracts.md` (Épica 2)

## Resumen
Flujo de checkout de reserva: selección de slot → hold temporal con cuenta regresiva visible → confirmación con validación de saldo de créditos.

## Historias de usuario
- HU-03: Como usuario miembro, quiero reservar una sala usando mis créditos, para asegurar el espacio para mi equipo.
- HU-04: Como usuario en proceso de reserva, quiero que el slot quede retenido 5 minutos mientras completo el checkout, para que no me lo gane otro usuario.

## Criterios de aceptación (EARS)
- CUANDO el usuario selecciona un slot `AVAILABLE` y avanza al checkout, EL SISTEMA DEBERÁ crear un hold y mostrar un contador regresivo visible con el tiempo restante hasta `expiresAt`.
- MIENTRAS el hold esté activo, EL SISTEMA DEBERÁ mostrar el costo en créditos (`creditsRequired`) y el saldo actual del usuario antes de pedir confirmación.
- SI el saldo del usuario es menor al costo, ENTONCES EL SISTEMA DEBERÁ deshabilitar el botón de confirmar y explicar la insuficiencia de créditos, sin permitir el intento contra el backend.
- CUANDO el contador llega a cero sin confirmación, EL SISTEMA DEBERÁ invalidar el checkout localmente, informar que el slot se liberó, y devolver al usuario a la grilla de disponibilidad.
- SI la confirmación falla porque el hold ya expiró en el servidor (`HOLD_EXPIRED`), ENTONCES EL SISTEMA DEBERÁ mostrar el mismo mensaje de expiración que el caso del contador local, aunque el reloj del cliente y del servidor no coincidan exactamente.
- CUANDO la reserva se confirma con éxito, EL SISTEMA DEBERÁ mostrar un resumen (recurso, horario, créditos deducidos, nuevo saldo) y ofrecer navegar al listado de "mis reservas".

## Inventario de pantallas / componentes
- `SlotCheckoutDrawer`: contenedor del flujo hold → confirmación, con `HoldCountdown` (cuenta regresiva).
- `CreditsBalanceBadge`: saldo actual, reutilizable en header.
- `ConfirmReservationButton`: deshabilitado si `availableCredits < creditsRequired`.
- `ReservationSuccessSummary`: pantalla/modal de éxito post-confirmación.

## Contrato de API que consume
`POST /reservations/holds`, `DELETE /reservations/holds/{holdId}`, `POST /reservations`, `GET /wallet/balance` — ver `00-api-contracts.md`.

## Estrategia de mocks
- Handler de `POST /reservations/holds` en MSW debe simular `expiresAt` a `now + 300s` real, para poder probar el contador regresivo con tiempos reales, no acelerados.
- Caso simulado de `SLOT_UNAVAILABLE` (otro usuario "ganó" el slot) y de `INSUFFICIENT_CREDITS`, seedeable desde el dataset de mocks para QA manual.
- El componente `HoldCountdown` se calcula 100% a partir de `expiresAt` recibido del servidor (mock o real) — nunca de un timer fijo hardcodeado en el cliente, así el comportamiento es idéntico en mock y en producción.

## Requisitos no funcionales
- El countdown debe seguir corriendo correctamente aunque el usuario cambie de pestaña y vuelva (basarse en `expiresAt` absoluto, no en un intervalo relativo que se desincroniza).
- La mutación de confirmación debe deshabilitar doble click mientras está en vuelo (evitar doble submit).

## Fuera de alcance
- Selección de método de pago alterno cuando faltan créditos (queda para una épica de "paquetes extra / pago directo", no definida en el documento fuente).
- Lógica real de expiración del hold (vive en PostgreSQL/backend); el cliente solo refleja el `expiresAt` que recibe.

## Casos borde (UI)
- Usuario cierra el drawer de checkout manualmente antes de confirmar: se debe llamar a `DELETE /reservations/holds/{holdId}` para liberar el slot antes de tiempo (buena ciudadanía, no es obligatorio para la corrección del sistema pero mejora la disponibilidad para otros).
- Confirmación enviada justo en el límite del TTL: si el backend responde `HOLD_EXPIRED`, tratar igual que expiración normal, no como error genérico.

## Supuestos
- El saldo mostrado en `CreditsBalanceBadge` se refresca al entrar al checkout (no se asume cacheado indefinidamente).

## Preguntas abiertas
- [ ] ¿Se debe permitir extender un hold una sola vez (ej. +2 min) si el usuario sigue activo, o expira siempre a los 5 min fijos? El documento fuente no lo contempla.

## Métricas de éxito
- El flujo completo (seleccionar slot → hold → confirmar) es completamente funcional y probado contra mocks antes de que exista un solo endpoint de backend real.
