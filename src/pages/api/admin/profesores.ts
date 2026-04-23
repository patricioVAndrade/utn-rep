import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { requireAdmin } from '../../../lib/admin-guards';

function json(data: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/admin/profesores
 * List all professors with their dictado assignments.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const user = await requireAdmin(request, cookies);
  if (!user) return json({ error: 'No autorizado.' }, 403);

  const { data, error } = await supabaseAdmin
    .from('profesores')
    .select(`
      id, nombre_completo,
      dictado_profesores (
        dictado_id,
        dictados (
          id,
          cursos ( identificador ),
          materias ( nombre, nivel )
        )
      )
    `)
    .order('nombre_completo');

  if (error) {
    console.error('Error fetching profesores:', error);
    return json({ error: 'Error obteniendo profesores.' }, 500);
  }

  return json({ data });
};

/**
 * POST /api/admin/profesores
 * Actions: create, update, delete
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await requireAdmin(request, cookies, { requireCsrf: true });
  if (!user) return json({ error: 'No autorizado.' }, 403);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido.' }, 400);
  }

  const { action } = body;

  // ── CREATE: add a new professor ──
  if (action === 'create') {
    const { nombre_completo } = body;
    if (!nombre_completo || typeof nombre_completo !== 'string' || nombre_completo.trim().length < 2) {
      return json({ error: 'Nombre inválido (mínimo 2 caracteres).' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('profesores')
      .insert({ nombre_completo: nombre_completo.trim() })
      .select()
      .single();

    if (error) {
      console.error('Error creating profesor:', error);
      return json({ error: 'Error creando profesor.' }, 500);
    }
    return json({ success: true, data }, 201);
  }

  // ── UPDATE: rename a professor ──
  if (action === 'update') {
    const { id, nombre_completo } = body;
    if (!id) return json({ error: 'Se requiere id.' }, 400);
    if (!nombre_completo || typeof nombre_completo !== 'string' || nombre_completo.trim().length < 2) {
      return json({ error: 'Nombre inválido (mínimo 2 caracteres).' }, 400);
    }

    const { error } = await supabaseAdmin
      .from('profesores')
      .update({ nombre_completo: nombre_completo.trim() })
      .eq('id', id);

    if (error) {
      console.error('Error updating profesor:', error);
      return json({ error: 'Error actualizando profesor.' }, 500);
    }
    return json({ success: true });
  }

  // ── DELETE: remove a professor ──
  if (action === 'delete') {
    const { id } = body;
    if (!id) return json({ error: 'Se requiere id.' }, 400);

    // First remove from dictado_profesores
    await supabaseAdmin
      .from('dictado_profesores')
      .delete()
      .eq('profesor_id', id);

    const { error } = await supabaseAdmin
      .from('profesores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting profesor:', error);
      return json({ error: 'Error eliminando profesor.' }, 500);
    }
    return json({ success: true });
  }

  return json({ error: 'Acción no válida. Usa "create", "update" o "delete".' }, 400);
};
