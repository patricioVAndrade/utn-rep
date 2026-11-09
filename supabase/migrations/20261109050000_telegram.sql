-- =====================================================================
-- Etapa 3, migración 18: avisos por Telegram
-- Correr en la BASE DE PRUEBA, después de la 17. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261109050000_telegram.sql
--
-- Qué hace:
--  1. telegram_cuentas: qué chat de Telegram tiene vinculado cada uno. Cada
--     persona ve la suya (para saber si está conectada) y la puede borrar
--     (desconectar). La escribe solo el servidor, cuando alguien toca
--     "Iniciar" en el bot con su código.
--  2. telegram_codigos: el código de un solo uso que va en el link al bot
--     (vence a los 30 minutos). Solo el servidor.
--  3. notificaciones.telegram_enviado_at: cuándo salió por Telegram.
--  4. quiere_telegram(): por defecto, todo lo que llega al sitio (se puede
--     apagar por tipo en Mi cuenta).
--  5. reclamar_telegram(limite): toma los avisos pendientes de quienes tienen
--     Telegram y los marca en el mismo paso, así dos envíos a la vez no
--     mandan dos veces lo mismo. liberar_telegram() los devuelve si el envío
--     falló. desvincular_telegram() borra un chat que bloqueó al bot.
--  6. mails_pendientes() (migración 17) ya no le manda mail a quien tiene
--     Telegram: le llega por ahí, sin gastar mails.
--  7. Aviso inmediato: si la base tiene pg_net (Supabase lo trae, se prende
--     en Database > Extensions), cada aviso nuevo para alguien con Telegram
--     llama a <url_sitio>/api/telegram/despachar. La dirección se guarda en
--     ajustes_sitio (distinta en la base de prueba y en la real). El
--     pedido no lleva datos ni claves: el sitio busca qué mandar.
--     Sin pg_net igual funciona: lo pendiente sale con el envío de la mañana.
-- No cambia ninguna reseña.
-- =====================================================================

BEGIN;

