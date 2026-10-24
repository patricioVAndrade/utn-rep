import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';
import { json, readJson } from '../../lib/http';
import { parseBody, reporteSchema } from '../../lib/validation';

/**
 * POST /api/reportes
 * Reports a review. Requires authentication.
 * Tabla `reportes_resenas`: ver supabase/migrations.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: 'Tenés que iniciar sesión para reportar.' }, 401);
  }

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);

  const parsed = parseBody(reporteSchema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { resena_id, motivo } = parsed.data;

  const { data: existing } = await supabase
    .from('reportes_resenas')
    .select('id')
    .eq('resena_id', resena_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return json({ error: 'Ya reportaste esta reseña.' }, 409);

  const { error: insertError } = await supabase
    .from('reportes_resenas')
    .insert({ resena_id, user_id: user.id, motivo });

  if (insertError) {
    console.error('Error inserting report:', insertError);
    return json({ error: 'No se pudo enviar el reporte. Intentá de nuevo.' }, 500);
  }

  return json({ success: true }, 201);
};
