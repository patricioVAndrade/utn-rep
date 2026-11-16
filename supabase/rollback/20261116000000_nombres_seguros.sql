-- Vuelta atrás de supabase/migrations/20261116000000_nombres_seguros.sql
-- Saca los controles de nombre de la base (vuelve a controlarlos solo el sitio)
-- y deja nombre_de_usuario() como en la migración 5.
BEGIN;

DROP TRIGGER IF EXISTS trg_finales_nombre_autor ON public.experiencias_finales;
DROP FUNCTION IF EXISTS public.finales_nombre_autor();
DROP TRIGGER IF EXISTS trg_perfiles_controlar_nombre ON public.perfiles;
DROP FUNCTION IF EXISTS public.perfiles_controlar_nombre();

CREATE OR REPLACE FUNCTION public.nombre_de_usuario(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    (SELECT p.nombre_mostrar FROM public.perfiles p WHERE p.user_id = p_user),
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1),
    'Usuario')
  FROM auth.users u WHERE u.id = p_user;
$fn$;
REVOKE ALL ON FUNCTION public.nombre_de_usuario(uuid) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.nombre_aceptable(text);

COMMIT;
