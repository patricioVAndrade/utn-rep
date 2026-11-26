// Recordatorio de fin de cuatrimestre (F32, migración 15), dentro del sitio.
// La base crea los avisos "¿Cómo te fue en X?" por las materias de
// Mi inscripción (migración 19). Se pide como mucho una vez por día y por navegador (cookie),
// la primera vez que la persona entra con sesión.
import type { AstroCookies } from 'astro';

export const COOKIE_RECORDATORIO = 'rec_cuatri';

/** La fecha de hoy en Córdoba, como "2026-11-09". */
export function hoyCordoba(ahora = new Date()): string {
  return ahora.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Cordoba' });
}

export async function recordarFinCuatri(client: any, cookies: AstroCookies, ahora = new Date()) {
  const hoy = hoyCordoba(ahora);
  if (cookies.get(COOKIE_RECORDATORIO)?.value === hoy) return;
  const { error } = await client.rpc('recordar_fin_cuatri');
  // Sin la migración 15 falla: se anota igual para no volver a pedirlo en el día
  if (error && error.code !== 'PGRST202') console.error('[recordatorio]', error.message);
  cookies.set(COOKIE_RECORDATORIO, hoy, { path: '/', maxAge: 60 * 60 * 24, httpOnly: true, sameSite: 'lax', secure: import.meta.env.PROD });
}
