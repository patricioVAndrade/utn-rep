import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { requireAdmin } from '../../../lib/admin-guards';

function json(data: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ALLOWED_TURNOS = new Set(['MAÑANA', 'TARDE', 'NOCHE', 'INDEFINIDO']);

function normalizeTurno(turno: string): string {
  const trimmed = turno.trim().toUpperCase();
  if (trimmed === 'MANANA') return 'MAÑANA';
  return trimmed;
}

function inferAnioCarrera(identificador: string): number | null {
  const match = identificador.match(/\d/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isInteger(num) ? num : null;
}

/**
 * POST /api/admin/cursos
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
    const { identificador, turno, anio_carrera } = body;

    if (!identificador || typeof identificador !== 'string' || identificador.trim().length < 2) {
      return json({ error: 'Identificador inválido (mínimo 2 caracteres).' }, 400);
    }

    const ident = identificador.trim().toUpperCase();
    const turnoNormalizado = normalizeTurno(String(turno || ''));
    if (!ALLOWED_TURNOS.has(turnoNormalizado)) {
      return json({ error: 'Turno inválido.' }, 400);
    }

    let anioNum = Number(anio_carrera);
    if (!Number.isInteger(anioNum) || anioNum < 1 || anioNum > 5) {
      const inferred = inferAnioCarrera(ident);
      anioNum = inferred ?? 0;
    }

    if (!Number.isInteger(anioNum) || anioNum < 1 || anioNum > 5) {
      return json({ error: 'Año de carrera inválido (1 a 5).' }, 400);
    }

    const { data: existing } = await supabaseAdmin
      .from('cursos')
      .select('id')
      .eq('identificador', ident)
      .maybeSingle();

    if (existing) {
      return json({ error: 'El curso ya existe.' }, 409);
    }

    const { data, error } = await supabaseAdmin
      .from('cursos')
      .insert({
        identificador: ident,
        anio_carrera: anioNum,
        turno: turnoNormalizado,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating curso:', error);
      return json({ error: 'Error creando curso.' }, 500);
    }

    return json({ success: true, data }, 201);
  }

  return json({ error: 'Acción no válida. Usa "create".' }, 400);
};
