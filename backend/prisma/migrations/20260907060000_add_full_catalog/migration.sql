BEGIN;

-- Catálogo adicional para entornos nuevos. Esta migración solo inserta datos
-- faltantes: no modifica ni elimina sedes, recursos, usuarios o reservas.
INSERT INTO "sites"
  ("id", "name", "address", "city", "openingTime", "closingTime", "timezone", "utcOffsetMinutes", "isActive", "createdAt", "updatedAt")
VALUES
  ('site_02', 'Sede San Isidro — Centro Financiero', 'Av. Rivera Navarrete 475, San Isidro', 'Lima', '07:30', '21:30', 'America/Lima', -300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('site_03', 'Sede Barranco — Distrito Creativo & Podcast', 'Av. Pedro de Osma 210, Barranco', 'Lima', '08:30', '23:00', 'America/Lima', -300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('site_04', 'Sede Surco — Polo Tecnológico & Training', 'Av. El Polo 670, Santiago de Surco', 'Lima', '08:00', '20:00', 'America/Lima', -300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "operating_hours"
  ("id", "siteId", "dayOfWeek", "opensAt", "closesAt")
VALUES
  ('hours_02_mon', 'site_02', 'MON', '07:30', '21:30'),
  ('hours_02_tue', 'site_02', 'TUE', '07:30', '21:30'),
  ('hours_02_wed', 'site_02', 'WED', '07:30', '21:30'),
  ('hours_02_thu', 'site_02', 'THU', '07:30', '21:30'),
  ('hours_02_fri', 'site_02', 'FRI', '07:30', '21:30'),
  ('hours_02_sat', 'site_02', 'SAT', '07:30', '21:30'),
  ('hours_02_sun', 'site_02', 'SUN', '07:30', '21:30'),
  ('hours_03_mon', 'site_03', 'MON', '08:30', '23:00'),
  ('hours_03_tue', 'site_03', 'TUE', '08:30', '23:00'),
  ('hours_03_wed', 'site_03', 'WED', '08:30', '23:00'),
  ('hours_03_thu', 'site_03', 'THU', '08:30', '23:00'),
  ('hours_03_fri', 'site_03', 'FRI', '08:30', '23:00'),
  ('hours_03_sat', 'site_03', 'SAT', '08:30', '23:00'),
  ('hours_03_sun', 'site_03', 'SUN', '08:30', '23:00'),
  ('hours_04_mon', 'site_04', 'MON', '08:00', '20:00'),
  ('hours_04_tue', 'site_04', 'TUE', '08:00', '20:00'),
  ('hours_04_wed', 'site_04', 'WED', '08:00', '20:00'),
  ('hours_04_thu', 'site_04', 'THU', '08:00', '20:00'),
  ('hours_04_fri', 'site_04', 'FRI', '08:00', '20:00'),
  ('hours_04_sat', 'site_04', 'SAT', '08:00', '20:00'),
  ('hours_04_sun', 'site_04', 'SUN', '08:00', '20:00')
ON CONFLICT DO NOTHING;

-- Miraflores ya cuenta con tres recursos mínimos en la migración inicial.
-- Aquí se agregan los dos espacios adicionales que completan esa sede.
INSERT INTO "resources"
  ("id", "siteId", "name", "type", "capacity", "creditCostAmount", "amenities", "isActive", "createdAt", "updatedAt")
VALUES
  (
    'res_04',
    'site_01',
    'Directorio Ejecutivo Pacífica (Cámara Rally 4K)',
    'MEETING_ROOM',
    14,
    4,
    ARRAY['Pantalla Dual 75"', 'Cámara Logitech Rally 4K', 'Micrófonos perimetrales Shure', 'Servicio de Catering', 'Insonorización acústica'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_05',
    'site_01',
    'Cabina Acústica Privada — Focus Phone Booth 01',
    'DEDICATED_DESK',
    1,
    1,
    ARRAY['Aislamiento Acústico 38dB', 'Luz LED regulable', 'Soporte para Laptop y Celular', 'Ventilación activa ultra-silenciosa'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_06',
    'site_02',
    'Sala Innovación & Design Thinking (Proyector Láser)',
    'MEETING_ROOM',
    12,
    3,
    ARRAY['Proyector Láser 5000 lúmenes', 'Audio envolvente JBL Pro', 'Pared de Pizarra Magnética 360°', 'Kits de Design Thinking'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_07',
    'site_02',
    'Auditorio Principal Tech Hub (50 Personas & Streaming)',
    'MEETING_ROOM',
    50,
    10,
    ARRAY['Escenario con atril digital', '2 Micrófonos inalámbricos Shure', 'Setup de Streaming multicámara', 'Cabina técnica de sonido'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_08',
    'site_02',
    'Hot Desk Lounge Ejecutivo San Isidro',
    'HOT_DESK',
    1,
    1,
    ARRAY['Mesas de nogal macizo', 'Conexión cableada Gigabit RJ45', 'WiFi 6 prioritario', 'Barista en recepción'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_09',
    'site_02',
    'Escritorio Dedicado — Workstation 08',
    'DEDICATED_DESK',
    1,
    2,
    ARRAY['Doble Monitor 24" IPS', 'Teclado y Mouse inalámbrico Logitech MX', 'Casillero digital'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_10',
    'site_03',
    'Estudio de Grabación Podcast & Media Hub',
    'MEETING_ROOM',
    4,
    4,
    ARRAY['4 Micrófonos Shure SM7B', 'Consola Rodecaster Pro II', 'Cámaras Sony Alpha 4K', 'Luces Elgato Key Light', 'Tratamiento Acústico Pro'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_11',
    'site_03',
    'Terraza Coworking Bohemia & Café de Especialidad',
    'HOT_DESK',
    1,
    1,
    ARRAY['Zona al aire libre pet-friendly', 'Sombra bioclimática', 'Tomas impermeables', 'Música ambiental suave'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_12',
    'site_03',
    'Sala Creativa Brainstorming & Workshop',
    'MEETING_ROOM',
    10,
    2,
    ARRAY['Smart Board táctil 70"', 'Mobiliario modular reconfigurable', 'Pizarra móvil', 'Café artesanal ilimitado'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_13',
    'site_04',
    'Sala de Capacitación & Training Room (20 Personas)',
    'MEETING_ROOM',
    20,
    5,
    ARRAY['Proyector 4K Ultra Short Throw', 'Sistema de audio perimetral', 'Distribución tipo aula modular', 'Puntero inalámbrico y atril'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_14',
    'site_04',
    'Hot Desk Zona Silencio Absoluto — Surco',
    'HOT_DESK',
    1,
    1,
    ARRAY['Zona Libre de Llamadas', 'Lámparas de lectura individuales', 'Tomas de alta potencia', 'Dispensador de agua purificada'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'res_15',
    'site_04',
    'Escritorio Dedicado — Lab Tech 02',
    'DEDICATED_DESK',
    1,
    2,
    ARRAY['Monitor Curvo 34" Ultrawide', 'Brazo ergonómico neumático', 'Lockers privados', 'Regleta con supresor de picos'],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT DO NOTHING;

COMMIT;
