// Rangos y logros (migraciones 8 y 16). Los logros los da la base (revisar_logros);
// acá solo están los nombres, los dibujos y la cuenta del rango.

export type LogroId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L8' | 'L9' | 'L10' | 'L12' | 'L13' | 'L14' | 'L15' | 'L17' | 'L18' | 'L19' | 'L20';

export type Logro = {
  id: LogroId;
  clase: string;
  nombre: string;
  /** Cómo se gana, para el que todavía no lo tiene */
  como: string;
  svg: string;
};

/** Los logros que da la base. L7 (cambios de profesores) llega en 2027; L11 y L16 se descartaron (9/11). */
export const LOGROS: Logro[] = [
  { id: 'L1', clase: 'l1', nombre: 'Primera reseña', como: 'Escribí tu primera reseña', svg: '<path d="M4 20h4L19 9l-4-4L4 16z" stroke-linejoin="round"/>' },
  { id: 'L2', clase: 'l2', nombre: 'Abriste camino', como: 'La primera reseña de una materia', svg: '<path d="M5 21V4h11l-2 4 2 4H5" stroke-linejoin="round"/>' },
  { id: 'L3', clase: 'l3', nombre: 'Útil para 10 estudiantes', como: 'Tus reseñas suman 10 "Me sirvió"', svg: '<path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.5 2.5V9H19a2 2 0 012 2.3l-1.2 7A2 2 0 0117.8 20H7" stroke-linejoin="round"/>' },
  { id: 'L4', clase: 'l4', nombre: 'Rendí y compartí mi experiencia', como: 'Tu primera experiencia de final', svg: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h3" stroke-linecap="round"/>' },
  { id: 'L5', clase: 'l5', nombre: 'Madrugada de parcial', como: 'Una reseña escrita entre las 2 y las 5', svg: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" stroke-linejoin="round"/>' },
  { id: 'L6', clase: 'l6', nombre: 'Los cinco años', como: 'Reseñas de materias de los cinco años', svg: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" stroke-linejoin="round"/>' },
  { id: 'L8', clase: 'l8', nombre: 'Pasalo al grupo', como: 'Tres personas abren un link que compartiste', svg: '<path d="M4 20.5l1.4-4.1A8.3 8.3 0 1112 20.3a8.3 8.3 0 01-4-1z" stroke-linejoin="round"/><path d="M9.2 8.6c-.3 2.9 2.6 6 5.8 6.1l1-1.5-2-1.1-1 .9a4.4 4.4 0 01-2-2l.8-1-.9-2.1z" fill="currentColor" stroke="none"/>' },
  { id: 'L9', clase: 'l9', nombre: 'Detective', como: 'Es secreto. Pista: los nombres esconden cosas', svg: '<path d="M3 8c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0 0 5-2 9-5 9-2 0-3-2-4-2s-2 2-4 2c-3 0-5-4-5-9z" stroke-linejoin="round"/><ellipse cx="7.5" cy="11" rx="2" ry="1.2" fill="currentColor" stroke="none"/><ellipse cx="16.5" cy="11" rx="2" ry="1.2" fill="currentColor" stroke="none"/>' },
  { id: 'L10', clase: 'l10', nombre: 'Estrenaste el curso', como: 'La primera reseña de un curso', svg: '<path d="M5 21V4h11l-2 4 2 4H5" stroke-linejoin="round"/><path d="M9 7.5v1" stroke-linecap="round"/>' },
  { id: 'L12', clase: 'l12', nombre: 'Recursante', como: 'Reseñas de dos cursos de la misma materia', svg: '<path d="M4 11V9a3 3 0 013-3h12l-3-3M20 13v2a3 3 0 01-3 3H5l3 3" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'L13', clase: 'l13', nombre: 'Buen compañero', como: 'Votaste "Me sirvió" 20 veces', svg: '<path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.5 2.5V9H19a2 2 0 012 2.3l-1.2 7A2 2 0 0117.8 20H7" stroke-linejoin="round"/>' },
  { id: 'L14', clase: 'l14', nombre: 'Mesa completa', como: 'Finales de las mesas de diciembre, febrero y julio', svg: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4" stroke-linecap="round"/>' },
  { id: 'L15', clase: 'l15', nombre: 'Búho', como: 'Tres reseñas de cursos del turno noche', svg: '<path d="M5 4l3 2h8l3-2v9a7 7 0 01-14 0z" stroke-linejoin="round"/><circle cx="9" cy="11" r="2"/><circle cx="15" cy="11" r="2"/><path d="M11 15l1 1 1-1" stroke-linecap="round"/>' },
  { id: 'L17', clase: 'l17', nombre: 'Detallista', como: 'Una reseña de más de 400 caracteres con 5 "Me sirvió"', svg: '<path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke-linecap="round"/><circle cx="18" cy="17" r="3"/>' },
  { id: 'L18', clase: 'l18', nombre: 'La más útil del curso', como: 'Tu reseña es la más votada de su curso (con 3 votos o más)', svg: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" stroke-linejoin="round"/>' },
  { id: 'L19', clase: 'l19', nombre: 'Ayudante de cátedra', como: 'Tus reseñas ayudaron a 50 personas', svg: '<path d="M3 9l9-5 9 5-9 5z" stroke-linejoin="round"/><path d="M7 11.5V16c3 2 7 2 10 0v-4.5" stroke-linejoin="round"/>' },
  { id: 'L20', clase: 'l20', nombre: 'Titular de cátedra', como: 'Tus reseñas ayudaron a 100 personas', svg: '<path d="M3 9l9-5 9 5-9 5z" stroke-linejoin="round"/><path d="M7 11.5V16c3 2 7 2 10 0v-4.5M21 9v6" stroke-linejoin="round" stroke-linecap="round"/>' },
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
