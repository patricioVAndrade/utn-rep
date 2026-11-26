-- =====================================================================
-- Deshace la migración 1 de la etapa 3 (autor en experiencias de finales).
-- Usar solo junto con volver el código a la versión anterior (las páginas
-- nuevas leen de experiencias_finales_publicas).
-- Ojo: borra el nombre y la elección "con mi nombre" de las experiencias
-- publicadas después de la migración (vuelven a mostrarse como anónimas).
-- =====================================================================

BEGIN;

DROP VIEW IF EXISTS public.experiencias_finales_publicas;

DROP POLICY IF EXISTS "Finales: cada uno lee las suyas" ON public.experiencias_finales;
DROP POLICY IF EXISTS "Public read experiencias_finales" ON public.experiencias_finales;
CREATE POLICY "Public read experiencias_finales" ON public.experiencias_finales FOR SELECT USING (true);
GRANT SELECT ON public.experiencias_finales TO anon, authenticated;

ALTER TABLE public.experiencias_finales DROP CONSTRAINT IF EXISTS finales_nombre_largo;
ALTER TABLE public.experiencias_finales DROP COLUMN IF EXISTS nombre_usuario;
ALTER TABLE public.experiencias_finales DROP COLUMN IF EXISTS es_anonima;

COMMIT;
