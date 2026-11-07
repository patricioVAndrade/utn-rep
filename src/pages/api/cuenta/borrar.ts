import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { json, readJson } from '../../../lib/http';
import { borrarCuentaSchema, parseBody } from '../../../lib/validation';

/**
 * POST /api/cuenta/borrar (migración 5)
 * Borra la cuenta de quien está con sesión. Sus reseñas y experiencias de finales
 * quedan como anónimas y sin dueño, o se borran, según elija.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión para borrar tu cuenta.' }, 401);

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);
  const parsed = parseBody(borrarCuentaSchema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  if (parsed.data.resenas === 'borrar') {
    const [r, f] = await Promise.all([
      supabaseAdmin.from('resenas').delete().eq('user_id', user.id),
      supabaseAdmin.from('experiencias_finales').delete().eq('user_id', user.id),
    ]);
    if (r.error || f.error) {
      console.error('Error borrando lo publicado:', r.error || f.error);
      return json({ error: 'No se pudo borrar. Tu cuenta sigue como estaba.' }, 500);
    }
  }

  // Lo que quede publicado pasa a anónimo y sin dueño, así no se borra con el usuario
  const { error: anonError } = await supabaseAdmin.rpc('anonimizar_usuario', { p_user: user.id });
  if (anonError) {
    console.error('Error anonimizando:', anonError);
    return json({ error: 'No se pudo borrar. Tu cuenta sigue como estaba.' }, 500);
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Error borrando usuario:', error);
    return json({ error: 'Tus reseñas ya quedaron anónimas, pero no se pudo borrar la cuenta. Probá de nuevo.' }, 500);
  }

  await client.auth.signOut().catch(() => null);
  return json({ success: true });
};
