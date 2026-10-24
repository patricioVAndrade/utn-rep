import type { APIRoute, AstroCookies } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { isAdmin } from '../../../lib/admin';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { json, readJson } from '../../../lib/http';
import { parseBody, resenaEditSchema } from '../../../lib/validation';

/** Shared delete logic */
async function handleDelete(params: Record<string, string | undefined>, request: Request, cookies: AstroCookies) {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'No autenticado.' }, 401);
  }

  const resenaId = parseInt(params.id || '');
  if (!resenaId || isNaN(resenaId)) {
    return json({ error: 'ID de reseña inválido.' }, 400);
  }

  // Los admins borran con la service role; el resto solo puede ver (y borrar) sus propias reseñas por RLS
  const userIsAdmin = isAdmin(user.id);
  const db = userIsAdmin ? supabaseAdmin : supabase;

  const { data: resena } = await db
    .from('resenas')
    .select('id, user_id')
    .eq('id', resenaId)
    .maybeSingle();

  if (!resena) {
    return json({ error: 'Reseña no encontrada.' }, 404);
  }

  if (resena.user_id !== user.id && !userIsAdmin) {
    return json({ error: 'No podés eliminar una reseña que no es tuya.' }, 403);
  }

  const { error: deleteError } = await db
    .from('resenas')
    .delete()
    .eq('id', resenaId);

  if (deleteError) {
    console.error('Error deleting resena:', deleteError);
    return json({ error: 'No se pudo eliminar la reseña.' }, 500);
  }

  // Verify the row was actually removed (RLS can make delete a no-op)
  const { data: checkAfterDelete, error: checkError } = await db
    .from('resenas')
    .select('id')
    .eq('id', resenaId)
    .maybeSingle();

  if (checkError) {
    console.error('Error verifying deletion:', checkError);
    return json({ error: 'Error verificando eliminación.' }, 500);
  }

  if (checkAfterDelete) {
    console.warn('Delete appeared to succeed but row still present (likely RLS).');
    return json({ error: 'No autorizado para eliminar esta reseña (políticas de seguridad).' }, 403);
  }

  return json({ success: true });
}

/** Shared edit logic */
async function handleEdit(params: Record<string, string | undefined>, request: Request, cookies: AstroCookies, body: unknown) {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'No autenticado.' }, 401);
  }

  const resenaId = parseInt(params.id || '');
  if (!resenaId || isNaN(resenaId)) {
    return json({ error: 'ID de reseña inválido.' }, 400);
  }

  const parsed = parseBody(resenaEditSchema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { comentario } = parsed.data;

  // Verify ownership
  const { data: resena } = await supabase
    .from('resenas')
    .select('id, user_id')
    .eq('id', resenaId)
    .maybeSingle();

  if (!resena) {
    return json({ error: 'Reseña no encontrada.' }, 404);
  }

  if (resena.user_id !== user.id) {
    return json({ error: 'No podés editar una reseña que no es tuya.' }, 403);
  }

  const { error: updateError } = await supabase
    .from('resenas')
    .update({ comentario })
    .eq('id', resenaId);

  if (updateError) {
    console.error('Error updating resena:', updateError);
    return json({ error: 'No se pudo actualizar la reseña.' }, 500);
  }

  return json({ success: true });
}

/**
 * POST /api/resenas/:id
 * Fallback endpoint: accepts _method in body to dispatch to DELETE or PUT.
 * Works around serverless platforms that don't reliably route DELETE/PUT.
 */
export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const body = await readJson(request) as Record<string, any> | undefined;
    if (!body) return json({ error: 'Body inválido.' }, 400);

    const method = (body._method || '').toUpperCase();

    if (method === 'DELETE') {
      return await handleDelete(params, request, cookies);
    } else if (method === 'PUT') {
      return await handleEdit(params, request, cookies, body);
    }

    return json({ error: 'Método no soportado.' }, 405);
  } catch (err: any) {
    console.error('Unhandled error in POST /api/resenas/[id]:', err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
};

/**
 * DELETE /api/resenas/:id
 */
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  try {
    return await handleDelete(params, request, cookies);
  } catch (err: any) {
    console.error('Unhandled error in DELETE /api/resenas/[id]:', err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
};

/**
 * PUT /api/resenas/:id
 */
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const body = await readJson(request) as Record<string, any> | undefined;
    if (!body) return json({ error: 'Body inválido.' }, 400);
    return await handleEdit(params, request, cookies, body);
  } catch (err: any) {
    console.error('Unhandled error in PUT /api/resenas/[id]:', err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
};
