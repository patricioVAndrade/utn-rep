/**
 * Imagen al compartir Mi inscripción (6.4, Pato 16/11): la semana con los
 * cursos del link. /og/inscripcion.png?c=1,2,3&cuatri=1. Si no hay nada que
 * dibujar o algo falla, devuelve la genérica.
 */
import type { APIRoute } from 'astro';
import { imagenSemana, type BloqueOg } from '../../lib/og';
import { idsDeTexto } from '../../lib/inscripcion';
import { cuatrisInscripcion, materiasSim, periodoInscripcion } from '../../lib/simulador';
import { siglaMateria } from '../../lib/horarios';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ url, redirect }) => {
  try {
    const ids = idsDeTexto(url.searchParams.get('c')).slice(0, 40);
    const pedido = Number(url.searchParams.get('cuatri'));
    const cuatri = pedido === 1 || pedido === 2 ? pedido : periodoInscripcion().cuatri;
    if (!ids.length) return redirect('/og-image.png', 302);

    const { data } = await supabase.from('dictados').select('id, materia_id').in('id', ids);
    const materiaDe = new Map((data || []).map((d: any) => [d.id, d.materia_id]));
    const materias = await materiasSim([...new Set(ids.map((i) => materiaDe.get(i)).filter((x): x is number => !!x))]);

    // Como en la página: en cada materia, el del link con mejor puntaje; solo lo de ese cuatrimestre
    const bloques: (BloqueOg & { materia: number })[] = [];
    materias.forEach((m, i) => {
      const o = m.opciones.find((x) => ids.includes(x.id));
      if (!o || !o.cuatris.includes(cuatri)) return;
      for (const b of o.bloques) {
        if (b.cuatri !== null && b.cuatri !== cuatri) continue;
        bloques.push({ dia: b.dia, desde: b.desde, hasta: b.hasta, curso: o.curso, sigla: m.sigla || siglaMateria(m.nombre), nota: o.promedio, color: i, pisa: false, materia: m.id });
      }
    });
    if (!bloques.length) return redirect('/og-image.png', 302);
    for (const b of bloques) b.pisa = bloques.some((x) => x.materia !== b.materia && x.dia === b.dia && Math.max(x.desde, b.desde) < Math.min(x.hasta, b.hasta));

    const png = await imagenSemana({ cuatri: cuatrisInscripcion().find((c) => c.c === cuatri)!.texto, bloques });
    return new Response(png as BodyInit, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (e) {
    console.error('[og] No se pudo armar la semana:', (e as Error).message);
    return redirect('/og-image.png', 302);
  }
};
