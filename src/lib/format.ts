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

/** Fecha y hora exactas, como en los foros: "12/11/2026 02:11" (hora de Córdoba). */
export function fechaHora(fecha: string): string {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Cordoba' })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
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

/** "2.º año" */
export function anioLabel(nivel: number | null | undefined): string {
  return `${nivel ?? 1}.º año`;
}

/** Clase del chip de turno: m (mañana), t (tarde), n (noche). */
export function turnoClase(turno: string | null | undefined): string {
  const t = (turno || '').toUpperCase();
  if (t.startsWith('MA')) return 'm';
  if (t.startsWith('TA')) return 't';
  if (t.startsWith('NO')) return 'n';
  return '';
}

/** "Mañana", "Tarde", "Noche" */
export function turnoLabel(turno: string | null | undefined): string {
  if (!turno) return 'Sin turno';
  const t = turno.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** 4.25 → "4,3" */
export function nota(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Orden natural de cursos: 1K2 antes que 1K10. */
export function compararCursos(a: string, b: string): number {
  return (a || '').localeCompare(b || '', 'es', { numeric: true });
}

/** "Mesa de julio 2026", "Mesa de febrero / marzo 2026", "Mesa especial 2026" */
export function mesaTexto(mesa: string | null | undefined, anio: number | string | null | undefined): string {
  const m = (mesa || '').trim().toLowerCase();
  const a = anio ? ` ${anio}` : '';
  if (!m) return `Mesa${a}`;
  if (m.startsWith('feb')) return `Mesa de febrero / marzo${a}`;
  if (m.startsWith('esp')) return `Mesa especial${a}`;
  return `Mesa de ${m}${a}`;
}

/** "Rindió en julio 2026" (F34): lo que dice la reseña que tiene sumado su final. */
export function rindioTexto(mesa: string | null | undefined, anio: number | string | null | undefined): string {
  const m = (mesa || '').trim().toLowerCase();
  if (!m && !anio) return '';
  const a = anio ? ` ${anio}` : '';
  if (m.startsWith('feb')) return `Rindió en febrero / marzo${a}`;
  if (m.startsWith('esp')) return `Rindió en una mesa especial${a}`;
  return m ? `Rindió en ${m}${a}` : `Rindió el final${a}`;
}

/** "Editada el 12/11" (vacío si nunca se editó). La fecha la pone la base al cambiar texto, estrellas o "¿Cómo te fue?". */
export function editadaEl(fecha: string | null | undefined): string {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  return `Editada el ${d.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', timeZone: 'America/Argentina/Cordoba' })}`;
}

/** Cómo le fue, en primera persona (para quien escribió la reseña) */
export const COMO_TE_FUE = [
  { valor: 'PROMOCIONADO', texto: 'Promocioné', clase: 'prom' },
  { valor: 'REGULAR', texto: 'Regularicé', clase: 'reg' },
  { valor: 'LIBRE', texto: 'Quedé libre', clase: 'libre' },
] as const;
