import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';
import { json, readJson } from '../../lib/http';
import { parseBody, resenaCreateSchema } from '../../lib/validation';

/**
 * POST /api/resenas
 * Creates a review. Requires authentication.
 * Anti-spam: max 1 review per user per dictado (unique constraint en la base).
 * Rate-limit: max 8 reviews per user per hour.
 * nombre_usuario, es_alumno_utn y votos_utilidad los completa un trigger en la base.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'Tenés que iniciar sesión para enviar una reseña.' }, 401);
  }

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);

  const parsed = parseBody(resenaCreateSchema(), body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { dictado_id, calificacion_general, anio_cursado, comentario, es_anonima, condicion_final } = parsed.data;

  // Rate-limit: max 8 reviews in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from('resenas')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo);

  if (recentCount !== null && recentCount >= 8) {
    return json({ error: 'Demasiadas reseñas en poco tiempo. Esperá un rato antes de escribir otra.' }, 429);
  }

  const { data: dictado } = await supabase
    .from('dictados')
    .select('id')
    .eq('id', dictado_id)
    .maybeSingle();

  if (!dictado) return json({ error: 'El curso no existe.' }, 404);

  const { error: insertError } = await supabase
    .from('resenas')
    .insert({
      dictado_id,
      calificacion_general,
      anio_cursado,
      comentario,
      user_id: user.id,
      es_anonima,
      condicion_final,
    });

  if (insertError) {
    // 23505 = unique_violation (unique_user_dictado)
    if (insertError.code === '23505') {
      return json({ error: 'Ya escribiste una reseña para este curso. Solo se permite una por curso.' }, 409);
    }
    console.error('Error inserting resena:', insertError);
    return json({ error: 'No se pudo guardar la reseña. Intentá de nuevo.' }, 500);
  }

  return json({ success: true }, 201);
};
