-- Vuelta atrás de supabase/migrations/20261108080000_usuarios_links.sql
-- OJO: desbloquea a todos, borra los códigos de links y sus aperturas, y
-- borra del registro las líneas de bloquear y desbloquear.
BEGIN;

DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['resenas', 'experiencias_finales', 'votos_resenas', 'votos_finales', 'reportes_resenas', 'reportes_finales'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_bloqueo ON public.%I', t);
    END IF;
  END LOOP;
END $do$;
DROP TRIGGER IF EXISTS trg_bloqueo_editar ON public.resenas;
DROP TRIGGER IF EXISTS trg_bloqueo_perfil ON public.perfiles;
DROP FUNCTION IF EXISTS public.frenar_bloqueados();
DROP FUNCTION IF EXISTS public.esta_bloqueado(uuid);
ALTER TABLE public.perfiles DROP COLUMN IF EXISTS bloqueado_at;
ALTER TABLE public.perfiles DROP COLUMN IF EXISTS bloqueo_motivo;

DELETE FROM public.registro_moderacion WHERE accion IN ('bloquear', 'desbloquear');
ALTER TABLE public.registro_moderacion DROP COLUMN IF EXISTS usuario_id;
ALTER TABLE public.registro_moderacion DROP CONSTRAINT IF EXISTS registro_moderacion_accion_check;
ALTER TABLE public.registro_moderacion ADD CONSTRAINT registro_moderacion_accion_check CHECK (accion IN (
  'borrar', 'dejar', 'editar_texto', 'responder', 'borrar_respuesta',
  'pedir_edicion', 'quitar_pedido', 'marcada_automatica',
  'agregar_palabra', 'quitar_palabra'));

DROP TABLE IF EXISTS public.aperturas_link;
DROP TABLE IF EXISTS public.links_compartidos;

COMMIT;
