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
 * GET /api/admin/stats
 * Returns dashboard statistics.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const user = await requireAdmin(request, cookies);
  if (!user) return json({ error: 'No autorizado.' }, 403);

  const [
    { count: totalMaterias },
    { count: totalCursos },
    { count: totalProfesores },
    { count: totalDictados },
    { count: totalResenas },
    { count: totalReportes },
  ] = await Promise.all([
    supabaseAdmin.from('materias').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('cursos').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profesores').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('dictados').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('resenas').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('reportes_resenas').select('id', { count: 'exact', head: true }),
  ]);

  // Recent reviews (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: resenasRecientes } = await supabaseAdmin
    .from('resenas')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);

  // Recent reviews list (last 10)
  const { data: ultimasResenas } = await supabaseAdmin
    .from('resenas')
    .select(`
      id, comentario, calificacion_general, nombre_usuario, es_anonima, created_at,
      dictados (
        cursos ( identificador ),
        materias ( nombre )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return json({
    stats: {
      totalMaterias: totalMaterias || 0,
      totalCursos: totalCursos || 0,
      totalProfesores: totalProfesores || 0,
      totalDictados: totalDictados || 0,
      totalResenas: totalResenas || 0,
      totalReportes: totalReportes || 0,
      resenasRecientes: resenasRecientes || 0,
    },
    ultimasResenas: ultimasResenas || [],
  });
};
