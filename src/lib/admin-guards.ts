import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from './supabase';
import { isAdmin } from './admin';

export const ADMIN_CSRF_COOKIE = 'admin_csrf';
export const ADMIN_CSRF_HEADER = 'x-csrf-token';

function isSameOrigin(request: Request): boolean {
  // El navegador marca si el pedido salió de la misma página (no lo puede falsear otro sitio)
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';

  // Sin esa marca, el origen tiene que ser el del sitio. Detrás de Vercel la
  // dirección que ve el servidor puede no ser la que abrió el navegador, así
  // que también vale la del encabezado Host.
  const esperados = new Set([new URL(request.url).origin]);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) esperados.add(`https://${host.split(',')[0].trim()}`);

  const origin = request.headers.get('origin');
  if (origin) return esperados.has(origin);

  const referer = request.headers.get('referer');
  if (!referer) return false;

  try {
    return esperados.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

function hasValidCsrf(request: Request, cookies: AstroCookies): boolean {
  const headerToken = request.headers.get(ADMIN_CSRF_HEADER);
  const cookieToken = cookies.get(ADMIN_CSRF_COOKIE)?.value;
  if (!headerToken || !cookieToken) return false;
  return headerToken === cookieToken;
}

// Por qué se rechazó cada pedido, para decirlo en el mensaje (solo al que lo hizo)
const motivos = new WeakMap<Request, string>();

export async function requireAdmin(
  request: Request,
  cookies: AstroCookies,
  options: { requireCsrf?: boolean } = {},
) {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) { motivos.set(request, 'tu sesión venció: recargá la página o volvé a iniciar sesión'); return null; }
  if (!isAdmin(user.id)) { motivos.set(request, 'tu cuenta no está en ADMIN_IDS de este sitio'); return null; }

  if (options.requireCsrf) {
    if (!isSameOrigin(request)) { motivos.set(request, 'el pedido no salió de esta página'); return null; }
    if (!hasValidCsrf(request, cookies)) { motivos.set(request, 'el código de seguridad de la página venció: recargá la página'); return null; }
  }

  return user;
}

/** Respuesta 403 con el motivo del rechazo. */
export function noAutorizado(request: Request) {
  const motivo = motivos.get(request);
  return new Response(JSON.stringify({ error: motivo ? `No autorizado: ${motivo}.` : 'No autorizado.' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
