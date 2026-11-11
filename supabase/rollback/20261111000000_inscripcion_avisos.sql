-- Vuelta atrás de supabase/migrations/20261111000000_inscripcion_avisos.sql
-- Vuelve "elegido" (todos sin marcar: lo que estaba marcado no se recupera) y
-- las funciones de las migraciones 7, 15 y 18. Los avisos ya creados quedan.
BEGIN;

ALTER TABLE public.inscripcion_cursos ADD COLUMN IF NOT EXISTS elegido boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS inscripcion_un_elegido ON public.inscripcion_cursos (user_id, materia_id) WHERE elegido;
GRANT INSERT (elegido), UPDATE (elegido) ON public.inscripcion_cursos TO authenticated;
DROP INDEX IF EXISTS public.inscripcion_por_curso;

CREATE OR REPLACE FUNCTION public.avisos_resena_nueva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_materia integer;
  v_nombre text;
  v_curso text;
  s record;
BEGIN
  SELECT d.materia_id, m.nombre, c.identificador INTO v_materia, v_nombre, v_curso
  FROM public.dictados d
  JOIN public.materias m ON m.id = d.materia_id
  LEFT JOIN public.cursos c ON c.id = d.curso_id
  WHERE d.id = NEW.dictado_id;
  IF v_materia IS NULL THEN RETURN NULL; END IF;
  FOR s IN SELECT user_id FROM public.seguimientos WHERE materia_id = v_materia AND user_id IS DISTINCT FROM NEW.user_id LOOP
    PERFORM public.avisar(s.user_id, 'resena_nueva',
      'Reseña nueva en ' || v_nombre,
      CASE WHEN v_curso IS NOT NULL THEN 'Del curso ' || v_curso || '.' END,
      '/dictado/' || NEW.dictado_id || '#resena-' || NEW.id,
      'resena_nueva:' || NEW.id);
  END LOOP;
  RETURN NULL;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.mails_pendientes(p_limite integer, p_dias integer DEFAULT 7)
