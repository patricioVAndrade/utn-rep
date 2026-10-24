import type { APIRoute } from 'astro';
import { createSupabaseServerClient, redirectWithCookies } from '../../../lib/supabase';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/request';
import { safeReturnTo } from '../../../lib/redirect';

/**
 * GET /api/auth/login?provider=google|github&returnTo=/some/path
 * Generates the OAuth URL with PKCE, stores the code verifier as a cookie,
 * then redirects the user to the OAuth provider.
 */
export const GET: APIRoute = async ({ request, cookies, url, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  if (!(await checkRateLimit(`login:${ip}`, 5, 60 * 1000))) {
    console.warn(`[Seguridad] Múltiples intentos de login bloqueados para la IP: ${ip}`);
    return new Response(null, { status: 302, headers: { Location: '/?auth_error=rate_limit' } });
  }

  const provider = url.searchParams.get('provider');
  if (provider !== 'google' && provider !== 'github') {
    return new Response(null, { status: 302, headers: { Location: '/?auth_error=invalid_provider' } });
  }

  const returnTo = safeReturnTo(url.searchParams.get('returnTo'));

  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });

  // Store returnTo in a cookie (the Layout.astro JS also sets this, but ensure it's set server-side too)
  cookies.set('auth_returnTo', encodeURIComponent(returnTo), {
    path: '/',
    maxAge: 600,
    sameSite: 'lax',
    httpOnly: false,
  });

  // Use a clean callback URL without query params (avoids Supabase redirect URL mismatch)
  const redirectTo = `${url.origin}/api/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error || !data.url) {
    console.error('[Auth Login] OAuth error:', error?.message);
    return new Response(null, { status: 302, headers: { Location: '/?auth_error=oauth_failed' } });
  }

  // Use redirectWithCookies to guarantee PKCE verifier cookie is in the response
  return redirectWithCookies(data.url, responseCookies);
};
