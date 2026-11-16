-- =====================================================================
-- Migración 21: nombres seguros (auditoría de seguridad, 16/11/2026)
-- Correr primero en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261116000000_nombres_seguros.sql
--
-- Por qué: las reglas del nombre (solo letras y sin palabras marcadas) las
-- controlaba solo el sitio (/api/perfil). Con la clave pública de Supabase y
-- su propia sesión, alguien podía guardar cualquier nombre directo en la base,
-- o ponerlo en los datos de su cuenta (full_name), y salía en sus reseñas.
--
-- Qué hace:
--  1. nombre_aceptable(texto): letras (con tildes), espacios, punto, apóstrofo
--     y guion; al menos dos letras; ninguna palabra marcada.
--  2. perfiles: un nombre nuevo o cambiado que no cumple no se guarda (error
--     NM001). Los nombres que ya están no se tocan (decisión 4.1: solo aviso).
--  3. nombre_de_usuario(): el nombre de los datos de la cuenta (Google o lo que
--     escribió al entrar con mail) se usa solo si cumple; si no, el del mail.
--  4. Experiencias de finales nuevas: el nombre lo pone la base, como en las
--     reseñas, y no el sitio.
-- No borra ni cambia ninguna reseña, experiencia ni perfil que ya exista.
-- =====================================================================

BEGIN;

-- 1. La regla ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nombre_aceptable(p_nombre text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_texto text;
BEGIN
  IF p_nombre IS NULL OR p_nombre !~ '^[A-Za-zÀ-ÖØ-öø-ɏ̀-ͯ .''’-]+$' THEN
    RETURN false;
  END IF;
  IF (SELECT count(*) FROM regexp_matches(p_nombre, '[A-Za-zÀ-ÖØ-öø-ɏ]', 'g')) < 2 THEN
    RETURN false;
  END IF;
  -- Palabra entera, sin mayúsculas ni tildes (como encontrarPalabra del sitio)
  v_texto := ' ' || btrim(regexp_replace(lower(translate(p_nombre, 'ÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòù', 'AEIOUUNaeiouunAEIOUaeiou')), '[^a-z0-9ñ]+', ' ', 'g')) || ' ';
  RETURN NOT EXISTS (
    SELECT 1 FROM public.palabras_marcadas p
    WHERE position(' ' || btrim(regexp_replace(lower(translate(p.palabra, 'ÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòù', 'AEIOUUNaeiouunAEIOUaeiou')), '[^a-z0-9ñ]+', ' ', 'g')) || ' ' IN v_texto) > 0
  );
END;
$fn$;
REVOKE ALL ON FUNCTION public.nombre_aceptable(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nombre_aceptable(text) TO service_role;

-- 2. Perfiles: un nombre nuevo tiene que cumplir --------------------------------
CREATE OR REPLACE FUNCTION public.perfiles_controlar_nombre()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.nombre_mostrar IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.nombre_mostrar IS DISTINCT FROM OLD.nombre_mostrar)
     AND NOT public.nombre_aceptable(NEW.nombre_mostrar) THEN
    RAISE EXCEPTION 'Nombre no permitido' USING ERRCODE = 'NM001';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.perfiles_controlar_nombre() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_perfiles_controlar_nombre ON public.perfiles;
CREATE TRIGGER trg_perfiles_controlar_nombre
  BEFORE INSERT OR UPDATE OF nombre_mostrar ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.perfiles_controlar_nombre();

-- 3. El nombre de los datos de la cuenta, solo si cumple ------------------------
CREATE OR REPLACE FUNCTION public.nombre_de_usuario(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    (SELECT p.nombre_mostrar FROM public.perfiles p WHERE p.user_id = p_user),
    CASE WHEN public.nombre_aceptable(btrim(u.raw_user_meta_data->>'full_name')) THEN btrim(u.raw_user_meta_data->>'full_name') END,
    CASE WHEN public.nombre_aceptable(btrim(u.raw_user_meta_data->>'name')) THEN btrim(u.raw_user_meta_data->>'name') END,
    NULLIF(split_part(u.email, '@', 1), ''),
    'Usuario')
  FROM auth.users u WHERE u.id = p_user;
$fn$;
REVOKE ALL ON FUNCTION public.nombre_de_usuario(uuid) FROM PUBLIC, anon, authenticated;

-- 4. Experiencias de finales: el nombre lo pone la base -------------------------
CREATE OR REPLACE FUNCTION public.finales_nombre_autor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    NEW.nombre_usuario := left(COALESCE(public.nombre_de_usuario(NEW.user_id), 'Usuario'), 120);
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.finales_nombre_autor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_finales_nombre_autor ON public.experiencias_finales;
CREATE TRIGGER trg_finales_nombre_autor
  BEFORE INSERT ON public.experiencias_finales
  FOR EACH ROW EXECUTE FUNCTION public.finales_nombre_autor();

COMMIT;

-- Verificación (una fila): tiene que dar true · true · false · false · false · 1 · 1
SELECT
  public.nombre_aceptable('María José Pérez') AS acepta_tildes,
  public.nombre_aceptable('O''Connor-Díaz') AS acepta_apostrofo,
  public.nombre_aceptable('sofi_2004') AS acepta_numeros,
  public.nombre_aceptable('<b>x</b>') AS acepta_simbolos,
  public.nombre_aceptable('A') AS acepta_una_letra,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_perfiles_controlar_nombre') AS trigger_perfiles,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_finales_nombre_autor') AS trigger_finales;
