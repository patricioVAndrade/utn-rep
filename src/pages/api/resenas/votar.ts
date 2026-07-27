import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { checkRateLimit } from '../../../lib/rate-limit';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // --- Seguridad Anti-Spam ---
  const ip = clientAddress || request.headers.get('x-forwarded-for') || '127.0.0.1';
  // Límite: Máximo 20 acciones de votos por minuto por IP (subimos un poco porque votar y desvotar cuenta doble)
  if (!checkRateLimit(ip, 20, 60 * 1000)) {
    return new Response(JSON.stringify({ error: 'Demasiadas acciones. Esperá un momento.' }), { status: 429 });
  }

  try {
    const body = await request.json();
    const { resena_id, accion } = body; // 'votar' o 'desvotar'

    if (!resena_id) {
      return new Response(JSON.stringify({ error: 'Falta el ID de la reseña.' }), { status: 400 });
    }

    const isVotar = accion !== 'desvotar'; // Por defecto, si no se envía acción, asume 'votar'

    // 1. Obtener los votos actuales de la reseña
    const { data: resena, error: fetchError } = await supabaseAdmin
      .from('resenas')
      .select('votos_utilidad')
      .eq('id', resena_id)
      .single();

    if (fetchError || !resena) {
      return new Response(JSON.stringify({ error: 'Reseña no encontrada.' }), { status: 404 });
    }

    // 2. Sumar o restar según la acción recibida (los votos nunca bajan de 0)
    let nuevosVotos = resena.votos_utilidad || 0;
    if (isVotar) {
      nuevosVotos += 1;
    } else {
      nuevosVotos = Math.max(0, nuevosVotos - 1);
    }

    // 3. Actualizar la base de datos
    const { error: updateError } = await supabaseAdmin
      .from('resenas')
      .update({ votos_utilidad: nuevosVotos })
      .eq('id', resena_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, votos: nuevosVotos }), { status: 200 });

  } catch (error) {
    console.error('[Votar Reseña] Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), { status: 500 });
  }
};