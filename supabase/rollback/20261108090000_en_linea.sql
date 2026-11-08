-- Vuelta atrás de supabase/migrations/20261108090000_en_linea.sql
-- Borra el contador. No guarda nada que haga falta conservar.
BEGIN;
DROP FUNCTION IF EXISTS public.latido(text);
DROP FUNCTION IF EXISTS public.en_linea();
DROP TABLE IF EXISTS public.presencia;
COMMIT;
