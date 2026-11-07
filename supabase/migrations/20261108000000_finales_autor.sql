-- =====================================================================
-- Etapa 3, migración 1: autor y anonimato en las experiencias de finales
-- Correr en la BASE DE PRUEBA (Dashboard > SQL Editor). Es idempotente y
-- corre en una transacción: si algo falla, no se aplica nada.
-- Para deshacerla: supabase/rollback/20261108000000_finales_autor.sql
--
-- Qué hace:
--  1. Suma a experiencias_finales: es_anonima (por defecto true) y
--     nombre_usuario. Las que ya existen quedan anónimas: nadie eligió
--     mostrar su nombre.
--  2. Crea la vista pública experiencias_finales_publicas: sin user_id y
--     sin nombre cuando es anónima (como resenas_publicas).
--  3. La tabla deja de ser legible con la anon key: cada persona logueada
--     lee solo sus propias filas. Hoy cualquiera puede leer el user_id de
--     cada experiencia, y con el nombre guardado eso destaparía a los
--     anónimos.
--  4. Escribir sigue siendo solo desde el servidor (service role).
-- No borra ni cambia filas existentes.
-- =====================================================================

BEGIN;

ALTER TABLE public.experiencias_finales
  ADD COLUMN IF NOT EXISTS es_anonima boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nombre_usuario text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finales_nombre_largo') THEN
    ALTER TABLE public.experiencias_finales ADD CONSTRAINT finales_nombre_largo
      CHECK (nombre_usuario IS NULL OR char_length(nombre_usuario) <= 120) NOT VALID;
  END IF;
END $$;

-- Solo si no existe: la migración 2 le suma columnas y volver a correr
-- esta no tiene que pisarla.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views
                 WHERE table_schema = 'public' AND table_name = 'experiencias_finales_publicas') THEN
    EXECUTE $v$
CREATE VIEW public.experiencias_finales_publicas AS
SELECT
  f.id,
  f.materia_id,
  f.anio,
  f.mesa,
  f.profesor_nombre,
  f.comentario,
  f.es_anonima,
  CASE WHEN f.es_anonima THEN NULL ELSE f.nombre_usuario END AS nombre_usuario,
  f.created_at
FROM public.experiencias_finales f
    $v$;
  END IF;
END $do$;

GRANT SELECT ON public.experiencias_finales_publicas TO anon, authenticated;

-- Lectura de la tabla: solo las propias. Se borran todas las políticas de
-- lectura que haya (se suman con OR, así que una abierta dejaría ver todo).
ALTER TABLE public.experiencias_finales ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'experiencias_finales' AND cmd IN ('SELECT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.experiencias_finales', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Finales: cada uno lee las suyas" ON public.experiencias_finales
  FOR SELECT USING (auth.uid() = user_id);

REVOKE SELECT ON public.experiencias_finales FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.experiencias_finales FROM anon, authenticated;

COMMIT;

-- Verificación (el SQL Editor muestra solo este último resultado):
-- tiene que decir columnas_nuevas = 2, vista = 1, anon_puede_leer_tabla = false.
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'experiencias_finales'
      AND column_name IN ('es_anonima', 'nombre_usuario')) AS columnas_nuevas,
  (SELECT count(*) FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'experiencias_finales_publicas') AS vista,
  has_table_privilege('anon', 'public.experiencias_finales', 'SELECT') AS anon_puede_leer_tabla,
  (SELECT count(*) FROM public.experiencias_finales_publicas) AS experiencias;
