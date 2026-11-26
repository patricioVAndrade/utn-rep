import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { codigoDe } from '../../../lib/links';
import { createSupabaseServerClient } from '../../../lib/supabase';

/** GET /api/links/mio: tu código para los links que compartís (migración 9). */
export const GET: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ codigo: null });
  const codigo = await codigoDe(user.id);
  return json({ codigo });
};
