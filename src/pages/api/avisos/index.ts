import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { json, readJson } from '../../../lib/http';
import { parseBody } from '../../../lib/validation';

const schema = z.object({
  accion: z.enum(['leer', 'borrar'], { errorMap: () => ({ message: 'Acción no válida.' }) }),
  id: z.coerce.number().int().positive().optional(),
});

/**
 * POST /api/avisos (migración 7)
 * { accion: 'leer', id? } marca uno (o todos) como leídos; { accion: 'borrar', id } borra uno.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión.' }, 401);

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);
  const parsed = parseBody(schema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { accion, id } = parsed.data;

  if (accion === 'leer') {
    let q = client.from('notificaciones').update({ leida_at: new Date().toISOString() }).eq('user_id', user.id).is('leida_at', null);
    if (id) q = q.eq('id', id);
    const { error } = await q;
    if (error) return json({ error: 'No se pudo marcar.' }, 500);
    return json({ success: true });
  }
  if (!id) return json({ error: 'Falta el aviso.' }, 400);
  const { error } = await client.from('notificaciones').delete().eq('user_id', user.id).eq('id', id);
  if (error) return json({ error: 'No se pudo borrar.' }, 500);
  return json({ success: true });
};
