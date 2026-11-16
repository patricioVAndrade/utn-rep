-- =====================================================================
-- Etapa 3, migración 3: reseñas — fecha de edición, "¿Cómo te fue?" y plan
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108020000_resenas_edicion_plan.sql
--
-- Qué hace:
--  1. Columna updated_at en resenas. Se llena sola cuando cambia el texto,
--     el puntaje o "¿Cómo te fue?" (los votos no cuentan como edición).
--     En las que ya existen queda vacía: nunca se editaron con esto.
--  2. Cada persona puede completar o cambiar condicion_final de su propia
--     reseña (hoy solo puede editar el texto). Sigue valiendo la regla que
--     solo acepta PROMOCIONADO, REGULAR o LIBRE.
--  3. Columna plan (2008 o 2023), 2023 en todas. No se muestra todavía.
--  4. La vista pública suma updated_at y plan al final.
-- No borra ni cambia el contenido de ninguna reseña.
-- =====================================================================

BEGIN;

ALTER TABLE public.resenas
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan smallint NOT NULL DEFAULT 2023;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resenas_plan_valido') THEN
    ALTER TABLE public.resenas ADD CONSTRAINT resenas_plan_valido CHECK (plan IN (2008, 2023));
  END IF;
END $do$;

CREATE OR REPLACE FUNCTION public.resenas_marcar_edicion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.comentario IS DISTINCT FROM OLD.comentario
     OR NEW.calificacion_general IS DISTINCT FROM OLD.calificacion_general
     OR NEW.condicion_final IS DISTINCT FROM OLD.condicion_final THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_resenas_marcar_edicion ON public.resenas;
CREATE TRIGGER trg_resenas_marcar_edicion
  BEFORE UPDATE ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.resenas_marcar_edicion();

-- Además del texto, cada uno puede completar "¿Cómo te fue?" (RLS: solo las propias)
GRANT UPDATE (comentario, condicion_final) ON public.resenas TO authenticated;

CREATE OR REPLACE VIEW public.resenas_publicas AS
SELECT
  r.id,
  r.dictado_id,
  r.calificacion_general,
  r.anio_cursado,
  r.comentario,
  r.es_anonima,
  CASE WHEN r.es_anonima THEN NULL ELSE r.nombre_usuario END AS nombre_usuario,
  r.es_alumno_utn,
  r.condicion_final,
  r.votos_utilidad,
  r.created_at,
  r.updated_at,
  r.plan
FROM public.resenas r;

GRANT SELECT ON public.resenas_publicas TO anon, authenticated;

COMMIT;

-- Verificación: columnas = 2, trigger = 1, puede_editar_condicion = true, y cuántas reseñas tienen plan 2023.
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resenas_publicas' AND column_name IN ('updated_at', 'plan')) AS columnas,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_resenas_marcar_edicion') AS trigger,
  has_column_privilege('authenticated', 'public.resenas', 'condicion_final', 'UPDATE') AS puede_editar_condicion,
  (SELECT count(*) FROM public.resenas WHERE plan = 2023) AS resenas_plan_2023;
