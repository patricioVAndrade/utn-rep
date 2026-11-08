// Mi inscripción (F29) en el navegador: sin sesión la lista vive acá
// (localStorage "miInscripcion"); con sesión va a la cuenta por /api/inscripcion.
// Al iniciar sesión, lo que había en el navegador se pasa a la cuenta.

export type ListaLocal = { c: number[]; e: number[] };
const CLAVE = 'miInscripcion';

export function leerLocal(): ListaLocal {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter((n) => Number.isInteger(n) && n > 0).slice(0, 80) : []);
    return x ? { c: ids(x.c), e: ids(x.e) } : { c: [], e: [] };
  } catch {
    return { c: [], e: [] };
  }
}

export function guardarLocal(l: ListaLocal) {
  try {
    if (!l.c.length) localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, JSON.stringify({ c: l.c, e: l.e.filter((x) => l.c.includes(x)) }));
  } catch { /* sin almacenamiento */ }
}

export const conSesion = () => document.body.dataset.sesion === '1';

export async function api(body: Record<string, unknown>) {
  const res = await fetch('/api/inscripcion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
  return data;
}

/** Si hay sesión y quedó algo en el navegador, lo pasa a la cuenta. Devuelve true si pasó algo. */
export async function traerLocal(): Promise<boolean> {
  if (!conSesion()) return false;
  const l = leerLocal();
  if (!l.c.length) return false;
  try {
    await api({ accion: 'traer', dictados: l.c, elegidos: l.e });
    guardarLocal({ c: [], e: [] });
    return true;
  } catch {
    return false;
  }
}

/** Link de la lista: /mi-inscripcion?c=1,2&e=2 */
export const linkDe = (l: ListaLocal, extra = '') => `/mi-inscripcion?c=${l.c.join(',')}${l.e.length ? `&e=${l.e.join(',')}` : ''}${extra}`;
