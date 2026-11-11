-- =====================================================================
-- Contraseña para el "Ingreso de prueba" de Preview (docs/INGRESO-CON-MAIL.md)
-- SOLO EN LA BASE DE PRUEBA. No correr en producción: ahí nadie tiene
-- contraseña y el ingreso de prueba no existe.
-- Se corre de a un paso, en el SQL Editor de Supabase. La contraseña la
-- escribís vos ahí; no la pegues en el chat ni la guardes en el repositorio.
-- =====================================================================

-- 1. Qué cuentas hay y cómo quedó escrito cada mail
SELECT id, email, email_confirmed_at IS NOT NULL AS confirmada,
       COALESCE(encrypted_password, '') <> '' AS tiene_clave
FROM auth.users
ORDER BY created_at;

-- 2. Ponerle contraseña a tu cuenta. Cambiá las dos cosas en mayúsculas.
--    El mail va tal cual salió en el paso 1. Tiene que decir "UPDATE 1".
UPDATE auth.users
SET encrypted_password = extensions.crypt('ACA-TU-CLAVE-DE-PRUEBA', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'ACA-TU-MAIL';

-- 3. (Si hace falta) Sacar el bloqueo de "Demasiados intentos" del sitio
--    para pedir links por mail. No cambia el tope propio de Supabase.
DELETE FROM public.rate_limits WHERE key LIKE 'magic-link%';

-- Para sacarle la contraseña a la cuenta:
-- UPDATE auth.users SET encrypted_password = '' WHERE email = 'ACA-TU-MAIL';
