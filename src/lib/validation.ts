import { z } from 'astro/zod';

const comentario = (min: number, max: number) =>
  z.string({ error: `El comentario debe tener al menos ${min} caracteres.` })
    .trim()
    .min(min, `El comentario debe tener al menos ${min} caracteres.`)
    .max(max, `El comentario no puede superar los ${max} caracteres.`);

const id = (mensaje: string) =>
  z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje);

export const CONDICIONES_FINALES = ['PROMOCIONADO', 'REGULAR', 'LIBRE'] as const;

export function resenaCreateSchema(currentYear = new Date().getFullYear()) {
  return z.object({
    dictado_id: z.number({ error: 'Dictado inválido.' }).int('Dictado inválido.').positive('Dictado inválido.'),
    calificacion_general: z.number({ error: 'Calificación debe ser entre 1 y 5.' })
      .int('Calificación debe ser entre 1 y 5.').min(1, 'Calificación debe ser entre 1 y 5.').max(5, 'Calificación debe ser entre 1 y 5.'),
    anio_cursado: z.number({ error: 'Año de cursado inválido.' })
      .int('Año de cursado inválido.').min(currentYear - 10, 'Año de cursado inválido.').max(currentYear, 'Año de cursado inválido.'),
    comentario: comentario(10, 2000),
    es_anonima: z.boolean().optional().default(false),
    // "" cuenta como sin dato
    condicion_final: z.preprocess((v) => (v === '' ? null : v),
      z.enum(CONDICIONES_FINALES, { error: 'Condición final inválida.' }).nullish())
      .transform((v) => v ?? null),
  });
}

// Quien escribió la reseña puede cambiar el texto y completar "¿Cómo te fue?" (las estrellas no)
export const resenaEditSchema = z.object({
  comentario: comentario(10, 2000).optional(),
  condicion_final: z.preprocess((v) => (v === '' ? null : v),
    z.enum(CONDICIONES_FINALES, { error: 'Condición final inválida.' }).nullable())
    .optional(),
}).refine((d) => d.comentario !== undefined || d.condicion_final !== undefined, { message: 'No hay nada para cambiar.' });

export const reporteSchema = z.object({
  resena_id: z.number({ error: 'ID de reseña inválido.' }).int('ID de reseña inválido.').positive('ID de reseña inválido.'),
  motivo: z.string().trim().max(500).optional().nullable()
    .transform((v) => (v ? v : null)),
});

export const votoFinalSchema = z.object({
  final_id: id('Falta el ID de la experiencia.'),
  accion: z.enum(['votar', 'desvotar']).optional().default('votar'),
});

export const reporteFinalSchema = z.object({
  final_id: id('Falta el ID de la experiencia.'),
  motivo: z.string().trim().min(3, 'Contá brevemente el motivo.').max(500, 'El motivo es demasiado largo.'),
});

export const votoSchema = z.object({
  resena_id: id('Falta el ID de la reseña.'),
  accion: z.enum(['votar', 'desvotar']).optional().default('votar'),
});

export function finalCreateSchema(currentYear = new Date().getFullYear()) {
  return z.object({
    materia_id: id('Materia inválida.'),
    anio: z.coerce.number({ error: 'Año de examen inválido.' })
      .int('Año de examen inválido.').min(2015, 'Año de examen inválido.').max(currentYear, 'Año de examen inválido.'),
    mesa: z.string({ error: 'Faltan completar campos obligatorios.' }).trim()
      .min(1, 'Faltan completar campos obligatorios.').max(100, 'La mesa no puede superar los 100 caracteres.'),
    profesor_nombre: z.string().trim().max(120, 'El nombre del profesor es demasiado largo.').optional().nullable()
      .transform((v) => (v ? v : null)),
    comentario: z.string({ error: 'Faltan completar campos obligatorios.' }).trim()
      .min(10, 'El comentario debe tener entre 10 y 1000 caracteres.').max(1000, 'El comentario debe tener entre 10 y 1000 caracteres.'),
    con_nombre: z.boolean().optional().default(false),
  });
}

export const finalAccionSchema = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('eliminar'), id: id('Faltan datos.') }),
  z.object({
    accion: z.literal('editar'),
    id: id('Faltan datos.'),
    comentario: z.string({ error: 'El comentario debe tener al menos 10 caracteres.' }).trim()
      .min(10, 'El comentario debe tener al menos 10 caracteres.').max(1000, 'El comentario no puede superar los 1000 caracteres.'),
  }),
], { error: 'Acción no válida.' });

/** Returns the parsed data, or the first validation message. */
// Mi cuenta (migración 5): cada campo es opcional, se guarda solo lo que llega
/** Nombre a mostrar: letras de cualquier idioma, espacios, punto, guion y apóstrofo, con al menos dos letras. */
export const NOMBRE_VALIDO = /^(?=(?:.*\p{L}){2})[\p{L}\p{M} .'’-]+$/u;

export const perfilSchema = z.object({
  nombre_mostrar: z.string({ error: 'Nombre inválido.' }).trim()
    .max(40, 'El nombre puede tener hasta 40 caracteres.')
    .refine((v) => v === '' || v.length >= 2, 'El nombre tiene que tener al menos 2 caracteres.')
    // Solo letras (con tildes), espacios, punto, guion y apóstrofo: nada de números ni símbolos
    .refine((v) => v === '' || NOMBRE_VALIDO.test(v), 'Usá solo letras y espacios en tu nombre.')
    .transform((v) => (v ? v.replace(/\s+/g, ' ') : null))
    .nullable()
    .optional(),
  foto: z.enum(['inicial', 'google', 'dibujo'], { error: 'Foto inválida.' }).optional(),
  dibujo: z.number().int().min(1).max(12).nullable().optional(),
  color: z.enum(['azul', 'verde', 'rojo', 'violeta', 'naranja', 'gris'], { error: 'Color inválido.' }).nullable().optional(),
  mostrar_ficha: z.boolean().optional(),
  anios_cursada: z.array(z.coerce.number().int().min(1).max(5), { error: 'Años inválidos.' })
    .max(5)
    .transform((a) => [...new Set(a)].sort())
    .optional(),
  preguntar_como_te_fue: z.boolean().optional(),
  pausar_como_te_fue: z.boolean().optional(),
}, { error: (iss) => (iss.code === 'unrecognized_keys' ? 'Hay un dato que no se puede cambiar desde acá.' : undefined) }).strict();

export const borrarCuentaSchema = z.object({
  resenas: z.enum(['anonimas', 'borrar'], { error: 'Elegí qué hacer con tus reseñas.' }),
  confirmacion: z.literal('BORRAR', { error: 'Escribí BORRAR para confirmar.' }),
});

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): { ok: true; data: z.output<T> } | { ok: false; error: string } {
  const result = schema.safeParse(body ?? {});
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues[0]?.message || 'Datos inválidos.' };
}
