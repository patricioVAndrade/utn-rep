-- =====================================================================
-- Etapa 3, migración 11: rol de cada profe e historial (3.13)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108100000_profesores_historial.sql
-- Prueba con datos (se deshace sola): supabase/pruebas/migracion-11.sql
--
-- Qué hace:
--  1. dictado_profesores.rol: Titular, Adjunto, JTP o Ayudante (o vacío).
--     Lo pone el admin; las planillas no lo traen.
--  2. Tabla profesores_historial: cada vez que un profe entra a un curso se
--     abre un período (desde año y cuatrimestre) y cuando sale se cierra
--     (hasta). Lo llevan triggers, así que el importador y el admin no
--     cambian: siguen agregando y sacando como hoy, y la base anota.
--     Si el profe vuelve, se abre otro período.
--  3. Los profes de hoy arrancan con su período abierto desde el año en que
--     se cargaron (2026).
-- Cuatrimestre: de enero a julio el 1.º, de agosto a diciembre el 2.º
-- (hora de Córdoba). Lo que ve el público no cambia hasta 2027 (F22 a F27).
-- No cambia ninguna reseña.
-- =====================================================================

BEGIN;

ALTER TABLE public.dictado_profesores ADD COLUMN IF NOT EXISTS rol text;
ALTER TABLE public.dictado_profesores DROP CONSTRAINT IF EXISTS dictado_profesores_rol_check;
ALTER TABLE public.dictado_profesores ADD CONSTRAINT dictado_profesores_rol_check
  CHECK (rol IS NULL OR rol IN ('TITULAR', 'ADJUNTO', 'JTP', 'AYUDANTE'));

CREATE TABLE IF NOT EXISTS public.profesores_historial (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dictado_id bigint NOT NULL,
  profesor_id bigint NOT NULL,
  rol text CHECK (rol IS NULL OR rol IN ('TITULAR', 'ADJUNTO', 'JTP', 'AYUDANTE')),
  desde_anio smallint NOT NULL CHECK (desde_anio BETWEEN 2000 AND 2100),
  desde_cuatri smallint CHECK (desde_cuatri IN (1, 2)),
  hasta_anio smallint CHECK (hasta_anio BETWEEN 2000 AND 2100),
  hasta_cuatri smallint CHECK (hasta_cuatri IN (1, 2)),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Un solo período abierto por profe y curso
CREATE UNIQUE INDEX IF NOT EXISTS profesores_historial_abierto
  ON public.profesores_historial (dictado_id, profesor_id) WHERE hasta_anio IS NULL;
CREATE INDEX IF NOT EXISTS profesores_historial_profe ON public.profesores_historial (profesor_id);

ALTER TABLE public.profesores_historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Historial: lo lee cualquiera" ON public.profesores_historial;
CREATE POLICY "Historial: lo lee cualquiera" ON public.profesores_historial FOR SELECT USING (true);
REVOKE ALL ON public.profesores_historial FROM anon, authenticated;
GRANT SELECT ON public.profesores_historial TO anon, authenticated;

-- Año y cuatrimestre de hoy en Córdoba
CREATE OR REPLACE FUNCTION public.cuatri_actual(OUT anio smallint, OUT cuatri smallint)
LANGUAGE sql
STABLE
AS $fn$
  SELECT extract(year FROM t)::smallint, (CASE WHEN extract(month FROM t) <= 7 THEN 1 ELSE 2 END)::smallint
  FROM (SELECT now() AT TIME ZONE 'America/Argentina/Cordoba' AS t) x;
$fn$;

CREATE OR REPLACE FUNCTION public.profesores_historial_anotar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.cuatri_actual();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profesores_historial (dictado_id, profesor_id, rol, desde_anio, desde_cuatri)
    VALUES (NEW.dictado_id, NEW.profesor_id, NEW.rol, c.anio, c.cuatri)
    ON CONFLICT (dictado_id, profesor_id) WHERE hasta_anio IS NULL DO UPDATE SET rol = EXCLUDED.rol;
    RETURN NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.profesores_historial SET rol = NEW.rol
    WHERE dictado_id = NEW.dictado_id AND profesor_id = NEW.profesor_id AND hasta_anio IS NULL;
    RETURN NULL;
  ELSE
    UPDATE public.profesores_historial SET hasta_anio = c.anio, hasta_cuatri = c.cuatri
    WHERE dictado_id = OLD.dictado_id AND profesor_id = OLD.profesor_id AND hasta_anio IS NULL;
    RETURN NULL;
  END IF;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_profesores_historial ON public.dictado_profesores;
CREATE TRIGGER trg_profesores_historial
  AFTER INSERT OR DELETE OR UPDATE OF rol ON public.dictado_profesores
  FOR EACH ROW EXECUTE FUNCTION public.profesores_historial_anotar();

-- Los de hoy: período abierto desde el año en que se cargaron
INSERT INTO public.profesores_historial (dictado_id, profesor_id, rol, desde_anio)
SELECT dp.dictado_id, dp.profesor_id, dp.rol,
       COALESCE(extract(year FROM dp.created_at AT TIME ZONE 'America/Argentina/Cordoba')::smallint, 2026)
FROM public.dictado_profesores dp
WHERE NOT EXISTS (
  SELECT 1 FROM public.profesores_historial h
  WHERE h.dictado_id = dp.dictado_id AND h.profesor_id = dp.profesor_id AND h.hasta_anio IS NULL
);

COMMIT;

-- Verificación: columna_rol = 1, tabla = 1, trigger = 1,
-- sin_periodo = 0 (todos los profes de hoy tienen su período abierto),
-- publico_cambia = false.
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dictado_profesores' AND column_name = 'rol') AS columna_rol,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profesores_historial') AS tabla,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_profesores_historial') AS trigger,
  (SELECT count(*) FROM public.dictado_profesores dp WHERE NOT EXISTS (
     SELECT 1 FROM public.profesores_historial h WHERE h.dictado_id = dp.dictado_id AND h.profesor_id = dp.profesor_id AND h.hasta_anio IS NULL)) AS sin_periodo,
  has_table_privilege('anon', 'public.profesores_historial', 'INSERT') AS publico_cambia;
