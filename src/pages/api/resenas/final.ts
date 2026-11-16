import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { json, readJson } from '../../../lib/http';

/**
 * POST /api/resenas/final (F34, migración 13): sumar o sacar el final de tu reseña.
 * { resena_id, final_id }  — final_id null lo saca.
 * Solo la reseña propia (RLS y el filtro por user_id). La base controla que
 * el final sea tuyo y de la misma materia (FN001) y que esté en una sola reseña.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const entero = (x: unknown) => (Number.isInteger(x) && (x as number) > 0 ? (x as number) : null);

export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión para cambiar tu reseña.' }, 401);

  const body: any = await readJson(request);
  const resenaId = entero(body?.resena_id);
  const f = body?.final_id;
  const finalId = f === null ? null : typeof f === 'string' && UUID.test(f) ? f : entero(f);
  if (!resenaId || (finalId === null && f !== null)) return json({ error: 'Falta la reseña o el final.' }, 400);

  const { data, error } = await client.from('resenas').update({ final_id: finalId }).eq('id', resenaId).eq('user_id', user.id).select('id');
  if (error) {
    if (error.code === 'FN001') return json({ error: 'Ese final no es tuyo o es de otra materia.' }, 400);
    if (error.code === '23505') return json({ error: 'Ese final ya está en otra de tus reseñas.' }, 409);
    console.error('Error sumando el final a la reseña:', error);
    return json({ error: 'No se pudo guardar. Probá de nuevo.' }, 500);
  }
  if (!Array.isArray(data) || !data.length) return json({ error: 'No encontré esa reseña entre las tuyas.' }, 404);
  return json({ ok: true });
};
