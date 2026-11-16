-- =====================================================================
-- Sistemas de Gestión: el horario del 2.º cuatrimestre que el PDF pone en
-- 5K4 (miércoles y jueves de 19:55 a 23:05) es del 5K3, que es el
-- contracuatrimestral del 2.º (Pato, 16/11/2026). 5K4 queda solo en el 1.º.
-- Pegá TODO en el SQL Editor de Supabase y tocá Run. Se puede correr más de
-- una vez. Al final muestra una fila con cómo quedaron los dos cursos.
-- =====================================================================
WITH sg AS (
  SELECT d.id, upper(trim(c.identificador)) AS curso
  FROM public.dictados d
  JOIN public.cursos c ON c.id = d.curso_id
  JOIN public.materias m ON m.id = d.materia_id
  WHERE lower(translate(m.nombre, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = 'sistemas de gestion'
    AND upper(trim(c.identificador)) IN ('5K3', '5K4')
),
copiados AS (
  INSERT INTO public.horarios (dictado_id, cuatri, dia, desde, hasta)
  SELECT (SELECT id FROM sg WHERE curso = '5K3'), 2, h.dia, h.desde, h.hasta
  FROM public.horarios h
  WHERE h.dictado_id = (SELECT id FROM sg WHERE curso = '5K4') AND h.cuatri = 2
    AND (SELECT id FROM sg WHERE curso = '5K3') IS NOT NULL
  ON CONFLICT DO NOTHING
  RETURNING 1
),
borrados AS (
  DELETE FROM public.horarios h
  WHERE h.dictado_id = (SELECT id FROM sg WHERE curso = '5K4') AND h.cuatri = 2
    AND (SELECT id FROM sg WHERE curso = '5K3') IS NOT NULL
  RETURNING 1
),
-- (El SELECT ve la base de antes de este cambio: por eso arma cómo quedan)
quedan AS (
  SELECT CASE WHEN h.dictado_id = (SELECT id FROM sg WHERE curso = '5K4') AND h.cuatri = 2
              AND (SELECT id FROM sg WHERE curso = '5K3') IS NOT NULL THEN '5K3' ELSE s.curso END AS curso,
         h.cuatri, h.dia, h.desde, h.hasta
  FROM public.horarios h JOIN sg s ON s.id = h.dictado_id
)
SELECT
  (SELECT count(*) FROM sg WHERE curso = '5K3') = 1 AS encontre_5k3,
  (SELECT count(*) FROM sg WHERE curso = '5K4') = 1 AS encontre_5k4,
  (SELECT count(*) FROM borrados) AS pasados_a_5k3,
  (SELECT count(*) FROM copiados) AS nuevos_en_5k3,
  (SELECT string_agg(CASE q.cuatri WHEN 1 THEN '1.er cuatri ' WHEN 2 THEN '2.º cuatri ' ELSE 'Todo el año ' END || (ARRAY['lun','mar','mié','jue','vie','sáb'])[q.dia] || ' ' || to_char(q.desde, 'HH24:MI') || ' a ' || to_char(q.hasta, 'HH24:MI'), ' · ' ORDER BY q.cuatri, q.dia, q.desde)
     FROM quedan q WHERE q.curso = '5K3') AS horario_5k3,
  (SELECT string_agg(CASE q.cuatri WHEN 1 THEN '1.er cuatri ' WHEN 2 THEN '2.º cuatri ' ELSE 'Todo el año ' END || (ARRAY['lun','mar','mié','jue','vie','sáb'])[q.dia] || ' ' || to_char(q.desde, 'HH24:MI') || ' a ' || to_char(q.hasta, 'HH24:MI'), ' · ' ORDER BY q.cuatri, q.dia, q.desde)
     FROM quedan q WHERE q.curso = '5K4') AS horario_5k4;
