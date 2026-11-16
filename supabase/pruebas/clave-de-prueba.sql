-- =====================================================================
-- Contraseña para el "Ingreso de prueba" de Preview (docs/INGRESO-DE-PRUEBA.md)
-- SOLO EN LA BASE DE PRUEBA. No correr en producción.
--
-- Cómo se usa: pegá TODO esto en el SQL Editor de Supabase, cambiá las dos
-- líneas marcadas con <<< y tocá Run. Abajo aparece una tabla de una fila
-- que dice si quedó o qué faltó.
-- La contraseña la inventás y la escribís vos acá (8 caracteres o más).
-- No la pegues en el chat ni la guardes en el repositorio.
-- =====================================================================
WITH datos AS (
  SELECT
    'tu-mail@gmail.com'::text AS mail,   -- <<< 1. tu mail, entre las comillas
    'CAMBIAR'::text           AS clave   -- <<< 2. la contraseña que quieras, entre las comillas
),
cambiada AS (
  UPDATE auth.users u
  SET encrypted_password = extensions.crypt(d.clave, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(u.email_confirmed_at, now())
  FROM datos d
  WHERE d.clave <> 'CAMBIAR'
    AND length(d.clave) >= 8
    AND (
      lower(u.email) = lower(trim(d.mail))
      -- Gmail: el sitio guarda el mail sin puntos y sin lo que sigue al "+"
      OR (lower(u.email) LIKE '%@gmail.com' AND lower(trim(d.mail)) LIKE '%@gmail.com'
          AND replace(split_part(lower(u.email), '@', 1), '.', '')
            = replace(split_part(split_part(lower(trim(d.mail)), '@', 1), '+', 1), '.', ''))
    )
  RETURNING u.id, u.email
)
SELECT
  CASE
    WHEN (SELECT clave FROM datos) = 'CAMBIAR' THEN 'FALTA: cambiá CAMBIAR por tu contraseña (línea 2) y tocá Run de nuevo'
    WHEN length((SELECT clave FROM datos)) < 8 THEN 'FALTA: la contraseña tiene que tener 8 caracteres o más'
    WHEN (SELECT count(*) FROM cambiada) = 0 THEN 'NO HAY CUENTA CON ESE MAIL: copiá uno de la columna cuentas_que_hay en la línea 1 y tocá Run de nuevo'
    ELSE 'LISTO: ya podés entrar con ese mail y esa contraseña'
  END AS resultado,
  (SELECT string_agg(email, ', ') FROM cambiada) AS mail_para_entrar,
  (SELECT string_agg(id::text, ', ') FROM cambiada) AS id_de_la_cuenta,
  (SELECT string_agg(email, ', ' ORDER BY created_at) FROM auth.users) AS cuentas_que_hay;
