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

  // Read returnTo from the callback URL query params
  const returnTo = url.searchParams.get('returnTo') || '/';

  if (error_param) {
    console.error('[Auth Callback] Provider error:', error_param, error_description);
    return new Response(null, {
      status: 302,
      headers: { Location: '/?auth_error=' + encodeURIComponent(error_description || error_param) },
    });
  }

  if (!code) {
    console.error('[Auth Callback] No code in URL. Search params:', url.search);
    return new Response(null, { status: 302, headers: { Location: '/?auth_error=missing_code' } });
  }

  console.log('[Auth Callback] Got code, exchanging for session...');

  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[Auth Callback] Exchange error:', error.message);
    return new Response(null, { status: 302, headers: { Location: '/?auth_error=exchange_failed' } });
  }

  console.log('[Auth Callback] Session established! returnTo:', returnTo);

  // Validate returnTo is a relative path (prevent open redirect)
  const destination = returnTo.startsWith('/') ? returnTo : '/';

  return redirectWithCookies(destination, responseCookies);
};
