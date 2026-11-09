-- =====================================================================
-- Prueba de la migración 13 (sumar el final a tu reseña) CON DATOS.
-- Crea reseñas y finales de prueba con dos cuentas y al final los DESHACE:
-- la base queda igual que antes.
-- Correr DESPUÉS de la migración 13. Tiene que terminar con
-- "TODO OK: migración 13". Si algo falla, sale el error con el número
-- de la prueba (por ejemplo "3: sumó el final de otra persona").
-- =====================================================================

CREATE TEMP TABLE IF NOT EXISTS resultado_prueba (texto text);
TRUNCATE resultado_prueba;
GRANT ALL ON resultado_prueba TO authenticated, anon;

DO $prueba$
DECLARE
  v_a uuid;
  v_b uuid;
  v_d1 integer;     -- curso de la materia M
  v_d2 integer;     -- otro curso de la materia M
  v_dx integer;     -- curso de otra materia
  v_m integer;
  v_r1 integer;     -- reseñas de A
  v_r2 integer;
  v_rb integer;     -- reseña de B
  v_fa text;        -- final de A en la materia M
  v_fa2 text;       -- final de A en otra materia
  v_fb text;        -- final de B en la materia M
  v_n integer;
  v_t text;
BEGIN
 BEGIN
  SELECT id INTO v_a FROM auth.users ORDER BY id LIMIT 1;
  SELECT id INTO v_b FROM auth.users WHERE id <> v_a ORDER BY id LIMIT 1;
  IF v_b IS NULL THEN RAISE EXCEPTION 'Hacen falta dos cuentas para probar'; END IF;
  SELECT d1.id, d2.id, d1.materia_id INTO v_d1, v_d2, v_m
  FROM public.dictados d1 JOIN public.dictados d2 ON d2.materia_id = d1.materia_id AND d2.id > d1.id LIMIT 1;
  SELECT id INTO v_dx FROM public.dictados WHERE materia_id <> v_m LIMIT 1;
  IF v_d1 IS NULL OR v_dx IS NULL THEN RAISE EXCEPTION 'Hacen falta dos cursos de una materia y uno de otra'; END IF;

  -- Datos de prueba (se borran al final)
  INSERT INTO public.resenas (dictado_id, calificacion_general, anio_cursado, comentario, user_id, es_anonima)
    VALUES (v_d1, 4, 2026, 'Prueba de la migración 13, se borra sola.', v_a, true) RETURNING id INTO v_r1;
  INSERT INTO public.resenas (dictado_id, calificacion_general, anio_cursado, comentario, user_id, es_anonima)
    VALUES (v_d2, 4, 2025, 'Prueba de la migración 13, se borra sola.', v_a, true) RETURNING id INTO v_r2;
  INSERT INTO public.resenas (dictado_id, calificacion_general, anio_cursado, comentario, user_id, es_anonima)
    VALUES (v_d1, 3, 2026, 'Prueba de la migración 13, se borra sola.', v_b, true) RETURNING id INTO v_rb;
  INSERT INTO public.experiencias_finales (user_id, materia_id, anio, mesa, comentario)
    VALUES (v_a, v_m, 2026, 'Julio', 'Prueba de la migración 13') RETURNING id::text INTO v_fa;
  INSERT INTO public.experiencias_finales (user_id, materia_id, anio, mesa, comentario)
    VALUES (v_a, (SELECT materia_id FROM public.dictados WHERE id = v_dx), 2026, 'Julio', 'Prueba de la migración 13') RETURNING id::text INTO v_fa2;
  INSERT INTO public.experiencias_finales (user_id, materia_id, anio, mesa, comentario)
    VALUES (v_b, v_m, 2026, 'Diciembre', 'Prueba de la migración 13') RETURNING id::text INTO v_fb;

  -- Desde acá, como la persona A (con sesión)
  PERFORM set_config('request.jwt.claim.sub', v_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- 1. Suma su final de la misma materia a su reseña, y no cuenta como "Editada"
  EXECUTE format('UPDATE public.resenas SET final_id = %L WHERE id = %s', v_fa, v_r1);
  SELECT count(*) INTO v_n FROM public.resenas WHERE id = v_r1 AND final_id::text = v_fa AND updated_at IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION '1: no sumó el final propio (o lo marcó como editada)'; END IF;

  -- 2. Un final de otra materia no entra
  BEGIN
    EXECUTE format('UPDATE public.resenas SET final_id = %L WHERE id = %s', v_fa2, v_r2);
    RAISE EXCEPTION '2: sumó un final de otra materia';
  EXCEPTION WHEN SQLSTATE 'FN001' THEN NULL;
  END;

  -- 3. El final de otra persona no entra
  BEGIN
    EXECUTE format('UPDATE public.resenas SET final_id = %L WHERE id = %s', v_fb, v_r2);
    RAISE EXCEPTION '3: sumó el final de otra persona';
  EXCEPTION WHEN SQLSTATE 'FN001' THEN NULL;
  END;

  -- 4. El mismo final no va en dos reseñas
  BEGIN
    EXECUTE format('UPDATE public.resenas SET final_id = %L WHERE id = %s', v_fa, v_r2);
    RAISE EXCEPTION '4: el mismo final quedó en dos reseñas';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- 5. No toca la reseña de otra persona (RLS: no la ve para cambiarla)
  EXECUTE format('UPDATE public.resenas SET final_id = NULL WHERE id = %s', v_rb);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN RAISE EXCEPTION '5: cambió la reseña de otra persona'; END IF;

  -- 6. La vista pública dice la mesa y el año, no cuál es el final
  SELECT final_mesa || ' ' || final_anio INTO v_t FROM public.resenas_publicas WHERE id = v_r1;
  IF v_t IS DISTINCT FROM 'Julio 2026' THEN RAISE EXCEPTION '6: la vista no muestra la mesa (%)', v_t; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resenas_publicas' AND column_name = 'final_id') THEN
    RAISE EXCEPTION '6: la vista muestra cuál es el final';
  END IF;

  -- 7. Lo puede sacar
  EXECUTE format('UPDATE public.resenas SET final_id = NULL WHERE id = %s', v_r1);
  SELECT count(*) INTO v_n FROM public.resenas WHERE id = v_r1 AND final_id IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION '7: no lo pudo sacar'; END IF;
  RESET ROLE;

  -- 8. Si se borra el final, la reseña queda sin final (no se borra)
  EXECUTE format('UPDATE public.resenas SET final_id = %L WHERE id = %s', v_fa, v_r1);
  EXECUTE format('DELETE FROM public.experiencias_finales WHERE id::text = %L', v_fa);
  SELECT count(*) INTO v_n FROM public.resenas WHERE id = v_r1 AND final_id IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION '8: borrar el final se llevó la reseña'; END IF;

  -- Todo bien: este error a propósito deshace los cambios de prueba
  RAISE EXCEPTION 'fin' USING ERRCODE = 'PT001';
 EXCEPTION WHEN SQLSTATE 'PT001' THEN
  INSERT INTO resultado_prueba VALUES ('TODO OK: migración 13 (los cambios de prueba se deshicieron)');
 END;
END $prueba$;

SELECT COALESCE((SELECT texto FROM resultado_prueba), 'FALLÓ: mirá el error') AS resultado;
