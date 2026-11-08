// Contador "Hay X estudiantes en línea" (migración 10, F13).
// La base cuenta navegadores que dieron señales en los últimos 5 minutos.
import { supabaseAdmin } from './supabase-admin';

/** Con menos gente no se muestra, para no exponer a nadie. */
export const MINIMO_EN_LINEA = 5;

/** Texto del contador, o null si no hay que mostrarlo. */
export function textoEnLinea(n: number, corto = false): string | null {
  if (!Number.isFinite(n) || n < MINIMO_EN_LINEA) return null;
  const num = Math.floor(n).toLocaleString('es-AR');
  return corto ? `${num} en línea` : `Hay ${num} estudiantes en línea`;
}

/** Cuántos hay ahora (0 si la base no responde). */
export async function enLinea(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('en_linea');
  if (error) { console.error('[en-linea]', error.message); return 0; }
  return Number(data) || 0;
}

/** Anota que este navegador sigue ahí y devuelve cuántos hay. */
export async function latido(visitante: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('latido', { p_visitante: visitante });
  if (error) { console.error('[en-linea]', error.message); return 0; }
  return Number(data) || 0;
}
