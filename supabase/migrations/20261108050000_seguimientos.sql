-- =====================================================================
-- Etapa 3, migración 6: seguir materias (F11)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108050000_seguimientos.sql
--
-- Qué hace:
--  1. Tabla seguimientos: qué materias sigue cada persona y si quiere mail
--     de lo nuevo en cada una (el mail llega con la migración 7; por ahora
--     queda guardada la preferencia). Desde un curso se sigue su materia.
--  2. Cada persona ve, agrega, cambia y saca solo los suyos. Nadie más puede
--     saber qué materias sigue otra persona.
-- No toca ninguna tabla existente.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.seguimientos (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id integer NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  mail boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, materia_id)
);
CREATE INDEX IF NOT EXISTS seguimientos_materia ON public.seguimientos (materia_id);

ALTER TABLE public.seguimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Seguimientos: cada uno ve los suyos" ON public.seguimientos;
CREATE POLICY "Seguimientos: cada uno ve los suyos" ON public.seguimientos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Seguimientos: cada uno agrega los suyos" ON public.seguimientos;
CREATE POLICY "Seguimientos: cada uno agrega los suyos" ON public.seguimientos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Seguimientos: cada uno cambia los suyos" ON public.seguimientos;
CREATE POLICY "Seguimientos: cada uno cambia los suyos" ON public.seguimientos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Seguimientos: cada uno saca los suyos" ON public.seguimientos;
CREATE POLICY "Seguimientos: cada uno saca los suyos" ON public.seguimientos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.seguimientos FROM anon, authenticated;
GRANT SELECT, DELETE ON public.seguimientos TO authenticated;
GRANT INSERT (user_id, materia_id, mail) ON public.seguimientos TO authenticated;
GRANT UPDATE (mail) ON public.seguimientos TO authenticated;

COMMIT;

-- Verificación: tabla = 1, politicas = 4, anon_lee = false.
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seguimientos') AS tabla,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seguimientos') AS politicas,
  has_table_privilege('anon', 'public.seguimientos', 'SELECT') AS anon_lee;
