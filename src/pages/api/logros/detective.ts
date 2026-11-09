import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { createSupabaseServerClient } from '../../../lib/supabase';

/**
 * POST /api/logros/detective (migración 16, logro secreto L9)
 * Lo manda el navegador cuando alguien toca "Anónimo" cinco veces seguidas.
 * La base solo da L9, a quien tiene la sesión. Devuelve { nuevo }.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ nuevo: false }, 401);
  const { data, error } = await client.rpc('ganar_detective');
  if (error) {
    console.error('[detective]', error.message);
    return json({ nuevo: false }, 500);
  }
  return json({ nuevo: data === true });
};
