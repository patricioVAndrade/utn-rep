import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

/**
 * Fechas de las últimas experiencias de finales, para el aviso "N nuevas" de la
 * pestaña. Se cachea unos minutos en Vercel para no consultar la base en cada página.
 */
export const GET: APIRoute = async () => {
  const { data } = await supabase.from('experiencias_finales_publicas').select('created_at').order('created_at', { ascending: false }).limit(50);
  return new Response(JSON.stringify({ fechas: (data || []).map((f) => f.created_at) }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
  });
};
