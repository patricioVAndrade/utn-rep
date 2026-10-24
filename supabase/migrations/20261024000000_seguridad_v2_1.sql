-- =====================================================================
-- UTN REP v2.1: parche de seguridad e integridad
-- Correr UNA VEZ en Supabase (Dashboard > SQL Editor) ANTES de desplegar
-- el código de esta versión. Es idempotente: se puede volver a correr.
--
-- No borra ni modifica filas existentes: crea vistas, tablas y funciones
-- nuevas y cambia permisos. Corre en una transacción: si algo falla, no
-- se aplica nada. Para deshacerlo: supabase/rollback/20261024000000_seguridad_v2_1.sql
-- Antes de correrlo conviene correr supabase/checks/precheck_v2_1.sql.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Anonimato: vista pública de reseñas sin user_id y sin nombre real
--    cuando la reseña es anónima. La tabla base deja de ser legible con
--    la anon key; cada usuario logueado solo puede leer sus propias filas.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.resenas_publicas AS
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
  r.created_at
FROM public.resenas r;

GRANT SELECT ON public.resenas_publicas TO anon, authenticated;

-- Borra TODAS las políticas de lectura existentes de resenas (en producción
-- hay varias con USING (true): "Public read resenas", "Lectura pública",
-- "Lectura publica resenas"...). Las políticas se suman con OR, así que si
-- quedara una sola, cualquier usuario logueado seguiría leyendo todo.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'resenas' AND cmd IN ('SELECT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.resenas', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can read own resenas" ON public.resenas
  FOR SELECT USING (auth.uid() = user_id);

REVOKE SELECT ON public.resenas FROM anon;

-- Estadísticas agregadas por dictado (evita traer todas las reseñas y el
-- corte de 1000 filas de PostgREST).
CREATE OR REPLACE VIEW public.stats_dictados AS
SELECT
  d.id AS dictado_id,
  d.materia_id,
  COUNT(r.id)::int AS cantidad,
  COALESCE(AVG(r.calificacion_general), 0)::float AS promedio
FROM public.dictados d
LEFT JOIN public.resenas r ON r.dictado_id = d.id
GROUP BY d.id, d.materia_id;

GRANT SELECT ON public.stats_dictados TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Integridad: el usuario solo puede escribir las columnas que le
--    corresponden. Votos, nombre y verificación UTN los pone la base.
-- ---------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.resenas FROM anon, authenticated;
GRANT INSERT (dictado_id, calificacion_general, anio_cursado, comentario,
              user_id, es_anonima, condicion_final)
  ON public.resenas TO authenticated;
GRANT UPDATE (comentario) ON public.resenas TO authenticated;

CREATE OR REPLACE FUNCTION public.resenas_completar_autor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_meta jsonb;
BEGIN
  -- Inserciones hechas con la service role (admin/ETL) se respetan tal cual.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.email, u.raw_user_meta_data INTO v_email, v_meta
  FROM auth.users u WHERE u.id = auth.uid();

  NEW.user_id := auth.uid();
  NEW.votos_utilidad := 0;
  NEW.nombre_usuario := COALESCE(
    NULLIF(v_meta->>'full_name', ''),
    NULLIF(v_meta->>'name', ''),
    split_part(v_email, '@', 1),
    'Usuario'
  );
  NEW.es_alumno_utn := COALESCE(
    v_email ILIKE '%@frc.utn.edu.ar'
    OR v_email ILIKE '%.frc.utn.edu.ar'
    OR v_email ILIKE '%@utn.edu.ar',
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resenas_completar_autor ON public.resenas;
CREATE TRIGGER trg_resenas_completar_autor
  BEFORE INSERT ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.resenas_completar_autor();

-- Constraints de contenido. NOT VALID: no revisan filas viejas (por si
-- alguna edición de admin quedó fuera de rango), sí todas las nuevas.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resenas_calificacion_rango') THEN
    ALTER TABLE public.resenas ADD CONSTRAINT resenas_calificacion_rango
      CHECK (calificacion_general BETWEEN 1 AND 5) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resenas_comentario_largo') THEN
    ALTER TABLE public.resenas ADD CONSTRAINT resenas_comentario_largo
      CHECK (char_length(comentario) BETWEEN 3 AND 2000) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resenas_anio_rango') THEN
    ALTER TABLE public.resenas ADD CONSTRAINT resenas_anio_rango
      CHECK (anio_cursado BETWEEN 2000 AND 2100) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resenas_condicion_valida') THEN
    ALTER TABLE public.resenas ADD CONSTRAINT resenas_condicion_valida
      CHECK (condicion_final IS NULL OR condicion_final IN ('PROMOCIONADO', 'REGULAR', 'LIBRE')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resenas_votos_no_negativos') THEN
    ALTER TABLE public.resenas ADD CONSTRAINT resenas_votos_no_negativos
      CHECK (votos_utilidad >= 0) NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. Votos de utilidad: uno por usuario y reseña, con login.
--    votos_utilidad sigue siendo el contador (conserva los votos viejos)
--    y solo lo mueve esta función.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.votos_resenas (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resena_id INTEGER NOT NULL REFERENCES public.resenas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, resena_id)
);

ALTER TABLE public.votos_resenas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own votos" ON public.votos_resenas;
CREATE POLICY "Users read own votos" ON public.votos_resenas
  FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.votos_resenas FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.votar_resena(p_resena_id integer, p_votar boolean)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows int;
  v_votos int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_votar THEN
    INSERT INTO votos_resenas (user_id, resena_id)
    VALUES (v_uid, p_resena_id)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      UPDATE resenas SET votos_utilidad = COALESCE(votos_utilidad, 0) + 1
      WHERE id = p_resena_id;
    END IF;
  ELSE
    DELETE FROM votos_resenas WHERE user_id = v_uid AND resena_id = p_resena_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      UPDATE resenas SET votos_utilidad = GREATEST(COALESCE(votos_utilidad, 0) - 1, 0)
      WHERE id = p_resena_id;
    END IF;
  END IF;

  SELECT votos_utilidad INTO v_votos FROM resenas WHERE id = p_resena_id;
  RETURN COALESCE(v_votos, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.votar_resena(integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.votar_resena(integer, boolean) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Rate limiting compartido entre instancias serverless.
--    Solo lo usa el servidor con la service role.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO rate_limits AS rl (key, count, reset_at)
  VALUES (p_key, 1, NOW() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN rl.reset_at < NOW() THEN 1 ELSE rl.count + 1 END,
        reset_at = CASE WHEN rl.reset_at < NOW()
                        THEN NOW() + make_interval(secs => p_window_seconds)
                        ELSE rl.reset_at END
  RETURNING count INTO v_count;

  -- Limpieza ocasional de claves vencidas
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE reset_at < NOW() - INTERVAL '1 day';
  END IF;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------
-- 5. Experiencias de finales: límites de largo (se escriben desde el
--    servidor con la service role, esto es una segunda barrera).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finales_comentario_largo') THEN
    ALTER TABLE public.experiencias_finales ADD CONSTRAINT finales_comentario_largo
      CHECK (char_length(comentario) BETWEEN 10 AND 1000) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finales_mesa_largo') THEN
    ALTER TABLE public.experiencias_finales ADD CONSTRAINT finales_mesa_largo
      CHECK (char_length(mesa) <= 100) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finales_profesor_largo') THEN
    ALTER TABLE public.experiencias_finales ADD CONSTRAINT finales_profesor_largo
      CHECK (profesor_nombre IS NULL OR char_length(profesor_nombre) <= 120) NOT VALID;
  END IF;
END $$;

COMMIT;
