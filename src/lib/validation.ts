import { z } from 'astro/zod';

const comentario = (min: number, max: number) =>
  z.string({ required_error: `El comentario debe tener al menos ${min} caracteres.`, invalid_type_error: `El comentario debe tener al menos ${min} caracteres.` })
    .trim()
    .min(min, `El comentario debe tener al menos ${min} caracteres.`)
    .max(max, `El comentario no puede superar los ${max} caracteres.`);

const id = (mensaje: string) =>
  z.coerce.number({ invalid_type_error: mensaje }).int(mensaje).positive(mensaje);

export const CONDICIONES_FINALES = ['PROMOCIONADO', 'REGULAR', 'LIBRE'] as const;

export function resenaCreateSchema(currentYear = new Date().getFullYear()) {
  return z.object({
    dictado_id: z.number({ required_error: 'Dictado inválido.', invalid_type_error: 'Dictado inválido.' }).int('Dictado inválido.').positive('Dictado inválido.'),
    calificacion_general: z.number({ required_error: 'Calificación debe ser entre 1 y 5.', invalid_type_error: 'Calificación debe ser entre 1 y 5.' })
      .int('Calificación debe ser entre 1 y 5.').min(1, 'Calificación debe ser entre 1 y 5.').max(5, 'Calificación debe ser entre 1 y 5.'),
    anio_cursado: z.number({ required_error: 'Año de cursado inválido.', invalid_type_error: 'Año de cursado inválido.' })
      .int('Año de cursado inválido.').min(currentYear - 10, 'Año de cursado inválido.').max(currentYear, 'Año de cursado inválido.'),
    comentario: comentario(10, 2000),
    es_anonima: z.boolean().optional().default(false),
    condicion_final: z.enum(CONDICIONES_FINALES, { errorMap: () => ({ message: 'Condición final inválida.' }) })
      .nullish()
      .or(z.literal('').transform(() => null))
      .transform((v) => v ?? null),
  });
}

export const resenaEditSchema = z.object({
  comentario: comentario(10, 2000),
});

export const reporteSchema = z.object({
  resena_id: z.number({ required_error: 'ID de reseña inválido.', invalid_type_error: 'ID de reseña inválido.' }).int('ID de reseña inválido.').positive('ID de reseña inválido.'),
  motivo: z.string().trim().max(500).optional().nullable()
    .transform((v) => (v ? v : null)),
});

export const votoSchema = z.object({
  resena_id: id('Falta el ID de la reseña.'),
  accion: z.enum(['votar', 'desvotar']).optional().default('votar'),
});

export function finalCreateSchema(currentYear = new Date().getFullYear()) {
  return z.object({
    materia_id: id('Materia inválida.'),
    anio: z.coerce.number({ invalid_type_error: 'Año de examen inválido.' })
      .int('Año de examen inválido.').min(2015, 'Año de examen inválido.').max(currentYear, 'Año de examen inválido.'),
    mesa: z.string({ required_error: 'Faltan completar campos obligatorios.' }).trim()
      .min(1, 'Faltan completar campos obligatorios.').max(100, 'La mesa no puede superar los 100 caracteres.'),
    profesor_nombre: z.string().trim().max(120, 'El nombre del profesor es demasiado largo.').optional().nullable()
      .transform((v) => (v ? v : null)),
    comentario: z.string({ required_error: 'Faltan completar campos obligatorios.' }).trim()
      .min(10, 'El comentario debe tener entre 10 y 1000 caracteres.').max(1000, 'El comentario debe tener entre 10 y 1000 caracteres.'),
  });
}

export const finalAccionSchema = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('eliminar'), id: id('Faltan datos.') }),
  z.object({
    accion: z.literal('editar'),
    id: id('Faltan datos.'),
    comentario: z.string({ required_error: 'El comentario debe tener al menos 10 caracteres.' }).trim()
      .min(10, 'El comentario debe tener al menos 10 caracteres.').max(1000, 'El comentario no puede superar los 1000 caracteres.'),
  }),
], { errorMap: () => ({ message: 'Acción no válida.' }) });

/** Returns the parsed data, or the first validation message. */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): { ok: true; data: z.output<T> } | { ok: false; error: string } {
  const result = schema.safeParse(body ?? {});
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues[0]?.message || 'Datos inválidos.' };
}
