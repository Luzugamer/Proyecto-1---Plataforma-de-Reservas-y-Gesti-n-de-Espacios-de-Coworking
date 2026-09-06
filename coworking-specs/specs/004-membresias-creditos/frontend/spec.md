# Especificación: Membresías y Billetera de Créditos — Frontend

**Feature**: 004-membresias-creditos | **Tipo**: Frontend | **Fecha**: 2026-09-01 | **Estado**: Borrador
**Depende de**: `specs/00-api-contracts.md` (Épica 4)

## Resumen
Vista de billetera del usuario: saldo actual, historial de movimientos de créditos (otorgados, consumidos, reembolsados, expirados) y catálogo de planes disponibles.

## Historias de usuario
- HU-07: Como sistema central de facturación, quiero restablecer y asignar los créditos mensuales según el plan del usuario, para iniciar su nuevo ciclo. *(Desde el frontend, esta historia se traduce en: el usuario debe poder **ver** el resultado de esa renovación — no dispararla.)*

## Criterios de aceptación (EARS)
- CUANDO el usuario abre su billetera, EL SISTEMA DEBERÁ mostrar el saldo actual y la fecha en que cierra el ciclo (`cycleEndsAt`).
- CUANDO el usuario consulta el historial, EL SISTEMA DEBERÁ listar los movimientos (`GRANT`, `CONSUME`, `REFUND`, `EXPIRE`) en orden cronológico descendente, con el saldo resultante después de cada uno (`balanceAfter`).
- CUANDO un movimiento de tipo `CONSUME` o `REFUND` está asociado a una reserva (`reservationId` no nulo), EL SISTEMA DEBERÁ ofrecer un enlace/referencia a esa reserva.
- SI el ciclo del usuario está por cerrar (ej. dentro de 3 días de `cycleEndsAt`) y quedan créditos sin usar, ENTONCES EL SISTEMA DEBERÁ mostrar un aviso informativo de que esos créditos no son acumulables y caducarán (RN-MEM.2), sin bloquear ninguna acción.
- CUANDO el usuario consulta los planes disponibles, EL SISTEMA DEBERÁ mostrar nombre, créditos mensuales y precio de cada uno.

## Inventario de pantallas / componentes
- `WalletOverview`: saldo + fecha de cierre de ciclo (`GET /wallet/balance`).
- `CreditLedgerTable`: historial paginado de movimientos (`GET /wallet/ledger`).
- `LedgerEntryTypeBadge`: badge visual por tipo de movimiento.
- `PlansCatalog`: catálogo de planes (`GET /plans`), informativo en v1 (sin flujo de upgrade/downgrade, ver fuera de alcance).
- `CycleExpiryNotice`: banner de aviso de expiración próxima de créditos.

## Contrato de API que consume
`GET /wallet/balance`, `GET /wallet/ledger`, `GET /plans` — ver `00-api-contracts.md`. (`POST /admin/billing/cycle-renewal` es interno/cron, no se consume desde este frontend de usuario.)

## Estrategia de mocks
- Dataset de mocks con historial de ledger que incluya al menos un movimiento de cada tipo (`GRANT`, `CONSUME`, `REFUND`, `EXPIRE`) para poder maquetar y probar los 4 badges sin backend.
- Simular en mocks un usuario con `cycleEndsAt` a menos de 3 días, para poder construir y probar `CycleExpiryNotice` sin depender de la fecha real del sistema.

## Requisitos no funcionales
- `CreditLedgerTable` debe paginar (no cargar todo el historial de una vez) siguiendo la convención de paginación del contrato.
- Los montos negativos (`CONSUME`) y positivos (`GRANT`/`REFUND`) deben diferenciarse visualmente (color/signo), no solo por el campo `type`.

## Fuera de alcance
- Flujo de cambio de plan (upgrade/downgrade) o compra de paquete extra de créditos — el documento fuente no lo define, `PlansCatalog` es solo informativo en v1.
- Disparo manual de la renovación de ciclo (es un proceso de sistema/cron, no una acción de usuario).

## Casos borde (UI)
- Usuario sin ningún movimiento en el ledger (recién registrado, aún no le llegó el primer `GRANT`): estado vacío explícito.
- `balanceAfter` de un `EXPIRE` en 0: debe mostrarse igual que cualquier otro movimiento, sin tratamiento especial de error.

## Supuestos
- La fecha para evaluar "ciclo por cerrar" se calcula en el cliente comparando `cycleEndsAt` contra la hora local, con la misma salvedad de sincronización de reloj que en la spec 003.

## Preguntas abiertas
- [ ] ¿El usuario final debe poder ver el historial de ledger de renovaciones (`GRANT`) de meses anteriores sin límite, o solo del ciclo actual? El documento fuente no acota el rango.

## Métricas de éxito
- Un usuario puede ver su saldo, entender de dónde viene cada movimiento y anticipar la expiración de créditos, completamente contra mocks, antes de que el backend de billing exista.
