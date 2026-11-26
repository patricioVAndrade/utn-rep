-- =====================================================================
-- Etapa 3, migración 5: perfil y preferencias (Mi cuenta)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108040000_perfiles.sql
--
-- Qué hace:
--  1. Tabla perfiles, una fila por persona: nombre para mostrar, foto elegida
--     (inicial, Google o un dibujo), si muestra su ficha, sus años de cursada
--     y si quiere que le pregunten "¿Cómo te fue?". Cada uno lee y cambia solo
--     la suya. La fila se crea la primera vez que guarda algo en Mi cuenta.
--  2. Si elige un nombre para mostrar, las reseñas nuevas salen con ese nombre
--     y se actualiza en las que ya publicó (también en las experiencias de
--     finales). Las anónimas siguen anónimas: el nombre solo lo ve la moderación.
--  3. Borrar la cuenta: la función anonimizar_usuario deja las reseñas y
--     experiencias de esa persona como anónimas y sin dueño, para que no se
--     borren con el usuario. Solo la puede llamar el servidor, que después
--     borra el usuario. Por eso user_id pasa a aceptar vacío en resenas y
--     experiencias_finales.
-- No borra ni cambia el contenido de ninguna reseña.
-- =====================================================================

BEGIN;

-- 1. Perfiles ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_mostrar text CHECK (nombre_mostrar IS NULL OR (nombre_mostrar = btrim(nombre_mostrar) AND char_length(nombre_mostrar) BETWEEN 2 AND 40)),
  foto text NOT NULL DEFAULT 'inicial' CHECK (foto IN ('inicial', 'google', 'dibujo')),
  dibujo smallint CHECK (dibujo IS NULL OR dibujo BETWEEN 1 AND 12),
  mostrar_ficha boolean NOT NULL DEFAULT true,
  anios_cursada smallint[] NOT NULL DEFAULT '{}' CHECK (anios_cursada <@ ARRAY[1, 2, 3, 4, 5]::smallint[]),
  preguntar_como_te_fue boolean NOT NULL DEFAULT true,
  como_te_fue_pausa_hasta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Perfil: cada uno lee el suyo" ON public.perfiles;
CREATE POLICY "Perfil: cada uno lee el suyo" ON public.perfiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Perfil: cada uno crea el suyo" ON public.perfiles;
CREATE POLICY "Perfil: cada uno crea el suyo" ON public.perfiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Perfil: cada uno cambia el suyo" ON public.perfiles;
CREATE POLICY "Perfil: cada uno cambia el suyo" ON public.perfiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.perfiles FROM anon, authenticated;
GRANT SELECT ON public.perfiles TO authenticated;
GRANT INSERT (user_id, nombre_mostrar, foto, dibujo, mostrar_ficha, anios_cursada, preguntar_como_te_fue, como_te_fue_pausa_hasta)
  ON public.perfiles TO authenticated;
GRANT UPDATE (nombre_mostrar, foto, dibujo, mostrar_ficha, anios_cursada, preguntar_como_te_fue, como_te_fue_pausa_hasta)
  ON public.perfiles TO authenticated;

-- 2. Nombre para mostrar --------------------------------------------------
-- El nombre que corresponde a una persona: el que eligió, o el de Google, o el del mail.
CREATE OR REPLACE FUNCTION public.nombre_de_usuario(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    (SELECT p.nombre_mostrar FROM public.perfiles p WHERE p.user_id = p_user),
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1),
    'Usuario')
  FROM auth.users u WHERE u.id = p_user;
$fn$;
REVOKE ALL ON FUNCTION public.nombre_de_usuario(uuid) FROM PUBLIC, anon, authenticated;

-- Reseñas nuevas: corre después de trg_resenas_completar_autor (los triggers van por orden alfabético)
CREATE OR REPLACE FUNCTION public.resenas_nombre_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() THEN
    NEW.nombre_usuario := COALESCE(public.nombre_de_usuario(NEW.user_id), NEW.nombre_usuario);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_resenas_nombre_perfil ON public.resenas;
CREATE TRIGGER trg_resenas_nombre_perfil
  BEFORE INSERT ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.resenas_nombre_perfil();

-- Al cambiar el nombre, se actualiza en lo que ya publicó
CREATE OR REPLACE FUNCTION public.perfiles_propagar_nombre()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_nombre text;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.nombre_mostrar IS DISTINCT FROM OLD.nombre_mostrar THEN
    v_nombre := public.nombre_de_usuario(NEW.user_id);
    UPDATE public.resenas SET nombre_usuario = v_nombre
      WHERE user_id = NEW.user_id AND nombre_usuario IS DISTINCT FROM v_nombre;
    UPDATE public.experiencias_finales SET nombre_usuario = left(v_nombre, 120)
      WHERE user_id = NEW.user_id AND nombre_usuario IS DISTINCT FROM left(v_nombre, 120);
  END IF;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_perfiles_propagar_nombre ON public.perfiles;
CREATE TRIGGER trg_perfiles_propagar_nombre
  AFTER INSERT OR UPDATE OF nombre_mostrar ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.perfiles_propagar_nombre();

CREATE OR REPLACE FUNCTION public.perfiles_fecha()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_perfiles_fecha ON public.perfiles;
CREATE TRIGGER trg_perfiles_fecha
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.perfiles_fecha();

-- 3. Borrar la cuenta ------------------------------------------------------
ALTER TABLE public.resenas ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.experiencias_finales ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.anonimizar_usuario(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  n integer;
  m integer;
BEGIN
  UPDATE public.resenas SET user_id = NULL, es_anonima = true, nombre_usuario = NULL WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.experiencias_finales SET user_id = NULL, es_anonima = true, nombre_usuario = NULL WHERE user_id = p_user;
  GET DIAGNOSTICS m = ROW_COUNT;
  DELETE FROM public.reportes_resenas WHERE user_id = p_user;
  DELETE FROM public.perfiles WHERE user_id = p_user;
  RETURN n + m;
END;
$fn$;
REVOKE ALL ON FUNCTION public.anonimizar_usuario(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonimizar_usuario(uuid) TO service_role;

COMMIT;

-- Verificación: tabla = 1, triggers = 2, anon_lee_perfiles = false,
-- usuario_puede_anonimizar = false (solo el servidor) y cuántas reseñas tienen dueño.
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'perfiles') AS tabla,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_resenas_nombre_perfil', 'trg_perfiles_propagar_nombre')) AS triggers,
  has_table_privilege('anon', 'public.perfiles', 'SELECT') AS anon_lee_perfiles,
  has_function_privilege('authenticated', 'public.anonimizar_usuario(uuid)', 'EXECUTE') AS usuario_puede_anonimizar,
  (SELECT count(*) FROM public.resenas WHERE user_id IS NOT NULL) AS resenas_con_duenio;
