import type { AstroCookies } from 'astro';
import { ADMIN_CSRF_COOKIE } from './admin-guards';

/** Token CSRF de doble envío para las pantallas del admin: lo reusa o crea uno. */
export function tokenCsrf(cookies: AstroCookies): string {
  const existente = cookies.get(ADMIN_CSRF_COOKIE)?.value;
  if (existente) return existente;
  const token = crypto.randomUUID();
  cookies.set(ADMIN_CSRF_COOKIE, token, { path: '/', sameSite: 'strict', secure: import.meta.env.PROD, httpOnly: false, maxAge: 60 * 60 * 8 });
  return token;
}
