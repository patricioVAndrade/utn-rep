-- =====================================================================
-- Etapa 3, migración 4: moderación (F10, F12 y el resto de 3.6)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108030000_moderacion.sql
--
-- Qué hace:
--  1. respuestas_moderador: una respuesta de la moderación por reseña o por
--     experiencia de final. Es pública (se ve debajo de la reseña) y no guarda
--     quién de la moderación la escribió. Solo el servidor puede escribirla.
--  2. "Pedirle que la edite": dos columnas en resenas (motivo y fecha). Las ve
--     solo quien la escribió (en Mis reseñas); la vista pública no las muestra.
--     Cuando la persona cambia el texto, el pedido se borra solo.
--  3. registro_moderacion: quién hizo qué y cuándo. Solo lo lee el servidor.
--  4. palabras_marcadas: la lista que se edita desde el admin. Solo el servidor.
--  5. reportes_resenas acepta reportes automáticos (sin persona que reporte),
--     para las reseñas que traen una palabra marcada.
-- No borra ni cambia el contenido de ninguna reseña, final ni reporte.
-- =====================================================================

BEGIN;

-- 1. Respuesta del moderador -------------------------------------------
DO $do$
DECLARE
  tipo text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO tipo
  FROM pg_attribute a
  WHERE a.attrelid = 'public.experiencias_finales'::regclass AND a.attname = 'id';

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.respuestas_moderador (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      resena_id integer UNIQUE REFERENCES public.resenas(id) ON DELETE CASCADE,
      final_id %1$s UNIQUE REFERENCES public.experiencias_finales(id) ON DELETE CASCADE,
      texto text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 3 AND 1000),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz,
      CONSTRAINT respuesta_de_una_sola_cosa CHECK (num_nonnulls(resena_id, final_id) = 1)
    )$f$, tipo);

  -- 3. Registro (final_id sin referencia: queda aunque se borre el final)
  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.registro_moderacion (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      moderador_id uuid,
      accion text NOT NULL CHECK (accion IN (
        'borrar', 'dejar', 'editar_texto', 'responder', 'borrar_respuesta',
        'pedir_edicion', 'quitar_pedido', 'marcada_automatica',
        'agregar_palabra', 'quitar_palabra')),
      resena_id integer,
      final_id %1$s,
      detalle text CHECK (detalle IS NULL OR char_length(detalle) <= 1000),
      created_at timestamptz NOT NULL DEFAULT now()
    )$f$, tipo);
END $do$;

ALTER TABLE public.respuestas_moderador ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Respuestas: las ve cualquiera" ON public.respuestas_moderador;
CREATE POLICY "Respuestas: las ve cualquiera" ON public.respuestas_moderador
  FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.respuestas_moderador FROM anon, authenticated;
GRANT SELECT ON public.respuestas_moderador TO anon, authenticated;

ALTER TABLE public.registro_moderacion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registro_moderacion FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS registro_moderacion_fecha ON public.registro_moderacion (created_at DESC);

-- 2. Pedirle que la edite ------------------------------------------------
ALTER TABLE public.resenas
  ADD COLUMN IF NOT EXISTS pedido_edicion text,
  ADD COLUMN IF NOT EXISTS pedido_edicion_at timestamptz;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resenas_pedido_largo') THEN
    ALTER TABLE public.resenas ADD CONSTRAINT resenas_pedido_largo
      CHECK (pedido_edicion IS NULL OR char_length(pedido_edicion) BETWEEN 3 AND 500);
  END IF;
END $do$;

CREATE OR REPLACE FUNCTION public.resenas_limpiar_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  -- Si cambió el texto, el pedido ya se atendió (lo revisa la moderación en el registro)
  IF NEW.comentario IS DISTINCT FROM OLD.comentario
     AND OLD.pedido_edicion IS NOT NULL
     AND NEW.pedido_edicion IS NOT DISTINCT FROM OLD.pedido_edicion THEN
    NEW.pedido_edicion := NULL;
    NEW.pedido_edicion_at := NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_resenas_limpiar_pedido ON public.resenas;
CREATE TRIGGER trg_resenas_limpiar_pedido
  BEFORE UPDATE ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.resenas_limpiar_pedido();

-- Las personas no pueden tocar el pedido (solo el texto y "¿Cómo te fue?", de la migración 3)
REVOKE UPDATE (pedido_edicion, pedido_edicion_at) ON public.resenas FROM anon, authenticated;

-- 4. Palabras marcadas ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.palabras_marcadas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  palabra text NOT NULL UNIQUE CHECK (palabra = lower(btrim(palabra)) AND char_length(palabra) BETWEEN 2 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.palabras_marcadas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.palabras_marcadas FROM anon, authenticated;

-- 5. Reportes automáticos ------------------------------------------------
ALTER TABLE public.reportes_resenas
  ADD COLUMN IF NOT EXISTS automatico boolean NOT NULL DEFAULT false;
ALTER TABLE public.reportes_resenas ALTER COLUMN user_id DROP NOT NULL;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reportes_persona_o_automatico') THEN
    ALTER TABLE public.reportes_resenas ADD CONSTRAINT reportes_persona_o_automatico
      CHECK (user_id IS NOT NULL OR automatico);
  END IF;
END $do$;

-- Una persona reporta solo a su nombre y nunca como "automático"
DROP POLICY IF EXISTS "Usuarios pueden reportar" ON public.reportes_resenas;
CREATE POLICY "Usuarios pueden reportar" ON public.reportes_resenas
  FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT automatico);

COMMIT;

-- Verificación: tablas = 3, columnas_pedido = 2, trigger = 1, reportes_automaticos = 1,
-- publico_lee_respuestas = true, publico_lee_registro = false, publico_lee_palabras = false.
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('respuestas_moderador', 'registro_moderacion', 'palabras_marcadas')) AS tablas,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resenas' AND column_name IN ('pedido_edicion', 'pedido_edicion_at')) AS columnas_pedido,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_resenas_limpiar_pedido') AS trigger,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reportes_resenas' AND column_name = 'automatico') AS reportes_automaticos,
  has_table_privilege('anon', 'public.respuestas_moderador', 'SELECT') AS publico_lee_respuestas,
  has_table_privilege('anon', 'public.registro_moderacion', 'SELECT') AS publico_lee_registro,
  has_table_privilege('anon', 'public.palabras_marcadas', 'SELECT') AS publico_lee_palabras;
