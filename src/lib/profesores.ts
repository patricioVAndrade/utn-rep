// Rol de cada profe en el curso e historial (migración 11).

export type Rol = 'TITULAR' | 'ADJUNTO' | 'JTP' | 'AYUDANTE';

export const ROLES: { valor: Rol; texto: string }[] = [
  { valor: 'TITULAR', texto: 'Titular' },
  { valor: 'ADJUNTO', texto: 'Adjunto' },
  { valor: 'JTP', texto: 'JTP' },
  { valor: 'AYUDANTE', texto: 'Ayudante' },
];

/** "Titular", "JTP"… o vacío si no tiene rol (o no es uno conocido). */
export const rolTexto = (rol: string | null | undefined) => ROLES.find((r) => r.valor === rol)?.texto || '';

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Pasa lo que escribe una persona al valor de la base.
 * null = sin rol (vacío). undefined = no es un rol válido.
 */
export function normalizarRol(valor: unknown): Rol | null | undefined {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') return undefined;
  const t = sinAcentos(valor).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  if (t === 'titular') return 'TITULAR';
  if (t === 'adjunto' || t === 'adjunta' || t === 'profesor adjunto') return 'ADJUNTO';
  if (t === 'jtp' || t === 'jefe de trabajos practicos' || t === 'jefa de trabajos practicos') return 'JTP';
  if (t === 'ayudante' || t === 'ayudante de trabajos practicos' || t === 'atp') return 'AYUDANTE';
  return undefined;
}

/** Año y cuatrimestre de una fecha, en hora de Córdoba (enero a julio = 1.º). */
export function cuatriDe(fecha = new Date()): { anio: number; cuatri: 1 | 2 } {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba', year: 'numeric', month: 'numeric' }).formatToParts(fecha);
  const anio = Number(partes.find((p) => p.type === 'year')?.value);
  const mes = Number(partes.find((p) => p.type === 'month')?.value);
  return { anio, cuatri: mes <= 7 ? 1 : 2 };
}

export type Periodo = { desde_anio: number; desde_cuatri: number | null; hasta_anio: number | null; hasta_cuatri: number | null };

const cuatri = (n: number) => (n === 1 ? '1.er cuatri' : '2.º cuatri');
const punto = (anio: number, c: number | null) => (c ? `${cuatri(c)} de ${anio}` : `${anio}`);

/** "Desde 2026", "Desde el 1.er cuatri de 2026", "2026 al 1.er cuatri de 2027"… */
export function periodoTexto(p: Periodo): string {
  if (p.hasta_anio === null) return p.desde_cuatri ? `Desde el ${punto(p.desde_anio, p.desde_cuatri)}` : `Desde ${p.desde_anio}`;
  if (p.desde_anio === p.hasta_anio && p.desde_cuatri && p.desde_cuatri === p.hasta_cuatri) return punto(p.desde_anio, p.desde_cuatri);
  return `${punto(p.desde_anio, p.desde_cuatri)} al ${punto(p.hasta_anio, p.hasta_cuatri)}`;
}
