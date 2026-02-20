import { createBrowserClient, createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser client — for read-only data fetching in SSR pages.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/** Cookie options for auth cookies */
const cookieOpts = {
  path: '/',
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
};

/**
 * Server client — for Astro server-side code (API routes, SSR pages, middleware).
 * Returns both the client AND any cookies that need to be written,
 * so callers can attach them manually to redirect Responses.
 */
export function createSupabaseServerClient(context: {
  headers: Headers;
  cookies: AstroCookies;
}) {
  const cookieHeader = context.headers.get('Cookie') ?? '';
  const responseCookies: Array<{ name: string; value: string; options: Record<string, any> }> = [];

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = { ...options, ...cookieOpts };
          responseCookies.push({ name, value, options: opts });
          // Also set via Astro cookies (works for non-redirect responses like middleware)
          context.cookies.set(name, value, opts);
        });
      },
    },
  });

  return { client, responseCookies };
}

/**
 * Build a redirect Response with explicit Set-Cookie headers.
 * This bypasses Astro's cookie handling to guarantee cookies
 * are included in 302 redirect responses.
 */
export function redirectWithCookies(
  location: string,
  cookies: Array<{ name: string; value: string; options: Record<string, any> }>,
  status = 302,
): Response {
  const headers = new Headers({ Location: location });

  for (const { name, value, options } of cookies) {
    let str = `${name}=${value}; Path=${options.path || '/'}`;
    if (options.httpOnly) str += '; HttpOnly';
    if (options.secure) str += '; Secure';
    if (options.sameSite) {
      const s = String(options.sameSite);
      str += `; SameSite=${s.charAt(0).toUpperCase()}${s.slice(1)}`;
    }
    if (options.maxAge != null) str += `; Max-Age=${options.maxAge}`;
    headers.append('Set-Cookie', str);
  }

  return new Response(null, { status, headers });
}