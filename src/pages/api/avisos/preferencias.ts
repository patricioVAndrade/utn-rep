import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { json, readJson } from '../../../lib/http';
import { parseBody } from '../../../lib/validation';
import { CANALES_AVISO, PREFERENCIAS_EDITABLES, TIPOS_AVISO } from '../../../lib/avisos';

const EDITABLES = PREFERENCIAS_EDITABLES.flatMap((p) => p.tipos);
/** Lo que llega por mail cuando se prende "Por mail" (lo mismo que manda quiere_mail() si no se tocó nada). */
const MAIL_POR_DEFECTO = ['pedido_edicion', 'respuesta_moderador', 'recordatorio', 'resena_nueva', 'final_nuevo'];

const schema = z.union([
  z.object({
    tipos: z.array(z.string()).min(1).refine((t) => t.every((x) => EDITABLES.includes(x)), 'Ese aviso no se puede apagar.'),
    canal: z.enum(CANALES_AVISO).default('sitio'),
    activo: z.boolean(),
  }),
  // "Por mail" de Mi cuenta: prende o apaga el mail de todo junto
  z.object({ todos: z.literal(true), canal: z.literal('mail'), activo: z.boolean() }),
]);

/** POST /api/avisos/preferencias (migración 7): prende o apaga un tipo de aviso por un canal, o el mail entero. */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión.' }, 401);

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);
  const parsed = parseBody(schema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const datos = parsed.data;
  const ahora = new Date().toISOString();

  const filas = 'todos' in datos
    ? TIPOS_AVISO.map((tipo) => ({ user_id: user.id, tipo, canal: 'mail', activo: datos.activo && MAIL_POR_DEFECTO.includes(tipo), updated_at: ahora }))
    : datos.tipos.map((tipo) => ({ user_id: user.id, tipo, canal: datos.canal, activo: datos.activo, updated_at: ahora }));
  const { error } = await client.from('preferencias_aviso').upsert(filas, { onConflict: 'user_id,tipo,canal' });
  if (error) {
    console.error('Error guardando preferencia de aviso:', error);
    return json({ error: 'No se pudo guardar.' }, 500);
  }
  if ('todos' in datos) {
    // Las materias que sigue también tienen su mail (mails_pendientes mira los dos)
    const { error: errSeg } = await client.from('seguimientos').update({ mail: datos.activo }).eq('user_id', user.id);
    if (errSeg) console.error('Error guardando el mail de las materias seguidas:', errSeg);
  }
  return json({ success: true });
};
