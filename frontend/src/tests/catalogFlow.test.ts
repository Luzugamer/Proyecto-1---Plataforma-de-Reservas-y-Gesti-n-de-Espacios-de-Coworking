import { catalogApi } from '../features/catalog/api';
import { AppApiError } from '../shared/api/errorEnvelope';

export async function runCatalogDiagnostics() {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  log('🧪 INICIANDO DIAGNÓSTICO DEL MÓDULO 001 (CATÁLOGO Y DISPONIBILIDAD)...');

  try {
    // 1. Listar sedes (GET /sites)
    log('\n1. Probando Listado de Sedes (GET /sites)...');
    const sites = await catalogApi.getSites();
    if (sites.length >= 2 && sites[0].operatingHours.length > 0) {
      log(`✅ Sedes obtenidas: ${sites.length} sedes registradas ("${sites[0].name}", "${sites[1].name}")`);
    } else {
      throw new Error(`Sedes inválidas: ${JSON.stringify(sites)}`);
    }

    const firstSite = sites[0];

    // 2. Listar todos los recursos de una sede (GET /sites/{id}/resources)
    log(`\n2. Probando Listado de Recursos para la sede ${firstSite.name}...`);
    const allResources = await catalogApi.getResources(firstSite.id);
    if (allResources.length > 0) {
      log(`✅ Recursos obtenidos: ${allResources.length} espacios configurados`);
    } else {
      throw new Error('No se encontraron recursos en la sede');
    }

    // 3. Filtrar recursos por tipo (GET /sites/{id}/resources?type=MEETING_ROOM)
    log('\n3. Probando Filtro de recursos por tipo MEETING_ROOM...');
    const meetingRooms = await catalogApi.getResources(firstSite.id, 'MEETING_ROOM');
    if (meetingRooms.length > 0 && meetingRooms.every((r) => r.type === 'MEETING_ROOM')) {
      log(`✅ Filtro verificado: ${meetingRooms.length} salas de reuniones encontradas`);
    } else {
      throw new Error('Fallo en el filtrado por tipo de recurso');
    }

    const testResource = meetingRooms[0];

    // 4. Consultar disponibilidad en bloques de 30 min (GET /resources/{id}/availability)
    const testDate = '2026-09-15';
    log(`\n4. Probando Consulta de Disponibilidad horaria (HU-01) para ${testResource.name} en fecha ${testDate}...`);
    const availability = await catalogApi.getAvailability(testResource.id, testDate);
    if (availability.slots.length > 0) {
      log(`✅ Disponibilidad generada: ${availability.slots.length} slots de 30 min`);

      // Verificar estados
      const statuses = new Set(availability.slots.map((s) => s.status));
      log(`   Estados detectados en slots: ${Array.from(statuses).join(', ')}`);

      if (!statuses.has('AVAILABLE')) {
        throw new Error('Debe existir al menos un slot AVAILABLE');
      }
    } else {
      throw new Error('No se generaron slots de disponibilidad');
    }

    // 5. Bloqueo administrativo de recurso por mantenimiento (HU-02 / POST /admin/resources/{id}/blocks)
    log('\n5. Probando Bloqueo administrativo por mantenimiento (HU-02)...');
    const blockPayload = {
      startsAt: `${testDate}T10:00:00Z`,
      endsAt: `${testDate}T12:00:00Z`,
      reason: 'Mantenimiento preventivo de aire acondicionado y proyector',
    };

    const blockRes = await catalogApi.blockResource(testResource.id, blockPayload);
    if (blockRes.blockId && blockRes.cancelledReservations) {
      log(`✅ Bloqueo creado exitosamente (ID: ${blockRes.blockId})`);
      log(`   Reservas canceladas y reembolsadas automáticamente: ${blockRes.cancelledReservations.length}`);
    } else {
      throw new Error(`Respuesta inválida de bloqueo: ${JSON.stringify(blockRes)}`);
    }

    // 6. Verificar que los slots en ese rango pasaron a estado BLOCKED
    log('\n6. Verificando actualización de disponibilidad post-bloqueo...');
    const updatedAvailability = await catalogApi.getAvailability(testResource.id, testDate);
    const blockedSlotsInRange = updatedAvailability.slots.filter(
      (s) => s.startsAt >= blockPayload.startsAt && s.endsAt <= blockPayload.endsAt
    );

    if (blockedSlotsInRange.length > 0 && blockedSlotsInRange.every((s) => s.status === 'BLOCKED')) {
      log(`✅ Verificación exitosa: ${blockedSlotsInRange.length} slots actualizados a BLOCKED`);
    } else {
      throw new Error('Los slots del rango bloqueado no figuran como BLOCKED');
    }

    // 7. Validación de recurso inexistente (RESOURCE_NOT_FOUND / 404)
    log('\n7. Probando manejo de error ante recurso inexistente (404 RESOURCE_NOT_FOUND)...');
    try {
      await catalogApi.getAvailability('res_inexistente_999', testDate);
      throw new Error('Debería haber retornado 404');
    } catch (err) {
      if (err instanceof AppApiError && err.code === 'RESOURCE_NOT_FOUND') {
        log('✅ Error 404 capturado correctamente: RESOURCE_NOT_FOUND');
      } else {
        throw err;
      }
    }

    log('\n🎉 TODOS LOS CRITERIOS DE ACEPTACIÓN DEL MÓDULO 001 (CATÁLOGO Y DISPONIBILIDAD) PASARON AL 100%.');
    return { success: true, logs };
  } catch (err) {
    log(`❌ Error durante el diagnóstico de catálogo: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, logs, error: err };
  }
}
