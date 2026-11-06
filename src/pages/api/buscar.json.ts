import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

/**
 * GET /api/buscar.json
 * Datos livianos para el buscador del banner: materias, cursos y profesores.
 * Son públicos y cambian poco, así que se cachean en el CDN.
 */
export const GET: APIRoute = async () => {
  const [{ data: materias }, { data: dictados }, { data: profesores }] = await Promise.all([
    supabase.from('materias').select('id, nombre, nivel').order('nivel').order('nombre'),
    supabase.from('dictados').select('id, materia_id, cursos ( identificador, turno )'),
    supabase
      .from('profesores')
      .select('id, nombre_completo, dictado_profesores ( dictados ( materias ( nombre ) ) )')
      .order('nombre_completo'),
  ]);

  const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);

  const cursos = (dictados || [])
    .map((d: any) => {
      const curso = one<any>(d.cursos);
      return { id: d.id, materiaId: d.materia_id, curso: curso?.identificador || '', turno: curso?.turno || null };
    })
    .filter((c) => c.curso)
    .sort((a, b) => a.curso.localeCompare(b.curso, 'es', { numeric: true }));

  const profes = (profesores || []).map((p: any) => {
    const nombres = new Set<string>();
    (p.dictado_profesores || []).forEach((dp: any) => {
      const m = one<any>(one<any>(dp.dictados)?.materias);
      if (m?.nombre) nombres.add(m.nombre);
    });
    return { id: p.id, nombre: p.nombre_completo, materias: [...nombres] };
  });

  return new Response(
    JSON.stringify({ materias: materias || [], cursos, profesores: profes }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=3600',
      },
    },
  );
};
