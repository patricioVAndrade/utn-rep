-- =====================================================================
-- Chequeo previo a la migración v2.1. SOLO LECTURA: no cambia nada.
-- Correr en el SQL Editor de Supabase y revisar cada resultado.
-- =====================================================================

-- 1. Columnas reales de las tablas que toca la migración.
--    La migración asume en resenas: id, dictado_id, calificacion_general,
--    anio_cursado, comentario, user_id, nombre_usuario, es_alumno_utn,
--    es_anonima, condicion_final, votos_utilidad, created_at.
--    Cualquier otra columna NOT NULL sin default rompería los INSERT.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('resenas', 'experiencias_finales')
ORDER BY table_name, ordinal_position;

-- 2. Cantidad de filas (para comparar antes y después de migrar).
SELECT
  (SELECT COUNT(*) FROM public.resenas) AS resenas,
  (SELECT COUNT(*) FROM public.resenas WHERE es_anonima) AS resenas_anonimas,
  (SELECT COALESCE(SUM(votos_utilidad), 0) FROM public.resenas) AS votos_totales,
  (SELECT COUNT(*) FROM public.experiencias_finales) AS finales,
  (SELECT COUNT(*) FROM auth.users) AS usuarios;

-- 3. Filas existentes que NO cumplirían los constraints nuevos.
--    Se agregan como NOT VALID, así que estas filas NO se borran ni bloquean
--    la migración; solo conviene saber si existen.
SELECT 'calificacion fuera de 1..5' AS problema, COUNT(*) FROM public.resenas WHERE calificacion_general NOT BETWEEN 1 AND 5
UNION ALL SELECT 'comentario fuera de 3..2000', COUNT(*) FROM public.resenas WHERE char_length(comentario) NOT BETWEEN 3 AND 2000
UNION ALL SELECT 'anio_cursado fuera de 2000..2100', COUNT(*) FROM public.resenas WHERE anio_cursado NOT BETWEEN 2000 AND 2100
UNION ALL SELECT 'condicion_final desconocida', COUNT(*) FROM public.resenas WHERE condicion_final IS NOT NULL AND condicion_final::text NOT IN ('PROMOCIONADO', 'REGULAR', 'LIBRE')
UNION ALL SELECT 'votos negativos', COUNT(*) FROM public.resenas WHERE votos_utilidad < 0
UNION ALL SELECT 'final comentario fuera de 10..1000', COUNT(*) FROM public.experiencias_finales WHERE char_length(comentario) NOT BETWEEN 10 AND 1000
UNION ALL SELECT 'final mesa > 100', COUNT(*) FROM public.experiencias_finales WHERE char_length(mesa) > 100
UNION ALL SELECT 'final profesor > 120', COUNT(*) FROM public.experiencias_finales WHERE char_length(profesor_nombre) > 120;

-- 4. Políticas RLS actuales de resenas (la migración reemplaza "Public read resenas").
SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'resenas';

-- 5. Triggers existentes en resenas (para que no choquen con el nuevo).
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.resenas'::regclass AND NOT tgisinternal;

-- 6. Objetos con el mismo nombre que ya existan (deberían salir vacíos o
--    ser de una corrida anterior de esta misma migración).
SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('resenas_publicas', 'stats_dictados', 'votos_resenas', 'rate_limits');
