-- Vuelta atrás de supabase/migrations/20261108070000_logros.sql
-- OJO: borra los logros ganados y la foto de Google guardada en los perfiles.
-- Los avisos de logros que ya llegaron quedan en la lista de cada uno.
BEGIN;
DROP TRIGGER IF EXISTS trg_logros_resena ON public.resenas;
DROP TRIGGER IF EXISTS trg_logros_final ON public.experiencias_finales;
DROP FUNCTION IF EXISTS public.logros_tras_cambio();
DROP FUNCTION IF EXISTS public.revisar_logros(uuid, boolean);
DROP TABLE IF EXISTS public.logros_usuario;
ALTER TABLE public.perfiles DROP COLUMN IF EXISTS foto_url;
COMMIT;