-- 1. Cuentas vinculadas -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telegram_cuentas (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL UNIQUE,
  usuario text CHECK (usuario IS NULL OR char_length(usuario) <= 64),
  vinculado_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_cuentas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Telegram: cada uno ve la suya" ON public.telegram_cuentas;
CREATE POLICY "Telegram: cada uno ve la suya" ON public.telegram_cuentas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Telegram: cada uno desconecta la suya" ON public.telegram_cuentas;
CREATE POLICY "Telegram: cada uno desconecta la suya" ON public.telegram_cuentas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.telegram_cuentas FROM anon, authenticated;
GRANT SELECT (user_id, usuario, vinculado_at), DELETE ON public.telegram_cuentas TO authenticated;
GRANT ALL ON public.telegram_cuentas TO service_role;

-- 2. Códigos para vincular ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telegram_codigos (
  codigo text PRIMARY KEY CHECK (char_length(codigo) BETWEEN 16 AND 64),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expira_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes'
);
ALTER TABLE public.telegram_codigos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_codigos FROM anon, authenticated;
GRANT ALL ON public.telegram_codigos TO service_role;

-- Usa el código (una sola vez) y vincula el chat. Devuelve el user_id o null.
CREATE OR REPLACE FUNCTION public.vincular_telegram(p_codigo text, p_chat bigint, p_usuario text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid;
BEGIN
  DELETE FROM public.telegram_codigos WHERE expira_at < now();
  DELETE FROM public.telegram_codigos WHERE codigo = p_codigo RETURNING user_id INTO v_user;
  IF v_user IS NULL THEN RETURN NULL; END IF;
  -- Un chat es de una sola cuenta: si estaba con otra, pasa a esta
  DELETE FROM public.telegram_cuentas WHERE chat_id = p_chat AND user_id <> v_user;
  INSERT INTO public.telegram_cuentas (user_id, chat_id, usuario)
  VALUES (v_user, p_chat, left(p_usuario, 64))
  ON CONFLICT (user_id) DO UPDATE SET chat_id = EXCLUDED.chat_id, usuario = EXCLUDED.usuario, vinculado_at = now();
  RETURN v_user;
END;
$fn$;
REVOKE ALL ON FUNCTION public.vincular_telegram(text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_telegram(text, bigint, text) TO service_role;

-- 3. Cuándo salió por Telegram -------------------------------------------------
ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS telegram_enviado_at timestamptz;

-- 4. ¿Lo quiere por Telegram? Sin fila, sí (vincular ya es pedirlo) ---------------
CREATE OR REPLACE FUNCTION public.quiere_telegram(p_user uuid, p_tipo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE((SELECT activo FROM public.preferencias_aviso WHERE user_id = p_user AND tipo = p_tipo AND canal = 'telegram'), true);
$fn$;
REVOKE ALL ON FUNCTION public.quiere_telegram(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiere_telegram(uuid, text) TO service_role;

-- 5. Tomar lo pendiente (y marcarlo), devolverlo si falló, desconectar ------------
CREATE OR REPLACE FUNCTION public.reclamar_telegram(p_limite integer)
RETURNS TABLE (id bigint, user_id uuid, chat_id bigint, tipo text, titulo text, texto text, link text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN QUERY
  WITH tomados AS (
    SELECT n.id FROM public.notificaciones n
    JOIN public.telegram_cuentas t ON t.user_id = n.user_id
    LEFT JOIN public.perfiles p ON p.user_id = n.user_id
    WHERE n.telegram_enviado_at IS NULL
      AND n.leida_at IS NULL
      AND n.created_at >= now() - interval '3 days'
      AND p.bloqueado_at IS NULL
      AND public.quiere_telegram(n.user_id, n.tipo)
    ORDER BY n.created_at
    LIMIT greatest(p_limite, 0)
    FOR UPDATE OF n SKIP LOCKED
  ),
  marcados AS (
    UPDATE public.notificaciones n SET telegram_enviado_at = now()
    FROM tomados WHERE n.id = tomados.id
    RETURNING n.id, n.user_id, n.tipo, n.titulo, n.texto, n.link, n.created_at
  )
  SELECT m.id, m.user_id, t.chat_id, m.tipo, m.titulo, m.texto, m.link
  FROM marcados m JOIN public.telegram_cuentas t ON t.user_id = m.user_id
  ORDER BY m.user_id, m.created_at;
END;
$fn$;
REVOKE ALL ON FUNCTION public.reclamar_telegram(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclamar_telegram(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.liberar_telegram(p_ids bigint[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  UPDATE public.notificaciones SET telegram_enviado_at = NULL WHERE id = ANY (p_ids);
$fn$;
REVOKE ALL ON FUNCTION public.liberar_telegram(bigint[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.liberar_telegram(bigint[]) TO service_role;

-- Un chat que bloqueó al bot o se fue: se desconecta y lo suyo vuelve a ir por mail
CREATE OR REPLACE FUNCTION public.desvincular_telegram(p_chat bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid;
BEGIN
  DELETE FROM public.telegram_cuentas WHERE chat_id = p_chat RETURNING user_id INTO v_user;
  IF v_user IS NOT NULL THEN
    UPDATE public.notificaciones SET telegram_enviado_at = NULL
    WHERE user_id = v_user AND leida_at IS NULL AND mail_enviado_at IS NULL AND telegram_enviado_at >= now() - interval '1 day';
  END IF;
END;
$fn$;
REVOKE ALL ON FUNCTION public.desvincular_telegram(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.desvincular_telegram(bigint) TO service_role;

-- 6. El mail del día no va a quien tiene Telegram --------------------------------
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
      AND n.telegram_enviado_at IS NULL
      AND n.created_at >= now() - make_interval(days => p_dias)
      AND NOT EXISTS (SELECT 1 FROM public.telegram_cuentas t WHERE t.user_id = n.user_id)
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

-- 7. Aviso inmediato con pg_net ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ajustes_sitio (
  clave text PRIMARY KEY,
  valor text
);
ALTER TABLE public.ajustes_sitio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ajustes_sitio FROM anon, authenticated;
GRANT ALL ON public.ajustes_sitio TO service_role;
INSERT INTO public.ajustes_sitio (clave, valor) VALUES ('url_sitio', NULL) ON CONFLICT (clave) DO NOTHING;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'No se pudo prender pg_net (%): los avisos por Telegram salen con el envío de la mañana.', SQLERRM;
END;
$do$;

CREATE OR REPLACE FUNCTION public.avisar_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_url text;
BEGIN
  IF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN RETURN NULL; END IF;
  SELECT valor INTO v_url FROM public.ajustes_sitio WHERE clave = 'url_sitio';
  IF v_url IS NULL OR v_url NOT LIKE 'https://%' THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM nuevas n JOIN public.telegram_cuentas t ON t.user_id = n.user_id) THEN RETURN NULL; END IF;
  EXECUTE 'SELECT net.http_post($1, ''{}''::jsonb)' USING rtrim(v_url, '/') || '/api/telegram/despachar';
  RETURN NULL;
EXCEPTION WHEN others THEN
  RETURN NULL; -- un aviso nunca tiene que fallar por esto
END;
$fn$;
DROP TRIGGER IF EXISTS trg_avisar_telegram ON public.notificaciones;
CREATE TRIGGER trg_avisar_telegram
  AFTER INSERT ON public.notificaciones
  REFERENCING NEW TABLE AS nuevas
  FOR EACH STATEMENT EXECUTE FUNCTION public.avisar_telegram();

COMMIT;

-- Después de correrla, en cada base (con su dirección):
--   UPDATE public.ajustes_sitio SET valor = 'https://utnrep.app' WHERE clave = 'url_sitio';

-- Verificación: tiene que dar  2 | true | false | true | (true o false)
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('telegram_cuentas', 'telegram_codigos')) AS tablas,
  has_column_privilege('authenticated', 'public.telegram_cuentas', 'usuario', 'SELECT') AS usuario_ve_la_suya,
  has_column_privilege('authenticated', 'public.telegram_cuentas', 'chat_id', 'SELECT') AS usuario_ve_chat,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'notificaciones' AND column_name = 'telegram_enviado_at') = 1 AS columna,
  to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL AS aviso_inmediato;
