import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';
import { DOMINIO } from '../lib/seo';

/**
 * GET /sitemap.xml
 * Materias, cursos, profesores y años. La fecha de cada materia y curso es la
 * de su última reseña (Google no le hace caso a una fecha que cambia siempre).
 */
export const GET: APIRoute = async () => {
  const [{ data: materias }, { data: dictados }, { data: profesores }, { data: resenas }] = await Promise.all([
    supabase.from('materias').select('id').order('id'),
    supabase.from('dictados').select('id, materia_id').order('id'),
    supabase.from('profesores').select('id').order('id'),
    supabase.from('resenas_publicas').select('dictado_id, created_at').order('created_at', { ascending: false }).limit(20000),
  ]);

  const dia = (iso: string) => iso.slice(0, 10);
  const ultimaCurso = new Map<number, string>();
  (resenas || []).forEach((r: any) => { if (!ultimaCurso.has(r.dictado_id)) ultimaCurso.set(r.dictado_id, dia(r.created_at)); });
  const ultimaMateria = new Map<number, string>();
  (dictados || []).forEach((d: any) => {
    const f = ultimaCurso.get(d.id);
    if (f && f > (ultimaMateria.get(d.materia_id) || '')) ultimaMateria.set(d.materia_id, f);
  });
  const ultimaSitio = [...ultimaMateria.values()].sort().pop();

  const urls: Array<{ loc: string; lastmod?: string }> = [
    { loc: '/', lastmod: ultimaSitio },
    { loc: '/recientes', lastmod: ultimaSitio },
    { loc: '/finales' },
    { loc: '/sobre' },
    { loc: '/terminos' },
    { loc: '/privacidad' },
  ];
  for (let i = 1; i <= 5; i++) urls.push({ loc: `/nivel/${i}` });
  (materias || []).forEach((m: any) => urls.push({ loc: `/materia/${m.id}`, lastmod: ultimaMateria.get(m.id) }));
  (dictados || []).forEach((d: any) => urls.push({ loc: `/dictado/${d.id}`, lastmod: ultimaCurso.get(d.id) }));
  (profesores || []).forEach((p: any) => urls.push({ loc: `/profesor/${p.id}` }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${DOMINIO}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
