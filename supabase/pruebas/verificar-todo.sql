-- =====================================================================
-- Verificar TODAS las migraciones de la etapa 3 de una vez.
-- Solo lee: no cambia nada. Se puede correr cuantas veces quieras, en la
-- base de prueba o en producción (después de migrar).
-- Resultado: una fila por prueba. La columna "ok" tiene que decir true en
-- todas. "falta" en resultado = esa migración no se corrió todavía.
-- Al sumar una migración, se suman sus filas acá.
-- =====================================================================

CREATE OR REPLACE FUNCTION pg_temp.tabla(t text) RETURNS text LANGUAGE sql AS
$$ SELECT CASE WHEN to_regclass('public.' || t) IS NULL THEN 'falta' ELSE 'está' END $$;
CREATE OR REPLACE FUNCTION pg_temp.priv(rol text, t text, p text) RETURNS text LANGUAGE sql AS
$$ SELECT CASE WHEN to_regclass('public.' || t) IS NULL THEN 'falta' ELSE has_table_privilege(rol, 'public.' || t, p)::text END $$;
CREATE OR REPLACE FUNCTION pg_temp.col(t text, c text) RETURNS text LANGUAGE sql AS
$$ SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = c) THEN 'está' ELSE 'falta' END $$;
CREATE OR REPLACE FUNCTION pg_temp.colpriv(rol text, t text, c text, p text) RETURNS text LANGUAGE sql AS
$$ SELECT CASE WHEN pg_temp.col(t, c) = 'falta' THEN 'falta' ELSE has_column_privilege(rol, 'public.' || t, c, p)::text END $$;
CREATE OR REPLACE FUNCTION pg_temp.trig(nombres text[]) RETURNS text LANGUAGE sql AS
$$ SELECT count(DISTINCT tgname)::text FROM pg_trigger WHERE tgname = ANY(nombres) AND NOT tgisinternal $$;
CREATE OR REPLACE FUNCTION pg_temp.func(firma text) RETURNS text LANGUAGE sql AS
$$ SELECT CASE WHEN to_regprocedure('public.' || firma) IS NULL THEN 'falta' ELSE 'está' END $$;
CREATE OR REPLACE FUNCTION pg_temp.ejecuta(rol text, firma text) RETURNS text LANGUAGE sql AS
$$ SELECT CASE WHEN to_regprocedure('public.' || firma) IS NULL THEN 'falta' ELSE has_function_privilege(rol, 'public.' || firma, 'EXECUTE')::text END $$;
CREATE OR REPLACE FUNCTION pg_temp.contar(t text, consulta text) RETURNS text LANGUAGE plpgsql AS
$$ DECLARE n bigint; BEGIN
  IF to_regclass('public.' || t) IS NULL THEN RETURN 'falta'; END IF;
  EXECUTE consulta INTO n; RETURN n::text;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.contiene(firma text, texto text) RETURNS text LANGUAGE plpgsql AS
$$ BEGIN
  IF to_regprocedure('public.' || firma) IS NULL THEN RETURN 'falta'; END IF;
  RETURN (strpos(pg_get_functiondef(to_regprocedure('public.' || firma)), texto) > 0)::text;
END $$;

