-- Vuelta atrás de supabase/migrations/20261108030000_moderacion.sql
-- OJO: borra las respuestas del moderador, el registro, la lista de palabras,
-- los pedidos de edición y los reportes automáticos. Las reseñas no se tocan.

BEGIN;

DROP TABLE IF EXISTS public.respuestas_moderador;
DROP TABLE IF EXISTS public.registro_moderacion;
DROP TABLE IF EXISTS public.palabras_marcadas;

DROP TRIGGER IF EXISTS trg_resenas_limpiar_pedido ON public.resenas;
DROP FUNCTION IF EXISTS public.resenas_limpiar_pedido();
ALTER TABLE public.resenas DROP CONSTRAINT IF EXISTS resenas_pedido_largo;
ALTER TABLE public.resenas
  DROP COLUMN IF EXISTS pedido_edicion,
  DROP COLUMN IF EXISTS pedido_edicion_at;

DROP POLICY IF EXISTS "Usuarios pueden reportar" ON public.reportes_resenas;
CREATE POLICY "Usuarios pueden reportar" ON public.reportes_resenas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DELETE FROM public.reportes_resenas WHERE user_id IS NULL;
ALTER TABLE public.reportes_resenas DROP CONSTRAINT IF EXISTS reportes_persona_o_automatico;
ALTER TABLE public.reportes_resenas DROP COLUMN IF EXISTS automatico;
ALTER TABLE public.reportes_resenas ALTER COLUMN user_id SET NOT NULL;

COMMIT;
