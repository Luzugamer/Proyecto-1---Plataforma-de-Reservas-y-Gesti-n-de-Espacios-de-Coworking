# Especificación de Contexto y Requisitos: Plataforma de Reservas y Gestión de Espacios de Coworking

## 1. Contexto General del Dominio y Alcance

El sistema gestiona la operación diaria de un espacio de coworking multi-sede. Administra recursos físicos (escritorios flexibles, escritorios dedicados y salas de reuniones), esquemas de membresías con bolsas de créditos mensuales, el ciclo de vida transaccional de reservas evitando solapamientos mediante control estricto de concurrencia, y el acceso de usuarios mediante autenticación y roles.

```
+-----------------------------------------------------------------------------------+
|                                DOMINIO COWORKING                                  |
+---------------+-------------------------+-----------------------+-----------------+
| Autenticación |   Espacios y Recursos   |  Membresías y Créditos |  Motor de Reservas |
| - Registro    | - Sedes / Zonas         | - Planes (Free/Pro/Ent)| - Transacciones ACID |
| - Login/roles | - Capacidad y tipos     | - Renovación y bolsas  | - Máquina de estados |
| - Sesión JWT  | - Disponibilidad horaria| - Consumo y reembolsos | - Check-in / No-show |
+---------------+-------------------------+-----------------------+-----------------+
```

---

## 2. Stack Tecnológico Seleccionado (Localhost)

### Backend
* **Lenguaje y Framework:** TypeScript + Fastify.
* **Base de Datos Relacional:** PostgreSQL (bloqueos pesimistas `SELECT FOR UPDATE` y restricciones de exclusión de rangos temporales `tsrange` / `btree_gist`).
* **Concurrencia y expiración:** PostgreSQL como única fuente de verdad: advisory locks transaccionales, restricción de exclusión de rangos y jobs idempotentes para expiración.
* **Documentación de API / Contrato:** OpenAPI 3.0 / Swagger (núcleo para SDD).
* **Autenticación:** JWT (access token de vida corta + refresh token con rotación), hashing de contraseñas con bcrypt (coste 12).

### Frontend
* **Framework:** React + TypeScript (Vite).
* **Gestión de Estado y Servidor:** TanStack Query (React Query) para sincronización de estados asíncronos y mutaciones optimistas.
* **Componentes / UI:** Tailwind CSS + shadcn/ui.

---

## 3. Reglas de Negocio (Business Rules)

### RN-AUTH: Autenticación y Gestión de Sesión
1. **Registro:** Un usuario nuevo se registra con nombre, email único y contraseña. La contraseña se almacena únicamente como hash bcrypt (coste 12), nunca en texto plano.
2. **Roles:** Todo usuario tiene exactamente un rol: `MEMBER` (usuario miembro estándar), `SITE_ADMIN` (administrador de una o más sedes) o `RECEPTIONIST` (personal de recepción de sede). El rol determina qué endpoints puede invocar en el resto del sistema.
3. **Inicio de sesión:** El login con email + contraseña otorga un `accessToken` (JWT, vida corta) y un `refreshToken` (vida larga, de un solo uso, con rotación en cada renovación).
4. **Renovación de sesión:** Un `refreshToken` válido y no revocado permite obtener un nuevo par de tokens sin volver a pedir credenciales.
5. **Cierre de sesión:** El logout revoca el `refreshToken` actual. El `accessToken` ya emitido permanece válido hasta su expiración natural (no hay revocación de access token en v1, por eso su vida es corta).
6. **Bloqueo por intentos fallidos:** Tras 5 intentos fallidos consecutivos de login para el mismo email en 15 minutos, se bloquean nuevos intentos por 15 minutos.
7. **Recuperación de contraseña:** El usuario solicita recuperación con su email; si existe, se genera un token de un solo uso con vida de 1 hora, permitiendo establecer una nueva contraseña una única vez.

### RN-REC: Gestión de Recursos y Espacios
1. **Tipos de Recurso:**
   * `HOT_DESK`: Puesto libre en área común (reserva por día o medio día).
   * `DEDICATED_DESK`: Puesto asignado a un usuario específico (reserva mínima: 1 mes).
   * `MEETING_ROOM`: Sala de reuniones con capacidad fija (reserva por bloques mínimos de 30 minutos).
