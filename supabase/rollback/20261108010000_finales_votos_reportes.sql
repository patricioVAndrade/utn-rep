-- =====================================================================
-- Deshace la migración 2 de la etapa 3 ("Me sirvió" y reportes en finales).
-- Usar junto con volver el código a la versión anterior.
-- Ojo: borra los votos y los reportes de finales hechos después de la migración.
-- =====================================================================

BEGIN;

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN SELECT oid::regprocedure AS firma FROM pg_proc WHERE proname = 'votar_final' AND pronamespace = 'public'::regnamespace LOOP
    EXECUTE format('DROP FUNCTION %s', f.firma);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.votos_finales;
DROP TABLE IF EXISTS public.reportes_finales;

-- La vista vuelve a como la dejó la migración 1 (hay que borrarla para sacar una columna)
DROP VIEW IF EXISTS public.experiencias_finales_publicas;
CREATE VIEW public.experiencias_finales_publicas AS
SELECT
  f.id, f.materia_id, f.anio, f.mesa, f.profesor_nombre, f.comentario, f.es_anonima,
  CASE WHEN f.es_anonima THEN NULL ELSE f.nombre_usuario END AS nombre_usuario,
  f.created_at
FROM public.experiencias_finales f;
GRANT SELECT ON public.experiencias_finales_publicas TO anon, authenticated;

ALTER TABLE public.experiencias_finales DROP CONSTRAINT IF EXISTS finales_votos_no_negativos;
ALTER TABLE public.experiencias_finales DROP COLUMN IF EXISTS votos_utilidad;

COMMIT;
