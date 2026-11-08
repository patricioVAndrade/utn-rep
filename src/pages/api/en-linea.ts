import type { APIRoute } from 'astro';
import { json, readJson } from '../../lib/http';
import { latido, textoEnLinea } from '../../lib/en-linea';
import { VISITANTE_VALIDO } from '../../lib/links';
import { checkRateLimit } from '../../lib/rate-limit';
import { getClientIp } from '../../lib/request';

/**
 * POST /api/en-linea { visitante } (migración 10)
 * Lo manda cada pestaña abierta una vez por minuto. Devuelve el contador
 * (null si hay menos de 5 personas).
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const body: any = await readJson(request);
  const visitante = String(body?.visitante || '');
  if (!VISITANTE_VALIDO.test(visitante)) return json({ error: 'Visitante inválido.' }, 400);
  if (!(await checkRateLimit(`latido:${getClientIp(request, clientAddress)}`, 300, 60 * 1000))) return json({ error: 'Demasiados pedidos.' }, 429);
  const n = await latido(visitante);
  const texto = textoEnLinea(n);
  return json({ n: texto ? n : null, texto, corto: textoEnLinea(n, true) });
};
