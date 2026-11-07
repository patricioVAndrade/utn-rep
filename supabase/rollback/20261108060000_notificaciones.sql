-- Vuelta atrás de supabase/migrations/20261108060000_notificaciones.sql
-- OJO: borra todos los avisos y las preferencias de aviso. Las reseñas no se tocan.
BEGIN;

DROP TRIGGER IF EXISTS trg_avisos_resena_nueva ON public.resenas;
DROP TRIGGER IF EXISTS trg_avisos_resena_cambio ON public.resenas;
DROP TRIGGER IF EXISTS trg_avisos_final_nuevo ON public.experiencias_finales;
DROP TRIGGER IF EXISTS trg_avisos_respuesta_moderador ON public.respuestas_moderador;
DROP FUNCTION IF EXISTS public.avisos_resena_nueva();
DROP FUNCTION IF EXISTS public.avisos_final_nuevo();
DROP FUNCTION IF EXISTS public.avisos_resena_cambio();
DROP FUNCTION IF EXISTS public.avisos_respuesta_moderador();
DROP FUNCTION IF EXISTS public.avisar(uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.quiere_aviso(uuid, text, text);

DROP TABLE IF EXISTS public.notificaciones;
DROP TABLE IF EXISTS public.preferencias_aviso;

COMMIT;
