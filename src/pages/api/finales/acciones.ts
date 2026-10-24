import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { isAdmin } from '../../../lib/admin';
import { json, readJson } from '../../../lib/http';
import { finalAccionSchema, parseBody } from '../../../lib/validation';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return json({ error: 'Debes iniciar sesión.' }, 401);

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);

  const parsed = parseBody(finalAccionSchema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const accion = parsed.data;

  // Buscar quién es el dueño del final
  const { data: exp } = await supabaseAdmin
    .from('experiencias_finales')
    .select('user_id')
    .eq('id', accion.id)
    .maybeSingle();

  if (!exp) return json({ error: 'Experiencia no encontrada.' }, 404);

  if (accion.accion === 'eliminar') {
    // Solo el autor o un admin puede eliminar
    if (exp.user_id !== user.id && !isAdmin(user.id)) {
      return json({ error: 'No tienes permiso para eliminar esto.' }, 403);
    }
    const { error } = await supabaseAdmin.from('experiencias_finales').delete().eq('id', accion.id);
    if (error) {
      console.error('[Acciones Finales API] Error eliminando:', error);
      return json({ error: 'Error del servidor.' }, 500);
    }
    return json({ success: true });
  }

  // Solo el autor puede editar su texto
  if (exp.user_id !== user.id) {
    return json({ error: 'Solo el autor puede editar la experiencia.' }, 403);
  }
  const { error } = await supabaseAdmin
    .from('experiencias_finales')
    .update({ comentario: accion.comentario })
    .eq('id', accion.id);
  if (error) {
    console.error('[Acciones Finales API] Error editando:', error);
    return json({ error: 'Error del servidor.' }, 500);
  }
  return json({ success: true });
};
