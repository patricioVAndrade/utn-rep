-- =====================================================================
-- Cargar los horarios 2026 de los cursos intensivos (los que tienen H).
-- Pegá TODO en el SQL Editor de Supabase y tocá Run. No hay que cambiar nada.
-- Se puede correr más de una vez: lo que ya está no se repite. Sirve igual
-- para la base de producción cuando Pato lo decida.
--
-- De la planilla "Horarios básicas" (Pato, 12/11/2026), pestañas Álgebra,
-- Análisis 1, Análisis 2 y Física 1 cuatrimestral: 19 cursos H, cada uno con
-- su cuatrimestre. Busca el curso por su nombre ("1H10/11"); "1H10 Comisión
-- 50" vale como "1H10/50" y "1H9 VIRTUAL" como "1H9". Si la planilla dice
-- solo "1H9" y la materia tiene un único "1H9/algo" libre, usa ese. Lo que
-- no encuentra no lo guarda y lo muestra en "no_encontre".
--
-- Antes crea Física 1 en 1H9 y 1H20 (1.er cuatrimestre, sábados), que no
-- estaban en la base, con los profesores de la planilla: busca cada uno por
-- apellido (y nombre, si la planilla lo trae); si no está, lo crea; si hay
-- más de uno con ese apellido, usa el que ya da Física 1 o no pone ninguno
-- y lo avisa en "profesores".
-- Requiere la migración 12 (tabla horarios).
-- =====================================================================

