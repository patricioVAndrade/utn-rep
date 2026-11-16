-- =====================================================================
-- Migración 20: color de la inicial o del dibujo (Pato, 14/11/2026)
-- Vuelta atrás: supabase/rollback/20261115000000_perfil_color.sql
--
--  1. perfiles.color: el color que eligió para su inicial o su dibujo.
--     Vacío es el azul de siempre. Lo cambia cada uno desde Mi cuenta.
--  2. El freno a cuentas bloqueadas también cubre el color.
-- No cambia ninguna reseña ni ningún perfil que ya exista.
-- =====================================================================

BEGIN;

ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS color text
  CHECK (color IS NULL OR color IN ('azul', 'verde', 'rojo', 'violeta', 'naranja', 'gris'));

GRANT INSERT (color), UPDATE (color) ON public.perfiles TO authenticated;

DROP TRIGGER IF EXISTS trg_bloqueo_perfil ON public.perfiles;
CREATE TRIGGER trg_bloqueo_perfil
  BEFORE UPDATE OF nombre_mostrar, foto, dibujo, color ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.frenar_bloqueados();

COMMIT;

-- Verificación: tiene que dar una fila con true · true · true
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'perfiles' AND column_name = 'color') AS columna_color,
  has_column_privilege('authenticated', 'public.perfiles', 'color', 'UPDATE') AS cada_uno_lo_cambia,
  pg_get_triggerdef((SELECT oid FROM pg_trigger WHERE tgname = 'trg_bloqueo_perfil' AND tgrelid = 'public.perfiles'::regclass)) LIKE '%color%' AS bloqueo_cubre_el_color;
