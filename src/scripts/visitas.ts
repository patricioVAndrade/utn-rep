/**
 * Última visita, guardada solo en este navegador.
 * Una visita nueva empieza después de 30 minutos sin entrar.
 */
const CLAVE = 'visitas';
const PAUSA_MS = 30 * 60 * 1000;

type Visitas = { actual: number; anterior: number | null };

let cache: Visitas | null = null;

function registrar(): Visitas {
  if (cache) return cache;
  const ahora = Date.now();
  let guardado: Partial<Visitas> = {};
  try { guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { /* sin almacenamiento */ }
  const actual = typeof guardado.actual === 'number' ? guardado.actual : null;
  const anterior = actual === null
    ? null
    : ahora - actual > PAUSA_MS ? actual : (guardado.anterior ?? null);
  cache = { actual: ahora, anterior };
  try { localStorage.setItem(CLAVE, JSON.stringify(cache)); } catch { /* sin almacenamiento */ }
  return cache;
}

/** Fecha (ms) de la visita anterior a esta, o null si es la primera. */
export function visitaAnterior(): number | null {
  return registrar().anterior;
}

/** Toma "ahora" como la visita anterior: todo lo publicado hasta ahora deja de ser nuevo. */
export function marcarLeido(): void {
  const v = registrar();
  v.anterior = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
}

/** "hoy, 18:20", "ayer, 9:05" o "3/11, 21:40" */
export function textoVisita(ms: number): string {
  const d = new Date(ms);
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hoy = new Date();
  const ayer = new Date(hoy.getTime() - 86400000);
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismoDia(d, hoy)) return `hoy, ${hora}`;
  if (mismoDia(d, ayer)) return `ayer, ${hora}`;
  return `${d.getDate()}/${d.getMonth() + 1}, ${hora}`;
}
