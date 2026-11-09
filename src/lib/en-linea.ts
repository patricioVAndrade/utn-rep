// Contador "Hay X estudiantes en línea" (migración 10, F13).
// La base cuenta navegadores que dieron señales en los últimos 5 minutos.
// Se muestra siempre, con el punto verde (gris si no hay nadie).
import { supabaseAdmin } from './supabase-admin';

/** Cuántos hay, limpio (0 si viene algo raro). */
export function cuantosEnLinea(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Texto del contador. Se muestra siempre (Pato, 9/11): no dice quién, solo cuántos.
 *  Con 0 el punto va en gris. */
export function textoEnLinea(n: number, corto = false): string {
  const c = cuantosEnLinea(n);
  if (corto) return `${c.toLocaleString('es-AR')} en línea`;
  if (c === 0) return 'Nadie en línea ahora';
  return c === 1 ? 'Hay 1 estudiante en línea' : `Hay ${c.toLocaleString('es-AR')} estudiantes en línea`;
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

/** Con menos visitas en la semana, el inicio muestra las reseñas de la semana (Pato, 9/11). */
export const MINIMO_VISITAS = 100;

/** Visitas de los últimos 7 días (un navegador cuenta una vez por día; migración 14, F14).
 *  null si la base no responde o todavía no tiene la migración. */
export async function visitasSemana(): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc('visitas_semana');
  if (error) { console.error('[visitas]', error.message); return null; }
  return Number(data) || 0;
}
