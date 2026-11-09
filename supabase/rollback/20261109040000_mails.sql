-- Vuelta atrás de supabase/migrations/20261109040000_mails.sql
-- Borra el registro de mails y sus funciones. Los avisos quedan como estaban
-- (los que ya salieron por mail conservan mail_enviado_at, que es de la migración 7).
BEGIN;
DROP FUNCTION IF EXISTS public.marcar_mail_enviado(uuid, bigint[]);
DROP FUNCTION IF EXISTS public.mails_pendientes(integer, integer);
DROP FUNCTION IF EXISTS public.presupuesto_mails(integer, integer, integer);
DROP FUNCTION IF EXISTS public.anotar_mail_login(integer);
DROP FUNCTION IF EXISTS public.quiere_mail(uuid, text);
DROP FUNCTION IF EXISTS public.inicio_dia_mails();
DROP TABLE IF EXISTS public.mails_enviados;
COMMIT;
