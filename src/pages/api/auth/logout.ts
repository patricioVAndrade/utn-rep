import type { APIRoute } from 'astro';
import { createSupabaseServerClient, redirectWithCookies } from '../../../lib/supabase';

/**
 * GET /api/auth/logout
 * Signs out the user and clears auth cookies.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });

  await supabase.auth.signOut();

  return redirectWithCookies('/', responseCookies);
};
