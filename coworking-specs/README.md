# Specs — Plataforma de Reservas y Gestión de Coworking

Paquete de especificaciones listo para construcción, derivado de `coworking-reservas-contexto-sdd.md`. Sigue el flujo **frontend-first, contract-first**: el frontend se construye completo antes que el backend, sin que la integración posterior requiera modificar el código de UI.

## Estructura

```
.specify/memory/constitution.md     ← reglas globales del proyecto (leer primero)
specs/
├── 00-api-contracts.md             ← contrato de API congelado (fuente de verdad única)
├── 005-autenticacion/
│   ├── frontend/spec.md
│   └── backend/spec.md
├── 001-catalogo-disponibilidad/
│   ├── frontend/spec.md
│   └── backend/spec.md
├── 002-reserva-concurrencia/
│   ├── frontend/spec.md
│   └── backend/spec.md
├── 003-ciclo-vida-checkin/
│   ├── frontend/spec.md
│   └── backend/spec.md
└── 004-membresias-creditos/
    ├── frontend/spec.md
    └── backend/spec.md
```

## Por qué este orden y no otro

**005 — Autenticación se construye primero**, aunque su carpeta esté numerada al final por haberse agregado después: todos los demás endpoints del contrato exigen `Authorization: Bearer <accessToken>`, y en frontend `AuthProvider`/`ProtectedRoute` son la base sobre la que se montan el resto de las pantallas. Empezar cualquier otra épica sin esto ya resuelto (aunque sea contra mocks) obliga a parchear rutas y llamadas después.

Las 4 carpetas restantes siguen el orden de dependencia funcional del documento fuente:

0. **005 — Autenticación y Sesión**: base de acceso y roles para todo lo demás.
1. **001 — Catálogo y Disponibilidad**: sin esto no hay nada que reservar.
2. **002 — Reserva y Concurrencia**: el corazón transaccional (holds, créditos, no-solapamiento).
3. **003 — Ciclo de Vida y Check-in**: qué pasa después de confirmada la reserva.
4. **004 — Membresías y Billetera**: de dónde salen los créditos que 002 consume.

Nota: 004 depende conceptualmente de 002 (el saldo que se consume), pero como el saldo es solo *lectura* desde 002 (`GET /wallet/balance`), el orden de construcción de frontend puede ser 005→001→002→003→004 sin bloqueos: se mockea el saldo en 002 y luego 004 construye la pantalla real de billetera sobre el mismo contrato.

## Flujo de construcción recomendado

### Fase A — Frontend (contra mocks, sin backend)

Por cada carpeta, en orden 005 → 001 → 002 → 003 → 004:

1. Leer `frontend/spec.md` de la feature.
2. Implementar los handlers de MSW descritos en "Estrategia de mocks" replicando exactamente `00-api-contracts.md`.
3. Construir las pantallas/componentes listados en "Inventario de pantallas / componentes".
4. Validar los criterios de aceptación (EARS) manualmente o con tests E2E contra los mocks.

Al terminar la Fase A, la aplicación es demostrable de punta a punta sin backend real.

### Fase B — Backend (en paralelo o después, mismo orden)

Por cada carpeta, en orden 005 → 001 → 002 → 003 → 004:

1. Leer `backend/spec.md` de la feature — contiene las reglas de negocio (RN-*) exactas del documento fuente.
2. Implementar los endpoints contra el esquema exacto de `00-api-contracts.md`.
3. Escribir contract tests que validen las respuestas contra ese esquema antes de dar la feature por lista.
4. Prestar especial atención a los "Casos borde" y "Requisitos no funcionales" — ahí vive la concurrencia y las transacciones atómicas que el frontend asume que existen.

### Fase C — Integración

1. Apagar los handlers de MSW.
2. Apuntar la `baseURL` del cliente HTTP al backend real.
3. No debería requerirse ningún otro cambio. Si lo requiere, es señal de que el contrato no se respetó en algún punto — revisar contra `00-api-contracts.md` antes de parchear el frontend.

### Organización de carpetas

Separación estricta frontend/backend, y las 5 épicas como unidades de feature), la organización que se deriva naturalmente es esta — un **monorepo** con `frontend/` y `backend/` en la raíz, y dentro de cada uno, **una carpeta por épica que refleja 1:1 los nombres de `specs/`**, para que sea trivial trazar código → spec:

```
coworking-platform/                     # raíz del repo
├── .specify/memory/constitution.md
├── specs/                              # el paquete que ya tienes
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── app/                        # bootstrap, router, providers globales
│   │   │   ├── AuthProvider.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── features/                   # 1 carpeta por épica (mapea specs/)
│   │   │   ├── auth/                   # ← 005-autenticacion
│   │   │   ├── catalog/                # ← 001-catalogo-disponibilidad
│   │   │   ├── reservations/           # ← 002-reserva-concurrencia
│   │   │   ├── lifecycle/              # ← 003-ciclo-vida-checkin
│   │   │   └── wallet/                 # ← 004-membresias-creditos
│   │   │       ├── components/
│   │   │       ├── hooks/              # useLogin, useHoldSlot, etc.
│   │   │       ├── api.ts              # llamadas del feature al contrato
│   │   │       └── types.ts
│   │   ├── shared/                     # httpClient, parser del error envelope, UI base
│   │   └── mocks/                      # handlers MSW, 1 archivo por épica
│   └── tests/
│
└── backend/
    ├── src/
    │   ├── core/                       # config, JWT, sesión DB, cliente Redis
    │   ├── modules/                    # 1 carpeta por épica (mismo mapeo)
    │   │   ├── auth/                   # router.py, service.py, models.py, schemas.py
    │   │   ├── catalog/
    │   │   ├── reservations/
    │   │   ├── lifecycle/
    │   │   └── wallet/
    │   └── shared/                     # error envelope, middlewares
    ├── tests/
    │   ├── contract/                   # valida respuestas contra 00-api-contracts.md
    │   ├── integration/
    │   └── unit/
    └── alembic/                        # migraciones de Postgres
```

## Preguntas abiertas pendientes de resolver antes de congelar el contrato

Cada spec tiene su propia sección "Preguntas abiertas". Las más relevantes a nivel de contrato (afectan a más de una épica):

- Cómo se representa `DEDICATED_DESK` en disponibilidad y si usa el mismo mecanismo de hold de 5 minutos que `MEETING_ROOM`/`HOT_DESK`.
- Si una reserva `CHECKED_IN` puede cancelarse y con qué reembolso.
- Si el primer ciclo de un usuario nuevo se prorratea o recibe el cupo completo.
- Cómo se persiste el `refreshToken` en el cliente (cookie `httpOnly` del backend vs. almacenamiento explícito en el frontend) — afecta configuración de CORS/cookies en 005-backend, no la forma del resto del contrato.
- Cómo se asigna el rol `SITE_ADMIN`/`RECEPTIONIST` a un usuario, ya que el registro público solo contempla el alta como `MEMBER`.
- Si se exige verificación de email antes de poder reservar.

Resolver estas antes de iniciar la Fase B evita retrabajo en `00-api-contracts.md` a mitad de construcción del backend (el frontend, al estar mockeado, no se ve afectado por este tipo de cambio si ocurre a tiempo).
