import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { darDeBaja, firmaBajaValida } from '../../../lib/mail';

/**
 * POST /api/avisos/baja?u=…&t=… (migración 17)
 * Dejar de recibir mails sin iniciar sesión. Lo usa el botón de /baja (el
 * "Desuscribirse" de Gmail abre esa página: Astro no deja POST de otro sitio).
 * Apaga todos los mails de esa persona; los avisos en el sitio siguen.
 * No hay GET a propósito: los antivirus del correo abren los links solos.
 */
export const POST: APIRoute = async ({ request, url, redirect }) => {
  let u: unknown = url.searchParams.get('u');
  let t: unknown = url.searchParams.get('t');
  let desdePagina = false;
  const tipo = request.headers.get('content-type') || '';
  if (tipo.includes('form')) {
    const form = await request.formData().catch(() => null);
    if (form) {
      u = form.get('u') ?? u;
      t = form.get('t') ?? t;
      desdePagina = form.get('desde') === 'pagina';
    }
  }
  if (!firmaBajaValida(u, t)) {
    return desdePagina ? redirect('/baja?error=1', 303) : json({ error: 'El link no es válido.' }, 400);
  }
  const ok = await darDeBaja(supabaseAdmin, u);
  if (desdePagina) return redirect(ok ? '/baja?listo=1' : '/baja?error=1', 303);
  return ok ? json({ success: true }) : json({ error: 'No se pudo. Probá de nuevo.' }, 500);
};
