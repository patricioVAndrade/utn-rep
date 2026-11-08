-- Vuelta atrás de la migración 12 (horarios y Mi inscripción).
-- Borra los horarios cargados y las listas de "Lo estoy pensando".
-- No toca cursos, materias ni reseñas.
BEGIN;
DROP TABLE IF EXISTS public.inscripcion_cursos;
DROP FUNCTION IF EXISTS public.inscripcion_completar();
DROP TABLE IF EXISTS public.horarios;
COMMIT;