WITH pruebas(migracion, prueba, esperado, resultado) AS (VALUES
  -- 1. Autor y anonimato en finales
  ('01 finales autor', 'columna es_anonima', 'está', pg_temp.col('experiencias_finales', 'es_anonima')),
  ('01 finales autor', 'columna nombre_usuario', 'está', pg_temp.col('experiencias_finales', 'nombre_usuario')),
  ('01 finales autor', 'vista experiencias_finales_publicas', 'está', pg_temp.tabla('experiencias_finales_publicas')),
  ('01 finales autor', 'el público NO lee la tabla (solo la vista)', 'false', pg_temp.priv('anon', 'experiencias_finales', 'SELECT')),
  -- 2. "Me sirvió" y reportes en finales
  ('02 finales votos', 'tabla votos_finales', 'está', pg_temp.tabla('votos_finales')),
  ('02 finales votos', 'tabla reportes_finales', 'está', pg_temp.tabla('reportes_finales')),
  ('02 finales votos', 'función votar_final', 'está', CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'votar_final') THEN 'está' ELSE 'falta' END),
  ('02 finales votos', 'la vista muestra votos_utilidad', 'está', pg_temp.col('experiencias_finales_publicas', 'votos_utilidad')),
  -- 3. Edición de reseñas y plan
  ('03 reseñas edición', 'vista con updated_at', 'está', pg_temp.col('resenas_publicas', 'updated_at')),
  ('03 reseñas edición', 'vista con plan', 'está', pg_temp.col('resenas_publicas', 'plan')),
  ('03 reseñas edición', 'trigger de fecha de edición', '1', pg_temp.trig(ARRAY['trg_resenas_marcar_edicion'])),
  ('03 reseñas edición', 'quien escribió puede completar "¿Cómo te fue?"', 'true', pg_temp.colpriv('authenticated', 'resenas', 'condicion_final', 'UPDATE')),
  -- 4. Moderación
  ('04 moderación', 'tabla respuestas_moderador', 'está', pg_temp.tabla('respuestas_moderador')),
  ('04 moderación', 'tabla registro_moderacion', 'está', pg_temp.tabla('registro_moderacion')),
  ('04 moderación', 'tabla palabras_marcadas', 'está', pg_temp.tabla('palabras_marcadas')),
  ('04 moderación', 'columna pedido_edicion', 'está', pg_temp.col('resenas', 'pedido_edicion')),
  ('04 moderación', 'trigger que limpia el pedido al editar', '1', pg_temp.trig(ARRAY['trg_resenas_limpiar_pedido'])),
  ('04 moderación', 'reportes automáticos', 'está', pg_temp.col('reportes_resenas', 'automatico')),
  ('04 moderación', 'el público lee las respuestas', 'true', pg_temp.priv('anon', 'respuestas_moderador', 'SELECT')),
  ('04 moderación', 'el público NO lee el registro', 'false', pg_temp.priv('anon', 'registro_moderacion', 'SELECT')),
  ('04 moderación', 'el público NO lee las palabras', 'false', pg_temp.priv('anon', 'palabras_marcadas', 'SELECT')),
  -- 5. Perfiles
  ('05 perfiles', 'tabla perfiles', 'está', pg_temp.tabla('perfiles')),
  ('05 perfiles', 'triggers del nombre', '2', pg_temp.trig(ARRAY['trg_resenas_nombre_perfil', 'trg_perfiles_propagar_nombre'])),
  ('05 perfiles', 'el público NO lee perfiles', 'false', pg_temp.priv('anon', 'perfiles', 'SELECT')),
  ('05 perfiles', 'un usuario NO puede anonimizar', 'false', pg_temp.ejecuta('authenticated', 'anonimizar_usuario(uuid)')),
  -- 6. Seguir materias
  ('06 seguir', 'tabla seguimientos', 'está', pg_temp.tabla('seguimientos')),
  ('06 seguir', 'políticas (ver, crear, cambiar, borrar)', '4', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seguimientos')),
  ('06 seguir', 'el público NO lee', 'false', pg_temp.priv('anon', 'seguimientos', 'SELECT')),
  -- 7. Avisos
  ('07 avisos', 'tabla notificaciones', 'está', pg_temp.tabla('notificaciones')),
  ('07 avisos', 'tabla preferencias_aviso', 'está', pg_temp.tabla('preferencias_aviso')),
  ('07 avisos', 'triggers que crean avisos', '4', pg_temp.trig(ARRAY['trg_avisos_resena_nueva', 'trg_avisos_final_nuevo', 'trg_avisos_resena_cambio', 'trg_avisos_respuesta_moderador'])),
  ('07 avisos', 'el público NO lee avisos', 'false', pg_temp.priv('anon', 'notificaciones', 'SELECT')),
  ('07 avisos', 'un usuario NO puede crear avisos', 'false', pg_temp.priv('authenticated', 'notificaciones', 'INSERT')),
  -- 8. Logros
  ('08 logros', 'tabla logros_usuario', 'está', pg_temp.tabla('logros_usuario')),
  ('08 logros', 'triggers que dan logros', '2', pg_temp.trig(ARRAY['trg_logros_resena', 'trg_logros_final'])),
  ('08 logros', 'el público NO lee logros', 'false', pg_temp.priv('anon', 'logros_usuario', 'SELECT')),
  ('08 logros', 'un usuario NO puede escribir foto_url', 'false', pg_temp.colpriv('authenticated', 'perfiles', 'foto_url', 'UPDATE')),
  ('08 logros', 'aviso de L4 con el nombre nuevo', 'true', pg_temp.contiene('revisar_logros(uuid,boolean)', 'Rendí y compartí mi experiencia')),
  -- 9. Bloqueo y links
  ('09 usuarios y links', 'columna bloqueado_at', 'está', pg_temp.col('perfiles', 'bloqueado_at')),
  ('09 usuarios y links', 'triggers de bloqueo', '3', pg_temp.trig(ARRAY['trg_bloqueo', 'trg_bloqueo_editar', 'trg_bloqueo_perfil'])),
  ('09 usuarios y links', 'tabla links_compartidos', 'está', pg_temp.tabla('links_compartidos')),
  ('09 usuarios y links', 'tabla aperturas_link', 'está', pg_temp.tabla('aperturas_link')),
  ('09 usuarios y links', 'el público NO lee links', 'false', pg_temp.priv('anon', 'links_compartidos', 'SELECT')),
  ('09 usuarios y links', 'un usuario NO puede bloquearse ni desbloquearse', 'false', pg_temp.colpriv('authenticated', 'perfiles', 'bloqueado_at', 'UPDATE')),
  ('09 usuarios y links', 'un usuario NO puede ver quién está bloqueado', 'false', pg_temp.ejecuta('authenticated', 'esta_bloqueado(uuid)')),
  -- 10. En línea
  ('10 en línea', 'tabla presencia', 'está', pg_temp.tabla('presencia')),
  ('10 en línea', 'función latido', 'está', pg_temp.func('latido(text)')),
  ('10 en línea', 'el público NO puede llamar a latido', 'false', pg_temp.ejecuta('anon', 'latido(text)')),
  ('10 en línea', 'el público NO lee presencia', 'false', pg_temp.priv('anon', 'presencia', 'SELECT')),
  -- 11. Historial de profesores (sin rol)
  ('11 profesores', 'sin columna rol', 'falta', pg_temp.col('dictado_profesores', 'rol')),
  ('11 profesores', 'tabla profesores_historial', 'está', pg_temp.tabla('profesores_historial')),
  ('11 profesores', 'trigger que anota el historial', '1', pg_temp.trig(ARRAY['trg_profesores_historial'])),
  ('11 profesores', 'el público lee el historial', 'true', pg_temp.priv('anon', 'profesores_historial', 'SELECT')),
  ('11 profesores', 'el público NO cambia el historial', 'false', pg_temp.priv('anon', 'profesores_historial', 'INSERT')),
  ('11 profesores', 'profes de hoy sin período abierto', '0', pg_temp.contar('profesores_historial', 'SELECT count(*) FROM public.dictado_profesores dp WHERE NOT EXISTS (SELECT 1 FROM public.profesores_historial h WHERE h.dictado_id = dp.dictado_id AND h.profesor_id = dp.profesor_id AND h.hasta_anio IS NULL)')),
  -- 12. Horarios y Mi inscripción
  ('12 horarios', 'tabla horarios', 'está', pg_temp.tabla('horarios')),
  ('12 horarios', 'el público lee los horarios', 'true', pg_temp.priv('anon', 'horarios', 'SELECT')),
  ('12 horarios', 'el público NO cambia los horarios', 'false', pg_temp.priv('authenticated', 'horarios', 'INSERT')),
  ('12 horarios', 'tabla inscripcion_cursos', 'está', pg_temp.tabla('inscripcion_cursos')),
  ('12 horarios', 'sin sesión NO se ven las listas', 'false', pg_temp.priv('anon', 'inscripcion_cursos', 'SELECT')),
  ('12 horarios', 'la materia la completa la base (no se elige)', 'false', pg_temp.colpriv('authenticated', 'inscripcion_cursos', 'materia_id', 'INSERT')),
  ('12 horarios', 'trigger que completa la materia', '1', pg_temp.trig(ARRAY['trg_inscripcion_completar'])),
  ('12 horarios', 'horarios que terminan antes de empezar', '0', pg_temp.contar('horarios', 'SELECT count(*) FROM public.horarios WHERE hasta <= desde'))
)
SELECT migracion, prueba, esperado, COALESCE(resultado, 'falta') AS resultado, COALESCE(resultado, 'falta') = esperado AS ok
FROM pruebas
ORDER BY ok, migracion;
