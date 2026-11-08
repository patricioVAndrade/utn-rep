-- =====================================================================
-- Prueba de la migración 12 (horarios y Mi inscripción) CON DATOS.
-- Usa dos cuentas y cursos que ya existen, hace cambios y al final los
-- DESHACE: la base queda igual que antes.
-- Correr DESPUÉS de la migración 12. Tiene que terminar con
-- "TODO OK: migración 12". Si algo falla, sale el error con el número
-- de la prueba (por ejemplo "4: otra persona ve tu lista").
-- =====================================================================

CREATE TEMP TABLE IF NOT EXISTS resultado_prueba (texto text);
TRUNCATE resultado_prueba;
GRANT ALL ON resultado_prueba TO authenticated, anon;

DO $prueba$
DECLARE
  v_a uuid;
  v_b uuid;
  v_d1 integer;
  v_d2 integer;
  v_materia integer;
  v_n integer;
BEGIN
 BEGIN
  SELECT id INTO v_a FROM auth.users ORDER BY id LIMIT 1;
  SELECT id INTO v_b FROM auth.users WHERE id <> v_a ORDER BY id LIMIT 1;
  IF v_b IS NULL THEN RAISE EXCEPTION 'Hacen falta dos cuentas para probar'; END IF;
  -- Dos cursos de la misma materia
  SELECT d1.id, d2.id, d1.materia_id INTO v_d1, v_d2, v_materia
  FROM public.dictados d1 JOIN public.dictados d2 ON d2.materia_id = d1.materia_id AND d2.id > d1.id
  LIMIT 1;
  IF v_d1 IS NULL THEN RAISE EXCEPTION 'No encontré dos cursos de la misma materia'; END IF;

  -- 1. Un horario se guarda; uno al revés (termina antes de empezar) o un domingo, no
  INSERT INTO public.horarios (dictado_id, cuatri, dia, desde, hasta) VALUES (v_d1, 1, 1, '08:00', '10:25');
  BEGIN
    INSERT INTO public.horarios (dictado_id, dia, desde, hasta) VALUES (v_d1, 2, '10:00', '09:00');
    RAISE EXCEPTION '1: aceptó un horario que termina antes de empezar';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.horarios (dictado_id, dia, desde, hasta) VALUES (v_d1, 7, '10:00', '11:00');
    RAISE EXCEPTION '1: aceptó el domingo';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 2. El mismo bloque dos veces no entra
  BEGIN
    INSERT INTO public.horarios (dictado_id, cuatri, dia, desde, hasta) VALUES (v_d1, 1, 1, '08:00', '09:30');
    RAISE EXCEPTION '2: aceptó el mismo bloque dos veces';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- Desde acá, como la persona A (con sesión)
  PERFORM set_config('request.jwt.claim.sub', v_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- 3. Agrega un curso: la materia la completa la base
  INSERT INTO public.inscripcion_cursos (user_id, dictado_id) VALUES (v_a, v_d1);
  SELECT count(*) INTO v_n FROM public.inscripcion_cursos WHERE user_id = v_a AND dictado_id = v_d1 AND materia_id = v_materia;
  IF v_n <> 1 THEN RAISE EXCEPTION '3: la materia no se completó sola'; END IF;
  BEGIN
    INSERT INTO public.inscripcion_cursos (user_id, dictado_id, materia_id) VALUES (v_a, v_d2, 999999);
    RAISE EXCEPTION '3: dejó elegir la materia a mano';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 4. No puede agregar en la lista de otra persona
  BEGIN
    INSERT INTO public.inscripcion_cursos (user_id, dictado_id) VALUES (v_b, v_d1);
    RAISE EXCEPTION '4: agregó en la lista de otra persona';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 5. Un solo elegido por materia
  INSERT INTO public.inscripcion_cursos (user_id, dictado_id) VALUES (v_a, v_d2);
  UPDATE public.inscripcion_cursos SET elegido = true WHERE user_id = v_a AND dictado_id = v_d1;
  BEGIN
    UPDATE public.inscripcion_cursos SET elegido = true WHERE user_id = v_a AND dictado_id = v_d2;
    RAISE EXCEPTION '5: dejó dos elegidos en la misma materia';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- 6. Los horarios los lee, pero no los cambia
  SELECT count(*) INTO v_n FROM public.horarios WHERE dictado_id = v_d1;
  IF v_n < 1 THEN RAISE EXCEPTION '6: no ve los horarios'; END IF;
  BEGIN
    INSERT INTO public.horarios (dictado_id, dia, desde, hasta) VALUES (v_d1, 3, '08:00', '09:00');
    RAISE EXCEPTION '6: una persona cambió los horarios';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 7. Otra persona (B) no ve la lista de A
  PERFORM set_config('request.jwt.claim.sub', v_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_n FROM public.inscripcion_cursos WHERE user_id = v_a;
  IF v_n <> 0 THEN RAISE EXCEPTION '7: otra persona ve tu lista'; END IF;
  RESET ROLE;

  -- 8. Sin sesión no se ve ninguna lista
  IF has_table_privilege('anon', 'public.inscripcion_cursos', 'SELECT') THEN RAISE EXCEPTION '8: sin sesión se ven las listas'; END IF;

  -- Todo bien: este error a propósito deshace los cambios de prueba
  RAISE EXCEPTION 'fin' USING ERRCODE = 'PT001';
 EXCEPTION WHEN SQLSTATE 'PT001' THEN
  INSERT INTO resultado_prueba VALUES ('TODO OK: migración 12 (los cambios de prueba se deshicieron)');
 END;
END $prueba$;

SELECT COALESCE((SELECT texto FROM resultado_prueba), 'FALLÓ: mirá el error') AS resultado;
