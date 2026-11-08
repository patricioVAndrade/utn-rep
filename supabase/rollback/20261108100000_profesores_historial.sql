-- Vuelta atrás de supabase/migrations/20261108100000_profesores_historial.sql
-- OJO: borra el historial de profesores.
-- Los profesores de cada curso (dictado_profesores) quedan como están.
BEGIN;
DROP TRIGGER IF EXISTS trg_profesores_historial ON public.dictado_profesores;
DROP FUNCTION IF EXISTS public.profesores_historial_anotar();
DROP FUNCTION IF EXISTS public.cuatri_actual();
DROP TABLE IF EXISTS public.profesores_historial;
COMMIT;
