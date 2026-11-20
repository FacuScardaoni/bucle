-- Datos de demostración de Bucle. Las fechas son relativas al día en que se carga,
-- así la demo siempre muestra prioridades, estados y estadísticas coherentes con las reglas.
-- Se carga con: npm run seed   (solo si la base está vacía)

SET TIME ZONE 'America/Argentina/Buenos_Aires';

INSERT INTO categorias (nombre, nombre_normalizado, descripcion) VALUES
  ('Puntualidad',   'puntualidad',   'Llegar tarde, perder turnos o transportes'),
  ('Olvidos',       'olvidos',       'Cosas que se olvidan o se pierden'),
  ('Finanzas',      'finanzas',      'Gastos que se van de las manos'),
  ('Productividad', 'productividad', 'Tiempo perdido y distracciones');

-- 1) ACTIVO, prioridad ALTA: varias ocurrencias recientes, casi siempre a la mañana.
INSERT INTO problemas (nombre, nombre_normalizado, descripcion, categoria_id, estado, fecha_creacion, fecha_estado)
VALUES ('Llegar tarde al trabajo', 'llegar tarde al trabajo', 'Sobre todo los lunes y cuando llueve',
        (SELECT id FROM categorias WHERE nombre_normalizado = 'puntualidad'), 'ACTIVO',
        current_date - 50, current_date - 50);

-- 2) CONTROLADO: una solución que funcionó bajó mucho la frecuencia.
INSERT INTO problemas (nombre, nombre_normalizado, descripcion, categoria_id, estado, fecha_creacion, fecha_estado)
VALUES ('Olvidar la billetera', 'olvidar la billetera', 'Me doy cuenta cuando tengo que pagar',
        (SELECT id FROM categorias WHERE nombre_normalizado = 'olvidos'), 'CONTROLADO',
        current_date - 60, current_date - 5 + time '21:00');

-- 3) ACTIVO: una solución no funcionó y otra está planificada.
INSERT INTO problemas (nombre, nombre_normalizado, descripcion, categoria_id, estado, fecha_creacion, fecha_estado)
VALUES ('Gastar de más en delivery', 'gastar de mas en delivery', 'Pedidos a la noche cuando estoy cansado',
        (SELECT id FROM categorias WHERE nombre_normalizado = 'finanzas'), 'ACTIVO',
        current_date - 40, current_date - 40);

-- 4) SOLUCIONADO: solución que funcionó y más de 14 días sin ocurrencias.
INSERT INTO problemas (nombre, nombre_normalizado, descripcion, categoria_id, estado, fecha_creacion, fecha_estado)
VALUES ('Usar el celular antes de dormir', 'usar el celular antes de dormir', 'Me acuesto y me quedo una hora con el celular',
        (SELECT id FROM categorias WHERE nombre_normalizado = 'productividad'), 'SOLUCIONADO',
        current_date - 70, current_date - 5 + time '21:00');

-- 5) ACTIVO, prioridad BAJA: recién empieza a registrarse.
INSERT INTO problemas (nombre, nombre_normalizado, descripcion, categoria_id, estado, fecha_creacion, fecha_estado)
VALUES ('Olvidar responder mensajes importantes', 'olvidar responder mensajes importantes', NULL,
        (SELECT id FROM categorias WHERE nombre_normalizado = 'olvidos'), 'ACTIVO',
        current_date - 3, current_date - 3);

-- Ocurrencias: (problema, días atrás, desde cuándo se cuentan, hora, descripción, contexto, posible causa, gravedad)
-- 'lunes' cuenta desde el lunes de esta semana, para que "Llegar tarde" caiga siempre en lunes (salvo una en miércoles).
INSERT INTO ocurrencias (problema_id, fecha, descripcion, contexto, posible_causa, gravedad)
SELECT p.id,
       CASE o.ancla WHEN 'lunes' THEN date_trunc('week', current_date)::date ELSE current_date END - o.dias + o.hora, o.descripcion, o.contexto, o.causa, o.gravedad
