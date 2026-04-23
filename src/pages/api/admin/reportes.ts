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
 * GET /api/admin/reportes
 * Returns all reported reviews with report details.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const user = await requireAdmin(request, cookies);
  if (!user) return json({ error: 'No autorizado.' }, 403);

  // Get all reports with review details
  const { data: reportes, error } = await supabaseAdmin
    .from('reportes_resenas')
    .select(`
      id, motivo, created_at,
      resena_id,
      resenas (
        id, comentario, calificacion_general, nombre_usuario, es_anonima,
        created_at, user_id, dictado_id,
        dictados (
          id,
          cursos ( identificador ),
          materias ( nombre )
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    return json({ error: 'Error obteniendo reportes.' }, 500);
  }

  // Group reports by resena_id
  const grouped: Record<number, {
    resena: any;
    reportes: Array<{ id: number; motivo: string | null; created_at: string }>;
    totalReportes: number;
  }> = {};

  for (const r of reportes || []) {
    const rid = r.resena_id;
    if (!grouped[rid]) {
      grouped[rid] = {
        resena: r.resenas,
        reportes: [],
        totalReportes: 0,
      };
    }
    grouped[rid].reportes.push({ id: r.id, motivo: r.motivo, created_at: r.created_at });
    grouped[rid].totalReportes++;
  }

  // Sort by total reports descending
  const result = Object.values(grouped).sort((a, b) => b.totalReportes - a.totalReportes);

  return json({ data: result });
};

/**
 * POST /api/admin/reportes
 * Actions: dismiss (delete reports) or delete_resena (delete review + reports)
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

  const { action, resena_id, reporte_ids } = body;

  if (action === 'dismiss') {
    // Dismiss specific reports (or all for a review)
    if (reporte_ids && Array.isArray(reporte_ids)) {
      const { error } = await supabaseAdmin
        .from('reportes_resenas')
        .delete()
        .in('id', reporte_ids);
      if (error) return json({ error: 'Error eliminando reportes.' }, 500);
    } else if (resena_id) {
      const { error } = await supabaseAdmin
        .from('reportes_resenas')
        .delete()
        .eq('resena_id', resena_id);
      if (error) return json({ error: 'Error eliminando reportes.' }, 500);
    } else {
      return json({ error: 'Se requiere resena_id o reporte_ids.' }, 400);
    }
    return json({ success: true });
  }

  if (action === 'delete_resena') {
    if (!resena_id) return json({ error: 'Se requiere resena_id.' }, 400);

    // Delete the review (cascade will delete reports too)
    const { error } = await supabaseAdmin
      .from('resenas')
      .delete()
      .eq('id', resena_id);
    if (error) {
      console.error('Error deleting review:', error);
      return json({ error: 'Error eliminando reseña.' }, 500);
    }
    return json({ success: true });
  }

  return json({ error: 'Acción no válida. Usa "dismiss" o "delete_resena".' }, 400);
};
