import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { isAdmin } from '../../../lib/admin';

/**
 * DELETE /api/resenas/:id
 * Deletes a review. Only the author can delete their own review.
 */
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  try {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'No autenticado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resenaId = parseInt(params.id || '');
  if (!resenaId || isNaN(resenaId)) {
    return new Response(JSON.stringify({ error: 'ID de reseña inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify the review exists and belongs to the user
  const { data: resena } = await supabase
    .from('resenas')
    .select('id, user_id')
    .eq('id', resenaId)
    .maybeSingle();

  if (!resena) {
    return new Response(JSON.stringify({ error: 'Reseña no encontrada.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (resena.user_id !== user.id && !isAdmin(user.id)) {
    return new Response(JSON.stringify({ error: 'No podés eliminar una reseña que no es tuya.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: deleteError } = await supabase
    .from('resenas')
    .delete()
    .eq('id', resenaId);

  if (deleteError) {
    console.error('Error deleting resena:', deleteError);
    return new Response(JSON.stringify({ error: 'No se pudo eliminar la reseña.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  } catch (err: any) {
    console.error('Unhandled error in DELETE /api/resenas/[id]:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * PUT /api/resenas/:id
 * Updates a review's comment. Only the author can edit their own review.
 */
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'No autenticado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resenaId = parseInt(params.id || '');
  if (!resenaId || isNaN(resenaId)) {
    return new Response(JSON.stringify({ error: 'ID de reseña inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { comentario } = body;

  if (!comentario || typeof comentario !== 'string' || comentario.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'El comentario debe tener al menos 10 caracteres.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (comentario.trim().length > 2000) {
    return new Response(JSON.stringify({ error: 'El comentario no puede superar los 2000 caracteres.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify ownership
  const { data: resena } = await supabase
    .from('resenas')
    .select('id, user_id')
    .eq('id', resenaId)
    .maybeSingle();

  if (!resena) {
    return new Response(JSON.stringify({ error: 'Reseña no encontrada.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (resena.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'No podés editar una reseña que no es tuya.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: updateError } = await supabase
    .from('resenas')
    .update({ comentario: comentario.trim() })
    .eq('id', resenaId);

  if (updateError) {
    console.error('Error updating resena:', updateError);
    return new Response(JSON.stringify({ error: 'No se pudo actualizar la reseña.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  } catch (err: any) {
    console.error('Unhandled error in PUT /api/resenas/[id]:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
