-- Vuelta atrás de supabase/migrations/20261109050000_telegram.sql
-- Desconecta todos los Telegram y vuelve mails_pendientes() a la versión de la 17.
-- pg_net queda prendido (no molesta y lo puede usar otra cosa).
BEGIN;
DROP TRIGGER IF EXISTS trg_avisar_telegram ON public.notificaciones;
DROP FUNCTION IF EXISTS public.avisar_telegram();
DROP TABLE IF EXISTS public.ajustes_sitio;
DROP FUNCTION IF EXISTS public.desvincular_telegram(bigint);
DROP FUNCTION IF EXISTS public.liberar_telegram(bigint[]);
DROP FUNCTION IF EXISTS public.reclamar_telegram(integer);
DROP FUNCTION IF EXISTS public.quiere_telegram(uuid, text);
DROP FUNCTION IF EXISTS public.vincular_telegram(text, bigint, text);
DROP TABLE IF EXISTS public.telegram_codigos;
DROP TABLE IF EXISTS public.telegram_cuentas;
ALTER TABLE public.notificaciones DROP COLUMN IF EXISTS telegram_enviado_at;

CREATE OR REPLACE FUNCTION public.mails_pendientes(p_limite integer, p_dias integer DEFAULT 7)
RETURNS TABLE (user_id uuid, email text, nombre text, prioridad integer, avisos jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH cand AS (
    SELECT n.id, n.user_id, n.tipo, n.titulo, n.texto, n.link, n.created_at,
      CASE n.tipo WHEN 'pedido_edicion' THEN 1 WHEN 'respuesta_moderador' THEN 2 WHEN 'recordatorio' THEN 3
        WHEN 'resena_nueva' THEN 4 WHEN 'final_nuevo' THEN 4 ELSE 5 END AS prioridad
    FROM public.notificaciones n
    WHERE n.leida_at IS NULL
      AND n.mail_enviado_at IS NULL
      AND n.created_at >= now() - make_interval(days => p_dias)
      AND public.quiere_mail(n.user_id, n.tipo)
      AND (n.tipo NOT IN ('resena_nueva', 'final_nuevo') OR EXISTS (
        SELECT 1 FROM public.seguimientos s
        WHERE s.user_id = n.user_id AND s.mail AND s.materia_id = (
          CASE n.tipo
            WHEN 'resena_nueva' THEN (SELECT d.materia_id FROM public.resenas r JOIN public.dictados d ON d.id = r.dictado_id WHERE r.id::text = split_part(n.clave, ':', 2))
            ELSE (SELECT f.materia_id FROM public.experiencias_finales f WHERE f.id::text = split_part(n.clave, ':', 2))
          END)))
  ),
  gente AS (
    SELECT c.user_id, min(c.prioridad) AS prioridad, min(c.created_at) AS desde,
      jsonb_agg(jsonb_build_object('id', c.id, 'tipo', c.tipo, 'titulo', c.titulo, 'texto', c.texto, 'link', c.link)
        ORDER BY c.prioridad, c.created_at) AS avisos
    FROM cand c
    GROUP BY c.user_id
  )
  SELECT g.user_id, u.email::text,
    COALESCE(NULLIF(p.nombre_mostrar, ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    g.prioridad, g.avisos
  FROM gente g
  JOIN auth.users u ON u.id = g.user_id
  LEFT JOIN public.perfiles p ON p.user_id = g.user_id
  WHERE u.email IS NOT NULL
    AND p.bloqueado_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.mails_enviados m WHERE m.user_id = g.user_id AND m.tipo = 'resumen' AND m.created_at >= now() - interval '20 hours')
  ORDER BY g.prioridad, g.desde
  LIMIT greatest(p_limite, 0);
$fn$;
COMMIT;