2. **Disponibilidad Operativa:** No se pueden crear reservas fuera del horario operativo configurado para cada sede o sala (ej. Lunes a Viernes 08:00 - 20:00).
3. **Mantenimiento y Bloqueos:** Los administradores pueden bloquear rangos temporales por mantenimiento; las reservas activas en ese rango deben cancelarse automáticamente con notificación y reembolso íntegro.

### RN-MEM: Membresías y Billetera de Créditos
1. **Asignación de Créditos:** Cada plan otorga una cantidad fija de créditos al inicio del ciclo de facturación mensual (ej. Plan Básico: 10 créditos; Plan Pro: 30 créditos).
2. **Expiración de Créditos:** Los créditos no consumidos en el mes corriente caducan al cierre del ciclo y no son acumulables.
3. **Costo en Créditos:**
   * `HOT_DESK`: 1 crédito / bloque de 4 horas.
   * `MEETING_ROOM`: 2 créditos / hora (fraccionable en bloques de 30 min = 1 crédito).
4. **Saldo Insuficiente:** Si un usuario no dispone de créditos suficientes, no puede reservar vía bolsa de membresía (debe adquirir un paquete extra o pagar tarifa directa).

### RN-RES: Motor Transaccional de Reservas y Concurrencia
1. **Invariante de No Solapamiento:** Para un mismo recurso, no pueden coexistir dos reservas en estado `CONFIRMED` o `CHECKED_IN` que compartan cualquier intervalo de tiempo `[T_inicio, T_fin)`.
2. **Pre-reserva (Hold):** Al iniciar el checkout de una reserva, se aplica un bloqueo de 5 minutos sobre el slot. Si no se confirma en dicho tiempo, el slot queda liberado.
3. **Máquina de Estados:**
   * `PENDING` -> `CONFIRMED` -> `CHECKED_IN` -> `COMPLETED`
   * `CONFIRMED` -> `CANCELLED`
   * `CONFIRMED` -> `NO_SHOW`

### RN-CAN: Cancelaciones y Reembolsos Escalados
1. **Cancelación Temprana:** Cancelar con **24 horas o más** de anticipación al `T_inicio` otorga un reembolso del **100%** de los créditos deducidos.
2. **Cancelación Tardía:** Cancelar con menos de **24 horas** y al menos **2 horas** de anticipación otorga un reembolso del **50%**.
3. **Cancelación Crítica:** Menos de **2 horas** antes de la reserva o posterior a `T_inicio` no otorga reembolso (**0%**).

### RN-CHK: Check-in y Penalización por No-Show
1. **Ventana de Check-in:** El usuario puede registrar su llegada desde **15 minutos antes** hasta **15 minutos después** del `T_inicio`.
2. **Transición a No-Show:** Si pasan más de 15 minutos de `T_inicio` sin check-in, la reserva pasa automáticamente a `NO_SHOW`, el recurso queda liberado para otros usuarios y no hay reembolso.

---

## 4. Historias de Usuario (User Stories)

### Épica 1: Autenticación y Perfil
* **HU-08: Registro de cuenta**
  * *Como* visitante,
  * *quiero* registrarme con mi nombre, email y contraseña,
  * *para* poder acceder al sistema como usuario miembro.
  * **Criterios de Aceptación:**
    * Si el email ya está registrado, el sistema lo rechaza con un mensaje claro, sin revelar si el email pertenece a otra cuenta con más detalle del necesario.
    * La contraseña nunca se transmite de vuelta ni se almacena en texto plano.

* **HU-09: Inicio de sesión y renovación de sesión**
  * *Como* usuario registrado,
  * *quiero* iniciar sesión con mi email y contraseña, y que mi sesión se mantenga activa sin volver a loguearme constantemente,
  * *para* usar el sistema de forma continua.
  * **Criterios de Aceptación:**
    * Credenciales inválidas no revelan si el error fue el email o la contraseña.
    * Tras 5 intentos fallidos en 15 minutos, la cuenta queda temporalmente bloqueada.
    * El `accessToken` se renueva automáticamente usando el `refreshToken` sin interrumpir al usuario.

* **HU-10: Cierre de sesión**
  * *Como* usuario con sesión activa,
  * *quiero* cerrar sesión explícitamente,
  * *para* invalidar mi acceso desde ese dispositivo.

