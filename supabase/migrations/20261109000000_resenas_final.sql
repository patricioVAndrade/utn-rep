-- =====================================================================
-- Etapa 3, migración 13: sumar el final a tu reseña (F34)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261109000000_resenas_final.sql
--
-- Qué hace:
--  1. Columna final_id en resenas: la experiencia de final que la persona
--     eligió sumar a su reseña. Si se borra el final, la reseña queda como
--     antes (sin final).
--  2. La base controla que el final sea de la misma persona y de la misma
--     materia que la reseña (error FN001), y que un final esté en una sola
--     reseña.
--  3. Cada persona puede sumar o sacar el final de su propia reseña (solo
--     esa columna; RLS: solo las propias). Sumarlo no cuenta como "Editada".
--  4. La vista pública suma al final final_mesa y final_anio, para mostrar
--     "Rindió el final en julio 2026". No muestra cuál es el final.
-- No borra ni cambia el contenido de ninguna reseña ni de ningún final.
-- =====================================================================

BEGIN;

-- El tipo del id de los finales (uuid o número) se copia de la tabla
DO $do$
DECLARE
  v_tipo text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo
  FROM pg_attribute a
  WHERE a.attrelid = 'public.experiencias_finales'::regclass AND a.attname = 'id';
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'resenas' AND column_name = 'final_id') THEN
    EXECUTE format('ALTER TABLE public.resenas ADD COLUMN final_id %s REFERENCES public.experiencias_finales(id) ON DELETE SET NULL', v_tipo);
  END IF;
END $do$;

CREATE UNIQUE INDEX IF NOT EXISTS resenas_un_final ON public.resenas (final_id) WHERE final_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.resenas_controlar_final()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.final_id IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.experiencias_finales f
    JOIN public.dictados d ON d.id = NEW.dictado_id
    WHERE f.id = NEW.final_id AND f.user_id = NEW.user_id AND f.materia_id = d.materia_id
  ) THEN
    RAISE EXCEPTION 'Ese final no es tuyo o es de otra materia.' USING ERRCODE = 'FN001';
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.resenas_controlar_final() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_resenas_controlar_final ON public.resenas;
CREATE TRIGGER trg_resenas_controlar_final
  BEFORE INSERT OR UPDATE OF final_id ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.resenas_controlar_final();

-- Además del texto y "¿Cómo te fue?", cada uno puede sumar o sacar su final
GRANT UPDATE (final_id) ON public.resenas TO authenticated;

-- Misma vista que en la migración 3, con dos columnas más al final
CREATE OR REPLACE VIEW public.resenas_publicas AS
SELECT
  r.id,
  r.dictado_id,
  r.calificacion_general,
  r.anio_cursado,
  r.comentario,
  r.es_anonima,
  CASE WHEN r.es_anonima THEN NULL ELSE r.nombre_usuario END AS nombre_usuario,
  r.es_alumno_utn,
  r.condicion_final,
  r.votos_utilidad,
  r.created_at,
  r.updated_at,
  r.plan,
  f.mesa AS final_mesa,
  f.anio AS final_anio
FROM public.resenas r
LEFT JOIN public.experiencias_finales f ON f.id = r.final_id;

GRANT SELECT ON public.resenas_publicas TO anon, authenticated;

COMMIT;

-- Verificación: columna = 1, trigger = 1, puede_sumar = true,
-- vista = 2 (final_mesa y final_anio), publico_ve_final_id = 0.
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resenas' AND column_name = 'final_id') AS columna,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_resenas_controlar_final') AS "trigger",
  has_column_privilege('authenticated', 'public.resenas', 'final_id', 'UPDATE') AS puede_sumar,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resenas_publicas' AND column_name IN ('final_mesa', 'final_anio')) AS vista,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resenas_publicas' AND column_name = 'final_id') AS publico_ve_final_id;
