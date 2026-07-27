import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';
import { createSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Debes iniciar sesión para publicar.' }), { status: 401 });
  }

  const ip = clientAddress || request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip, 3, 60 * 60 * 1000)) {
    return new Response(JSON.stringify({ error: 'Llegaste al límite. Intentá de nuevo en una hora.' }), { status: 429 });
  }

  try {
    const body = await request.json();
    const { materia_id, anio, mesa, profesor_nombre, comentario } = body;

    if (!materia_id || !anio || !mesa || !comentario) {
      return new Response(JSON.stringify({ error: 'Faltan completar campos obligatorios.' }), { status: 400 });
    }

    const anioInt = parseInt(anio);
    const currentYear = new Date().getFullYear();
    if (isNaN(anioInt) || anioInt < 2015 || anioInt > currentYear) {
      return new Response(JSON.stringify({ error: 'Año de examen inválido.' }), { status: 400 });
    }

    if (comentario.trim().length < 10 || comentario.trim().length > 1000) {
      return new Response(JSON.stringify({ error: 'El comentario debe tener entre 10 y 1000 caracteres.' }), { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('experiencias_finales')
      .insert({
        user_id: user.id,
        materia_id: parseInt(materia_id),
        anio: anioInt,
        mesa: mesa.trim(),
        profesor_nombre: profesor_nombre ? profesor_nombre.trim() : null,
        comentario: comentario.trim()
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('[Finales Crear API] Error:', error);
    return new Response(JSON.stringify({ error: 'No se pudo guardar. Intentá de nuevo.' }), { status: 500 });
  }
};