/**
 * Imagen al compartir de cada página: /og/curso/ID.png, /og/materia/ID.png,
 * /og/profesor/ID.png y /og/anio/N.png. Si algo falla, devuelve la genérica.
 */
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { imagenOg, type DatosOg } from '../../../lib/og';
import { anioLabel, turnoLabel } from '../../../lib/format';

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ponderado(stats: { cantidad: number; promedio: number }[]) {
  const total = stats.reduce((a, s) => a + (s.cantidad || 0), 0);
  const nota = total ? stats.reduce((a, s) => a + (s.cantidad ? s.promedio * s.cantidad : 0), 0) / total : null;
  return { nota, total };
}

async function datos(tipo: string, id: number): Promise<DatosOg | null> {
  if (tipo === 'curso') {
    const { data: d } = await supabase.from('dictados').select('id, cursos ( identificador, turno ), materias ( nombre, nivel )').eq('id', id).single();
    if (!d) return null;
    const curso = one(d.cursos as any) as { identificador: string; turno: string | null } | null;
    const materia = one(d.materias as any) as { nombre: string; nivel: number } | null;
    const { data: st } = await supabase.from('stats_dictados').select('cantidad, promedio').eq('dictado_id', id);
    const { nota, total } = ponderado(st || []);
    return {
      titulo: materia?.nombre || 'Curso',
      etiquetas: [
        { texto: curso?.identificador || '', tipo: 'curso' },
        ...(curso?.turno ? [{ texto: turnoLabel(curso.turno), tipo: 'turno' as const }] : []),
        ...(materia?.nivel ? [{ texto: `${materia.nivel}.º año`, tipo: 'anio' as const, anio: materia.nivel }] : []),
      ],
      nota, resenas: total, pie: 'Todavía sin reseñas. ¿Lo cursaste?',
    };
  }
  if (tipo === 'materia') {
    const { data: m } = await supabase.from('materias').select('nombre, nivel, es_electiva').eq('id', id).single();
    if (!m) return null;
    const { data: st } = await supabase.from('stats_dictados').select('cantidad, promedio').eq('materia_id', id);
    const { nota, total } = ponderado(st || []);
    return {
      titulo: m.nombre,
      etiquetas: [
        { texto: `${m.nivel}.º año`, tipo: 'anio', anio: m.nivel },
        { texto: `${(st || []).length} curso${(st || []).length === 1 ? '' : 's'}`, tipo: 'gris' },
        ...(m.es_electiva ? [{ texto: 'Electiva', tipo: 'gris' as const }] : []),
      ],
      nota, resenas: total, pie: 'Todavía sin reseñas. ¿La cursaste?',
    };
  }
  if (tipo === 'profesor') {
    const { data: p } = await supabase.from('profesores').select('nombre_completo').eq('id', id).single();
    if (!p) return null;
    const { data: dps } = await supabase.from('dictado_profesores').select('dictados ( materias ( nombre ) )').eq('profesor_id', id);
    const materias = [...new Set((dps || []).map((x: any) => one(one(x.dictados as any)?.materias as any) as any).map((m: any) => m?.nombre).filter(Boolean))] as string[];
    const n = (dps || []).length;
    return {
      arriba: 'Profesor o profesora',
      titulo: p.nombre_completo,
      etiquetas: materias.slice(0, 3).map((t) => ({ texto: t.length > 34 ? t.slice(0, 32) + '…' : t, tipo: 'gris' as const })),
      pie: `Da clases en ${n} curso${n === 1 ? '' : 's'}. Mirá qué dicen de sus cursos.`,
    };
  }
  if (tipo === 'anio') {
    if (id < 1 || id > 5) return null;
    const { data: ms } = await supabase.from('materias').select('id').eq('nivel', id);
    const ids = (ms || []).map((m) => m.id);
    const { data: st } = ids.length ? await supabase.from('stats_dictados').select('cantidad, promedio').in('materia_id', ids) : { data: [] };
    const { total } = ponderado(st || []);
    return {
      titulo: `Materias de ${anioLabel(id)}`.replace(/de (.)/, (_, c) => `de ${c}`),
      etiquetas: [{ texto: `${id}.º año`, tipo: 'anio', anio: id }, { texto: `${ids.length} materias`, tipo: 'gris' }],
      pie: `${total} reseña${total === 1 ? '' : 's'} de estudiantes. ${mayus('elegí mejor tu curso.')}`,
    };
  }
  return null;
}

export const GET: APIRoute = async ({ params, redirect }) => {
  const tipo = params.tipo || '';
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return redirect('/og-image.png', 302);
  try {
    const d = await datos(tipo, id);
    if (!d) return redirect('/og-image.png', 302);
    const png = await imagenOg(d);
    return new Response(png as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e) {
    console.error('[og] No se pudo armar la imagen:', (e as Error).message);
    return redirect('/og-image.png', 302);
  }
};
