-- =====================================================================
-- Etapa 3, migración 8: rangos, logros y ficha (F5, F15 a F18)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108070000_logros.sql
--
-- Qué hace:
--  1. Tabla logros_usuario: qué logro ganó cada persona y cuándo. Un logro
--     ganado no se pierde. Cada uno ve los suyos; la ficha pública la arma
--     el servidor y solo si la persona la deja ver.
--  2. Los logros aprobados se dan solos (función revisar_logros y triggers):
--       L1 Primera reseña
--       L2 Abriste camino: la primera reseña de una materia
--       L3 Útil para 10 estudiantes: tus reseñas suman 10 "Me sirvió"
--       L4 Rendí y compartí mi experiencia: primera experiencia de final
--       L5 Madrugada de parcial: una reseña escrita entre las 2 y las 5
--       L6 Los cinco años: reseñas de materias de los cinco años
--     L7 (Bedelía al día) depende de los cambios de profesores (2027).
--     L8 a L19 esperan tu voto: la tabla ya los acepta.
--     Cada logro nuevo deja un aviso (migración 7).
--  3. Les da los logros que ya ganaron a quienes tienen reseñas, sin avisar.
--  4. perfiles.foto_url: la foto de Google, que guarda el servidor cuando la
--     persona elige mostrarla (para verla en sus reseñas). Nadie la puede
--     escribir desde el sitio.
-- El rango no se guarda: sale de contar reseñas (1 Ingresante, 2 a 4
-- Cursante, 5 a 14 Referente, 15 o más Leyenda).
-- No cambia ninguna reseña.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.logros_usuario (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logro text NOT NULL CHECK (logro ~ '^L([1-9]|1[0-9])$'),
  ganado_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, logro)
);
ALTER TABLE public.logros_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Logros: cada uno ve los suyos" ON public.logros_usuario;
CREATE POLICY "Logros: cada uno ve los suyos" ON public.logros_usuario
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.logros_usuario FROM anon, authenticated;
GRANT SELECT ON public.logros_usuario TO authenticated;

ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS foto_url text
  CHECK (foto_url IS NULL OR (foto_url LIKE 'https://%' AND char_length(foto_url) <= 500));
REVOKE INSERT (foto_url), UPDATE (foto_url) ON public.perfiles FROM anon, authenticated;

-- Revisa qué logros ganó una persona y da los nuevos (con aviso si p_avisar)
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

CREATE OR REPLACE FUNCTION public.logros_tras_cambio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.revisar_logros(NEW.user_id, true);
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_logros_resena ON public.resenas;
CREATE TRIGGER trg_logros_resena
  AFTER INSERT OR UPDATE OF votos_utilidad ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.logros_tras_cambio();

DROP TRIGGER IF EXISTS trg_logros_final ON public.experiencias_finales;
CREATE TRIGGER trg_logros_final
  AFTER INSERT ON public.experiencias_finales
  FOR EACH ROW EXECUTE FUNCTION public.logros_tras_cambio();

-- Los que ya ganaron (sin aviso)
SELECT public.revisar_logros(u.user_id, false)
FROM (SELECT DISTINCT user_id FROM public.resenas WHERE user_id IS NOT NULL
      UNION SELECT DISTINCT user_id FROM public.experiencias_finales WHERE user_id IS NOT NULL) u;

COMMIT;

-- Verificación: tabla = 1, triggers = 2, anon_lee = false, puede_escribir_foto = false,
-- y cuántos logros se dieron a quienes ya tenían reseñas.
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logros_usuario') AS tabla,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_logros_resena', 'trg_logros_final')) AS triggers,
  has_table_privilege('anon', 'public.logros_usuario', 'SELECT') AS anon_lee,
  has_column_privilege('authenticated', 'public.perfiles', 'foto_url', 'UPDATE') AS puede_escribir_foto,
  (SELECT count(*) FROM public.logros_usuario) AS logros_dados;
