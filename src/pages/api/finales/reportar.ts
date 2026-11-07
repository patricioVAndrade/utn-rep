import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';
import { json, readJson } from '../../../lib/http';
import { parseBody, reporteFinalSchema } from '../../../lib/validation';

/**
 * POST /api/finales/reportar
 * Reporta una experiencia de final. Va a la cola de Reportes del admin.
 * La tabla `reportes_finales` solo se escribe desde acá (service role).
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Tenés que iniciar sesión para reportar.' }, 401);

  if (!(await checkRateLimit(`reportar:${user.id}`, 10, 60 * 60 * 1000))) {
    return json({ error: 'Llegaste al límite de reportes. Probá más tarde.' }, 429);
  }

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);
  const parsed = parseBody(reporteFinalSchema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { final_id, motivo } = parsed.data;

  const { error } = await supabaseAdmin.from('reportes_finales').insert({ final_id, user_id: user.id, motivo });
  if (error) {
    if (error.code === '23505') return json({ error: 'Ya reportaste esta experiencia.' }, 409);
    if (error.code === '23503') return json({ error: 'La experiencia ya no existe.' }, 404);
    console.error('[Reportar final] Error:', error);
    return json({ error: 'No se pudo enviar el reporte. Intentá de nuevo.' }, 500);
  }
  return json({ success: true }, 201);
};
