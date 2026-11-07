// Palabras marcadas (migración 4): si una reseña trae una, entra sola a Reportes.
// Compara sin mayúsculas ni acentos y por palabra entera ("boludo" no marca "boludez").
// Una frase de varias palabras ("no vayan") también vale.

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Devuelve la primera palabra de la lista que aparece en el texto, o null. */
export function encontrarPalabra(texto: string, palabras: string[]): string | null {
  const t = ` ${normalizar(texto).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  for (const p of palabras) {
    const n = normalizar(p).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (n.length < 2) continue;
    if (new RegExp(` ${escapar(n)} `).test(t)) return p;
  }
  return null;
}

/** Limpia lo que escribe el admin antes de guardarlo (la base pide minúsculas y sin espacios en los bordes). */
export const limpiarPalabra = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
