export function tiempoRelativo(fecha: string, now = Date.now()): string {
  const diff = now - new Date(fecha).getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 30) return `Hace ${dias} días`;
  if (dias < 365) {
    const meses = Math.floor(dias / 30);
    return `Hace ${meses} mes${meses > 1 ? 'es' : ''}`;
  }
  const anios = Math.floor(dias / 365);
  return `Hace ${anios} año${anios > 1 ? 's' : ''}`;
}

export function estrellas(n: number): string {
  const llenas = Math.min(Math.max(Math.round(n), 0), 5);
  return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
}

export interface NivelColor {
  bg: string;
  light: string;
  accent: string;
  badge: string;
  label: string;
}

export const NIVEL_COLORS: Record<number, NivelColor> = {
  1: { bg: 'from-blue-500 to-blue-600', light: 'text-blue-200', accent: 'bg-blue-900/30 text-blue-400', badge: 'bg-blue-500', label: '1er Año' },
  2: { bg: 'from-green-500 to-green-600', light: 'text-green-200', accent: 'bg-green-900/30 text-green-400', badge: 'bg-green-500', label: '2do Año' },
  3: { bg: 'from-orange-500 to-orange-600', light: 'text-orange-200', accent: 'bg-orange-900/30 text-orange-400', badge: 'bg-orange-500', label: '3er Año' },
  4: { bg: 'from-red-500 to-red-600', light: 'text-red-200', accent: 'bg-red-900/30 text-red-400', badge: 'bg-red-500', label: '4to Año' },
  5: { bg: 'from-purple-500 to-purple-600', light: 'text-purple-200', accent: 'bg-purple-900/30 text-purple-400', badge: 'bg-purple-500', label: '5to Año' },
};

export function nivelColor(nivel: number | null | undefined): NivelColor {
  return NIVEL_COLORS[nivel ?? 1] || NIVEL_COLORS[1];
}
