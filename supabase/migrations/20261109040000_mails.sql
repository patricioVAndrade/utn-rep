-- =====================================================================
-- Etapa 3, migración 17: avisos por mail sin pasarse del tope de Brevo
-- Correr en la BASE DE PRUEBA, después de la 7 y la 9. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261109040000_mails.sql
--
-- Brevo (el SMTP de Supabase) manda 300 mails por día en el plan gratis, y
-- ahí entran también los links para entrar al sitio. Esto ordena el envío:
--  1. mails_enviados: un renglón por cada mail que sale (link de ingreso o
--     resumen de avisos), sin el texto. Lo de más de 30 días se borra solo.
--  2. quiere_mail(): si alguien quiere un tipo de aviso por mail. Si no lo
--     tocó, sí para lo importante (pedidos y respuestas de la moderación,
--     recordatorio de fin de cuatrimestre, reseñas y finales nuevos de lo que
--     sigue) y no para logros ni "te sirvió", que se ven en el sitio.
--  3. anotar_mail_login(tope): la llama el servidor antes de mandar un link
--     de ingreso. Si hoy ya salieron "tope" mails, devuelve false y no anota.
--  4. presupuesto_mails(tope, margen, reserva_minima): cuántos resúmenes se
--     pueden mandar ahora, guardando lugar para los links de ingreso del resto
--     del día (1,5 veces el día con más links de la última semana).
--  5. mails_pendientes(limite): a quién mandarle el resumen, por prioridad.
--     Un mail por persona por día como máximo, con todos sus avisos sin leer
--     y sin mandar de la última semana. Lo que no entra queda para mañana.
--  6. marcar_mail_enviado(user, ids): marca esos avisos y anota el mail.
-- "Hoy" cuenta desde la medianoche más temprana entre la de Córdoba y la
-- UTC, así no importa a qué hora reinicia el contador de Brevo.
-- Todo lo usa solo el servidor (service_role). No cambia ninguna reseña.
-- =====================================================================

BEGIN;

-- 1. Registro de mails ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mails_enviados (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('login', 'resumen')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mails_enviados_fecha ON public.mails_enviados (created_at);
CREATE INDEX IF NOT EXISTS mails_enviados_usuario ON public.mails_enviados (user_id, created_at) WHERE tipo = 'resumen';
ALTER TABLE public.mails_enviados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mails_enviados FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.mails_enviados TO service_role;

-- Desde cuándo cuenta "hoy" para el tope: la medianoche más temprana entre Córdoba y UTC
CREATE OR REPLACE FUNCTION public.inicio_dia_mails()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $fn$
  SELECT least(
    date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
    date_trunc('day', now() AT TIME ZONE 'America/Argentina/Cordoba') AT TIME ZONE 'America/Argentina/Cordoba'
  );
$fn$;

-- 2. ¿Quiere este aviso por mail? -------------------------------------------
CREATE OR REPLACE FUNCTION public.quiere_mail(p_user uuid, p_tipo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    (SELECT activo FROM public.preferencias_aviso WHERE user_id = p_user AND tipo = p_tipo AND canal = 'mail'),
    p_tipo IN ('pedido_edicion', 'respuesta_moderador', 'recordatorio', 'resena_nueva', 'final_nuevo')
  );
$fn$;
REVOKE ALL ON FUNCTION public.quiere_mail(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiere_mail(uuid, text) TO service_role;

-- 3. Link de ingreso ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anotar_mail_login(p_tope integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF (SELECT count(*) FROM public.mails_enviados WHERE created_at >= public.inicio_dia_mails()) >= p_tope THEN
    RETURN false;
  END IF;
  INSERT INTO public.mails_enviados (tipo) VALUES ('login');
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.anotar_mail_login(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anotar_mail_login(integer) TO service_role;

-- 4. Presupuesto -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.presupuesto_mails(p_tope integer, p_margen integer, p_reserva_minima integer)
RETURNS TABLE (usados integer, logins_hoy integer, pico_logins integer, reserva integer, disponible integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_desde timestamptz := public.inicio_dia_mails();
BEGIN
  DELETE FROM public.mails_enviados WHERE created_at < now() - interval '30 days';
  SELECT count(*)::int, count(*) FILTER (WHERE m.tipo = 'login')::int INTO usados, logins_hoy
  FROM public.mails_enviados m WHERE m.created_at >= v_desde;
  SELECT COALESCE(max(n), 0)::int INTO pico_logins FROM (
    SELECT count(*) AS n FROM public.mails_enviados m
    WHERE m.tipo = 'login' AND m.created_at >= now() - interval '7 days'
    GROUP BY (m.created_at AT TIME ZONE 'America/Argentina/Cordoba')::date
  ) x;
  reserva := greatest(p_reserva_minima, ceil(pico_logins * 1.5)::int);
  disponible := greatest(0, p_tope - p_margen - usados - reserva);
  RETURN NEXT;
END;
$fn$;
REVOKE ALL ON FUNCTION public.presupuesto_mails(integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.presupuesto_mails(integer, integer, integer) TO service_role;

-- 5. A quién mandarle el resumen ---------------------------------------------
-- Prioridad: 1 pedido de edición, 2 respuesta de la moderación, 3 recordatorio,
-- 4 reseña o final nuevo, 5 lo demás. Gana el aviso más importante de cada uno
-- y, a igual prioridad, el que espera hace más.
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
      -- reseñas y finales nuevos: solo si en esa materia dejó prendido "Mail"
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
    -- como mucho un resumen por persona por día
    AND NOT EXISTS (SELECT 1 FROM public.mails_enviados m WHERE m.user_id = g.user_id AND m.tipo = 'resumen' AND m.created_at >= now() - interval '20 hours')
  ORDER BY g.prioridad, g.desde
  LIMIT greatest(p_limite, 0);
$fn$;
REVOKE ALL ON FUNCTION public.mails_pendientes(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mails_pendientes(integer, integer) TO service_role;

-- 6. Marcar lo que salió -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marcar_mail_enviado(p_user uuid, p_ids bigint[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE public.notificaciones SET mail_enviado_at = now()
  WHERE user_id = p_user AND id = ANY (p_ids) AND mail_enviado_at IS NULL;
  INSERT INTO public.mails_enviados (tipo, user_id) VALUES ('resumen', p_user);
END;
$fn$;
REVOKE ALL ON FUNCTION public.marcar_mail_enviado(uuid, bigint[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_mail_enviado(uuid, bigint[]) TO service_role;

COMMIT;

-- Verificación: tiene que dar  1 | false | true | false | true
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mails_enviados') AS tabla,
  has_table_privilege('authenticated', 'public.mails_enviados', 'SELECT') AS usuario_lee_registro,
  has_function_privilege('service_role', 'public.mails_pendientes(integer, integer)', 'EXECUTE') AS servidor_arma_resumen,
  has_function_privilege('anon', 'public.anotar_mail_login(integer)', 'EXECUTE') AS anon_anota,
  (SELECT disponible FROM public.presupuesto_mails(300, 20, 40)) >= 0 AS presupuesto;
