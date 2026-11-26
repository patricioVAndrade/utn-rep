-- =====================================================================
-- Etapa 3, migración 14: "visitas esta semana" en Así viene el cuatri (F14)
-- Correr en la BASE DE PRUEBA, después de la 10. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261109010000_visitas.sql
--
-- Qué hace:
--  1. Tabla visitas_dia: el día y el número al azar del navegador (el mismo
--     del contador en línea). Cada navegador cuenta una vez por día. No
--     guarda quién es, ni la IP, ni qué página mira. Lo de más de 8 días se
--     borra solo.
--  2. latido() (migración 10) además anota la visita del día. Sigue
--     devolviendo lo mismo.
--  3. visitas_semana(): visitas de los últimos 7 días (hoy incluido, hora
--     de Córdoba). La usa solo el servidor.
-- No cambia ninguna reseña.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.visitas_dia (
  dia date NOT NULL,
  visitante text NOT NULL CHECK (char_length(visitante) BETWEEN 8 AND 64),
  PRIMARY KEY (dia, visitante)
);
ALTER TABLE public.visitas_dia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visitas_dia FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.hoy_cordoba()
RETURNS date
LANGUAGE sql
STABLE
AS $fn$
  SELECT (now() AT TIME ZONE 'America/Argentina/Cordoba')::date;
$fn$;

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
  -- Migración 14: una visita por navegador y por día
  INSERT INTO public.visitas_dia (dia, visitante) VALUES (public.hoy_cordoba(), p_visitante)
  ON CONFLICT DO NOTHING;
  DELETE FROM public.visitas_dia WHERE dia < public.hoy_cordoba() - 8;
  RETURN public.en_linea();
END;
$fn$;

CREATE OR REPLACE FUNCTION public.visitas_semana()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT count(*)::integer FROM public.visitas_dia WHERE dia > public.hoy_cordoba() - 7;
$fn$;

REVOKE ALL ON FUNCTION public.latido(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.visitas_semana() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.latido(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.visitas_semana() TO service_role;

COMMIT;

-- Prueba rápida: un latido anota la visita del día (si no, frena con un error).
-- Después borra el visitante de prueba.
DO $$
BEGIN
  PERFORM public.latido('prueba-migracion-14');
  IF NOT EXISTS (SELECT 1 FROM public.visitas_dia WHERE visitante = 'prueba-migracion-14') THEN
    RAISE EXCEPTION 'latido() no anotó la visita';
  END IF;
  DELETE FROM public.presencia WHERE visitante = 'prueba-migracion-14';
  DELETE FROM public.visitas_dia WHERE visitante = 'prueba-migracion-14';
END $$;

-- Verificación: tabla = 1, funcion = 1, anon_lee = false, anon_cuenta = false,
-- latido_anota = true.
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visitas_dia') AS tabla,
  (SELECT count(*) FROM pg_proc WHERE proname = 'visitas_semana' AND pronamespace = 'public'::regnamespace) AS funcion,
  has_table_privilege('anon', 'public.visitas_dia', 'SELECT') AS anon_lee,
  has_function_privilege('anon', 'public.visitas_semana()', 'EXECUTE') AS anon_cuenta,
  (SELECT prosrc LIKE '%visitas_dia%' FROM pg_proc WHERE proname = 'latido' AND pronamespace = 'public'::regnamespace) AS latido_anota;
