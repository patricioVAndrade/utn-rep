import type { APIRoute } from 'astro';
import { json, readJson } from '../../lib/http';
import { cuantosEnLinea, latido, textoEnLinea } from '../../lib/en-linea';
import { VISITANTE_VALIDO } from '../../lib/links';
import { checkRateLimit } from '../../lib/rate-limit';
import { getClientIp } from '../../lib/request';

/**
 * POST /api/en-linea { visitante } (migración 10)
 * Lo manda cada pestaña abierta una vez por minuto. Devuelve el contador
 * (siempre, aunque sea 0) y sus textos.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const body: any = await readJson(request);
  const visitante = String(body?.visitante || '');
  if (!VISITANTE_VALIDO.test(visitante)) return json({ error: 'Visitante inválido.' }, 400);
  if (!(await checkRateLimit(`latido:${getClientIp(request, clientAddress)}`, 300, 60 * 1000))) return json({ error: 'Demasiados pedidos.' }, 429);
  const n = cuantosEnLinea(await latido(visitante));
  return json({ n, texto: textoEnLinea(n), corto: textoEnLinea(n, true) });
};
