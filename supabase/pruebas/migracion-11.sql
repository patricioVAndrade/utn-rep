-- =====================================================================
-- Prueba de la migración 11 (historial de profesores) CON DATOS.
-- Usa un curso y un profe que ya existen, hace cambios y al final los
-- DESHACE: la base queda igual que antes.
-- Correr DESPUÉS de la migración 11. Tiene que terminar con
-- "TODO OK: migración 11". Si algo falla, sale el error con el número
-- de la prueba (por ejemplo "3: esperaba 1 período cerrado").
-- =====================================================================

CREATE TEMP TABLE IF NOT EXISTS resultado_prueba (texto text);
TRUNCATE resultado_prueba;

DO $prueba$
DECLARE
  v_dictado bigint;
  v_profe bigint;
  v_n integer;
  v_r record;
BEGIN
 BEGIN
  -- Un curso y un profe que NO estén juntos todavía
  SELECT d.id, p.id INTO v_dictado, v_profe
  FROM public.dictados d CROSS JOIN public.profesores p
  WHERE NOT EXISTS (SELECT 1 FROM public.dictado_profesores dp WHERE dp.dictado_id = d.id AND dp.profesor_id = p.id)
  LIMIT 1;
  IF v_dictado IS NULL THEN RAISE EXCEPTION 'No encontré un curso y un profe para probar'; END IF;

  -- 1. Al asignarlo, se abre un período (sin fecha de fin)
  INSERT INTO public.dictado_profesores (dictado_id, profesor_id) VALUES (v_dictado, v_profe);
  SELECT count(*) INTO v_n FROM public.profesores_historial
   WHERE dictado_id = v_dictado AND profesor_id = v_profe AND hasta_anio IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION '1: esperaba 1 período abierto, hay %', v_n; END IF;
  SELECT * INTO v_r FROM public.profesores_historial WHERE dictado_id = v_dictado AND profesor_id = v_profe;
  IF v_r.desde_anio <> extract(year FROM now() AT TIME ZONE 'America/Argentina/Cordoba') OR v_r.desde_cuatri NOT IN (1, 2) THEN
    RAISE EXCEPTION '1: el período empieza mal (% / %)', v_r.desde_anio, v_r.desde_cuatri;
  END IF;

  -- 2. Ya no hay rol: solo el historial
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dictado_profesores' AND column_name = 'rol') THEN
    RAISE EXCEPTION '2: dictado_profesores todavía tiene la columna rol';
  END IF;

  -- 3. Al sacarlo, el período se cierra (no se borra)
  DELETE FROM public.dictado_profesores WHERE dictado_id = v_dictado AND profesor_id = v_profe;
  SELECT count(*) INTO v_n FROM public.profesores_historial
   WHERE dictado_id = v_dictado AND profesor_id = v_profe AND hasta_anio IS NOT NULL AND hasta_cuatri IN (1, 2);
  IF v_n <> 1 THEN RAISE EXCEPTION '3: esperaba 1 período cerrado, hay %', v_n; END IF;

  -- 4. Si vuelve, se abre otro período y el viejo queda
  INSERT INTO public.dictado_profesores (dictado_id, profesor_id) VALUES (v_dictado, v_profe);
  SELECT count(*) INTO v_n FROM public.profesores_historial WHERE dictado_id = v_dictado AND profesor_id = v_profe;
  IF v_n <> 2 THEN RAISE EXCEPTION '4: esperaba 2 períodos, hay %', v_n; END IF;

  -- 5. Todo lo que está asignado hoy tiene su período abierto
  SELECT count(*) INTO v_n FROM public.dictado_profesores dp
   WHERE NOT EXISTS (SELECT 1 FROM public.profesores_historial h
                      WHERE h.dictado_id = dp.dictado_id AND h.profesor_id = dp.profesor_id AND h.hasta_anio IS NULL);
  IF v_n <> 0 THEN RAISE EXCEPTION '5: hay % asignaciones sin período abierto', v_n; END IF;

  -- 6. El público lee el historial pero no lo puede cambiar
  IF NOT has_table_privilege('anon', 'public.profesores_historial', 'SELECT') THEN RAISE EXCEPTION '6: el público no lo puede leer'; END IF;
  IF has_table_privilege('anon', 'public.profesores_historial', 'INSERT') OR has_table_privilege('authenticated', 'public.profesores_historial', 'UPDATE') THEN
    RAISE EXCEPTION '6: alguien de afuera lo puede cambiar';
  END IF;

  -- Todo bien: este error a propósito deshace los cambios de prueba
  RAISE EXCEPTION 'fin' USING ERRCODE = 'PT001';
 EXCEPTION WHEN SQLSTATE 'PT001' THEN
  INSERT INTO resultado_prueba VALUES ('TODO OK: migración 11 (los cambios de prueba se deshicieron)');
 END;
END $prueba$;

SELECT COALESCE((SELECT texto FROM resultado_prueba), 'FALLÓ: mirá el error') AS resultado;
