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
    const { nombre, nivel } = body;
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return json({ error: 'Nombre inválido (mínimo 2 caracteres).' }, 400);
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
      .insert({ nombre: nombreNormalizado, nivel: nivelNum })
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
