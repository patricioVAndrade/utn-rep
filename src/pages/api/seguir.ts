import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { createSupabaseServerClient } from '../../lib/supabase';
import { json, readJson } from '../../lib/http';
import { parseBody } from '../../lib/validation';

const schema = z.object({
  materia_id: z.coerce.number({ invalid_type_error: 'Materia inválida.' }).int('Materia inválida.').positive('Materia inválida.'),
  seguir: z.boolean().optional(),
  mail: z.boolean().optional(),
});

/**
 * POST /api/seguir (F11, migración 6)
 * { materia_id, seguir: true|false } sigue o deja de seguir; { materia_id, mail } cambia el aviso por mail.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión para seguir materias.' }, 401);

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);
  const parsed = parseBody(schema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { materia_id, seguir, mail } = parsed.data;

  if (seguir === false) {
    const { error } = await client.from('seguimientos').delete().eq('user_id', user.id).eq('materia_id', materia_id);
    if (error) return json({ error: 'No se pudo dejar de seguir.' }, 500);
    return json({ success: true, sigue: false });
  }
  if (seguir === true) {
    const { error } = await client.from('seguimientos').insert({ user_id: user.id, materia_id });
    if (error && error.code !== '23505') {
      if (error.code === '23503') return json({ error: 'La materia no existe.' }, 404);
      console.error('Error siguiendo materia:', error);
      return json({ error: 'No se pudo seguir la materia.' }, 500);
    }
    return json({ success: true, sigue: true });
  }
  if (mail !== undefined) {
    const { error } = await client.from('seguimientos').update({ mail }).eq('user_id', user.id).eq('materia_id', materia_id);
    if (error) return json({ error: 'No se pudo guardar.' }, 500);
    return json({ success: true });
  }
  return json({ error: 'No hay nada para cambiar.' }, 400);
};
