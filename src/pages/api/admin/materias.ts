import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { requireAdmin } from '../../../lib/admin-guards';

function json(data: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizeNombre(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * POST /api/admin/materias
 * Actions: create
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

  if (action === 'create') {
    const { nombre, nivel, es_electiva, puntos_electiva } = body;
    if (!nombre || !nivel) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
    }

    const nivelNum = Number(nivel);
    if (!Number.isInteger(nivelNum) || nivelNum < 1 || nivelNum > 5) {
      return json({ error: 'Nivel inválido (1 a 5).' }, 400);
    }

    const nombreNormalizado = normalizeNombre(nombre);

    const { data: existing } = await supabaseAdmin
      .from('materias')
      .select('id')
      .eq('nombre', nombreNormalizado)
      .maybeSingle();

    if (existing) {
      return json({ error: 'La materia ya existe.' }, 409);
    }

    const { data, error } = await supabaseAdmin
      .from('materias')
      .insert({ nombre: nombreNormalizado, nivel: nivelNum, es_electiva: !!es_electiva, puntos_electiva: parseInt(puntos_electiva) || 0 })
      .select()
      .single();

    if (error) {
      console.error('Error creating materia:', error);
      return json({ error: 'Error creando materia.' }, 500);
    }

    return json({ success: true, data }, 201);
  }

  return json({ error: 'Acción no válida. Usa "create".' }, 400);
};

/**
 * PUT /api/admin/materias
 * Actions: update
 */
export const PUT: APIRoute = async ({ request, cookies }) => {
  const user = await requireAdmin(request, cookies, { requireCsrf: true });
  if (!user) return json({ error: 'No autorizado.' }, 403);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido.' }, 400);
  }

  const { id, nombre, nivel, es_electiva, puntos_electiva } = body;

  if (!id || !nombre || !nivel) {
    return json({ error: 'Faltan datos.' }, 400);
  }

  const nivelNum = Number(nivel);
  if (!Number.isInteger(nivelNum) || nivelNum < 1 || nivelNum > 5) {
    return json({ error: 'Nivel inválido (1 a 5).' }, 400);
  }

  const nombreNormalizado = normalizeNombre(nombre);

  // Verificamos si existe otra materia (distinta a la que estamos editando) con el mismo nombre
  const { data: existing } = await supabaseAdmin
    .from('materias')
    .select('id')
    .eq('nombre', nombreNormalizado)
    .neq('id', id)
    .maybeSingle();

  if (existing) {
    return json({ error: 'Ya existe otra materia con ese nombre.' }, 409);
  }

  // Actualizamos la base de datos incluyendo las electivas
  const { data, error } = await supabaseAdmin
    .from('materias')
    .update({ 
      nombre: nombreNormalizado, 
      nivel: nivelNum,
      es_electiva: !!es_electiva,
      puntos_electiva: parseInt(puntos_electiva) || 0
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating materia:', error);
    return json({ error: 'Error actualizando materia.' }, 500);
  }

  return json({ success: true, data }, 200);
};
