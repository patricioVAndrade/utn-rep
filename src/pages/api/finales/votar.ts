import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { checkRateLimit } from '../../../lib/rate-limit';
import { json, readJson, esBloqueo, cuentaBloqueada } from '../../../lib/http';
import { parseBody, votoFinalSchema } from '../../../lib/validation';

/**
 * POST /api/finales/votar
 * "Me sirvió" en una experiencia de final: un voto por persona (RPC `votar_final`).
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Iniciá sesión para votar.' }, 401);

  if (!(await checkRateLimit(`votar:${user.id}`, 30, 60 * 1000))) {
    return json({ error: 'Demasiadas acciones. Esperá un momento.' }, 429);
  }

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);
  const parsed = parseBody(votoFinalSchema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { final_id, accion } = parsed.data;

  const { data: votos, error } = await supabase.rpc('votar_final', { p_final_id: final_id, p_votar: accion === 'votar' });
  if (error) {
    if (esBloqueo(error)) return cuentaBloqueada();
    if (error.code === '23503') return json({ error: 'La experiencia ya no existe.' }, 404);
    console.error('[Votar final] Error:', error);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
  return json({ success: true, votos, votado: accion === 'votar' });
};