RETURNS TABLE (user_id uuid, email text, nombre text, prioridad integer, avisos jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH cand AS (
    SELECT n.id, n.user_id, n.tipo, n.titulo, n.texto, n.link, n.created_at,
      CASE n.tipo WHEN 'pedido_edicion' THEN 1 WHEN 'respuesta_moderador' THEN 2 WHEN 'recordatorio' THEN 3
        WHEN 'resena_nueva' THEN 4 WHEN 'final_nuevo' THEN 4 ELSE 5 END AS prioridad
    FROM public.notificaciones n
    WHERE n.leida_at IS NULL
      AND n.mail_enviado_at IS NULL
      AND n.telegram_enviado_at IS NULL
      AND n.created_at >= now() - make_interval(days => p_dias)
      AND NOT EXISTS (SELECT 1 FROM public.telegram_cuentas t WHERE t.user_id = n.user_id)
      AND public.quiere_mail(n.user_id, n.tipo)
      AND (n.tipo NOT IN ('resena_nueva', 'final_nuevo') OR EXISTS (
        SELECT 1 FROM public.seguimientos s
        WHERE s.user_id = n.user_id AND s.mail AND s.materia_id = (
          CASE n.tipo
            WHEN 'resena_nueva' THEN (SELECT d.materia_id FROM public.resenas r JOIN public.dictados d ON d.id = r.dictado_id WHERE r.id::text = split_part(n.clave, ':', 2))
            ELSE (SELECT f.materia_id FROM public.experiencias_finales f WHERE f.id::text = split_part(n.clave, ':', 2))
          END)))
  ),
  gente AS (
    SELECT c.user_id, min(c.prioridad) AS prioridad, min(c.created_at) AS desde,
      jsonb_agg(jsonb_build_object('id', c.id, 'tipo', c.tipo, 'titulo', c.titulo, 'texto', c.texto, 'link', c.link)
        ORDER BY c.prioridad, c.created_at) AS avisos
    FROM cand c
    GROUP BY c.user_id
  )
  SELECT g.user_id, u.email::text,
    COALESCE(NULLIF(p.nombre_mostrar, ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    g.prioridad, g.avisos
  FROM gente g
  JOIN auth.users u ON u.id = g.user_id
  LEFT JOIN public.perfiles p ON p.user_id = g.user_id
  WHERE u.email IS NOT NULL
    AND p.bloqueado_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.mails_enviados m WHERE m.user_id = g.user_id AND m.tipo = 'resumen' AND m.created_at >= now() - interval '20 hours')
  ORDER BY g.prioridad, g.desde
  LIMIT greatest(p_limite, 0);
$fn$;

CREATE OR REPLACE FUNCTION public.recordar_fin_cuatri()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  v_hoy date := (now() AT TIME ZONE 'America/Argentina/Cordoba')::date;
  v_mes int := extract(month FROM v_hoy);
  v_anio int := extract(year FROM v_hoy);
  v_tanda int;          -- 1: agosto (1.er cuatri); 2: diciembre (2.º y anuales); 3: marzo (repite la 2)
  v_desde date;         -- cuándo empezó este recordatorio
  v_n int := 0;
  r record;
BEGIN
  IF v_user IS NULL THEN
    RETURN 0;
  END IF;
  IF to_char(v_hoy, 'MM-DD') >= '08-01' AND to_char(v_hoy, 'MM-DD') < '12-08' THEN
    v_tanda := 1; v_desde := make_date(v_anio, 8, 1);
  ELSIF to_char(v_hoy, 'MM-DD') >= '12-08' THEN
    v_tanda := 2; v_desde := make_date(v_anio, 12, 8);
  ELSIF v_mes <= 2 THEN
    v_tanda := 2; v_desde := make_date(v_anio - 1, 12, 8);
  ELSE
    v_tanda := 3; v_desde := make_date(v_anio - 1, 12, 8);
  END IF;

  FOR r IN
    SELECT i.dictado_id, m.nombre AS materia, c.identificador AS curso,
           CASE
             WHEN h.cuatris = ARRAY[1] THEN 1
             WHEN h.cuatris = ARRAY[2] THEN 2
             WHEN h.cuatris IS NOT NULL THEN 0
             WHEN to_jsonb(d) ->> 'periodo_dictado' = 'PRIMER_CUATRIMESTRE' THEN 1
             WHEN to_jsonb(d) ->> 'periodo_dictado' = 'SEGUNDO_CUATRIMESTRE' THEN 2
             ELSE 0
           END AS cuatri
    FROM public.inscripcion_cursos i
    JOIN public.dictados d ON d.id = i.dictado_id
    JOIN public.materias m ON m.id = d.materia_id
    LEFT JOIN public.cursos c ON c.id = d.curso_id
    LEFT JOIN LATERAL (
      SELECT array_agg(DISTINCT COALESCE(x.cuatri::int, 0) ORDER BY COALESCE(x.cuatri::int, 0)) AS cuatris
      FROM public.horarios x WHERE x.dictado_id = i.dictado_id
    ) h ON true
    WHERE i.user_id = v_user
      AND i.elegido
      AND (i.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date < v_desde
      AND (i.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date >= (v_desde - interval '11 months')::date
      AND NOT EXISTS (SELECT 1 FROM public.resenas re WHERE re.user_id = v_user AND re.dictado_id = i.dictado_id)
  LOOP
    IF (v_tanda = 1 AND r.cuatri = 1) OR (v_tanda IN (2, 3) AND r.cuatri <> 1) THEN
      PERFORM public.avisar(
        v_user,
        'recordatorio',
        '¿Cómo te fue en ' || r.materia || COALESCE(', ' || r.curso, '') || '?',
        CASE v_tanda
          WHEN 1 THEN 'Terminó el 1.er cuatrimestre.'
          WHEN 2 THEN 'Terminó el cuatrimestre.'
          ELSE 'Todavía estás a tiempo, antes de que arranque el año.'
        END || ' Lo elegiste en Mi inscripción: tu reseña le sirve a quien elige curso.',
        '/nueva-resena?dictado=' || r.dictado_id,
        'fin-cuatri-' || extract(year FROM v_desde) || '-' || v_tanda || '-' || r.dictado_id
      );
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END;
$fn$;

COMMIT;
