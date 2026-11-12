import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { noAutorizado, requireAdmin } from '../../../lib/admin-guards';
import { json } from '../../../lib/http';
import { bloquesValidos, horaBase } from '../../../lib/horarios';


const ALLOWED_PERIODOS = new Set(['PRIMER_CUATRIMESTRE', 'SEGUNDO_CUATRIMESTRE', 'ANUAL']);

function normalizePeriodo(periodo: unknown): string | null {
  if (typeof periodo !== 'string') return null;
  const trimmed = periodo.trim().toUpperCase();
  if (!trimmed) return null;
  if (trimmed === 'PRIMER CUATRIMESTRE' || trimmed === '1ER CUATRIMESTRE' || trimmed === '1ER_CUATRIMESTRE' || trimmed === 'PRIMER_CUATRIMESTRE') return 'PRIMER_CUATRIMESTRE';
  if (trimmed === 'SEGUNDO CUATRIMESTRE' || trimmed === '2DO CUATRIMESTRE' || trimmed === '2DO_CUATRIMESTRE' || trimmed === 'SEGUNDO_CUATRIMESTRE') return 'SEGUNDO_CUATRIMESTRE';
  if (trimmed === 'ANUAL') return 'ANUAL';
  return null;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * GET /api/admin/dictados?materia_id=X
 * List dictados for a materia (or all), including professors and course info.
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const user = await requireAdmin(request, cookies);
  if (!user) return noAutorizado(request);

  const materiaId = url.searchParams.get('materia_id');

  let query = supabaseAdmin
    .from('dictados')
    .select(`
      id, curso_id, materia_id, es_contracuatrimestral, periodo_dictado, es_intensivo,
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
 * Actions: assign_profesor, remove_profesor, create, delete, update,
 * set_horarios { dictado_id, bloques: [{ cuatri, dia, desde, hasta }] } (minutos desde las 0:00):
 * reemplaza el horario del curso; con bloques vacío lo borra.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await requireAdmin(request, cookies, { requireCsrf: true });
  if (!user) return noAutorizado(request);

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

// ── UPDATE: update dictado properties (periodo_dictado, es_intensivo, es_contracuatrimestral) ──
  if (action === 'update') {
    const dictadoId = Number(body.dictado_id);
    if (!Number.isInteger(dictadoId) || dictadoId <= 0) {
      return json({ error: 'ID de dictado inválido.' }, 400);
    }

    const updatePayload: Record<string, any> = {};

    updatePayload.updated_at = new Date().toISOString();
    // Solo actualizar el periodo_dictado si efectivamente fue enviado en la petición
    if (body.periodo_dictado !== undefined) {
      if (body.periodo_dictado !== null && body.periodo_dictado !== '') {
        const p = normalizePeriodo(body.periodo_dictado);
        if (!p) return json({ error: 'Periodo de dictado inválido.' }, 400);
        
        updatePayload.periodo_dictado = p;
        // Si lo pasamos a anual, forzamos que no sea contracuatrimestral por lógica
        if (p === 'ANUAL') {
          updatePayload.es_contracuatrimestral = false;
        }
      } else {
        updatePayload.periodo_dictado = null;
      }
    }

    // Solo actualizar las etiquetas booleanas si fueron enviadas
    if (body.es_contracuatrimestral !== undefined) {
      updatePayload.es_contracuatrimestral = normalizeBoolean(body.es_contracuatrimestral);
    }

    if (body.es_intensivo !== undefined) {
      updatePayload.es_intensivo = normalizeBoolean(body.es_intensivo);
    }

    if (Object.keys(updatePayload).length === 0) {
       return json({ error: 'No hay datos para actualizar.' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('dictados')
      .update(updatePayload)
      .eq('id', dictadoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating dictado:', error);
      return json({ error: 'Error actualizando dictado.' }, 500);
    }

    // El horario va con el período: cuatrimestral, ese cuatrimestre; anual, todo el año
    if (updatePayload.periodo_dictado) {
      const p = updatePayload.periodo_dictado;
      const cuatri = p === 'PRIMER_CUATRIMESTRE' ? 1 : p === 'SEGUNDO_CUATRIMESTRE' ? 2 : null;
      const { error: eh } = await supabaseAdmin.from('horarios').update({ cuatri }).eq('dictado_id', dictadoId);
      if (eh) console.error('Error pasando el horario al período nuevo:', eh);
    }

    return json({ success: true, data });
  }

  // ── HORARIOS: reemplaza los del curso (migración 12) ──
  if (action === 'set_horarios') {
    const dictadoId = Number(body.dictado_id);
    if (!Number.isInteger(dictadoId) || dictadoId <= 0) return json({ error: 'ID de dictado inválido.' }, 400);
    const bloques = bloquesValidos(body.bloques);
    if (!bloques) return json({ error: 'Revisá los horarios: cada uno necesita día, y que termine después de empezar.' }, 400);
    const { data: existe } = await supabaseAdmin.from('dictados').select('id, periodo_dictado').eq('id', dictadoId).maybeSingle();
    if (!existe) return json({ error: 'Ese curso no existe.' }, 404);
    // El cuatrimestre sale del período del curso (anual: todo el año); sin período, el que vino
    const p = existe.periodo_dictado;
    const delPeriodo = p === 'PRIMER_CUATRIMESTRE' ? 1 : p === 'SEGUNDO_CUATRIMESTRE' ? 2 : null;
    // Sin repetir el mismo día y hora de inicio (la base no lo deja)
    const vistos = new Set<string>();
    const filas = bloques
      .map((b) => ({ ...b, cuatri: p ? delPeriodo : b.cuatri }))
      .filter((b) => { const k = `${b.cuatri ?? 0}-${b.dia}-${b.desde}`; if (vistos.has(k)) return false; vistos.add(k); return true; })
      .map((b) => ({ dictado_id: dictadoId, cuatri: b.cuatri, dia: b.dia, desde: horaBase(b.desde), hasta: horaBase(b.hasta) }));
    const { data: antes } = await supabaseAdmin.from('horarios').select('cuatri, dia, desde, hasta').eq('dictado_id', dictadoId);
    const { error: e1 } = await supabaseAdmin.from('horarios').delete().eq('dictado_id', dictadoId);
    if (e1) {
      console.error('Error borrando horarios:', e1);
      return json({ error: 'No se pudo guardar el horario.' }, 500);
    }
    if (filas.length) {
      const { error: e2 } = await supabaseAdmin.from('horarios').insert(filas);
      if (e2) {
        console.error('Error guardando horarios:', e2);
        // Se vuelve a dejar el que estaba
        if (antes?.length) await supabaseAdmin.from('horarios').insert(antes.map((h: any) => ({ ...h, dictado_id: dictadoId })));
        return json({ error: 'No se pudo guardar el horario.' }, 500);
      }
    }
    return json({ success: true, guardados: filas.length });
  }

  return json({ error: 'Acción no válida.' }, 400);
};
