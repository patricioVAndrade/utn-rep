-- =====================================================================
-- Etapa 3, migración 15: recordatorio de fin de cuatrimestre (F32), en el sitio
-- Correr en la BASE DE PRUEBA, después de la 7 (avisos) y la 12 (Mi inscripción).
-- Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261109020000_recordatorio_fin_cuatri.sql
--
-- Qué hace:
--  recordar_fin_cuatri(): la llama el sitio con la sesión de la persona (una
--  vez por día como mucho) y crea un aviso "¿Cómo te fue en X, 2K3?" por cada
--  curso que eligió en Mi inscripción y todavía no reseñó.
--   - Desde el 1 de agosto (terminaron las mesas de julio, antes de anotarse
--     al 2.º cuatrimestre) hasta el 7 de diciembre: los cursos de 1.er cuatrimestre.
--   - Desde el 8 de diciembre hasta fin de febrero: los de 2.º cuatrimestre,
--     los anuales y los que no se sabe.
--   - Desde el 1 de marzo (antes de que arranque el año) hasta el 31 de julio:
--     otra vez los de diciembre que todavía no se reseñaron.
--   - El cuatrimestre sale de los horarios (migración 12) y, si no hay, del
--     período del curso.
--   - Solo cuenta lo que se eligió en los 11 meses antes del recordatorio
--     (así una inscripción vieja no vuelve a avisar al año siguiente).
--   - Cada curso avisa una sola vez por recordatorio, y respeta si la persona
--     apagó "Al terminar el cuatrimestre" en Mi cuenta.
--  Solo crea avisos para quien la llama (auth.uid()). No cambia ninguna reseña.
-- =====================================================================

BEGIN;

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

REVOKE ALL ON FUNCTION public.recordar_fin_cuatri() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recordar_fin_cuatri() TO authenticated;

COMMIT;

-- Verificación: funcion = 1, anon_puede = false, usuario_puede = true,
-- sin_sesion = 0 (desde el editor no hay sesión, así que no crea nada).
SELECT
  (SELECT count(*) FROM pg_proc WHERE proname = 'recordar_fin_cuatri' AND pronamespace = 'public'::regnamespace) AS funcion,
  has_function_privilege('anon', 'public.recordar_fin_cuatri()', 'EXECUTE') AS anon_puede,
  has_function_privilege('authenticated', 'public.recordar_fin_cuatri()', 'EXECUTE') AS usuario_puede,
  public.recordar_fin_cuatri() AS sin_sesion;
