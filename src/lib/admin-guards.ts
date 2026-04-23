import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from './supabase';
import { isAdmin } from './admin';

export const ADMIN_CSRF_COOKIE = 'admin_csrf';
export const ADMIN_CSRF_HEADER = 'x-csrf-token';

function isSameOrigin(request: Request): boolean {
  const requestUrl = new URL(request.url);
  const expectedOrigin = requestUrl.origin;
  const origin = request.headers.get('origin');

  if (origin) {
    return origin === expectedOrigin;
  }

  const referer = request.headers.get('referer');
  if (!referer) return false;

  try {
    return new URL(referer).origin === expectedOrigin;
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

export async function requireAdmin(
  request: Request,
  cookies: AstroCookies,
  options: { requireCsrf?: boolean } = {},
) {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user || !isAdmin(user.id)) return null;

  if (options.requireCsrf) {
    if (!isSameOrigin(request)) return null;
    if (!hasValidCsrf(request, cookies)) return null;
  }

  return user;
}
