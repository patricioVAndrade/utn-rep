import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { json, readJson } from '../../../lib/http';
import { finalCreateSchema, parseBody } from '../../../lib/validation';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return json({ error: 'Debes iniciar sesión para publicar.' }, 401);

  // Máximo 3 experiencias por hora por usuario
  if (!(await checkRateLimit(`finales:${user.id}`, 3, 60 * 60 * 1000))) {
    return json({ error: 'Llegaste al límite. Intentá de nuevo en una hora.' }, 429);
  }

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);

  const parsed = parseBody(finalCreateSchema(), body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { materia_id, anio, mesa, profesor_nombre, comentario } = parsed.data;

  const { data: materia } = await supabaseAdmin
    .from('materias')
    .select('id')
    .eq('id', materia_id)
    .maybeSingle();
  if (!materia) return json({ error: 'La materia no existe.' }, 404);

  const { error: insertError } = await supabaseAdmin
    .from('experiencias_finales')
    .insert({ user_id: user.id, materia_id, anio, mesa, profesor_nombre, comentario });

  if (insertError) {
    console.error('[Finales Crear API] Error:', insertError);
    return json({ error: 'No se pudo guardar. Intentá de nuevo.' }, 500);
  }

  return json({ success: true });
};
