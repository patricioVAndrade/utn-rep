import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { requireAdmin } from '../../../lib/admin-guards';

function json(data: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/admin/resenas
 * Admin actions on any review: delete, edit
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await requireAdmin(request, cookies, { requireCsrf: true });
  if (!user) return json({ error: 'No autorizado.' }, 403);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido.' }, 400);
  }

  const { action, resena_id } = body;

  if (!resena_id) return json({ error: 'Se requiere resena_id.' }, 400);

  // ── DELETE: admin delete any review ──
  if (action === 'delete') {
    const { error } = await supabaseAdmin
      .from('resenas')
      .delete()
      .eq('id', resena_id);

    if (error) {
      console.error('Error deleting review:', error);
      return json({ error: 'Error eliminando reseña.' }, 500);
    }
    return json({ success: true });
  }

  // ── EDIT: admin edit any review's comment ──
  if (action === 'edit') {
    const { comentario } = body;
    if (!comentario || typeof comentario !== 'string' || comentario.trim().length < 3) {
      return json({ error: 'Comentario inválido.' }, 400);
    }

    const { error } = await supabaseAdmin
      .from('resenas')
      .update({ comentario: comentario.trim() })
      .eq('id', resena_id);

    if (error) {
      console.error('Error editing review:', error);
      return json({ error: 'Error editando reseña.' }, 500);
    }
    return json({ success: true });
  }

  return json({ error: 'Acción no válida. Usa "delete" o "edit".' }, 400);
};