* **HU-11: Recuperación de contraseña**
  * *Como* usuario que olvidó su contraseña,
  * *quiero* solicitar un restablecimiento vía email,
  * *para* recuperar el acceso a mi cuenta de forma segura.
  * **Criterios de Aceptación:**
    * El token de restablecimiento es de un solo uso y expira en 1 hora.

---

### Épica 2: Catálogo y Disponibilidad
* **HU-01: Consulta de disponibilidad en tiempo real**
  * *Como* usuario miembro del coworking,
  * *quiero* consultar el calendario de una sala de reuniones seleccionando sede, fecha y franja horaria,
  * *para* ver qué intervalos están libres antes de solicitar una reserva.
  * **Criterios de Aceptación:**
    * Los slots ocupados o en retención temporal (*hold*) deben mostrarse como no disponibles.
    * La respuesta debe reflejar la disponibilidad en pasos mínimos de 30 minutos.

* **HU-02: Bloqueo administrativo de recursos**
  * *Como* administrador de sede,
  * *quiero* marcar un recurso como "Fuera de servicio" durante un rango de fechas/horas,
  * *para* realizar tareas de mantenimiento técnico o limpieza.
  * **Criterios de Aceptación:**
    * Si existen reservas confirmadas en ese rango, el sistema debe cancelarlas y devolver el 100% de los créditos a los afectados.

---

### Épica 3: Proceso de Reserva y Concurrencia
* **HU-03: Creación de reserva con validación de saldo**
  * *Como* usuario miembro,
  * *quiero* reservar una sala de reuniones utilizando mis créditos disponibles,
  * *para* asegurar el espacio para mi equipo.
  * **Criterios de Aceptación:**
    * El sistema verifica que el saldo de créditos sea mayor o igual al costo total.
    * Se aplica un bloqueo pesimista o verificación de concurrencia en base de datos para impedir *double-booking*.
    * Los créditos se descuentan de forma atómica con la creación de la reserva en estado `CONFIRMED`.

* **HU-04: Retención temporal de slot durante selección (Hold)**
  * *Como* usuario en proceso de reserva,
  * *quiero* que el slot seleccionado quede reservado temporalmente durante 5 minutos,
  * *para* poder completar los datos y confirmación sin que otro usuario me gane el espacio.
  * **Criterios de Aceptación:**
    * Si la reserva no se confirma en 300 segundos, el worker de PostgreSQL marca el hold como expirado; las consultas ignoran inmediatamente todo hold cuyo `expiresAt` haya vencido.

---

### Épica 4: Ciclo de Vida, Cancelación y Asistencia
* **HU-05: Cancelación de reserva con regla de penalización**
  * *Como* usuario con una reserva confirmada,
  * *quiero* cancelar mi reserva desde mi panel,
  * *para* liberar el espacio y recuperar los créditos que correspondan según la anticipación.
  * **Criterios de Aceptación:**
    * Más de 24h antes: 100% reembolso en créditos.
    * Entre 24h y 2h antes: 50% reembolso.
    * Menos de 2h: 0% reembolso, estado pasa a `CANCELLED`.

* **HU-06: Check-in de reserva y liberación por No-Show**
  * *Como* recepcionista o sistema automatizado,
  * *quiero* registrar el check-in de una reserva o marcarla como no presentada si venció la tolerancia,
  * *para* mantener el inventario de salas actualizado en tiempo real.
  * **Criterios de Aceptación:**
    * Si el usuario valida check-in entre `T_inicio - 15m` y `T_inicio + 15m`, el estado pasa a `CHECKED_IN`.
    * Un cron/worker ejecuta cada minuto la transición a `NO_SHOW` para reservas que superaron la ventana sin check-in, liberando el slot para el resto del día.

---

### Épica 5: Administración de Membresías y Billetera
* **HU-07: Renovación cíclica de créditos**
  * *Como* sistema central de facturación,
  * *quiero* restablecer y asignar los créditos mensuales de los usuarios activos según su plan,
  * *para* iniciar su nuevo ciclo operativo.
  * **Criterios de Aceptación:**
    * Los créditos remanentes del ciclo anterior caducan (saldo previo a 0 o balance registrado en log de auditoría).
    * Se crea una entrada en el libro de transacciones de créditos (`CreditLedger`) con el nuevo cupo.
