-- =====================================================================
-- Etapa 3, migración 7: avisos dentro del sitio (3.8, F33 y la base de F32)
-- Correr en la BASE DE PRUEBA. Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261108060000_notificaciones.sql
--
-- Qué hace:
--  1. notificaciones: un aviso por persona (tipo, título, link, si lo leyó y
--     si ya se mandó por mail). Cada uno ve, marca como leídos y borra solo
--     los suyos. Nadie puede crear avisos desde el sitio: los crea la base.
--  2. preferencias_aviso: qué avisos quiere cada uno y por qué canal (sitio,
--     mail, Telegram, push). Si no hay fila, el aviso está prendido. Sumar mail
--     o Telegram después no cambia nada de esto.
--  3. Los avisos se crean solos, con triggers:
--     - reseña nueva o final nuevo en una materia que seguís (sin decir quién);
--     - "Tu reseña le sirvió a 5 personas" (y 10, 25, 50, 100), como máximo
--       uno por semana;
--     - la moderación respondió tu reseña o tu final;
--     - la moderación te pide que edites tu reseña.
--     Los logros (migración 8) y el recordatorio de fin de cuatrimestre (F32)
--     usan la misma tabla.
-- No cambia ninguna reseña ni ninguna tabla existente (solo les suma triggers).
-- =====================================================================

BEGIN;

-- 1. Avisos ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('resena_nueva', 'final_nuevo', 'te_sirvio', 'respuesta_moderador', 'pedido_edicion', 'logro', 'recordatorio')),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  texto text CHECK (texto IS NULL OR char_length(texto) <= 500),
  link text CHECK (link IS NULL OR (link LIKE '/%' AND char_length(link) <= 300)),
  clave text,
  leida_at timestamptz,
  mail_enviado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, clave)
);
CREATE INDEX IF NOT EXISTS notificaciones_sin_leer ON public.notificaciones (user_id, created_at DESC) WHERE leida_at IS NULL;
CREATE INDEX IF NOT EXISTS notificaciones_usuario ON public.notificaciones (user_id, created_at DESC);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Avisos: cada uno ve los suyos" ON public.notificaciones;
CREATE POLICY "Avisos: cada uno ve los suyos" ON public.notificaciones
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Avisos: cada uno marca los suyos" ON public.notificaciones;
CREATE POLICY "Avisos: cada uno marca los suyos" ON public.notificaciones
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Avisos: cada uno borra los suyos" ON public.notificaciones;
CREATE POLICY "Avisos: cada uno borra los suyos" ON public.notificaciones
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.notificaciones FROM anon, authenticated;
GRANT SELECT, DELETE ON public.notificaciones TO authenticated;
GRANT UPDATE (leida_at) ON public.notificaciones TO authenticated;

-- 2. Preferencias ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preferencias_aviso (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('resena_nueva', 'final_nuevo', 'te_sirvio', 'respuesta_moderador', 'pedido_edicion', 'logro', 'recordatorio')),
  canal text NOT NULL CHECK (canal IN ('sitio', 'mail', 'telegram', 'push')),
  activo boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tipo, canal)
);
ALTER TABLE public.preferencias_aviso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Preferencias: cada uno las suyas" ON public.preferencias_aviso;
CREATE POLICY "Preferencias: cada uno las suyas" ON public.preferencias_aviso
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.preferencias_aviso FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferencias_aviso TO authenticated;

