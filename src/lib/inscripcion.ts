// Mi inscripción (F29, migración 12). La lista vive en inscripcion_cursos
// (con sesión) o en el navegador (sin sesión) y viaja en el link como ?c=1,2,3.

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
