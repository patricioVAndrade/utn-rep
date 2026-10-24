import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { checkRateLimit } from '../../../lib/rate-limit';
import { json, readJson } from '../../../lib/http';
import { parseBody, votoSchema } from '../../../lib/validation';

/**
 * POST /api/resenas/votar
 * Marca (o desmarca) una reseña como útil. Requiere login: la base guarda
 * un voto por usuario y reseña (RPC `votar_resena`).
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'Iniciá sesión para votar.' }, 401);
  }

  // Máximo 30 acciones de voto por minuto por usuario
  if (!(await checkRateLimit(`votar:${user.id}`, 30, 60 * 1000))) {
    return json({ error: 'Demasiadas acciones. Esperá un momento.' }, 429);
  }

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);

  const parsed = parseBody(votoSchema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { resena_id, accion } = parsed.data;

  const { data: votos, error } = await supabase.rpc('votar_resena', {
    p_resena_id: resena_id,
    p_votar: accion === 'votar',
  });

  if (error) {
    // 23503 = foreign_key_violation: la reseña no existe
    if (error.code === '23503') return json({ error: 'Reseña no encontrada.' }, 404);
    console.error('[Votar Reseña] Error:', error);
    return json({ error: 'Error interno del servidor.' }, 500);
  }

  return json({ success: true, votos, votado: accion === 'votar' });
};
