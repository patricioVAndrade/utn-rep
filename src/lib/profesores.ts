// Historial de profesores en cada curso (migración 11).
// No se guarda el rol (Titular, JTP...): solo desde y hasta cuándo estuvo.

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
