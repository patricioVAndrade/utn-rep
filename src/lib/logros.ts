// Rangos y logros (migración 8). Los logros los da la base (revisar_logros);
// acá solo están los nombres, los dibujos y la cuenta del rango.

export type LogroId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

export type Logro = {
  id: LogroId;
  clase: string;
  nombre: string;
  /** Cómo se gana, para el que todavía no lo tiene */
  como: string;
  svg: string;
};

/** Los logros que da la base hoy. L7 a L19 se suman cuando estén votados. */
export const LOGROS: Logro[] = [
  { id: 'L1', clase: 'l1', nombre: 'Primera reseña', como: 'Escribí tu primera reseña', svg: '<path d="M4 20h4L19 9l-4-4L4 16z" stroke-linejoin="round"/>' },
  { id: 'L2', clase: 'l2', nombre: 'Abriste camino', como: 'La primera reseña de una materia', svg: '<path d="M5 21V4h11l-2 4 2 4H5" stroke-linejoin="round"/>' },
  { id: 'L3', clase: 'l3', nombre: 'Útil para 10 estudiantes', como: 'Tus reseñas suman 10 "Me sirvió"', svg: '<path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.5 2.5V9H19a2 2 0 012 2.3l-1.2 7A2 2 0 0117.8 20H7" stroke-linejoin="round"/>' },
  { id: 'L4', clase: 'l4', nombre: 'Rendí y compartí mi experiencia', como: 'Tu primera experiencia de final', svg: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h3" stroke-linecap="round"/>' },
  { id: 'L5', clase: 'l5', nombre: 'Madrugada de parcial', como: 'Una reseña escrita entre las 2 y las 5', svg: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" stroke-linejoin="round"/>' },
  { id: 'L6', clase: 'l6', nombre: 'Los cinco años', como: 'Reseñas de materias de los cinco años', svg: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" stroke-linejoin="round"/>' },
];

export const logroPorId = (id: string) => LOGROS.find((l) => l.id === id);

export type RangoId = 'ing' | 'cur' | 'ref' | 'leg';
export type Rango = { id: RangoId; nombre: string; desde: number };

/** De menor a mayor. El rango no se guarda: sale de contar reseñas. */
export const RANGOS: Rango[] = [
  { id: 'ing', nombre: 'Ingresante', desde: 1 },
  { id: 'cur', nombre: 'Cursante', desde: 2 },
  { id: 'ref', nombre: 'Referente', desde: 5 },
  { id: 'leg', nombre: 'Leyenda', desde: 15 },
];

/** Rango según la cantidad de reseñas (sin reseñas no hay rango). */
export function rango(resenas: number): Rango | null {
  let r: Rango | null = null;
  for (const x of RANGOS) if (resenas >= x.desde) r = x;
  return r;
}

/** Cuánto falta para el próximo rango: { siguiente, faltan, pct } (pct de 0 a 100). */
export function progresoRango(resenas: number) {
  const siguiente = RANGOS.find((x) => x.desde > resenas) || null;
  if (!siguiente) return { siguiente: null, faltan: 0, pct: 100 };
  return { siguiente, faltan: siguiente.desde - resenas, pct: Math.round((resenas / siguiente.desde) * 100) };
}

/** Frases del cartel de "Anónimo". */
export const TEORIAS_ANONIMO = [
  'Se sienta en la última fila, nunca pregunta en clase y aprueba igual. Nadie sabe quién es.',
  'Rindió el final de Análisis tres veces. O ninguna. Nunca lo sabremos.',
  'Dicen que es el JTP. Lo niega.',
  'Tiene los apuntes de todas las materias desde 2019 y no se los pasa a nadie.',
  'Llega tarde a todas las clases y nunca se pierde nada.',
  'Escribe las reseñas en el buffet, entre parcial y parcial.',
];
