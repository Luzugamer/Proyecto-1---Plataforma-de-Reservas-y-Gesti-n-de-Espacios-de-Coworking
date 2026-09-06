# Especificación: Ciclo de Vida, Cancelación y Check-in — Frontend

**Feature**: 003-ciclo-vida-checkin | **Tipo**: Frontend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Depende de**: `specs/00-api-contracts.md` (Épica 3)

## Resumen
Panel de "mis reservas" con acciones de cancelar (mostrando el porcentaje de reembolso aplicable antes de confirmar) y check-in, más la vista de recepción para marcar llegada de usuarios.

## Historias de usuario
- HU-05: Como usuario con una reserva confirmada, quiero cancelarla y recuperar los créditos que correspondan según la anticipación.
- HU-06: Como recepcionista o sistema automatizado, quiero registrar el check-in o dejar que el sistema marque no-show, para mantener el inventario actualizado.

## Criterios de aceptación (EARS)
- CUANDO el usuario abre el detalle de una reserva `CONFIRMED`, EL SISTEMA DEBERÁ calcular y mostrar en pantalla el porcentaje de reembolso que aplicaría si cancela **ahora mismo** (100%/50%/0% según la anticipación), antes de que el usuario confirme la cancelación.
- CUANDO el usuario confirma la cancelación, EL SISTEMA DEBERÁ mostrar el resultado real devuelto por el backend (`refundPercentage`, `refundedCredits`), que debe coincidir con lo previsualizado salvo que haya pasado un umbral de tiempo entre la vista previa y la confirmación.
- SI se intenta cancelar una reserva que ya no es cancelable (`RESERVATION_NOT_CANCELLABLE`), ENTONCES EL SISTEMA DEBERÁ explicar por qué (ej. "la reserva ya inició o fue completada") en vez de un error genérico.
- CUANDO un recepcionista registra el check-in dentro de la ventana permitida, EL SISTEMA DEBERÁ actualizar el estado a `CHECKED_IN` de forma inmediata en la UI (optimista) y confirmar contra el servidor.
- SI el check-in se intenta fuera de ventana (`CHECKINWINDOW_CLOSED`), ENTONCES EL SISTEMA DEBERÁ explicar que la ventana de check-in (±15 min de la hora de inicio) ya cerró.
- MIENTRAS el panel de reservas esté abierto, EL SISTEMA DEBERÁ reflejar transiciones automáticas a `NO_SHOW` hechas por el backend (vía refresco periódico de `GET /reservations`), sin que el usuario tenga que recargar manualmente.

## Inventario de pantallas / componentes
- `MyReservationsList`: listado con filtro por estado (`GET /reservations`).
- `ReservationDetailPanel`: detalle + cálculo de reembolso estimado + botón cancelar.
- `CancelReservationDialog`: confirmación con el porcentaje mostrado antes de llamar al backend.
- `ReceptionCheckinView`: vista operativa de recepción con botón de check-in por reserva del día.
- `ReservationStatusBadge`: badge reutilizable para los 6 estados de la máquina de estados.

## Contrato de API que consume
`GET /reservations`, `POST /reservations/{id}/cancel`, `POST /reservations/{id}/checkin` — ver `00-api-contracts.md`.

## Estrategia de mocks
- El cálculo de reembolso "previsualizado" en el cliente (100%/50%/0%) es **solo una réplica de UX** de RN-CAN, no la fuente de verdad — debe implementarse en un helper puro y testeado, para que el mock y el mensaje coincidan con lo que hará el backend real.
- Dataset de mocks debe incluir reservas en cada ventana de tiempo (>24h, entre 24h y 2h, <2h) para poder probar los 3 porcentajes de reembolso sin esperar tiempo real.
- Mock de `GET /reservations` debe poder simular una transición a `NO_SHOW` entre dos llamadas consecutivas, para probar que el polling la refleja.

## Requisitos no funcionales
- El cálculo de reembolso en UI debe re-evaluarse cada vez que se abre el diálogo de cancelación (no cachear un valor calculado hace rato).
- `ReceptionCheckinView` optimizada para uso rápido en tablet/mostrador (botones grandes, sin pasos innecesarios).

## Fuera de alcance
- Ejecución del job que transiciona a `NO_SHOW` (vive en el backend); el frontend solo lo refleja.
- Notificación al usuario del resultado de la cancelación por canal externo (email/push).

## Casos borde (UI)
- Reserva cancelada por otro medio (ej. por bloqueo de mantenimiento de la Épica 1) mientras el usuario tenía el detalle abierto: al refrescar debe reflejar `CANCELLED` sin que el botón de cancelar vuelva a estar disponible.
- Doble click en "Confirmar cancelación": debe prevenirse (deshabilitar botón mientras la mutación está en vuelo).

## Supuestos
- El cálculo de "ahora mismo" para el reembolso usa la hora del cliente; se asume una diferencia de reloj despreciable con el servidor (no se implementa sincronización NTP en el cliente).

## Preguntas abiertas
- [ ] ¿La vista de recepción (`ReceptionCheckinView`) requiere un rol distinto al de "administrador de sede" definido en la Épica 1, o es el mismo rol?

## Métricas de éxito
- Un usuario puede ver el reembolso estimado y cancelar su reserva completamente contra mocks, con el mismo mensaje que dará el backend real, antes de que el backend exista.