-- Ayudantes que duran solo esta sesión (no quedan en la base)
CREATE OR REPLACE FUNCTION pg_temp.norma(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(regexp_replace(lower(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '[^a-z0-9]+', ' ', 'g'))
$$;
-- Primera palabra y número de la materia: "Análisis Matemático I" -> "analisis 1"
CREATE OR REPLACE FUNCTION pg_temp.materia_corta(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT split_part(pg_temp.norma(t), ' ', 1) || coalesce(' ' || (
    SELECT CASE w WHEN 'i' THEN '1' WHEN 'ii' THEN '2' WHEN 'iii' THEN '3' ELSE w END
    FROM unnest(string_to_array(pg_temp.norma(t), ' ')) w WHERE w IN ('1', '2', '3', 'i', 'ii', 'iii') LIMIT 1), '')
$$;
-- "1H10 / Comisión 50" -> "1H10/50"; "1H8/8 VIRTUAL" -> "1H8/8"; "1H9 VIRTUAL" -> "1H9"
CREATE OR REPLACE FUNCTION pg_temp.clave_curso(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(BOTH '/' FROM regexp_replace(regexp_replace(regexp_replace(
    upper(translate(coalesce(t, ''), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')), 'COMISION|VIRTUAL', '/', 'g'), '[^A-Z0-9/]+', '', 'g'), '/+', '/', 'g'))
$$;

-- 1. Física 1 en 1H9 y 1H20 ------------------------------------------------------
INSERT INTO public.cursos (identificador, anio_carrera, turno)
SELECT v.ident, 1, 'MAÑANA' FROM (VALUES ('1H9'), ('1H20')) v(ident)
WHERE NOT EXISTS (SELECT 1 FROM public.cursos c WHERE pg_temp.clave_curso(c.identificador) = v.ident);

INSERT INTO public.dictados (materia_id, curso_id, periodo_dictado, es_intensivo)
SELECT m.id, c.id, 'PRIMER_CUATRIMESTRE', true
FROM public.materias m
JOIN public.cursos c ON pg_temp.clave_curso(c.identificador) IN ('1H9', '1H20')
WHERE pg_temp.materia_corta(m.nombre) = 'fisica 1'
  AND NOT EXISTS (SELECT 1 FROM public.dictados d WHERE d.materia_id = m.id AND d.curso_id = c.id);

CREATE TEMP TABLE IF NOT EXISTS profes_h (curso text, apellido text, nombre text, crear text, profesor_id integer, nota text);
TRUNCATE profes_h;
INSERT INTO profes_h (curso, apellido, nombre, crear) VALUES
  ('1H9', 'valdiviezo', NULL, 'Valdiviezo'),
  ('1H9', 'gomez astudillo', 'luis', 'Gomez Astudillo, Luis'),
  ('1H20', 'montalvan', 'natalia', 'Montalvan, Natalia'),
  ('1H20', 'valdiviezo', NULL, 'Valdiviezo'),
  ('1H20', 'kassis', 'santiago', 'Kassis, Santiago');

-- Los que ya están en la base
UPDATE profes_h x SET
  profesor_id = CASE WHEN k.n = 1 THEN k.uno WHEN k.nf = 1 THEN k.uno_fisica END,
  nota = CASE WHEN k.n = 1 THEN 'ya estaba: ' || k.nombres
              WHEN k.nf = 1 THEN 'hay más de uno con ese apellido (' || k.nombres || '); puse el que ya da Física 1'
              ELSE 'NO PUSE NINGUNO, hay más de uno: ' || k.nombres END
FROM (
  SELECT x.curso, x.apellido, count(*) AS n, min(p.id) AS uno,
         count(*) FILTER (WHERE f.da) AS nf, min(p.id) FILTER (WHERE f.da) AS uno_fisica,
         string_agg(p.nombre_completo, ' / ' ORDER BY p.nombre_completo) AS nombres
  FROM profes_h x
  JOIN public.profesores p ON string_to_array(pg_temp.norma(p.nombre_completo), ' ') @> string_to_array(x.apellido || coalesce(' ' || x.nombre, ''), ' ')
  CROSS JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1 FROM public.dictado_profesores dp
      JOIN public.dictados d ON d.id = dp.dictado_id
      JOIN public.materias m ON m.id = d.materia_id
      WHERE dp.profesor_id = p.id AND pg_temp.materia_corta(m.nombre) = 'fisica 1') AS da
  ) f
  GROUP BY x.curso, x.apellido
) k
WHERE k.curso = x.curso AND k.apellido = x.apellido;

-- Los que no están se crean
INSERT INTO public.profesores (nombre_completo)
SELECT DISTINCT crear FROM profes_h WHERE nota IS NULL;
UPDATE profes_h x SET profesor_id = p.id, nota = 'no estaba: lo creé como "' || x.crear || '"'
FROM public.profesores p
WHERE x.nota IS NULL AND p.nombre_completo = x.crear;

INSERT INTO public.dictado_profesores (dictado_id, profesor_id)
SELECT d.id, x.profesor_id
FROM profes_h x
JOIN public.cursos c ON pg_temp.clave_curso(c.identificador) = x.curso
JOIN public.dictados d ON d.curso_id = c.id
JOIN public.materias m ON m.id = d.materia_id AND pg_temp.materia_corta(m.nombre) = 'fisica 1'
WHERE x.profesor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.dictado_profesores y WHERE y.dictado_id = d.id AND y.profesor_id = x.profesor_id);

-- 2. Horarios -----------------------------------------------------------------------
WITH datos (materia, curso, cuatri, dia, desde, hasta) AS (VALUES
  ('Álgebra', '1H10/10', 1, 1, '13:15', '14:45'),
  ('Álgebra', '1H10/10', 1, 5, '13:15', '14:45'),
  ('Álgebra', '1H10/11', 1, 5, '13:15', '16:25'),
  ('Álgebra', '1H22/22', 1, 6, '09:00', '13:00'),
  ('Álgebra', '1H8/9', 2, 1, '13:15', '14:45'),
  ('Álgebra', '1H8/9', 2, 5, '13:15', '14:45'),
  ('Álgebra', '1H8/8', 2, 5, '13:15', '16:25'),
  ('Álgebra', '1H22/31', 2, 6, '09:00', '13:00'),
  ('Análisis Matemático 1', '1H10/10', 1, 3, '13:15', '17:20'),
  ('Análisis Matemático 1', '1H10 Comisión 50', 1, 6, '09:00', '13:00'),
  ('Análisis Matemático 1', '1H8/8', 2, 3, '13:15', '17:20'),
  ('Análisis Matemático 1', '1H21 Comisión 62', 2, 6, '09:00', '13:00'),
  ('Análisis Matemático 2', '1H9/10', 1, 4, '13:15', '17:20'),
  ('Análisis Matemático 2', '1H9/50', 1, 6, '09:00', '13:00'),
  ('Análisis Matemático 2', '1H9/9', 2, 4, '13:15', '17:20'),
  ('Análisis Matemático 2', '1H10/51', 2, 6, '09:00', '13:00'),
  ('Física 1', '1H9 VIRTUAL', 1, 6, '09:00', '13:00'),
  ('Física 1', '1H20 VIRTUAL', 1, 6, '09:00', '13:00'),
  ('Física 1', '1H10 VIRTUAL', 1, 1, '14:55', '17:20'),
  ('Física 1', '1H10 VIRTUAL', 1, 2, '16:00', '18:00'),
  ('Física 1', '1H8/8 VIRTUAL', 2, 2, '15:40', '18:05'),
  ('Física 1', '1H8/8 VIRTUAL', 2, 4, '16:30', '18:05'),
  ('Física 1', '1H20/20 VIRTUAL', 2, 6, '09:00', '13:00')),
grupos AS (
  SELECT DISTINCT materia, curso, cuatri, pg_temp.clave_curso(curso) AS clave FROM datos
),
-- Los cursos H que la base tiene de esas materias
dic AS (
  SELECT g.materia, d.id AS dictado_id, pg_temp.clave_curso(c.identificador) AS clave, d.periodo_dictado::text AS periodo
  FROM (SELECT DISTINCT materia FROM datos) g
  JOIN public.materias m ON pg_temp.materia_corta(m.nombre) = pg_temp.materia_corta(g.materia)
  JOIN public.dictados d ON d.materia_id = m.id
  JOIN public.cursos c ON c.id = d.curso_id
  WHERE pg_temp.clave_curso(c.identificador) ~ '^[0-9]H'
),
exacto AS (
  SELECT g.materia, g.curso, g.cuatri, dic.dictado_id
  FROM grupos g JOIN dic ON dic.materia = g.materia AND dic.clave = g.clave
),
-- "1H9" a secas: el único "1H9/algo" de la materia que quedó libre y no es del otro cuatrimestre
parecido AS (
  SELECT g.materia, g.curso, g.cuatri, min(dic.dictado_id) AS dictado_id
  FROM grupos g JOIN dic ON dic.materia = g.materia AND dic.clave LIKE g.clave || '/%'
  WHERE g.clave NOT LIKE '%/%'
    AND NOT EXISTS (SELECT 1 FROM exacto e WHERE e.materia = g.materia AND e.curso = g.curso)
    AND NOT EXISTS (SELECT 1 FROM exacto e WHERE e.dictado_id = dic.dictado_id)
    AND coalesce(dic.periodo, '') <> CASE g.cuatri WHEN 1 THEN 'SEGUNDO_CUATRIMESTRE' ELSE 'PRIMER_CUATRIMESTRE' END
  GROUP BY g.materia, g.curso, g.cuatri
  HAVING count(*) = 1
),
elegido AS (
  SELECT * FROM exacto
  UNION ALL
  SELECT p.* FROM parecido p
  -- si dos de la planilla caen en el mismo curso, no se guarda ninguno
  WHERE (SELECT count(*) FROM parecido q WHERE q.dictado_id = p.dictado_id) = 1
),
guardados AS (
  INSERT INTO public.horarios (dictado_id, cuatri, dia, desde, hasta)
  SELECT e.dictado_id, x.cuatri, x.dia, x.desde::time, x.hasta::time
  FROM datos x JOIN elegido e USING (materia, curso, cuatri)
  ON CONFLICT (dictado_id, (COALESCE(cuatri, 0)), dia, desde) DO NOTHING
  RETURNING dictado_id
),
sin AS (
  SELECT g.materia, g.curso FROM grupos g
  WHERE NOT EXISTS (SELECT 1 FROM elegido e WHERE e.materia = g.materia AND e.curso = g.curso AND e.cuatri = g.cuatri)
)
SELECT
  CASE
    WHEN (SELECT count(*) FROM elegido) = 0 THEN 'NO GUARDÉ NADA: no encontré ningún curso H. Pasame lo que dicen las otras columnas.'
    WHEN (SELECT count(*) FROM sin) = 0 THEN 'LISTO: todos los horarios quedaron cargados'
    ELSE 'LISTO, CON FALTANTES: guardé los que encontré. Pasame lo que dicen las otras columnas.'
  END AS resultado,
  (SELECT count(*) FROM guardados) AS horarios_nuevos,
  (SELECT count(*) FROM elegido) || ' de ' || (SELECT count(*) FROM grupos) AS cursos_con_horario,
  (SELECT string_agg(materia || ' · ' || curso, E'\n' ORDER BY materia, curso) FROM sin) AS no_encontre,
  (SELECT string_agg(curso || ' · ' || initcap(apellido) || ': ' || nota, E'\n' ORDER BY curso DESC, apellido) FROM profes_h) AS profesores,
  -- Cursos H de la base (de cualquier materia) que siguen sin horario
  (SELECT string_agg(m.nombre || ' · ' || c.identificador, E'\n' ORDER BY m.nombre, c.identificador)
   FROM public.dictados d JOIN public.materias m ON m.id = d.materia_id JOIN public.cursos c ON c.id = d.curso_id
   WHERE pg_temp.clave_curso(c.identificador) ~ '^[0-9]H'
     AND NOT EXISTS (SELECT 1 FROM public.horarios h WHERE h.dictado_id = d.id)
     AND NOT EXISTS (SELECT 1 FROM elegido e WHERE e.dictado_id = d.id)) AS cursos_h_sin_horario;
