import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/request';
import { json, readJson } from '../../../lib/http';
import { normalizarEmail } from '../../../lib/auth-validation';
import { ingresoPruebaActivo } from '../../../lib/ingreso-prueba';

/**
 * POST /api/auth/prueba { email, clave }
 * Ingreso con contraseña, solo en Preview o en la compu con INGRESO_PRUEBA=1
 * (src/lib/ingreso-prueba.ts). En producción responde 404, como si no existiera.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress, url }) => {
  if (!ingresoPruebaActivo(url.hostname)) return json({ error: 'No encontrado.' }, 404);

  const ip = getClientIp(request, clientAddress);
  if (!(await checkRateLimit(`ingreso-prueba:${ip}`, 10, 10 * 60 * 1000))) {
    return json({ error: 'Demasiados intentos. Esperá unos minutos.' }, 429);
  }

  const body = (await readJson(request)) as { email?: unknown; clave?: unknown } | undefined;
  const escrito = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(escrito) || escrito.length > 200) return json({ error: 'Escribí el mail de tu cuenta de prueba.' }, 400);
  const clave = typeof body?.clave === 'string' ? body.clave : '';
  if (!clave || clave.length > 200) return json({ error: 'Escribí la contraseña.' }, 400);

  // El cliente guarda la sesión en las cookies de la respuesta
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  // Primero el mail tal cual; si no, como lo guarda el ingreso con mail (Gmail sin puntos)
  const normal = normalizarEmail(escrito);
  const mails = [escrito, ...(normal.ok && normal.email !== escrito ? [normal.email] : [])];
  let error: { message: string } | null = null;
  for (const email of mails) {
    ({ error } = await client.auth.signInWithPassword({ email, password: clave }));
    if (!error) break;
  }
  if (error) {
    console.error('[Ingreso de prueba]', error.message);
    return json({ error: 'El mail o la contraseña no coinciden con una cuenta de la base de prueba.' }, 401);
  }
  return json({ success: true });
};
