-- =====================================================================
-- Deshace la migración 3 de la etapa 3. Usar junto con volver el código.
-- Ojo: se pierden las fechas de edición y el plan guardados. Los cambios de
-- "¿Cómo te fue?" que hayan hecho las personas se conservan.
-- =====================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_resenas_marcar_edicion ON public.resenas;
DROP FUNCTION IF EXISTS public.resenas_marcar_edicion();

REVOKE UPDATE (condicion_final) ON public.resenas FROM authenticated;

-- La vista vuelve a la de la v2.1 (hay que borrarla para sacar columnas)
DROP VIEW IF EXISTS public.resenas_publicas;
CREATE VIEW public.resenas_publicas AS
SELECT
  r.id, r.dictado_id, r.calificacion_general, r.anio_cursado, r.comentario, r.es_anonima,
  CASE WHEN r.es_anonima THEN NULL ELSE r.nombre_usuario END AS nombre_usuario,
  r.es_alumno_utn, r.condicion_final, r.votos_utilidad, r.created_at
FROM public.resenas r;
GRANT SELECT ON public.resenas_publicas TO anon, authenticated;

ALTER TABLE public.resenas DROP CONSTRAINT IF EXISTS resenas_plan_valido;
ALTER TABLE public.resenas DROP COLUMN IF EXISTS plan;
ALTER TABLE public.resenas DROP COLUMN IF EXISTS updated_at;

COMMIT;