FROM (VALUES
  ('llegar tarde al trabajo', 49, 'lunes', time '09:20', 'Llegué 20 minutos tarde',        'Lunes, colectivo lleno',  'Me quedé dormido',             3),
  ('llegar tarde al trabajo', 42, 'lunes', time '09:10', 'Llegué 10 minutos tarde',        'Lunes',                   'Salí sin desayunar igual tarde', 2),
  ('llegar tarde al trabajo', 35, 'lunes', time '09:35', 'Llegué tarde a la reunión de equipo', 'Lunes, lluvia',      'No encontraba la ropa',        4),
  ('llegar tarde al trabajo', 28, 'lunes', time '09:15', 'Llegué 15 minutos tarde',        'Lunes',                   'Me quedé dormido',             3),
  ('llegar tarde al trabajo', 19, 'lunes', time '09:05', 'Llegué 5 minutos tarde',         'Miércoles',               NULL,                           1),
  ('llegar tarde al trabajo', 14, 'lunes', time '09:40', 'Perdí el inicio de una reunión', 'Lunes, lluvia',           'Corte de subte',               4),
  ('llegar tarde al trabajo',  7, 'lunes', time '09:10', 'Llegué 10 minutos tarde',        'Lunes',                   'Me quedé dormido',             2),

  ('olvidar la billetera', 55, 'hoy', time '13:00', 'No pude pagar el almuerzo',  'Trabajo',  'Cambié de mochila',  3),
  ('olvidar la billetera', 50, 'hoy', time '08:30', 'Volví a buscarla a casa',    'Mañana',   'Salí apurado',       2),
  ('olvidar la billetera', 46, 'hoy', time '19:00', 'No pude cargar la SUBE',     'Estación', NULL,                 3),
  ('olvidar la billetera', 41, 'hoy', time '12:30', 'Me prestaron plata',         'Trabajo',  'Cambié de mochila',  2),
  ('olvidar la billetera', 37, 'hoy', time '08:45', 'Volví a buscarla a casa',    'Mañana',   'Salí apurado',       2),
  ('olvidar la billetera', 34, 'hoy', time '20:15', 'No pude pagar en el súper',  'Súper',    NULL,                 3),
  ('olvidar la billetera', 16, 'hoy', time '08:40', 'Volví a buscarla a casa',    'Mañana',   'La dejé en el auto', 1),

  ('gastar de mas en delivery', 33, 'hoy', time '22:00', 'Pedí pizza',              'Día largo de trabajo', 'Cansancio',        2),
  ('gastar de mas en delivery', 26, 'hoy', time '21:30', 'Pedí sushi',              'Viernes',              'Antojo',           3),
  ('gastar de mas en delivery', 19, 'hoy', time '22:15', 'Pedí hamburguesas',       'Heladera vacía',       'No hice compras',  3),
  ('gastar de mas en delivery', 12, 'hoy', time '21:45', 'Pedí empanadas',          'Día largo de trabajo', 'Cansancio',        2),
  ('gastar de mas en delivery', 4, 'hoy', time '22:30', 'Pedí comida dos veces',   'Fin de semana',        'Antojo',           4),

  ('usar el celular antes de dormir', 60, 'hoy', time '00:30', 'Dormí 5 horas',            'Redes sociales', 'Videos cortos', 3),
  ('usar el celular antes de dormir', 55, 'hoy', time '01:00', 'Me costó levantarme',      'Redes sociales', 'Videos cortos', 3),
  ('usar el celular antes de dormir', 50, 'hoy', time '00:45', 'Dormí 5 horas',            'Series',         NULL,            2),
  ('usar el celular antes de dormir', 46, 'hoy', time '01:15', 'Llegué cansado al trabajo','Redes sociales', 'Videos cortos', 4),
  ('usar el celular antes de dormir', 39, 'hoy', time '00:20', 'Me dormí tarde',           'Mensajes',       NULL,            2),
  ('usar el celular antes de dormir', 27, 'hoy', time '23:50', 'Me dormí tarde',           'Redes sociales', NULL,            1),

  ('olvidar responder mensajes importantes', 2, 'hoy', time '18:00', 'No le respondí al contador', 'Trabajo', 'Lo leí y lo dejé para después', 3)
) AS o (problema, dias, ancla, hora, descripcion, contexto, causa, gravedad)
JOIN problemas p ON p.nombre_normalizado = o.problema;

-- Soluciones: (problema, nombre, descripción, días atrás de aplicación, resultado, observaciones, días atrás de evaluación)
INSERT INTO soluciones (problema_id, nombre, nombre_normalizado, descripcion, fecha_aplicacion, resultado, observaciones, fecha_evaluacion)
SELECT p.id, s.nombre, s.normalizado, s.descripcion, current_date - s.dias_aplicacion, s.resultado, s.observaciones,
       CASE WHEN s.dias_evaluacion IS NULL THEN NULL ELSE current_date - s.dias_evaluacion + time '20:00' END
FROM (VALUES
  ('llegar tarde al trabajo', 'Preparar la ropa la noche anterior', 'preparar la ropa la noche anterior',
   'Dejar todo listo antes de dormir', 21, 'PARCIAL', 'Ayuda, pero los lunes sigo llegando tarde por quedarme dormido', 7),
  ('olvidar la billetera', 'Bandeja junto a la puerta', 'bandeja junto a la puerta',
   'Dejar llaves, billetera y SUBE siempre en el mismo lugar', 30, 'FUNCIONO', NULL, 6),
  ('gastar de mas en delivery', 'Cocinar el domingo para la semana', 'cocinar el domingo para la semana',
   'Viandas en el freezer', 18, 'NO_FUNCIONO', 'A la noche igual tenía ganas de otra cosa y terminaba pidiendo', 3),
  ('gastar de mas en delivery', 'Límite semanal en la app del banco', 'limite semanal en la app del banco',
   'Tope de gasto en comida', -3, 'PENDIENTE', NULL, NULL),
  ('usar el celular antes de dormir', 'Cargar el celular fuera del dormitorio', 'cargar el celular fuera del dormitorio',
   'Despertador analógico en la mesa de luz', 35, 'FUNCIONO', 'Desde que lo hago me duermo antes', 10)
) AS s (problema, nombre, normalizado, descripcion, dias_aplicacion, resultado, observaciones, dias_evaluacion)
JOIN problemas p ON p.nombre_normalizado = s.problema;

-- Cambios de estado coherentes con los estados actuales.
INSERT INTO cambios_estado (problema_id, estado_anterior, estado_nuevo, motivo, fecha)
SELECT p.id, c.anterior, c.nuevo, 'MANUAL', current_date - c.dias + time '21:00'
FROM (VALUES
  ('olvidar la billetera',            'ACTIVO', 'CONTROLADO',  5),
  ('usar el celular antes de dormir', 'ACTIVO', 'CONTROLADO',  9),
  ('usar el celular antes de dormir', 'CONTROLADO', 'SOLUCIONADO', 5)
) AS c (problema, anterior, nuevo, dias)
JOIN problemas p ON p.nombre_normalizado = c.problema;
