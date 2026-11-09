-- Vuelta atrás de supabase/migrations/20261109020000_recordatorio_fin_cuatri.sql
-- Borra la función. Los avisos que ya creó quedan (cada persona los puede borrar).
BEGIN;
DROP FUNCTION IF EXISTS public.recordar_fin_cuatri();
COMMIT;
