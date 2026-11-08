-- =====================================================================
-- Etapa 3, migración 12: horarios de cada curso y Mi inscripción (F29)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108110000_horarios_inscripcion.sql
-- Prueba con datos (se deshace sola): supabase/pruebas/migracion-12.sql
--
-- Qué hace:
--  1. Tabla horarios: los bloques de clase de cada curso de una materia
--     (día, desde, hasta y, si la planilla lo dice, el cuatrimestre). Los
--     carga el importador desde las planillas del centro de estudiantes.
--     Los lee cualquiera; solo el servidor (el admin) los cambia.
--  2. Tabla inscripcion_cursos: "Lo estoy pensando". Cada persona guarda
--     los cursos que está pensando y marca uno "elegido" por materia. Nadie
--     más la ve (salvo que la comparta con el link). No inscribe a nadie:
--     eso sigue en Autogestión.
--     La materia la completa la base (no se puede mentir) y hay un tope de
--     80 cursos por persona.
-- Las superposiciones las calcula el sitio con estos horarios.
-- No cambia ninguna reseña.
-- =====================================================================

BEGIN;

-- 1. Horarios
CREATE TABLE IF NOT EXISTS public.horarios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dictado_id integer NOT NULL REFERENCES public.dictados(id) ON DELETE CASCADE,
  cuatri smallint CHECK (cuatri IN (1, 2)),
  dia smallint NOT NULL CHECK (dia BETWEEN 1 AND 6),
  desde time NOT NULL,
  hasta time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (hasta > desde)
);
CREATE UNIQUE INDEX IF NOT EXISTS horarios_unico ON public.horarios (dictado_id, COALESCE(cuatri, 0), dia, desde);
CREATE INDEX IF NOT EXISTS horarios_dictado ON public.horarios (dictado_id);

ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Horarios: los lee cualquiera" ON public.horarios;
CREATE POLICY "Horarios: los lee cualquiera" ON public.horarios FOR SELECT USING (true);
REVOKE ALL ON public.horarios FROM anon, authenticated;
GRANT SELECT ON public.horarios TO anon, authenticated;

-- 2. Mi inscripción
CREATE TABLE IF NOT EXISTS public.inscripcion_cursos (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dictado_id integer NOT NULL REFERENCES public.dictados(id) ON DELETE CASCADE,
  materia_id integer NOT NULL,
  elegido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dictado_id)
);
-- Un solo elegido por materia
CREATE UNIQUE INDEX IF NOT EXISTS inscripcion_un_elegido ON public.inscripcion_cursos (user_id, materia_id) WHERE elegido;

-- La materia sale del curso, y no más de 80 por persona
CREATE OR REPLACE FUNCTION public.inscripcion_completar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  SELECT d.materia_id INTO NEW.materia_id FROM public.dictados d WHERE d.id = NEW.dictado_id;
  IF NEW.materia_id IS NULL THEN
    RAISE EXCEPTION 'El curso no existe o no tiene materia' USING ERRCODE = '23503';
  END IF;
  IF TG_OP = 'INSERT' AND (SELECT count(*) FROM public.inscripcion_cursos WHERE user_id = NEW.user_id) >= 80 THEN
    RAISE EXCEPTION 'Llegaste al máximo de cursos en Mi inscripción' USING ERRCODE = 'IN001';
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_inscripcion_completar ON public.inscripcion_cursos;
CREATE TRIGGER trg_inscripcion_completar
  BEFORE INSERT OR UPDATE OF dictado_id ON public.inscripcion_cursos
  FOR EACH ROW EXECUTE FUNCTION public.inscripcion_completar();

ALTER TABLE public.inscripcion_cursos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inscripción: cada uno ve la suya" ON public.inscripcion_cursos;
CREATE POLICY "Inscripción: cada uno ve la suya" ON public.inscripcion_cursos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Inscripción: cada uno agrega a la suya" ON public.inscripcion_cursos;
CREATE POLICY "Inscripción: cada uno agrega a la suya" ON public.inscripcion_cursos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Inscripción: cada uno cambia la suya" ON public.inscripcion_cursos;
CREATE POLICY "Inscripción: cada uno cambia la suya" ON public.inscripcion_cursos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Inscripción: cada uno saca de la suya" ON public.inscripcion_cursos;
CREATE POLICY "Inscripción: cada uno saca de la suya" ON public.inscripcion_cursos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.inscripcion_cursos FROM anon, authenticated;
GRANT SELECT, DELETE ON public.inscripcion_cursos TO authenticated;
GRANT INSERT (user_id, dictado_id, elegido) ON public.inscripcion_cursos TO authenticated;
GRANT UPDATE (elegido) ON public.inscripcion_cursos TO authenticated;

COMMIT;

-- Verificación: tablas = 2, politicas = 5, publico_lee_horarios = true,
-- publico_cambia_horarios = false, anon_lee_inscripcion = false.
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('horarios', 'inscripcion_cursos')) AS tablas,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('horarios', 'inscripcion_cursos')) AS politicas,
  has_table_privilege('anon', 'public.horarios', 'SELECT') AS publico_lee_horarios,
  has_table_privilege('authenticated', 'public.horarios', 'INSERT') AS publico_cambia_horarios,
  has_table_privilege('anon', 'public.inscripcion_cursos', 'SELECT') AS anon_lee_inscripcion;
