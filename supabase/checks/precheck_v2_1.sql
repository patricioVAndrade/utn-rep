-- =====================================================================
-- Chequeo previo a la migración v2.1. SOLO LECTURA: no cambia nada.
-- Es una sola consulta (el SQL Editor de Supabase muestra solo el último
-- resultado). Correrla entera y copiar la tabla que devuelve.
-- =====================================================================
SELECT tipo, detalle FROM (
  -- Columnas reales de las tablas que toca la migración
  SELECT 1 AS orden, 'columna' AS tipo,
         table_name || '.' || column_name || ' ' || data_type
         || ' nullable=' || is_nullable || ' default=' || COALESCE(column_default, '-') AS detalle
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name IN ('resenas', 'experiencias_finales')

  -- Cantidad de filas (para comparar antes y después)
  UNION ALL SELECT 2, 'conteo',
    'resenas=' || (SELECT COUNT(*) FROM public.resenas)
    || ' anonimas=' || (SELECT COUNT(*) FROM public.resenas WHERE es_anonima)
    || ' votos=' || (SELECT COALESCE(SUM(votos_utilidad), 0) FROM public.resenas)
    || ' finales=' || (SELECT COUNT(*) FROM public.experiencias_finales)
    || ' usuarios=' || (SELECT COUNT(*) FROM auth.users)

  -- Filas viejas que no cumplirían los constraints nuevos (no se borran)
  UNION ALL SELECT 3, 'fuera de regla', 'calificacion fuera de 1..5: ' || COUNT(*) FROM public.resenas WHERE calificacion_general NOT BETWEEN 1 AND 5
  UNION ALL SELECT 3, 'fuera de regla', 'comentario fuera de 3..2000: ' || COUNT(*) FROM public.resenas WHERE char_length(comentario) NOT BETWEEN 3 AND 2000
  UNION ALL SELECT 3, 'fuera de regla', 'anio_cursado fuera de 2000..2100: ' || COUNT(*) FROM public.resenas WHERE anio_cursado NOT BETWEEN 2000 AND 2100
  UNION ALL SELECT 3, 'fuera de regla', 'condicion_final desconocida: ' || COUNT(*) FROM public.resenas WHERE condicion_final IS NOT NULL AND condicion_final::text NOT IN ('PROMOCIONADO', 'REGULAR', 'LIBRE')
  UNION ALL SELECT 3, 'fuera de regla', 'votos negativos: ' || COUNT(*) FROM public.resenas WHERE votos_utilidad < 0
  UNION ALL SELECT 3, 'fuera de regla', 'final comentario fuera de 10..1000: ' || COUNT(*) FROM public.experiencias_finales WHERE char_length(comentario) NOT BETWEEN 10 AND 1000
  UNION ALL SELECT 3, 'fuera de regla', 'final mesa > 100: ' || COUNT(*) FROM public.experiencias_finales WHERE char_length(mesa) > 100
  UNION ALL SELECT 3, 'fuera de regla', 'final profesor > 120: ' || COUNT(*) FROM public.experiencias_finales WHERE char_length(profesor_nombre) > 120

  -- Triggers existentes en resenas
  UNION ALL SELECT 4, 'trigger', tgname::text FROM pg_trigger
    WHERE tgrelid = 'public.resenas'::regclass AND NOT tgisinternal

  -- Objetos con el mismo nombre que ya existan
  UNION ALL SELECT 5, 'ya existe', c.relname::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('resenas_publicas', 'stats_dictados', 'votos_resenas', 'rate_limits')
) t
ORDER BY orden, detalle;
