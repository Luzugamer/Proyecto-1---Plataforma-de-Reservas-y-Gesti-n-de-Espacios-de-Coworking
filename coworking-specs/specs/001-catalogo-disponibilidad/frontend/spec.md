# Especificación: Catálogo y Disponibilidad — Frontend

**Feature**: 001-catalogo-disponibilidad | **Tipo**: Frontend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Depende de**: `specs/00-api-contracts.md` (Épica 1)

## Resumen
Pantallas para que el usuario explore sedes, tipos de recurso y consulte disponibilidad horaria en un calendario/selector de slots, y una vista de administración para bloquear recursos por mantenimiento.

## Historias de usuario
- HU-01: Como usuario miembro, quiero consultar el calendario de una sala eligiendo sede, fecha y franja, para ver qué intervalos están libres antes de reservar.
- HU-02: Como administrador de sede, quiero marcar un recurso como "Fuera de servicio" en un rango, para hacer mantenimiento.

## Criterios de aceptación (EARS)
- CUANDO el usuario selecciona una sede y una fecha, EL SISTEMA DEBERÁ mostrar los slots de 30 min del día con su estado (`AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`) diferenciados visualmente.
- CUANDO un slot tiene estado distinto de `AVAILABLE`, EL SISTEMA DEBERÁ deshabilitarlo para selección.
- SI la consulta de disponibilidad falla o tarda, ENTONCES EL SISTEMA DEBERÁ mostrar estado de carga y un mensaje de reintento, nunca una grilla vacía sin explicación.
- CUANDO un administrador prepara un bloqueo de mantenimiento, EL SISTEMA DEBERÁ advertir antes de confirmar que las reservas activas se cancelarán; tras confirmar, mostrará el conteo real y los reembolsos devueltos por el backend. El contrato v1.1 no define un endpoint de previsualización sin efectos.
- MIENTRAS la pantalla de disponibilidad esté abierta, EL SISTEMA DEBERÁ refrescar los datos periódicamente (polling, ver Notas técnicas) para reflejar cambios de otros usuarios sin recargar la página.

## Inventario de pantallas / componentes
- `SiteSelector`: dropdown de sedes (`GET /sites`).
- `ResourceTypeTabs`: filtro por `HOT_DESK | DEDICATED_DESK | MEETING_ROOM`.
- `ResourceList`: tarjetas de recurso con capacidad y costo en créditos (`GET /sites/{id}/resources`).
- `AvailabilityCalendar`: grilla de slots de 30 min por recurso/fecha (`GET /resources/{id}/availability`), con leyenda de estados.
- `AdminBlockResourceModal`: formulario de rango + motivo, advertencia de impacto y resultado de cancelaciones (`POST /admin/resources/{id}/blocks`).

## Contrato de API que consume
`GET /sites`, `GET /sites/{siteId}/resources`, `GET /resources/{resourceId}`, `GET /resources/{resourceId}/availability`, `POST /admin/resources/{resourceId}/blocks` — ver `00-api-contracts.md`.

## Estrategia de mocks (para construir sin backend)
- Handlers de MSW que replican exactamente los 4 endpoints anteriores, incluyendo los casos de error `RESOURCE_NOT_FOUND` y `VALIDATION_ERROR`.
- Dataset semilla: 2 sedes, 3 tipos de recurso, al menos un slot en cada estado (`AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`) para poder probar los 4 estilos visuales sin backend real.
- El cliente HTTP se construye con una única `baseURL` configurable por variable de entorno — este es el único cambio permitido al integrar el backend real.

## Requisitos no funcionales
- La grilla de disponibilidad debe renderizar sin bloqueo visual (skeleton) mientras carga.
- Accesible por teclado (navegación entre slots) y con contraste suficiente entre los 4 estados de color.
- Responsive: la grilla colapsa a lista vertical en viewport móvil.

## Fuera de alcance
- Cálculo de disponibilidad real (vive en backend).
- Notificaciones push/email de bloqueo por mantenimiento (solo se muestra el resultado en pantalla).
- WebSockets/SSE — el refresco es por polling, ver constitución del proyecto.

## Casos borde (UI)
- Slot que expira su `HOLD` mientras el usuario lo mira: debe volver a `AVAILABLE` en el próximo refresco de polling.
- Bloqueo de mantenimiento sobre un rango sin reservas activas: `cancelledReservations` vacío, la UI lo muestra igual sin error.
- Sede sin recursos configurados: estado vacío explícito, no pantalla en blanco.

## Supuestos
- El rol (usuario vs. admin) llega resuelto desde el token de sesión; la UI oculta `AdminBlockResourceModal` para usuarios no admin.
- El intervalo de polling por defecto es 30s (ajustable en config del cliente, no en el contrato).

## Preguntas abiertas
- [ ] ¿Se necesita vista de calendario mensual además de la vista diaria, o solo día-a-día para v1?

## Métricas de éxito
- Un usuario puede llegar de "elegir sede" a "ver slots disponibles de una sala" en ≤3 interacciones, completamente contra mocks, sin ningún endpoint real.
