import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { json, readJson, esBloqueo, cuentaBloqueada } from '../../../lib/http';
import { finalCreateSchema, parseBody } from '../../../lib/validation';
import { displayName } from '../../../lib/user';

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
  const { materia_id, anio, mesa, profesor_nombre, comentario, con_nombre } = parsed.data;

  const { data: materia } = await supabaseAdmin
    .from('materias')
    .select('id')
    .eq('id', materia_id)
    .maybeSingle();
  if (!materia) return json({ error: 'La materia no existe.' }, 404);

  const { data: nuevo, error: insertError } = await supabaseAdmin
    .from('experiencias_finales')
    .insert({
      user_id: user.id, materia_id, anio, mesa, profesor_nombre, comentario,
      // Anónima por defecto. El nombre se guarda igual, para la moderación.
      es_anonima: !con_nombre,
      nombre_usuario: displayName(user).slice(0, 120),
    })
    .select('id')
    .single();

  if (insertError) {
    if (esBloqueo(insertError)) return cuentaBloqueada();
    console.error('[Finales Crear API] Error:', insertError);
    return json({ error: 'No se pudo guardar. Intentá de nuevo.' }, 500);
  }

  return json({ success: true, id: nuevo?.id ?? null, sumar: await resenaParaSumar(user.id, materia_id) });
};

/**
 * F34 (migración 13): una reseña tuya de esa materia que todavía no tiene
 * final, para ofrecerte sumarlo. null si no hay o si falta la migración.
 */
async function resenaParaSumar(userId: string, materiaId: number): Promise<number | null> {
  const { data: dictados } = await supabaseAdmin.from('dictados').select('id').eq('materia_id', materiaId);
  const ids = (dictados || []).map((d: any) => d.id);
  if (!ids.length) return null;
  const { data, error } = await supabaseAdmin.from('resenas').select('id, final_id').eq('user_id', userId).in('dictado_id', ids);
  if (error) return null;
  return (data || []).find((r: any) => r.final_id == null)?.id ?? null;
};
