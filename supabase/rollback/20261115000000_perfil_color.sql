-- Vuelta atrás de supabase/migrations/20261115000000_perfil_color.sql
-- Saca el color (lo elegido se pierde: vuelve el azul de siempre).
BEGIN;

DROP TRIGGER IF EXISTS trg_bloqueo_perfil ON public.perfiles;
CREATE TRIGGER trg_bloqueo_perfil
  BEFORE UPDATE OF nombre_mostrar, foto, dibujo ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.frenar_bloqueados();

ALTER TABLE public.perfiles DROP COLUMN IF EXISTS color;

COMMIT;
