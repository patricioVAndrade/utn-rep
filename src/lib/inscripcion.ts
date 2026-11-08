// Mi inscripción (F29, migración 12): cuentas de la pantalla. La lista vive
// en inscripcion_cursos (con sesión) o en el navegador (sin sesión) y viaja
// en el link como ?c=1,2,3&e=2 (cursos y elegidos).

export const MAX_INSCRIPCION = 80;

/** "5,6,6,abc" -> [5, 6]: ids válidos, sin repetir, con tope. */
export function idsDeTexto(texto: string | null | undefined, max = MAX_INSCRIPCION): number[] {
  const out: number[] = [];
  for (const p of String(texto || '').split(',')) {
    const n = Number(p.trim());
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

const TURNO_TXT: Record<string, string> = { MAÑANA: 'a la mañana', TARDE: 'a la tarde', NOCHE: 'a la noche' };
const CUANTAS = ['', '', 'Las dos', 'Las tres', 'Las cuatro', 'Las cinco'];

/** "Las tres a la tarde." o "2 a la tarde y 1 a la noche." */
export function textoCombinacion(turnos: (string | null | undefined)[]): string {
  const t = turnos.map((x) => (x || '').toUpperCase()).filter((x) => TURNO_TXT[x]);
  if (!t.length) return '';
  const cuenta = new Map<string, number>();
  t.forEach((x) => cuenta.set(x, (cuenta.get(x) || 0) + 1));
  if (cuenta.size === 1) {
    const txt = TURNO_TXT[t[0]];
    if (t.length === 1) return `${txt[0].toUpperCase()}${txt.slice(1)}.`;
    return `${CUANTAS[t.length] || 'Todas'} ${txt}.`;
  }
  const partes = ['MAÑANA', 'TARDE', 'NOCHE'].filter((x) => cuenta.has(x)).map((x) => `${cuenta.get(x)} ${TURNO_TXT[x]}`);
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}.`;
}

/** Promedio de las notas que existen, con un decimal. */
export function notaPromedio(notas: (number | null | undefined)[]): number | null {
  const v = notas.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (!v.length) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}
