-- =====================================================================
-- Deshace la migración v2.1 y vuelve los permisos a como estaban.
-- Usar solo junto con volver el código a la versión anterior (las páginas
-- nuevas leen de resenas_publicas y stats_dictados).
-- No borra reseñas ni usuarios. Los votos registrados en votos_resenas
-- ya están sumados en resenas.votos_utilidad; la tabla se conserva.
-- =====================================================================

BEGIN;

-- Permisos de resenas como antes
GRANT SELECT, INSERT, UPDATE ON public.resenas TO anon, authenticated;
DROP POLICY IF EXISTS "Users can read own resenas" ON public.resenas;
DROP POLICY IF EXISTS "Public read resenas" ON public.resenas;
CREATE POLICY "Public read resenas" ON public.resenas FOR SELECT USING (true);

-- Trigger de autor
DROP TRIGGER IF EXISTS trg_resenas_completar_autor ON public.resenas;
DROP FUNCTION IF EXISTS public.resenas_completar_autor();

-- Constraints nuevos
ALTER TABLE public.resenas DROP CONSTRAINT IF EXISTS resenas_calificacion_rango;
ALTER TABLE public.resenas DROP CONSTRAINT IF EXISTS resenas_comentario_largo;
ALTER TABLE public.resenas DROP CONSTRAINT IF EXISTS resenas_anio_rango;
ALTER TABLE public.resenas DROP CONSTRAINT IF EXISTS resenas_condicion_valida;
ALTER TABLE public.resenas DROP CONSTRAINT IF EXISTS resenas_votos_no_negativos;
ALTER TABLE public.experiencias_finales DROP CONSTRAINT IF EXISTS finales_comentario_largo;
ALTER TABLE public.experiencias_finales DROP CONSTRAINT IF EXISTS finales_mesa_largo;
ALTER TABLE public.experiencias_finales DROP CONSTRAINT IF EXISTS finales_profesor_largo;

-- Vistas y funciones (las tablas votos_resenas y rate_limits se conservan)
DROP VIEW IF EXISTS public.resenas_publicas;
DROP VIEW IF EXISTS public.stats_dictados;
DROP FUNCTION IF EXISTS public.votar_resena(integer, boolean);
DROP FUNCTION IF EXISTS public.check_rate_limit(text, integer, integer);

COMMIT;
