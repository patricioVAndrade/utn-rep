import type { APIRoute } from 'astro';
import { createSupabaseServerClient, redirectWithCookies } from '../../../lib/supabase';

/**
 * GET /api/auth/callback
 * Supabase redirects here after OAuth. Exchanges the code for a session,
 * stores session tokens as cookies, then redirects to the returnTo page.
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const code = url.searchParams.get('code');
  const error_param = url.searchParams.get('error');
  const error_description = url.searchParams.get('error_description');

  // Read returnTo from cookie (set by Layout.astro JS and/or login.ts)
  const returnToCookie = cookies.get('auth_returnTo')?.value;
  const returnTo = returnToCookie ? decodeURIComponent(returnToCookie) : (url.searchParams.get('returnTo') || '/');

  if (error_param) {
    console.error('[Auth Callback] Provider error:', error_param, error_description);
    return new Response(null, {
      status: 302,
      headers: { Location: '/?auth_error=' + encodeURIComponent(error_description || error_param) },
    });
  }

  if (!code) {
    // No code — the session might have been established by the middleware already
    // (Supabase sometimes redirects to Site URL instead of callback URL).
    // Just redirect to the intended destination silently.
    console.warn('[Auth Callback] No code in URL (likely handled by middleware). Redirecting to:', returnTo);
    const destination = returnTo.startsWith('/') ? returnTo : '/';
    // Clean up the returnTo cookie
    cookies.delete('auth_returnTo', { path: '/' });
    return new Response(null, { status: 302, headers: { Location: destination } });
  }

  console.log('[Auth Callback] Got code, exchanging for session...');

  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[Auth Callback] Exchange error:', error.message);
    return new Response(null, { status: 302, headers: { Location: '/?auth_error=exchange_failed' } });
  }

  console.log('[Auth Callback] Session established! returnTo:', returnTo);

  // Clean up the returnTo cookie
  responseCookies.push({ name: 'auth_returnTo', value: '', options: { path: '/', maxAge: 0, sameSite: 'lax' as const } });

  // Validate returnTo is a relative path (prevent open redirect)
  const destination = returnTo.startsWith('/') ? returnTo : '/';

  return redirectWithCookies(destination, responseCookies);
};
