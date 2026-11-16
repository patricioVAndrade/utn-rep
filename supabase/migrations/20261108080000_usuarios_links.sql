-- =====================================================================
-- Etapa 3, migración 9: bloquear usuarios y links compartidos (3.14, F28)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108080000_usuarios_links.sql
--
-- Qué hace:
--  1. Bloquear: perfiles.bloqueado_at y bloqueo_motivo. Solo el servidor
--     (el admin) los puede escribir. Una cuenta bloqueada no puede escribir
--     ni editar reseñas, contar finales, votar, reportar ni cambiar su
--     nombre: lo frena la base, venga de donde venga. Lo que ya publicó
--     sigue a la vista (si hay que sacarlo, se borra aparte). Puede leer,
--     borrar lo suyo y borrar su cuenta.
--  2. El registro de moderación acepta 'bloquear' y 'desbloquear'.
--  3. Links compartidos: cada persona tiene un código corto (?de=k7p2) que
--     va en los links que comparte. No muestra su nombre.
--     aperturas_link guarda una apertura por visitante (un número al azar
--     del navegador, no la IP). Las del dueño no cuentan. Solo el servidor
--     lee y escribe estas tablas.
-- El logro "Pasalo al grupo" (L8) espera tu voto: esto solo cuenta.
-- No cambia ninguna reseña.
-- =====================================================================

BEGIN;

-- 1. Bloqueo
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS bloqueado_at timestamptz;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS bloqueo_motivo text
  CHECK (bloqueo_motivo IS NULL OR char_length(bloqueo_motivo) <= 500);
REVOKE INSERT (bloqueado_at, bloqueo_motivo), UPDATE (bloqueado_at, bloqueo_motivo) ON public.perfiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.esta_bloqueado(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.perfiles WHERE user_id = p_user AND bloqueado_at IS NOT NULL);
$fn$;
REVOKE ALL ON FUNCTION public.esta_bloqueado(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.esta_bloqueado(uuid) TO service_role;

-- Al crear: mira de quién es la fila. Al cambiar: mira quién lo hace
-- (el admin entra con la clave de servicio, sin usuario, y no lo frena).
CREATE OR REPLACE FUNCTION public.frenar_bloqueados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN v_user := NEW.user_id; ELSE v_user := auth.uid(); END IF;
  IF v_user IS NOT NULL AND public.esta_bloqueado(v_user) THEN
    RAISE EXCEPTION 'Cuenta bloqueada' USING ERRCODE = 'UB001';
  END IF;
  RETURN NEW;
END;
$fn$;

DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['resenas', 'experiencias_finales', 'votos_resenas', 'votos_finales', 'reportes_resenas', 'reportes_finales'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_bloqueo ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trg_bloqueo BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.frenar_bloqueados()', t);
    END IF;
  END LOOP;
END $do$;

-- Editar reseñas y cambiar el nombre o la foto
DROP TRIGGER IF EXISTS trg_bloqueo_editar ON public.resenas;
CREATE TRIGGER trg_bloqueo_editar
  BEFORE UPDATE OF comentario, condicion_final, calificacion_general, es_anonima ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.frenar_bloqueados();
DROP TRIGGER IF EXISTS trg_bloqueo_perfil ON public.perfiles;
CREATE TRIGGER trg_bloqueo_perfil
  BEFORE UPDATE OF nombre_mostrar, foto, dibujo ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.frenar_bloqueados();

-- 2. Registro de moderación
ALTER TABLE public.registro_moderacion DROP CONSTRAINT IF EXISTS registro_moderacion_accion_check;
ALTER TABLE public.registro_moderacion ADD CONSTRAINT registro_moderacion_accion_check CHECK (accion IN (
  'borrar', 'dejar', 'editar_texto', 'responder', 'borrar_respuesta',
  'pedir_edicion', 'quitar_pedido', 'marcada_automatica',
  'agregar_palabra', 'quitar_palabra', 'bloquear', 'desbloquear'));
ALTER TABLE public.registro_moderacion ADD COLUMN IF NOT EXISTS usuario_id uuid;

-- 3. Links compartidos
CREATE TABLE IF NOT EXISTS public.links_compartidos (
  codigo text PRIMARY KEY CHECK (codigo ~ '^[a-z0-9]{4,8}$'),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.aperturas_link (
  codigo text NOT NULL REFERENCES public.links_compartidos(codigo) ON DELETE CASCADE,
  visitante text NOT NULL CHECK (char_length(visitante) BETWEEN 8 AND 64),
  ruta text NOT NULL CHECK (char_length(ruta) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (codigo, visitante)
);
CREATE INDEX IF NOT EXISTS aperturas_link_fecha ON public.aperturas_link (created_at);
ALTER TABLE public.links_compartidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aperturas_link ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.links_compartidos FROM anon, authenticated;
REVOKE ALL ON public.aperturas_link FROM anon, authenticated;

COMMIT;

-- Verificación: columnas = 2, tablas = 2, triggers_bloqueo = 8 (o 7 si no
-- existe votos_resenas), anon_lee_links = false, puede_bloquearse = false,
-- usuario_puede_ver_bloqueos = false.
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'perfiles' AND column_name IN ('bloqueado_at', 'bloqueo_motivo')) AS columnas,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('links_compartidos', 'aperturas_link')) AS tablas,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_bloqueo', 'trg_bloqueo_editar', 'trg_bloqueo_perfil')) AS triggers_bloqueo,
  has_table_privilege('anon', 'public.links_compartidos', 'SELECT') AS anon_lee_links,
  has_column_privilege('authenticated', 'public.perfiles', 'bloqueado_at', 'UPDATE') AS puede_bloquearse,
  has_function_privilege('authenticated', 'public.esta_bloqueado(uuid)', 'EXECUTE') AS usuario_puede_ver_bloqueos;
