-- Vuelta atrás de supabase/migrations/20261108050000_seguimientos.sql
-- OJO: borra qué materias sigue cada persona.
BEGIN;
DROP TABLE IF EXISTS public.seguimientos;
COMMIT;
