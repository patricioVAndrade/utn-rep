/**
 * Búsqueda tolerante: la usan /buscar y el buscador del banner.
 * Primero busca tal cual; si no hay nada, busca lo parecido (letras de más, de menos o cambiadas).
 */

const ROMANOS: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5' };
// Palabras que no ayudan a encontrar nada
const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'en', 'a', 'con', 'para', 'por']);

/** Sin tildes, en minúscula, sin signos y con los números romanos sueltos como números ("II" es "2"). */
export function normalizar(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ/]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((t) => ROMANOS[t] ?? t)
    .join(' ');
}

/** Palabras de la búsqueda, sin las vacías (salvo que no quede otra). */
export function palabrasDe(q: string): string[] {
  const todas = normalizar(q).split(' ').filter(Boolean);
  const utiles = todas.filter((p) => !VACIAS.has(p));
  return utiles.length ? utiles : todas;
}

const esNumero = (p: string) => /^\d+$/.test(p);

/** Iniciales del texto, con los números enteros: "Análisis Matemático I" → "am1". */
export function iniciales(texto: string): string {
  return normalizar(texto).split(' ').filter((t) => t && !VACIAS.has(t)).map((t) => (esNumero(t) ? t : t[0])).join('');
}

/** La búsqueda es la sigla del texto ("AED", "AM1", "AM 1"). */
export function esSigla(palabras: string[], texto: string): boolean {
  const q = palabras.join('');
  return palabras.length <= 3 && q.length >= 2 && q.length <= 6 && /[a-z]/.test(q) && q === iniciales(texto);
}

/** Todas las palabras aparecen en el texto (los números, como palabra entera: "1" no encuentra "11"), o es su sigla. */
export function coincide(palabras: string[], texto: string): boolean {
  if (!palabras.length) return false;
  if (esSigla(palabras, texto)) return true;
  const n = normalizar(texto);
  const tokens = n.split(' ');
  return palabras.every((p) => (esNumero(p) ? tokens.includes(p) : n.includes(p)));
}

/** Distancia de edición (letras de más, de menos, cambiadas o dadas vuelta), cortando en `max`. */
export function distancia(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < menor) menor = v;
    }
    if (menor > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

const tolerancia = (p: string) => (p.length >= 8 ? 2 : p.length >= 4 ? 1 : 0);

/**
 * Qué tan parecido es el texto a la búsqueda: un número (más bajo, más parecido) o null si no se parece.
 * Cada palabra tiene que estar, empezar una palabra del texto o diferir en poco de alguna.
 */
export function parecido(palabras: string[], texto: string): number | null {
  if (!palabras.length) return null;
  const n = normalizar(texto);
  const tokens = n.split(' ');
  let total = 0;
  let letras = false;
  for (const p of palabras) {
    if (esNumero(p)) {
      // Un número que no está (Física 3) resta, pero no descarta
      if (!tokens.includes(p)) total += 2;
      continue;
    }
    letras = true;
    if (n.includes(p)) continue;
    const tol = tolerancia(p);
    if (!tol) return null;
    let mejor = tol + 1;
    for (const t of tokens) {
      // Contra la palabra entera o contra su comienzo ("algoritmso" ~ "algoritmos", "estructra" ~ "estructuras")
      const d = Math.min(distancia(p, t, tol), t.length > p.length ? distancia(p, t.slice(0, p.length), tol) : tol + 1);
      if (d < mejor) mejor = d;
    }
    if (mejor > tol) return null;
    total += mejor;
  }
  return letras ? total : null;
}

/** Lo parecido, de más a menos parecido. */
export function losParecidos<T>(items: T[], texto: (x: T) => string, palabras: string[]): T[] {
  return items
    .map((x) => ({ x, d: parecido(palabras, texto(x)) }))
    .filter((r): r is { x: T; d: number } => r.d !== null)
    .sort((a, b) => a.d - b.d)
    .map((r) => r.x);
}

/** Código de curso escrito sin espacios y en minúscula: "1K1 B" → "1k1b". */
export const codigoCurso = (q: string) => q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');

/** Parece un código de curso: 2K3, 1K1B, 1H10/11 (o el comienzo de uno, con `parcial`). */
export function esCodigoCurso(q: string, parcial = false): boolean {
  const c = codigoCurso(q);
  return parcial ? /^\d[a-z]\d*[a-z]?(\/\d*)?$/.test(c) : /^\d[a-z]\d{1,2}[a-z]?(\/\d+)?$/.test(c);
}

/** El curso es el buscado: igual, o "1H10" encuentra "1H10/11". */
export function cursoCoincide(identificador: string, q: string): boolean {
  const id = codigoCurso(identificador);
  const c = codigoCurso(q);
  return id === c || id.startsWith(c + '/');
}

/** Un curso escrito con un error (1K1V por 1K1B, 1KB1 por 1K1B). */
export function cursoParecido(identificador: string, q: string): boolean {
  return distancia(codigoCurso(identificador).split('/')[0], codigoCurso(q).split('/')[0], 1) <= 1;
}
