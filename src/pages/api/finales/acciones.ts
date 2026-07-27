import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { isAdmin } from '../../../lib/admin';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new Response(JSON.stringify({ error: 'Debes iniciar sesión.' }), { status: 401 });

  const userIsAdmin = isAdmin(user.id);

  try {
    const body = await request.json();
    const { accion, id, comentario } = body;

    if (!id || !accion) return new Response(JSON.stringify({ error: 'Faltan datos.' }), { status: 400 });

    // Buscar quién es el dueño del final
    const { data: exp } = await supabaseAdmin.from('experiencias_finales').select('user_id').eq('id', id).single();
    
    if (!exp) return new Response(JSON.stringify({ error: 'Experiencia no encontrada.' }), { status: 404 });

    if (accion === 'eliminar') {
      // Solo el autor o un admin puede eliminar
      if (exp.user_id !== user.id && !userIsAdmin) {
        return new Response(JSON.stringify({ error: 'No tienes permiso para eliminar esto.' }), { status: 403 });
      }
      await supabaseAdmin.from('experiencias_finales').delete().eq('id', id);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (accion === 'editar') {
      // Solo el autor puede editar su texto
      if (exp.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Solo el autor puede editar la experiencia.' }), { status: 403 });
      }
      if (!comentario || comentario.trim().length < 10) {
        return new Response(JSON.stringify({ error: 'El comentario debe tener al menos 10 caracteres.' }), { status: 400 });
      }
      await supabaseAdmin.from('experiencias_finales').update({ comentario: comentario.trim() }).eq('id', id);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Acción no válida.' }), { status: 400 });

  } catch (error) {
    console.error('[Acciones Finales API] Error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor.' }), { status: 500 });
  }
};