-- =====================================================================
-- Etapa 3, migración 10: contador "Hay X estudiantes en línea" (F13)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108090000_en_linea.sql
--
-- Qué hace:
--  1. Tabla presencia: un número al azar por navegador (el mismo de los
--     links compartidos) y la última vez que dio señales. No guarda quién
--     es, ni la IP, ni qué página mira. Lo de más de 10 minutos se borra solo.
--  2. latido(visitante): anota que sigue ahí y devuelve cuántos hubo en los
--     últimos 5 minutos. en_linea(): solo cuenta.
--     Las dos las usa solo el servidor (que además limita cuántas veces por
--     minuto se puede llamar, para que nadie infle el número).
-- El sitio lo muestra solo desde 5 personas.
-- No cambia ninguna reseña.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.presencia (
  visitante text PRIMARY KEY CHECK (char_length(visitante) BETWEEN 8 AND 64),
  visto_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS presencia_visto ON public.presencia (visto_at);
ALTER TABLE public.presencia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.presencia FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.en_linea()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT count(*)::integer FROM public.presencia WHERE visto_at > now() - interval '5 minutes';
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
  RETURN public.en_linea();
END;
$fn$;

REVOKE ALL ON FUNCTION public.en_linea() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.latido(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.en_linea() TO service_role;
GRANT EXECUTE ON FUNCTION public.latido(text) TO service_role;

COMMIT;

-- Verificación: tabla = 1, funciones = 2, anon_lee = false,
-- anon_puede_latir = false, prueba = 1 (anota un visitante de prueba y lo borra).
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'presencia') AS tabla,
  (SELECT count(*) FROM pg_proc WHERE proname IN ('en_linea', 'latido') AND pronamespace = 'public'::regnamespace) AS funciones,
  has_table_privilege('anon', 'public.presencia', 'SELECT') AS anon_lee,
  has_function_privilege('anon', 'public.latido(text)', 'EXECUTE') AS anon_puede_latir,
  (SELECT public.latido('prueba-migracion-10') >= 1) AS prueba;
DELETE FROM public.presencia WHERE visitante = 'prueba-migracion-10';
