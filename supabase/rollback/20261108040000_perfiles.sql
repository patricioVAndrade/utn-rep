-- Vuelta atrás de supabase/migrations/20261108040000_perfiles.sql
-- OJO: borra los perfiles (nombre elegido, foto, años y preferencias).
-- Los nombres que ya se copiaron a las reseñas quedan como están.
-- user_id sigue aceptando vacío en resenas y experiencias_finales: si alguien
-- borró su cuenta, sus reseñas anónimas quedaron sin dueño y no se pueden
-- volver a marcar como obligatorio sin borrarlas.

BEGIN;

DROP FUNCTION IF EXISTS public.anonimizar_usuario(uuid);

DROP TRIGGER IF EXISTS trg_resenas_nombre_perfil ON public.resenas;
DROP FUNCTION IF EXISTS public.resenas_nombre_perfil();

DROP TABLE IF EXISTS public.perfiles;
DROP FUNCTION IF EXISTS public.perfiles_propagar_nombre();
DROP FUNCTION IF EXISTS public.perfiles_fecha();
DROP FUNCTION IF EXISTS public.nombre_de_usuario(uuid);

COMMIT;
