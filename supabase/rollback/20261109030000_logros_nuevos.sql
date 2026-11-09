-- Vuelta atrás de supabase/migrations/20261109030000_logros_nuevos.sql
-- Deja los logros como en la migración 8 (L1 a L6).
-- OJO: borra los logros nuevos ganados (L8 en adelante). Los avisos que ya
-- llegaron quedan en la lista de cada uno.
BEGIN;
DROP TRIGGER IF EXISTS trg_logros_voto_resena ON public.votos_resenas;
DROP TRIGGER IF EXISTS trg_logros_voto_final ON public.votos_finales;
DROP TRIGGER IF EXISTS trg_logros_apertura ON public.aperturas_link;
DROP TRIGGER IF EXISTS trg_logros_resena ON public.resenas;
CREATE TRIGGER trg_logros_resena
  AFTER INSERT OR UPDATE OF votos_utilidad ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.logros_tras_cambio();
DROP FUNCTION IF EXISTS public.logros_tras_voto();
DROP FUNCTION IF EXISTS public.logros_tras_apertura();
DROP FUNCTION IF EXISTS public.ganar_detective();

-- revisar_logros como en la migración 8
CREATE OR REPLACE FUNCTION public.revisar_logros(p_user uuid, p_avisar boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ganados text[] := ARRAY[]::text[];
  v_nuevos integer := 0;
  v_logro text;
  v_titulo text;
BEGIN
  IF p_user IS NULL THEN RETURN 0; END IF;

  IF EXISTS (SELECT 1 FROM public.resenas WHERE user_id = p_user) THEN
    v_ganados := array_append(v_ganados, 'L1');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.resenas r
    JOIN public.dictados d ON d.id = r.dictado_id
    WHERE r.user_id = p_user
      AND NOT EXISTS (
        SELECT 1 FROM public.resenas o JOIN public.dictados od ON od.id = o.dictado_id
        WHERE od.materia_id = d.materia_id AND o.id <> r.id
          AND (o.created_at < r.created_at OR (o.created_at = r.created_at AND o.id < r.id))
      )
  ) THEN
    v_ganados := array_append(v_ganados, 'L2');
  END IF;

  IF (SELECT COALESCE(sum(votos_utilidad), 0) FROM public.resenas WHERE user_id = p_user) >= 10 THEN
    v_ganados := array_append(v_ganados, 'L3');
  END IF;

  IF EXISTS (SELECT 1 FROM public.experiencias_finales WHERE user_id = p_user) THEN
    v_ganados := array_append(v_ganados, 'L4');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.resenas
    WHERE user_id = p_user AND extract(hour FROM created_at AT TIME ZONE 'America/Argentina/Cordoba') BETWEEN 2 AND 4
  ) THEN
    v_ganados := array_append(v_ganados, 'L5');
  END IF;

  IF (
    SELECT count(DISTINCT m.nivel) FROM public.resenas r
    JOIN public.dictados d ON d.id = r.dictado_id
    JOIN public.materias m ON m.id = d.materia_id
    WHERE r.user_id = p_user AND m.nivel BETWEEN 1 AND 5
  ) = 5 THEN
    v_ganados := array_append(v_ganados, 'L6');
  END IF;

  FOREACH v_logro IN ARRAY v_ganados LOOP
    INSERT INTO public.logros_usuario (user_id, logro) VALUES (p_user, v_logro)
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_nuevos := v_nuevos + 1;
      IF p_avisar THEN
        v_titulo := CASE v_logro
          WHEN 'L1' THEN 'Primera reseña'
          WHEN 'L2' THEN 'Abriste camino'
          WHEN 'L3' THEN 'Útil para 10 estudiantes'
          WHEN 'L4' THEN 'Rendí y compartí mi experiencia'
          WHEN 'L5' THEN 'Madrugada de parcial'
          WHEN 'L6' THEN 'Los cinco años'
          ELSE v_logro END;
        PERFORM public.avisar(p_user, 'logro', 'Ganaste un logro: ' || v_titulo, 'Lo ves en Mi cuenta.', '/mi-cuenta#logros', 'logro:' || v_logro);
      END IF;
    END IF;
  END LOOP;
  RETURN v_nuevos;
END;
$fn$;
REVOKE ALL ON FUNCTION public.revisar_logros(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_logros(uuid, boolean) TO service_role;

DROP FUNCTION IF EXISTS public.dar_logro(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.titulo_logro(text);
DELETE FROM public.logros_usuario WHERE logro NOT IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7');
ALTER TABLE public.logros_usuario DROP CONSTRAINT IF EXISTS logros_usuario_logro_check;
ALTER TABLE public.logros_usuario ADD CONSTRAINT logros_usuario_logro_check CHECK (logro ~ '^L([1-9]|1[0-9])$');
COMMIT;
