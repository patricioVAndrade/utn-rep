import type { APIRoute } from 'astro';
import { createSupabaseServerClient, redirectWithCookies } from '../../../lib/supabase';

/**
 * GET /api/auth/login?provider=google|github&returnTo=/some/path
 * Generates the OAuth URL with PKCE, stores the code verifier as a cookie,
 * then redirects the user to the OAuth provider.
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const provider = url.searchParams.get('provider');

  if (provider !== 'google' && provider !== 'github') {
    return new Response(null, { status: 302, headers: { Location: '/?auth_error=invalid_provider' } });
  }

  const returnTo = url.searchParams.get('returnTo') || '/';

  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });

  // Pass returnTo through the callback URL itself (most reliable across redirects)
  const redirectTo = `${url.origin}/api/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;

  console.log('[Auth Login] Provider:', provider, '| Callback URL:', redirectTo);

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

  console.log('[Auth Login] PKCE cookies to set:', responseCookies.length, responseCookies.map(c => c.name));

  // Use redirectWithCookies to guarantee PKCE verifier cookie is in the response
  return redirectWithCookies(data.url, responseCookies);
};
