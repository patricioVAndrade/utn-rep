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
 * GET /api/admin/dictados?materia_id=X
 * List dictados for a materia (or all), including professors and course info.
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const user = await requireAdmin(request, cookies);
  if (!user) return json({ error: 'No autorizado.' }, 403);

  const materiaId = url.searchParams.get('materia_id');

  let query = supabaseAdmin
    .from('dictados')
    .select(`
      id, curso_id, materia_id,
      cursos ( id, identificador, anio_carrera, turno ),
      materias ( id, nombre, nivel ),
      dictado_profesores (
        id,
        profesor_id,
        profesores ( id, nombre_completo )
      )
    `)
    .order('id');

  if (materiaId) {
    query = query.eq('materia_id', parseInt(materiaId));
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching dictados:', error);
    return json({ error: 'Error obteniendo dictados.' }, 500);
  }

  return json({ data });
};

/**
 * POST /api/admin/dictados
 * Actions: assign_profesor, remove_profesor, create, delete
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

  // ── ASSIGN: add a professor to a dictado ──
  if (action === 'assign_profesor') {
    const { dictado_id, profesor_id } = body;
    if (!dictado_id || !profesor_id) {
      return json({ error: 'Se requiere dictado_id y profesor_id.' }, 400);
    }

    // Check if already assigned
    const { data: existing } = await supabaseAdmin
      .from('dictado_profesores')
      .select('id')
      .eq('dictado_id', dictado_id)
      .eq('profesor_id', profesor_id)
      .maybeSingle();

    if (existing) {
      return json({ error: 'El profesor ya está asignado a este dictado.' }, 409);
    }

    const { data, error } = await supabaseAdmin
      .from('dictado_profesores')
      .insert({ dictado_id, profesor_id })
      .select()
      .single();

    if (error) {
      console.error('Error assigning profesor:', error);
      return json({ error: 'Error asignando profesor.' }, 500);
    }
    return json({ success: true, data }, 201);
  }

  // ── REMOVE: remove a professor from a dictado ──
  if (action === 'remove_profesor') {
    const { dictado_id, profesor_id } = body;
    if (!dictado_id || !profesor_id) {
      return json({ error: 'Se requiere dictado_id y profesor_id.' }, 400);
    }

    const { error } = await supabaseAdmin
      .from('dictado_profesores')
      .delete()
      .eq('dictado_id', dictado_id)
      .eq('profesor_id', profesor_id);

    if (error) {
      console.error('Error removing profesor:', error);
      return json({ error: 'Error removiendo profesor.' }, 500);
    }
    return json({ success: true });
  }

  // ── CREATE: create a new dictado ──
  if (action === 'create') {
    const { materia_id, curso_id } = body;
    if (!materia_id || !curso_id) {
      return json({ error: 'Se requiere materia_id y curso_id.' }, 400);
    }

    // Check if dictado already exists
    const { data: existing } = await supabaseAdmin
      .from('dictados')
      .select('id')
      .eq('materia_id', materia_id)
      .eq('curso_id', curso_id)
      .maybeSingle();

    if (existing) {
      return json({ error: 'Ya existe un dictado para esta materia y curso.', existingId: existing.id }, 409);
    }

    const { data, error } = await supabaseAdmin
      .from('dictados')
      .insert({ materia_id, curso_id })
      .select()
      .single();

    if (error) {
      console.error('Error creating dictado:', error);
      return json({ error: 'Error creando dictado.' }, 500);
    }
    return json({ success: true, data }, 201);
  }

  // ── DELETE: delete a dictado ──
  if (action === 'delete') {
    const { id } = body;
    if (!id) return json({ error: 'Se requiere id.' }, 400);

    // Remove professor assignments first
    await supabaseAdmin
      .from('dictado_profesores')
      .delete()
      .eq('dictado_id', id);

    const { error } = await supabaseAdmin
      .from('dictados')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dictado:', error);
      return json({ error: 'Error eliminando dictado.' }, 500);
    }
    return json({ success: true });
  }

  return json({ error: 'Acción no válida.' }, 400);
};
