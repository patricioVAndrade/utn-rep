-- =====================================================================
-- Sistemas de Gestión en 5.º año (Pato, 16/11/2026): según el PDF de la
-- facultad (F72_horario_5), 5K4 la da en los dos cuatrimestres (1.º: lunes y
-- jueves; 2.º: miércoles y jueves, de 19:55 a 23:05). El curso de 5K3
-- (contracuatrimestral, sin horario) no existe: se saca.
-- Pegá TODO en el SQL Editor de Supabase y tocá Run. Se puede correr más de
-- una vez. Muestra una fila con el resultado.
-- Si el de 5K3 tiene reseñas no se borra (sale en "resenas_5k3").
-- =====================================================================
WITH sg AS (
  SELECT d.id, upper(trim(c.identificador)) AS curso,
         (SELECT count(*) FROM public.resenas r WHERE r.dictado_id = d.id) AS resenas
  FROM public.dictados d
  JOIN public.cursos c ON c.id = d.curso_id
  JOIN public.materias m ON m.id = d.materia_id
  WHERE lower(translate(m.nombre, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = 'sistemas de gestion'
    AND upper(trim(c.identificador)) IN ('5K3', '5K4')
),
-- El 2.º cuatrimestre de 5K4 (por si se perdió)
segundo AS (
  INSERT INTO public.horarios (dictado_id, cuatri, dia, desde, hasta)
  SELECT s.id, 2, v.dia, '19:55', '23:05'
  FROM sg s, (VALUES (3), (4)) AS v(dia)
  WHERE s.curso = '5K4'
  ON CONFLICT DO NOTHING
  RETURNING 1
),
-- 5K3: profesores, historial y el curso (horarios y Mi inscripción se van con él)
sin_profes AS (
  DELETE FROM public.dictado_profesores dp USING sg s
  WHERE dp.dictado_id = s.id AND s.curso = '5K3' AND s.resenas = 0
  RETURNING 1
),
sin_historial AS (
  DELETE FROM public.profesores_historial ph USING sg s
  WHERE ph.dictado_id = s.id AND s.curso = '5K3' AND s.resenas = 0
  RETURNING 1
),
borrado AS (
  DELETE FROM public.dictados d USING sg s
  WHERE d.id = s.id AND s.curso = '5K3' AND s.resenas = 0
    AND (SELECT count(*) FROM sin_profes) >= 0 AND (SELECT count(*) FROM sin_historial) >= 0
  RETURNING 1
)
SELECT
  (SELECT count(*) FROM sg WHERE curso = '5K4') = 1 AS encontre_5k4,
  (SELECT count(*) FROM borrado) AS borre_5k3,
  coalesce((SELECT sum(resenas) FROM sg WHERE curso = '5K3'), 0) AS resenas_5k3,
  -- El SELECT ve la base de antes: suma lo que se agregó recién
  (SELECT count(*) FROM public.horarios h JOIN sg s ON s.id = h.dictado_id WHERE s.curso = '5K4' AND h.cuatri = 1)
    AS bloques_5k4_1er_cuatri,
  (SELECT count(*) FROM public.horarios h JOIN sg s ON s.id = h.dictado_id WHERE s.curso = '5K4' AND h.cuatri = 2)
    + (SELECT count(*) FROM segundo) AS bloques_5k4_2do_cuatri;
