-- =====================================================================
-- Etapa 3, migración 16: logros nuevos (votados por Pato el 9/11/2026)
-- Correr en la BASE DE PRUEBA, después de la 8 (logros) y la 9 (links).
-- Idempotente y en una transacción.
-- Vuelta atrás: supabase/rollback/20261109030000_logros_nuevos.sql
--
-- Qué hace:
--  1. Suma estos logros a revisar_logros() (los da la base sola, con aviso):
--       L8  Pasalo al grupo: 3 personas distintas abrieron un link tuyo
--       L10 Estrenaste el curso: la primera reseña de un curso
--       L12 Recursante: reseñas de dos cursos de la misma materia
--       L13 Buen compañero: votaste "Me sirvió" 20 veces (reseñas y finales)
--       L14 Mesa completa: finales de las mesas de diciembre, febrero y julio
--       L15 Búho: tres reseñas de cursos del turno noche
--       L17 Detallista: una reseña de más de 400 caracteres con 5 votos
--       L18 La más útil del curso: tu reseña es la más votada de su curso
--           (con 3 votos o más; si empatan, la más vieja)
--       L19 Ayudante de cátedra: tus reseñas ayudaron a 50 personas
--       L20 Titular de cátedra: tus reseñas ayudaron a 100 personas
--  2. L9 Detective (secreto): lo da ganar_detective(), que el sitio llama
--     cuando alguien toca "Anónimo" cinco veces seguidas con la sesión iniciada.
--  3. Triggers nuevos para revisar cuando votás, cuando alguien abre tu link
--     y cuando editás el texto de una reseña.
--  4. Da los logros que ya se ganaron, sin avisar.
--  Quedan afuera: L11 Balanza y L16 Al toque (descartados), L7 (2027).
--  Un logro ganado no se pierde. No cambia ninguna reseña.
-- =====================================================================

BEGIN;

