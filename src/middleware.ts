import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient, redirectWithCookies } from './lib/supabase';

/**
 * Middleware that:
 * 1. Intercepts OAuth callback codes on ANY page and exchanges them for a session
 * 2. Reads the auth session from cookies on every request
 * 3. Adds security headers
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, cookies } = context;

  // ── Handle OAuth code on any page (Supabase may redirect to / instead of /api/auth/callback) ──
  const code = url.searchParams.get('code');
  if (code && !url.pathname.startsWith('/api/')) {
    const { client: supabase, responseCookies } = createSupabaseServerClient({
      headers: request.headers,
      cookies,
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Middleware] Code exchange failed:', error.message);
      return new Response(null, {
        status: 302,
        headers: { Location: '/?auth_error=exchange_failed' },
      });
    }

    // Redirect to clean URL (remove ?code= param, keep other query params) with session cookies
    // Check for auth_returnTo cookie to redirect directly to the intended page (avoids flash)
    const returnToCookie = cookies.get('auth_returnTo')?.value;
    let destination: string;
    if (returnToCookie) {
      const decoded = decodeURIComponent(returnToCookie);
      destination = decoded.startsWith('/') ? decoded : '/';
      // Delete the returnTo cookie by adding an expired cookie to the response
      responseCookies.push({
        name: 'auth_returnTo',
        value: '',
        options: { path: '/', maxAge: 0, sameSite: 'lax' as const },
      });
    } else {
      const cleanParams = new URLSearchParams(url.searchParams);
      cleanParams.delete('code');
      const cleanQuery = cleanParams.toString();
      destination = cleanQuery ? `${url.pathname}?${cleanQuery}` : url.pathname;
    }
    return redirectWithCookies(destination, responseCookies);
  }

  // ── Read session for all pages (skip API routes — they handle their own auth) ──
  if (!url.pathname.startsWith('/api/')) {
    const { client: supabase } = createSupabaseServerClient({
      headers: request.headers,
      cookies,
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      context.locals.user = {
        id: user.id,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Usuario',
        avatar: user.user_metadata?.avatar_url || undefined,
        email: user.email || '',
      };
    } else {
      context.locals.user = null;
    }
  } else {
    context.locals.user = null;
  }

  const response = await next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
});
