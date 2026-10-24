import type { APIRoute } from 'astro';
import { createSupabaseServerClient, redirectWithCookies } from '../../../lib/supabase';

/**
 * POST /api/auth/logout
 * Signs out the user and clears auth cookies.
 * Solo POST: con GET cualquier <img src="/api/auth/logout"> desloguearía al usuario.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });

  await supabase.auth.signOut();

  return redirectWithCookies('/', responseCookies, 303);
};

export const GET: APIRoute = () => new Response(null, { status: 302, headers: { Location: '/' } });
