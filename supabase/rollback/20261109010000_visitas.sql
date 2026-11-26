-- Vuelta atrás de supabase/migrations/20261109010000_visitas.sql
-- Deja latido() como en la migración 10 y borra las visitas (no hace falta conservarlas).
BEGIN;
CREATE OR REPLACE FUNCTION public.latido(p_visitante text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF p_visitante IS NULL OR p_visitante !~ '^[A-Za-z0-9-]{8,64}$' THEN
    RETURN public.en_linea();
  END IF;
  INSERT INTO public.presencia (visitante, visto_at) VALUES (p_visitante, now())
  ON CONFLICT (visitante) DO UPDATE SET visto_at = now();
  DELETE FROM public.presencia WHERE visto_at < now() - interval '10 minutes';
  RETURN public.en_linea();
END;
$fn$;
DROP FUNCTION IF EXISTS public.visitas_semana();
DROP FUNCTION IF EXISTS public.hoy_cordoba();
DROP TABLE IF EXISTS public.visitas_dia;
COMMIT;