-- Ahora hay logros hasta L20
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.logros_usuario'::regclass AND contype = 'c' LOOP
    EXECUTE format('ALTER TABLE public.logros_usuario DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.logros_usuario ADD CONSTRAINT logros_usuario_logro_check CHECK (logro ~ '^L([1-9]|[12][0-9])$');

CREATE OR REPLACE FUNCTION public.titulo_logro(p_logro text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE p_logro
    WHEN 'L1' THEN 'Primera reseña'
    WHEN 'L2' THEN 'Abriste camino'
    WHEN 'L3' THEN 'Útil para 10 estudiantes'
    WHEN 'L4' THEN 'Rendí y compartí mi experiencia'
    WHEN 'L5' THEN 'Madrugada de parcial'
    WHEN 'L6' THEN 'Los cinco años'
    WHEN 'L8' THEN 'Pasalo al grupo'
    WHEN 'L9' THEN 'Detective'
    WHEN 'L10' THEN 'Estrenaste el curso'
    WHEN 'L12' THEN 'Recursante'
    WHEN 'L13' THEN 'Buen compañero'
    WHEN 'L14' THEN 'Mesa completa'
    WHEN 'L15' THEN 'Búho'
    WHEN 'L17' THEN 'Detallista'
    WHEN 'L18' THEN 'La más útil del curso'
    WHEN 'L19' THEN 'Ayudante de cátedra'
    WHEN 'L20' THEN 'Titular de cátedra'
    ELSE p_logro END;
$fn$;

-- Da un logro (si no lo tenía) y avisa. Devuelve true si es nuevo.
CREATE OR REPLACE FUNCTION public.dar_logro(p_user uuid, p_logro text, p_avisar boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.logros_usuario (user_id, logro) VALUES (p_user, p_logro) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_avisar THEN
    PERFORM public.avisar(p_user, 'logro', 'Ganaste un logro: ' || public.titulo_logro(p_logro), 'Lo ves en Mi cuenta.', '/mi-cuenta#logros', 'logro:' || p_logro);
  END IF;
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.dar_logro(uuid, text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.revisar_logros(p_user uuid, p_avisar boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ganados text[] := ARRAY[]::text[];
  v_nuevos integer := 0;
  v_logro text;
  v_ayudadas integer;
BEGIN
  IF p_user IS NULL THEN RETURN 0; END IF;

  -- L1 Primera reseña
  IF EXISTS (SELECT 1 FROM public.resenas WHERE user_id = p_user) THEN
    v_ganados := array_append(v_ganados, 'L1');
  END IF;

  -- L2 Abriste camino: la primera reseña de una materia
  IF EXISTS (
    SELECT 1 FROM public.resenas r
    JOIN public.dictados d ON d.id = r.dictado_id
    WHERE r.user_id = p_user
      AND NOT EXISTS (
        SELECT 1 FROM public.resenas o JOIN public.dictados od ON od.id = o.dictado_id
        WHERE od.materia_id = d.materia_id AND o.id <> r.id
          AND (o.created_at < r.created_at OR (o.created_at = r.created_at AND o.id < r.id))
      )
  ) THEN
    v_ganados := array_append(v_ganados, 'L2');
  END IF;

  -- Personas ayudadas: los "Me sirvió" de tus reseñas (L3, L19, L20)
  SELECT COALESCE(sum(votos_utilidad), 0) INTO v_ayudadas FROM public.resenas WHERE user_id = p_user;
  IF v_ayudadas >= 10 THEN v_ganados := array_append(v_ganados, 'L3'); END IF;
  IF v_ayudadas >= 50 THEN v_ganados := array_append(v_ganados, 'L19'); END IF;
  IF v_ayudadas >= 100 THEN v_ganados := array_append(v_ganados, 'L20'); END IF;

  -- L4 Rendí y compartí mi experiencia
  IF EXISTS (SELECT 1 FROM public.experiencias_finales WHERE user_id = p_user) THEN
    v_ganados := array_append(v_ganados, 'L4');
  END IF;

  -- L5 Madrugada de parcial
  IF EXISTS (
    SELECT 1 FROM public.resenas
    WHERE user_id = p_user AND extract(hour FROM created_at AT TIME ZONE 'America/Argentina/Cordoba') BETWEEN 2 AND 4
  ) THEN
    v_ganados := array_append(v_ganados, 'L5');
  END IF;

  -- L6 Los cinco años
  IF (
    SELECT count(DISTINCT m.nivel) FROM public.resenas r
    JOIN public.dictados d ON d.id = r.dictado_id
    JOIN public.materias m ON m.id = d.materia_id
    WHERE r.user_id = p_user AND m.nivel BETWEEN 1 AND 5
  ) = 5 THEN
    v_ganados := array_append(v_ganados, 'L6');
  END IF;

  -- L8 Pasalo al grupo: 3 personas distintas abrieron un link tuyo
  IF (
    SELECT count(*) FROM public.aperturas_link a
    JOIN public.links_compartidos l ON l.codigo = a.codigo
    WHERE l.user_id = p_user
  ) >= 3 THEN
    v_ganados := array_append(v_ganados, 'L8');
  END IF;

  -- L10 Estrenaste el curso: la primera reseña de un curso
  IF EXISTS (
    SELECT 1 FROM public.resenas r
    WHERE r.user_id = p_user
      AND NOT EXISTS (
        SELECT 1 FROM public.resenas o
        WHERE o.dictado_id = r.dictado_id AND o.id <> r.id
          AND (o.created_at < r.created_at OR (o.created_at = r.created_at AND o.id < r.id))
      )
  ) THEN
    v_ganados := array_append(v_ganados, 'L10');
  END IF;

  -- L12 Recursante: dos cursos de la misma materia
  IF EXISTS (
    SELECT 1 FROM public.resenas r
    JOIN public.dictados d ON d.id = r.dictado_id
    WHERE r.user_id = p_user
    GROUP BY d.materia_id
    HAVING count(DISTINCT r.dictado_id) >= 2
  ) THEN
    v_ganados := array_append(v_ganados, 'L12');
  END IF;

  -- L13 Buen compañero: 20 "Me sirvió" dados (reseñas y finales)
  IF (SELECT count(*) FROM public.votos_resenas WHERE user_id = p_user)
     + (SELECT count(*) FROM public.votos_finales WHERE user_id = p_user) >= 20 THEN
    v_ganados := array_append(v_ganados, 'L13');
  END IF;

  -- L14 Mesa completa: diciembre, febrero y julio
  IF (
    SELECT count(DISTINCT left(lower(mesa), 3)) FROM public.experiencias_finales
    WHERE user_id = p_user AND left(lower(mesa), 3) IN ('dic', 'feb', 'jul')
  ) = 3 THEN
    v_ganados := array_append(v_ganados, 'L14');
  END IF;

  -- L15 Búho: tres reseñas de cursos del turno noche
  IF (
    SELECT count(*) FROM public.resenas r
    JOIN public.dictados d ON d.id = r.dictado_id
    JOIN public.cursos c ON c.id = d.curso_id
    WHERE r.user_id = p_user AND upper(COALESCE(to_jsonb(c) ->> 'turno', '')) LIKE 'NO%'
  ) >= 3 THEN
    v_ganados := array_append(v_ganados, 'L15');
  END IF;

  -- L17 Detallista: más de 400 caracteres y 5 votos
  IF EXISTS (
    SELECT 1 FROM public.resenas
    WHERE user_id = p_user AND char_length(COALESCE(comentario, '')) > 400 AND votos_utilidad >= 5
  ) THEN
    v_ganados := array_append(v_ganados, 'L17');
  END IF;

  -- L18 La más útil del curso: la más votada de su curso, con 3 votos o más
  IF EXISTS (
    SELECT 1 FROM public.resenas r
    WHERE r.user_id = p_user AND r.votos_utilidad >= 3
      AND NOT EXISTS (
        SELECT 1 FROM public.resenas o
        WHERE o.dictado_id = r.dictado_id AND o.id <> r.id
          AND (o.votos_utilidad > r.votos_utilidad
               OR (o.votos_utilidad = r.votos_utilidad AND (o.created_at < r.created_at OR (o.created_at = r.created_at AND o.id < r.id))))
      )
  ) THEN
    v_ganados := array_append(v_ganados, 'L18');
  END IF;

  FOREACH v_logro IN ARRAY v_ganados LOOP
    IF public.dar_logro(p_user, v_logro, p_avisar) THEN
      v_nuevos := v_nuevos + 1;
    END IF;
  END LOOP;
  RETURN v_nuevos;
END;
$fn$;
REVOKE ALL ON FUNCTION public.revisar_logros(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_logros(uuid, boolean) TO service_role;

-- L9 Detective: lo pide el sitio con la sesión de la persona. Solo da L9.
CREATE OR REPLACE FUNCTION public.ganar_detective()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  RETURN public.dar_logro(auth.uid(), 'L9', true);
END;
$fn$;
REVOKE ALL ON FUNCTION public.ganar_detective() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ganar_detective() TO authenticated;

-- Triggers: votar (L13), abrir un link (L8) y editar el texto (L17)
CREATE OR REPLACE FUNCTION public.logros_tras_voto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.revisar_logros(NEW.user_id, true);
  RETURN NULL;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.logros_tras_apertura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.revisar_logros((SELECT user_id FROM public.links_compartidos WHERE codigo = NEW.codigo), true);
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_logros_voto_resena ON public.votos_resenas;
CREATE TRIGGER trg_logros_voto_resena
  AFTER INSERT ON public.votos_resenas
  FOR EACH ROW EXECUTE FUNCTION public.logros_tras_voto();

DROP TRIGGER IF EXISTS trg_logros_voto_final ON public.votos_finales;
CREATE TRIGGER trg_logros_voto_final
  AFTER INSERT ON public.votos_finales
  FOR EACH ROW EXECUTE FUNCTION public.logros_tras_voto();

DROP TRIGGER IF EXISTS trg_logros_apertura ON public.aperturas_link;
CREATE TRIGGER trg_logros_apertura
  AFTER INSERT ON public.aperturas_link
  FOR EACH ROW EXECUTE FUNCTION public.logros_tras_apertura();

DROP TRIGGER IF EXISTS trg_logros_resena ON public.resenas;
CREATE TRIGGER trg_logros_resena
  AFTER INSERT OR UPDATE OF votos_utilidad, comentario ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.logros_tras_cambio();

-- Los que ya ganaron (sin aviso)
SELECT public.revisar_logros(u.user_id, false)
FROM (SELECT user_id FROM public.resenas WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM public.experiencias_finales WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM public.votos_resenas
      UNION SELECT user_id FROM public.votos_finales
      UNION SELECT user_id FROM public.links_compartidos) u;

COMMIT;

-- Verificación: triggers = 4, detective_usuario = true, detective_anon = false,
-- acepta_l20 = true, y cuántos logros nuevos se dieron a quienes ya los tenían ganados.
SELECT
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_logros_voto_resena', 'trg_logros_voto_final', 'trg_logros_apertura', 'trg_logros_resena')) AS "triggers",
  has_function_privilege('authenticated', 'public.ganar_detective()', 'EXECUTE') AS detective_usuario,
  has_function_privilege('anon', 'public.ganar_detective()', 'EXECUTE') AS detective_anon,
  (SELECT pg_get_constraintdef(oid) LIKE '%[12][0-9]%' FROM pg_constraint WHERE conname = 'logros_usuario_logro_check') AS acepta_l20,
  (SELECT count(*) FROM public.logros_usuario WHERE logro NOT IN ('L1', 'L2', 'L3', 'L4', 'L5', 'L6')) AS logros_nuevos_dados;
