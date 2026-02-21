import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { isAdmin } from '../../../lib/admin';

/** JSON response helper */
function json(data: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Shared delete logic */
async function handleDelete(params: Record<string, string | undefined>, request: Request, cookies: any) {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'No autenticado.' }, 401);
  }

  const resenaId = parseInt(params.id || '');
  if (!resenaId || isNaN(resenaId)) {
    return json({ error: 'ID de reseña inválido.' }, 400);
  }

  // Verify the review exists and belongs to the user
  const { data: resena } = await supabase
    .from('resenas')
    .select('id, user_id')
    .eq('id', resenaId)
    .maybeSingle();

  if (!resena) {
    return json({ error: 'Reseña no encontrada.' }, 404);
  }

  if (resena.user_id !== user.id && !isAdmin(user.id)) {
    return json({ error: 'No podés eliminar una reseña que no es tuya.', debug: { userId: user.id, resenaUserId: resena.user_id } }, 403);
  }

  const { error: deleteError } = await supabase
    .from('resenas')
    .delete()
    .eq('id', resenaId);

  if (deleteError) {
    console.error('Error deleting resena:', deleteError);
    return json({ error: 'No se pudo eliminar la reseña.' }, 500);
  }

  // Verify the row was actually removed (RLS can make delete a no-op)
  const { data: checkAfterDelete, error: checkError } = await supabase
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
    return json({ error: 'No autorizado para eliminar esta reseña (políticas de seguridad).', debug: { userId: user.id, resenaUserId: resena.user_id } }, 403);
  }

  return json({ success: true });
}

/** Shared edit logic */
async function handleEdit(params: Record<string, string | undefined>, request: Request, cookies: any, body: any) {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'No autenticado.' }, 401);
  }

  const resenaId = parseInt(params.id || '');
  if (!resenaId || isNaN(resenaId)) {
    return json({ error: 'ID de reseña inválido.' }, 400);
  }

  const { comentario } = body;

  if (!comentario || typeof comentario !== 'string' || comentario.trim().length < 10) {
    return json({ error: 'El comentario debe tener al menos 10 caracteres.' }, 400);
  }

  if (comentario.trim().length > 2000) {
    return json({ error: 'El comentario no puede superar los 2000 caracteres.' }, 400);
  }

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
    .update({ comentario: comentario.trim() })
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
    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Body inválido.' }, 400);
    }

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
    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Body inválido.' }, 400);
    }
    return await handleEdit(params, request, cookies, body);
  } catch (err: any) {
    console.error('Unhandled error in PUT /api/resenas/[id]:', err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
};
