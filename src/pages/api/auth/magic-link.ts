import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/request';
import { json, readJson } from '../../../lib/http';
import { safeReturnTo } from '../../../lib/redirect';
import { formatearNombre, normalizarEmail, validarNombre } from '../../../lib/auth-validation';

/**
 * POST /api/auth/magic-link
 * Sends a magic link email. Validates email domain and name.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  // 1. Rate limit: 3 magic links por hora por IP
  const ip = getClientIp(request, clientAddress);
  if (!(await checkRateLimit(`magic-link:${ip}`, 3, 60 * 60 * 1000))) {
    return json({ error: 'Demasiados intentos. Esperá un rato antes de intentar de nuevo.' }, 429);
  }

  const body = await readJson(request) as Record<string, unknown> | undefined;
  if (!body) return json({ error: 'Body inválido.' }, 400);

  // 2. Email
  const emailResult = normalizarEmail(body.email);
  if (!emailResult.ok) return json({ error: emailResult.error }, 400);

  // 3. Nombre
  if (!body.nombre || typeof body.nombre !== 'string') {
    return json({ error: 'Nombre requerido.' }, 400);
  }
  const errorNombre = validarNombre(body.nombre);
  if (errorNombre) return json({ error: errorNombre }, 400);

  // 4. Rate limit por email (evita que se usen muchas IPs contra la misma casilla)
  if (!(await checkRateLimit(`magic-link-email:${emailResult.email}`, 3, 60 * 60 * 1000))) {
    return json({ error: 'Ya te enviamos varios links. Revisá tu bandeja (y spam) o esperá un rato.' }, 429);
  }

  // 5. Send magic link via Supabase
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const returnTo = safeReturnTo(typeof body.returnTo === 'string' ? body.returnTo : null);
  const baseUrl = new URL('/', request.url).origin;

  const { error } = await supabase.auth.signInWithOtp({
    email: emailResult.email,
    options: {
      data: { full_name: formatearNombre(body.nombre) },
      emailRedirectTo: `${baseUrl}${returnTo}`,
    },
  });

  if (error) {
    console.error('[Magic Link] Error:', error.message);
    if (error.message.includes('rate') || error.message.includes('limit')) {
      return json({ error: 'Demasiados intentos. Esperá unos minutos.' }, 429);
    }
    return json({ error: 'No se pudo enviar el email. Intentá de nuevo.' }, 500);
  }

  return json({
    success: true,
    message: 'Te enviamos un link de acceso a tu email. Revisá tu bandeja de entrada (y spam).',
  });
};
