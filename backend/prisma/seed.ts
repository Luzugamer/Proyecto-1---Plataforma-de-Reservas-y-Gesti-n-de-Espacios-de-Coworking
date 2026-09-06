import { PrismaClient, UserRole, ResourceType, PlanTier, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seeder de Base de Datos PostgreSQL con Datos Enriquecidos...');

  // 1. Limpiar base de datos previa para garantizar idempotencia
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.hold.deleteMany();
  await prisma.maintenanceBlock.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.site.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Tablas limpiadas exitosamente.');

  // 2. Crear Planes de Membresía
  await prisma.membershipPlan.createMany({
    data: [
      {
        id: PlanTier.STARTER,
        name: 'Plan Starter',
        monthlyCredits: 10,
        pricePerMonth: 29.0,
        currency: 'USD',
        description: 'Ideal para freelancers y trabajadores independientes que necesitan acceso flexible.',
        features: [
          '10 créditos mensuales incluidos',
          'Acceso a zonas Hot Desk y Escritorios',
          'Reserva de salas con 7 días de anticipación',
          'WiFi 6 de alta velocidad y café ilimitado',
          'Soporte por email',
        ],
        isPopular: false,
      },
      {
        id: PlanTier.PRO,
        name: 'Plan Professional',
        monthlyCredits: 30,
        pricePerMonth: 69.0,
        currency: 'USD',
        description: 'Perfecto para profesionales y equipos pequeños que requieren reuniones frecuentes y estudio podcast.',
        features: [
          '30 créditos mensuales incluidos',
          'Acceso prioritario a las 4 sedes de Lima',
          'Reserva de salas con 30 días de anticipación',
          'Créditos válidos para salas 4K, Directorios y Podcast',
          'Soporte prioritario y casillero privado incluido',
        ],
        isPopular: true,
      },
      {
        id: PlanTier.ENTERPRISE,
        name: 'Plan Enterprise',
        monthlyCredits: 100,
        pricePerMonth: 199.0,
        currency: 'USD',
        description: 'Diseñado para empresas y startups en expansión con alta demanda colaborativa y auditorio.',
        features: [
          '100 créditos mensuales incluidos',
          'Acceso total e ilimitado a todas las sedes y espacios',
          'Reserva anticipada sin límite de tiempo',
          'Acceso al Auditorio Tech Hub para 50 personas',
          'Gestor de cuenta dedicado y facturación corporativa',
        ],
        isPopular: false,
      },
    ],
  });
  console.log('✅ Planes de membresía creados (Starter, Pro, Enterprise).');

  // 3. Crear Usuarios de Prueba con Roles y Planes
  const salt = await bcrypt.genSalt(10);
  const passwordMember = await bcrypt.hash('Miembro123!', salt);
  const passwordPro = await bcrypt.hash('Pro123!', salt);
  const passwordEnterprise = await bcrypt.hash('Enterprise123!', salt);
  const passwordAdmin = await bcrypt.hash('Admin123!', salt);
  const passwordReception = await bcrypt.hash('Recepcion123!', salt);

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 3.1 Miembro Starter (Ana Torres)
  const memberUser = await prisma.user.create({
    data: {
      name: 'Ana Torres (Miembro)',
      email: 'miembro@coworking.local',
      passwordHash: passwordMember,
      role: UserRole.MEMBER,
      wallet: {
        create: {
          balance: 15,
        },
      },
      subscription: {
        create: {
          planId: PlanTier.STARTER,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: thirtyDaysLater,
          autoRenew: true,
        },
      },
    },
    include: { wallet: true },
  });

  if (memberUser.wallet) {
    await prisma.walletTransaction.createMany({
      data: [
        {
          walletId: memberUser.wallet.id,
          userId: memberUser.id,
          type: TransactionType.MONTHLY_ALLOWANCE,
          amount: 10,
          balanceAfter: 10,
          description: 'Asignación mensual inicial — Plan Starter (10 créditos)',
        },
        {
          walletId: memberUser.wallet.id,
          userId: memberUser.id,
          type: TransactionType.TOPUP_PURCHASE,
          amount: 5,
          balanceAfter: 15,
          description: 'Recarga adicional de créditos (Pack 5 créditos)',
        },
      ],
    });
  }

  // 3.2 Miembro Pro (Mateo Rossi)
  const proUser = await prisma.user.create({
    data: {
      name: 'Mateo Rossi (Miembro Pro)',
      email: 'pro@coworking.local',
      passwordHash: passwordPro,
      role: UserRole.MEMBER,
      wallet: {
        create: {
          balance: 45,
        },
      },
      subscription: {
        create: {
          planId: PlanTier.PRO,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: thirtyDaysLater,
          autoRenew: true,
        },
      },
    },
    include: { wallet: true },
  });

  if (proUser.wallet) {
    await prisma.walletTransaction.createMany({
      data: [
        {
          walletId: proUser.wallet.id,
          userId: proUser.id,
          type: TransactionType.MONTHLY_ALLOWANCE,
          amount: 30,
          balanceAfter: 30,
          description: 'Asignación mensual — Plan Professional (30 créditos)',
        },
        {
          walletId: proUser.wallet.id,
          userId: proUser.id,
          type: TransactionType.TOPUP_PURCHASE,
          amount: 15,
          balanceAfter: 45,
          description: 'Recarga de créditos para grabaciones en Estudio Podcast',
        },
      ],
    });
  }

  // 3.3 Miembro Enterprise (Sofía Valdivia)
  const enterpriseUser = await prisma.user.create({
    data: {
      name: 'Sofía Valdivia (Enterprise)',
      email: 'enterprise@coworking.local',
      passwordHash: passwordEnterprise,
      role: UserRole.MEMBER,
      wallet: {
        create: {
          balance: 120,
        },
      },
      subscription: {
        create: {
          planId: PlanTier.ENTERPRISE,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: thirtyDaysLater,
          autoRenew: true,
        },
      },
    },
    include: { wallet: true },
  });

  if (enterpriseUser.wallet) {
    await prisma.walletTransaction.createMany({
      data: [
        {
          walletId: enterpriseUser.wallet.id,
          userId: enterpriseUser.id,
          type: TransactionType.MONTHLY_ALLOWANCE,
          amount: 100,
          balanceAfter: 100,
          description: 'Asignación corporativa — Plan Enterprise (100 créditos)',
        },
        {
          walletId: enterpriseUser.wallet.id,
          userId: enterpriseUser.id,
          type: TransactionType.TOPUP_PURCHASE,
          amount: 20,
          balanceAfter: 120,
          description: 'Recarga corporativa adicional para auditorio y eventos',
        },
      ],
    });
  }

  // 3.4 Administrador de Sede (Carlos Mendoza)
  await prisma.user.create({
    data: {
      name: 'Carlos Mendoza (Admin Sede)',
      email: 'admin@coworking.local',
      passwordHash: passwordAdmin,
      role: UserRole.SITE_ADMIN,
    },
  });

  // 3.5 Recepcionista (Valeria Gómez)
  await prisma.user.create({
    data: {
      name: 'Valeria Gómez (Recepción)',
      email: 'recepcion@coworking.local',
      passwordHash: passwordReception,
      role: UserRole.RECEPTIONIST,
    },
  });

  console.log('✅ 5 Usuarios de prueba creados (Starter, Pro, Enterprise, Admin, Recepción).');

  // 4. Crear Sedes Diversificadas en Lima
  const site1 = await prisma.site.create({
    data: {
      name: 'Sede Miraflores — Hub Larco',
      address: 'Av. José Larco 850, Miraflores',
      city: 'Lima',
      openingTime: '08:00',
      closingTime: '22:00',
      isActive: true,
    },
  });

  const site2 = await prisma.site.create({
    data: {
      name: 'Sede San Isidro — Centro Financiero',
      address: 'Av. Rivera Navarrete 475, San Isidro',
      city: 'Lima',
      openingTime: '07:30',
      closingTime: '21:30',
      isActive: true,
    },
  });

  const site3 = await prisma.site.create({
    data: {
      name: 'Sede Barranco — Distrito Creativo & Podcast',
      address: 'Av. Pedro de Osma 210, Barranco',
      city: 'Lima',
      openingTime: '08:30',
      closingTime: '23:00',
      isActive: true,
    },
  });

  const site4 = await prisma.site.create({
    data: {
      name: 'Sede Surco — Polo Tecnológico & Training',
      address: 'Av. El Polo 670, Santiago de Surco',
      city: 'Lima',
      openingTime: '08:00',
      closingTime: '20:00',
      isActive: true,
    },
  });

  console.log('✅ 4 Sedes creadas (Miraflores, San Isidro, Barranco, Surco).');

  // 5. Crear Recursos y Espacios por Sede
  // --- Sede 1: Miraflores ---
  const resAndes = await prisma.resource.create({
    data: {
      siteId: site1.id,
      name: 'Sala de Reuniones Andes (Smart TV 4K & Zoom Rooms)',
      type: ResourceType.MEETING_ROOM,
      capacity: 8,
      creditsPerHour: 2,
      amenities: ['TV 4K 65"', 'Pizarra de vidrio templado', 'Videoconferencia Zoom Rooms', 'Aire Acondicionado', 'Café Nespresso'],
      isActive: true,
    },
  });

  const resPacifica = await prisma.resource.create({
    data: {
      siteId: site1.id,
      name: 'Directorio Ejecutivo Pacífica (Cámara Rally 4K)',
      type: ResourceType.MEETING_ROOM,
      capacity: 14,
      creditsPerHour: 4,
      amenities: ['Pantalla Dual 75"', 'Cámara Logitech Rally 4K', 'Micrófonos perimetrales Shure', 'Servicio de Catering', 'Insonorización acústica'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site1.id,
      name: 'Puesto Flexible — Terraza Cowork con Vista Panorámica',
      type: ResourceType.HOT_DESK,
      capacity: 1,
      creditsPerHour: 1,
      amenities: ['Silla Ergonómica Herman Miller', 'Enchufe Universal y USB-C 100W', 'Luz Natural y Vista Panorámica', 'Café de Especialidad'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site1.id,
      name: 'Cabina Acústica Privada — Focus Phone Booth 01',
      type: ResourceType.DEDICATED_DESK,
      capacity: 1,
      creditsPerHour: 1,
      amenities: ['Aislamiento Acústico 38dB', 'Luz LED regulable', 'Soporte para Laptop y Celular', 'Ventilación activa ultra-silenciosa'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site1.id,
      name: 'Escritorio Dedicado Premium — Desk 05 (Monitor 27" 2K)',
      type: ResourceType.DEDICATED_DESK,
      capacity: 1,
      creditsPerHour: 2,
      amenities: ['Monitor 27" 2K Dell USB-C Hub', 'Casillero con cerradura biométrica', 'Silla Ergonómica Steelcase', 'Gavetero metálico con llave'],
      isActive: true,
    },
  });

  // --- Sede 2: San Isidro ---
  const resInnovacion = await prisma.resource.create({
    data: {
      siteId: site2.id,
      name: 'Sala Innovación & Design Thinking (Proyector Láser)',
      type: ResourceType.MEETING_ROOM,
      capacity: 12,
      creditsPerHour: 3,
      amenities: ['Proyector Láser 5000 lúmenes', 'Audio envolvente JBL Pro', 'Pared de Pizarra Magnética 360°', 'Kits de Design Thinking'],
      isActive: true,
    },
  });

  const resAuditorio = await prisma.resource.create({
    data: {
      siteId: site2.id,
      name: 'Auditorio Principal Tech Hub (50 Personas & Streaming)',
      type: ResourceType.EVENT_SPACE,
      capacity: 50,
      creditsPerHour: 10,
      amenities: ['Escenario con atril digital', '2 Micrófonos inalámbricos Shure', 'Setup de Streaming multicámara', 'Cabina técnica de sonido'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site2.id,
      name: 'Hot Desk Lounge Ejecutivo San Isidro',
      type: ResourceType.HOT_DESK,
      capacity: 1,
      creditsPerHour: 1,
      amenities: ['Mesas de nogal macizo', 'Conexión cableada Gigabit RJ45', 'WiFi 6 prioritario', 'Barista en recepción'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site2.id,
      name: 'Escritorio Dedicado — Workstation 08',
      type: ResourceType.DEDICATED_DESK,
      capacity: 1,
      creditsPerHour: 2,
      amenities: ['Doble Monitor 24" IPS', 'Teclado y Mouse inalámbrico Logitech MX', 'Casillero digital'],
      isActive: true,
    },
  });

  // --- Sede 3: Barranco ---
  const resPodcast = await prisma.resource.create({
    data: {
      siteId: site3.id,
      name: 'Estudio de Grabación Podcast & Media Hub',
      type: ResourceType.MEETING_ROOM,
      capacity: 4,
      creditsPerHour: 4,
      amenities: ['4 Micrófonos Shure SM7B', 'Consola Rodecaster Pro II', 'Cámaras Sony Alpha 4K', 'Luces Elgato Key Light', 'Tratamiento Acústico Pro'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site3.id,
      name: 'Terraza Coworking Bohemia & Café de Especialidad',
      type: ResourceType.HOT_DESK,
      capacity: 1,
      creditsPerHour: 1,
      amenities: ['Zona al aire libre pet-friendly', 'Sombra bioclimática', 'Tomas impermeables', 'Música ambiental suave'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site3.id,
      name: 'Sala Creativa Brainstorming & Workshop',
      type: ResourceType.MEETING_ROOM,
      capacity: 10,
      creditsPerHour: 2,
      amenities: ['Smart Board táctil 70"', 'Mobiliario modular reconfigurable', 'Pizarra móvil', 'Café artesanal ilimitado'],
      isActive: true,
    },
  });

  // --- Sede 4: Surco ---
  const resTraining = await prisma.resource.create({
    data: {
      siteId: site4.id,
      name: 'Sala de Capacitación & Training Room (20 Personas)',
      type: ResourceType.MEETING_ROOM,
      capacity: 20,
      creditsPerHour: 5,
      amenities: ['Proyector 4K Ultra Short Throw', 'Sistema de audio perimetral', 'Distribución tipo aula modular', 'Puntero inalámbrico y atril'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site4.id,
      name: 'Hot Desk Zona Silencio Absoluto — Surco',
      type: ResourceType.HOT_DESK,
      capacity: 1,
      creditsPerHour: 1,
      amenities: ['Zona Libre de Llamadas', 'Lámparas de lectura individuales', 'Tomas de alta potencia', 'Dispensador de agua purificada'],
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      siteId: site4.id,
      name: 'Escritorio Dedicado — Lab Tech 02',
      type: ResourceType.DEDICATED_DESK,
      capacity: 1,
      creditsPerHour: 2,
      amenities: ['Monitor Curvo 34" Ultrawide', 'Brazo ergonómico neumático', 'Lockers privados', 'Regleta con supresor de picos'],
      isActive: true,
    },
  });

  console.log('✅ 15 Recursos y espacios especializados creados across 4 sedes.');

  // 6. Sembrar Reservas de Prueba Realistas en Varios Estados
  const nowMs = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;

  // 6.1 Reserva Activa en ventana de Check-In (empieza en 5 min) para Ana Torres (Miembro)
  await prisma.reservation.create({
    data: {
      resourceId: resAndes.id,
      userId: memberUser.id,
      startsAt: new Date(nowMs + 5 * 60 * 1000),
      endsAt: new Date(nowMs + 5 * 60 * 1000 + 2 * oneHour),
      status: 'CONFIRMED',
      creditsDeducted: 4,
      notes: 'Sesión de Sprint Planning & Demo con equipo remoto',
    },
  });

  // 6.2 Reserva Futura >24h (dentro de 3 días) para Ana Torres (Miembro)
  await prisma.reservation.create({
    data: {
      resourceId: resPacifica.id,
      userId: memberUser.id,
      startsAt: new Date(nowMs + 3 * oneDay),
      endsAt: new Date(nowMs + 3 * oneDay + 2 * oneHour),
      status: 'CONFIRMED',
      creditsDeducted: 8,
      notes: 'Reunión con inversionistas y directorio',
    },
  });

  // 6.3 Reserva Pasada y Completada (hace 2 días) para Ana Torres (Miembro)
  await prisma.reservation.create({
    data: {
      resourceId: resAndes.id,
      userId: memberUser.id,
      startsAt: new Date(nowMs - 2 * oneDay),
      endsAt: new Date(nowMs - 2 * oneDay + 2 * oneHour),
      status: 'COMPLETED',
      creditsDeducted: 4,
      checkedInAt: new Date(nowMs - 2 * oneDay + 3 * 60 * 1000),
      notes: 'Revisión semanal de arquitectura',
    },
  });

  // 6.4 Reserva Futura para Mateo Rossi (Pro) en Estudio de Grabación Podcast
  await prisma.reservation.create({
    data: {
      resourceId: resPodcast.id,
      userId: proUser.id,
      startsAt: new Date(nowMs + 2 * oneDay),
      endsAt: new Date(nowMs + 2 * oneDay + 2 * oneHour),
      status: 'CONFIRMED',
      creditsDeducted: 8,
      notes: 'Grabación de Episodio #12 del Tech Podcast',
    },
  });

  // 6.5 Reserva Futura para Sofía Valdivia (Enterprise) en Auditorio Tech Hub
  await prisma.reservation.create({
    data: {
      resourceId: resAuditorio.id,
      userId: enterpriseUser.id,
      startsAt: new Date(nowMs + 5 * oneDay),
      endsAt: new Date(nowMs + 5 * oneDay + 4 * oneHour),
      status: 'CONFIRMED',
      creditsDeducted: 40,
      notes: 'All-Hands Corporativo Trimestral y Lanzamiento Q4',
    },
  });

  console.log('✅ Reservas realistas (activas para check-in, pasadas completadas y futuras) sembradas.');
  console.log('🎉 ¡Seeding completado con éxito!');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
