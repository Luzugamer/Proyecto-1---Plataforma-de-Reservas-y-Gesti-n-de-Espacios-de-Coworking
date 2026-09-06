import { PrismaClient, UserRole, ResourceType, PlanTier } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Iniciando Seeder de Base de Datos PostgreSQL...');
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
                    'WiFi de alta velocidad y café ilimitado',
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
                description: 'Perfecto para profesionales y equipos pequeños que requieren reuniones frecuentes.',
                features: [
                    '30 créditos mensuales incluidos',
                    'Acceso prioritario a todas las sedes',
                    'Reserva de salas con 30 días de anticipación',
                    'Créditos válidos para salas 4K y directorios',
                    'Soporte prioritario y casillero incluido',
                ],
                isPopular: true,
            },
            {
                id: PlanTier.ENTERPRISE,
                name: 'Plan Enterprise',
                monthlyCredits: 100,
                pricePerMonth: 199.0,
                currency: 'USD',
                description: 'Diseñado para empresas y startups en expansión con alta demanda colaborativa.',
                features: [
                    '100 créditos mensuales incluidos',
                    'Acceso ilimitado a todas las sedes y espacios',
                    'Reserva anticipada sin límite de tiempo',
                    'Invitados ilimitados a salas de directorio',
                    'Gestor de cuenta dedicado y facturación corporativa',
                ],
                isPopular: false,
            },
        ],
    });
    console.log('✅ Planes de membresía creados.');
    // 3. Crear Usuarios de Prueba
    const salt = await bcrypt.genSalt(10);
    const passwordMember = await bcrypt.hash('Miembro123!', salt);
    const passwordAdmin = await bcrypt.hash('Admin123!', salt);
    const passwordReception = await bcrypt.hash('Recepcion123!', salt);
    const memberUser = await prisma.user.create({
        data: {
            name: 'Ana Torres (Miembro)',
            email: 'miembro@coworking.local',
            passwordHash: passwordMember,
            role: UserRole.MEMBER,
            wallet: {
                create: {
                    balance: 10,
                },
            },
            subscription: {
                create: {
                    planId: PlanTier.STARTER,
                    status: 'ACTIVE',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    autoRenew: true,
                },
            },
        },
        include: {
            wallet: true,
        },
    });
    if (memberUser.wallet) {
        await prisma.walletTransaction.create({
            data: {
                walletId: memberUser.wallet.id,
                userId: memberUser.id,
                type: 'MONTHLY_ALLOWANCE',
                amount: 10,
                balanceAfter: 10,
                description: 'Asignación inicial de bienvenida — Plan Starter (10 créditos)',
            },
        });
    }
    const adminUser = await prisma.user.create({
        data: {
            name: 'Carlos Mendoza (Admin Sede)',
            email: 'admin@coworking.local',
            passwordHash: passwordAdmin,
            role: UserRole.SITE_ADMIN,
        },
    });
    await prisma.user.create({
        data: {
            name: 'Valeria Gómez (Recepción)',
            email: 'recepcion@coworking.local',
            passwordHash: passwordReception,
            role: UserRole.RECEPTIONIST,
        },
    });
    console.log('✅ Usuarios de prueba creados (miembro, admin, recepción).');
    // 4. Crear Sedes
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
            name: 'Sede San Isidro — Financiero',
            address: 'Av. Rivera Navarrete 475, San Isidro',
            city: 'Lima',
            openingTime: '07:30',
            closingTime: '21:30',
            isActive: true,
        },
    });
    console.log('✅ Sedes creadas.');
    // 5. Crear Recursos para cada Sede
    const res1 = await prisma.resource.create({
        data: {
            siteId: site1.id,
            name: 'Sala de Reuniones Andes (Smart TV 4K & Pizarra)',
            type: ResourceType.MEETING_ROOM,
            capacity: 8,
            creditsPerHour: 2,
            amenities: ['TV 4K 65"', 'Pizarra de vidrio', 'Videoconferencia Zoom Rooms', 'Aire Acondicionado'],
            isActive: true,
        },
    });
    const res2 = await prisma.resource.create({
        data: {
            siteId: site1.id,
            name: 'Sala de Directorio Pacífica (Videoconferencia)',
            type: ResourceType.MEETING_ROOM,
            capacity: 14,
            creditsPerHour: 4,
            amenities: ['Pantalla Dual 75"', 'Cámara Logitech Rally 4K', 'Micrófonos perimetrales', 'Cafetera Nespresso'],
            isActive: true,
        },
    });
    await prisma.resource.create({
        data: {
            siteId: site1.id,
            name: 'Puesto Flexible — Zona Creativa A',
            type: ResourceType.HOT_DESK,
            capacity: 1,
            creditsPerHour: 1,
            amenities: ['Silla Ergonómica Herman Miller', 'Enchufe Universal y USB-C', 'Luz Natural'],
            isActive: true,
        },
    });
    await prisma.resource.create({
        data: {
            siteId: site1.id,
            name: 'Escritorio Dedicado — Cabina Silenciosa 04',
            type: ResourceType.DEDICATED_DESK,
            capacity: 1,
            creditsPerHour: 2,
            amenities: ['Monitor 27" 2K USB-C', 'Casillero con cerradura digital', 'Aislamiento Acústico'],
            isActive: true,
        },
    });
    await prisma.resource.create({
        data: {
            siteId: site2.id,
            name: 'Sala Innovación (Proyector Láser)',
            type: ResourceType.MEETING_ROOM,
            capacity: 12,
            creditsPerHour: 3,
            amenities: ['Proyector Láser 5000 lúmenes', 'Audio envolvente JBL', 'Pizarra Magnética'],
            isActive: true,
        },
    });
    await prisma.resource.create({
        data: {
            siteId: site2.id,
            name: 'Auditorio Principal Tech Hub',
            type: ResourceType.EVENT_SPACE,
            capacity: 50,
            creditsPerHour: 10,
            amenities: ['Escenario con atril', '2 Micrófonos inalámbricos Shure', 'Streaming Setup', 'Cabina de sonido'],
            isActive: true,
        },
    });
    console.log('✅ Recursos de sedes creados.');
    // 6. Sembrar algunas reservas de prueba para la vista de recepción / ciclo de vida
    const nowMs = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;
    // Reserva en ventana activa de check-in (empieza en 5 min)
    await prisma.reservation.create({
        data: {
            resourceId: res1.id,
            userId: memberUser.id,
            startsAt: new Date(nowMs + 5 * 60 * 1000),
            endsAt: new Date(nowMs + 5 * 60 * 1000 + 2 * oneHour),
            status: 'CONFIRMED',
            creditsDeducted: 4,
            notes: 'Reunión de sprint planning',
        },
    });
    // Reserva futura >24h (para prueba de cancelación temprana 100%)
    await prisma.reservation.create({
        data: {
            resourceId: res2.id,
            userId: memberUser.id,
            startsAt: new Date(nowMs + 3 * oneDay),
            endsAt: new Date(nowMs + 3 * oneDay + 2 * oneHour),
            status: 'CONFIRMED',
            creditsDeducted: 8,
            notes: 'Presentación trimestral con clientes',
        },
    });
    console.log('🌱 Seeding completado con éxito.');
}
main()
    .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
