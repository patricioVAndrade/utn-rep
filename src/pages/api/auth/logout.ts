import type { APIRoute } from 'astro';
import { createSupabaseServerClient, redirectWithCookies } from '../../../lib/supabase';

/**
 * POST /api/auth/logout
 * Signs out the user and clears auth cookies.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });

  await supabase.auth.signOut();

  return redirectWithCookies('/', responseCookies);
};
