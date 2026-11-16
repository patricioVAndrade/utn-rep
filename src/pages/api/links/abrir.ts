import type { APIRoute } from 'astro';
import { json, readJson } from '../../../lib/http';
import { CODIGO_VALIDO, VISITANTE_VALIDO, anotarApertura } from '../../../lib/links';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/request';
import { createSupabaseServerClient } from '../../../lib/supabase';

/**
 * POST /api/links/abrir { codigo, visitante, ruta } (migración 9)
 * Lo manda el navegador de quien abrió un link con ?de=. Va desde el
 * navegador (y no desde el servidor) para que la vista previa de WhatsApp
 * no cuente como una persona.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const body: any = await readJson(request);
  const codigo = String(body?.codigo || '');
  const visitante = String(body?.visitante || '');
  const ruta = String(body?.ruta || '');
  if (!CODIGO_VALIDO.test(codigo) || !VISITANTE_VALIDO.test(visitante) || !ruta.startsWith('/')) return json({ ok: false }, 400);
  if (!(await checkRateLimit(`abrir:${getClientIp(request, clientAddress)}`, 30, 60 * 60 * 1000))) return json({ ok: false }, 429);
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  const ok = await anotarApertura(codigo, visitante, ruta, user?.id);
  return json({ ok });
};
