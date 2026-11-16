-- Vuelta atrás de la migración 13 (sumar el final a tu reseña).
-- Las reseñas pierden el final que tenían sumado; el texto y los finales quedan.
BEGIN;

-- La vista vuelve a ser la de la migración 3
DROP VIEW IF EXISTS public.resenas_publicas;
CREATE VIEW public.resenas_publicas AS
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

DROP TRIGGER IF EXISTS trg_resenas_controlar_final ON public.resenas;
DROP FUNCTION IF EXISTS public.resenas_controlar_final();
DROP INDEX IF EXISTS public.resenas_un_final;
ALTER TABLE public.resenas DROP COLUMN IF EXISTS final_id;

COMMIT;