-- ¿Quiere este aviso por este canal? Sin fila, sí.
CREATE OR REPLACE FUNCTION public.quiere_aviso(p_user uuid, p_tipo text, p_canal text DEFAULT 'sitio')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE((SELECT activo FROM public.preferencias_aviso WHERE user_id = p_user AND tipo = p_tipo AND canal = p_canal), true);
$fn$;
REVOKE ALL ON FUNCTION public.quiere_aviso(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Crea un aviso si la persona lo quiere; con clave repetida no hace nada
CREATE OR REPLACE FUNCTION public.avisar(p_user uuid, p_tipo text, p_titulo text, p_texto text, p_link text, p_clave text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF p_user IS NULL OR NOT public.quiere_aviso(p_user, p_tipo, 'sitio') THEN
    RETURN;
  END IF;
  INSERT INTO public.notificaciones (user_id, tipo, titulo, texto, link, clave)
  VALUES (p_user, p_tipo, left(p_titulo, 200), left(p_texto, 500), p_link, p_clave)
  ON CONFLICT (user_id, clave) DO NOTHING;
END;
$fn$;
REVOKE ALL ON FUNCTION public.avisar(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.avisar(uuid, text, text, text, text, text) TO service_role;

-- 3. Triggers ---------------------------------------------------------------
-- Reseña nueva en una materia que seguís
CREATE OR REPLACE FUNCTION public.avisos_resena_nueva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_materia integer;
  v_nombre text;
  v_curso text;
  s record;
BEGIN
  SELECT d.materia_id, m.nombre, c.identificador INTO v_materia, v_nombre, v_curso
  FROM public.dictados d
  JOIN public.materias m ON m.id = d.materia_id
  LEFT JOIN public.cursos c ON c.id = d.curso_id
  WHERE d.id = NEW.dictado_id;
  IF v_materia IS NULL THEN RETURN NULL; END IF;
  FOR s IN SELECT user_id FROM public.seguimientos WHERE materia_id = v_materia AND user_id IS DISTINCT FROM NEW.user_id LOOP
    PERFORM public.avisar(s.user_id, 'resena_nueva',
      'Reseña nueva en ' || v_nombre,
      CASE WHEN v_curso IS NOT NULL THEN 'Del curso ' || v_curso || '.' END,
      '/dictado/' || NEW.dictado_id || '#resena-' || NEW.id,
      'resena_nueva:' || NEW.id);
  END LOOP;
  RETURN NULL;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_avisos_resena_nueva ON public.resenas;
CREATE TRIGGER trg_avisos_resena_nueva
  AFTER INSERT ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.avisos_resena_nueva();

-- Final nuevo en una materia que seguís
CREATE OR REPLACE FUNCTION public.avisos_final_nuevo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_nombre text;
  s record;
BEGIN
  SELECT nombre INTO v_nombre FROM public.materias WHERE id = NEW.materia_id;
  IF v_nombre IS NULL THEN RETURN NULL; END IF;
  FOR s IN SELECT user_id FROM public.seguimientos WHERE materia_id = NEW.materia_id AND user_id IS DISTINCT FROM NEW.user_id LOOP
    PERFORM public.avisar(s.user_id, 'final_nuevo',
      'Contaron un final de ' || v_nombre,
      NULLIF(concat_ws(' ', NEW.mesa, NEW.anio::text), ''),
      '/finales?materia=' || NEW.materia_id || '#final-' || NEW.id,
      'final_nuevo:' || NEW.id);
  END LOOP;
  RETURN NULL;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_avisos_final_nuevo ON public.experiencias_finales;
CREATE TRIGGER trg_avisos_final_nuevo
  AFTER INSERT ON public.experiencias_finales
  FOR EACH ROW EXECUTE FUNCTION public.avisos_final_nuevo();

-- "Tu reseña le sirvió a N personas" (como máximo uno por semana) y pedido de edición
CREATE OR REPLACE FUNCTION public.avisos_resena_cambio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_hito integer;
  v_nombre text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NULL; END IF;
  SELECT m.nombre INTO v_nombre
  FROM public.dictados d JOIN public.materias m ON m.id = d.materia_id WHERE d.id = NEW.dictado_id;

  IF COALESCE(NEW.votos_utilidad, 0) > COALESCE(OLD.votos_utilidad, 0) THEN
    SELECT max(h) INTO v_hito FROM unnest(ARRAY[5, 10, 25, 50, 100]) AS h
    WHERE h > COALESCE(OLD.votos_utilidad, 0) AND h <= NEW.votos_utilidad;
    IF v_hito IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.notificaciones
      WHERE user_id = NEW.user_id AND tipo = 'te_sirvio' AND created_at > now() - interval '7 days'
    ) THEN
      PERFORM public.avisar(NEW.user_id, 'te_sirvio',
        'Tu reseña le sirvió a ' || v_hito || ' personas',
        CASE WHEN v_nombre IS NOT NULL THEN 'La de ' || v_nombre || '.' END,
        '/dictado/' || NEW.dictado_id || '#resena-' || NEW.id,
        'te_sirvio:' || NEW.id || ':' || v_hito);
    END IF;
  END IF;

  IF NEW.pedido_edicion IS NOT NULL AND NEW.pedido_edicion IS DISTINCT FROM OLD.pedido_edicion THEN
    PERFORM public.avisar(NEW.user_id, 'pedido_edicion',
      'La moderación te pide que edites tu reseña',
      left(NEW.pedido_edicion, 500),
      '/mis-resenas',
      'pedido_edicion:' || NEW.id || ':' || extract(epoch FROM COALESCE(NEW.pedido_edicion_at, now()))::bigint);
  END IF;
  RETURN NULL;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_avisos_resena_cambio ON public.resenas;
CREATE TRIGGER trg_avisos_resena_cambio
  AFTER UPDATE OF votos_utilidad, pedido_edicion ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.avisos_resena_cambio();

-- La moderación respondió tu reseña o tu final
CREATE OR REPLACE FUNCTION public.avisos_respuesta_moderador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid;
  v_link text;
BEGIN
  IF NEW.resena_id IS NOT NULL THEN
    SELECT user_id, '/dictado/' || dictado_id || '#resena-' || id INTO v_user, v_link FROM public.resenas WHERE id = NEW.resena_id;
  ELSE
    SELECT user_id, '/finales?materia=' || materia_id || '#final-' || id INTO v_user, v_link FROM public.experiencias_finales WHERE id = NEW.final_id;
  END IF;
  PERFORM public.avisar(v_user, 'respuesta_moderador',
    CASE WHEN NEW.resena_id IS NOT NULL THEN 'La moderación respondió tu reseña' ELSE 'La moderación respondió tu experiencia de final' END,
    left(NEW.texto, 500),
    v_link,
    'respuesta_moderador:' || NEW.id || ':' || extract(epoch FROM COALESCE(NEW.updated_at, NEW.created_at))::bigint);
  RETURN NULL;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_avisos_respuesta_moderador ON public.respuestas_moderador;
CREATE TRIGGER trg_avisos_respuesta_moderador
  AFTER INSERT OR UPDATE OF texto ON public.respuestas_moderador
  FOR EACH ROW EXECUTE FUNCTION public.avisos_respuesta_moderador();

COMMIT;

-- Verificación: tablas = 2, triggers = 4, anon_lee = false, puede_crear_avisos = false.
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('notificaciones', 'preferencias_aviso')) AS tablas,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_avisos_resena_nueva', 'trg_avisos_final_nuevo', 'trg_avisos_resena_cambio', 'trg_avisos_respuesta_moderador')) AS triggers,
  has_table_privilege('anon', 'public.notificaciones', 'SELECT') AS anon_lee,
  has_table_privilege('authenticated', 'public.notificaciones', 'INSERT') AS puede_crear_avisos;
