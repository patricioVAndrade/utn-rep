import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { json, readJson } from '../../../lib/http';
import { parseBody } from '../../../lib/validation';
import { CANALES_AVISO, PREFERENCIAS_EDITABLES } from '../../../lib/avisos';

const EDITABLES = PREFERENCIAS_EDITABLES.flatMap((p) => p.tipos);
const schema = z.object({
  tipos: z.array(z.string()).min(1).refine((t) => t.every((x) => EDITABLES.includes(x)), 'Ese aviso no se puede apagar.'),
  canal: z.enum(CANALES_AVISO).default('sitio'),
  activo: z.boolean(),
});

/** POST /api/avisos/preferencias (migración 7): prende o apaga un tipo de aviso por un canal. */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión.' }, 401);

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);
  const parsed = parseBody(schema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { tipos, canal, activo } = parsed.data;

  const filas = tipos.map((tipo) => ({ user_id: user.id, tipo, canal, activo, updated_at: new Date().toISOString() }));
  const { error } = await client.from('preferencias_aviso').upsert(filas, { onConflict: 'user_id,tipo,canal' });
  if (error) {
    console.error('Error guardando preferencia de aviso:', error);
    return json({ error: 'No se pudo guardar.' }, 500);
  }
  return json({ success: true });
};
