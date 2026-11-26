import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { noAutorizado, requireAdmin } from '../../../lib/admin-guards';
import { isAdmin } from '../../../lib/admin';
import { json } from '../../../lib/http';
import { registrar } from '../../../lib/moderacion';

/**
 * POST /api/admin/usuarios (migración 9)
 * - bloquear { user_id, motivo }: no puede escribir, editar, votar ni reportar
 * - desbloquear { user_id }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const admin = await requireAdmin(request, cookies, { requireCsrf: true });
  if (!admin) return noAutorizado(request);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido.' }, 400);
  }
  const accion = String(body?.accion || '');
  const userId = String(body?.user_id || '');
  const motivo = typeof body?.motivo === 'string' ? body.motivo.trim().slice(0, 500) : '';
  if (!/^[0-9a-z-]{4,64}$/i.test(userId)) return json({ error: 'Falta la cuenta.' }, 400);
  if (accion !== 'bloquear' && accion !== 'desbloquear') return json({ error: 'Acción desconocida.' }, 400);
  if (accion === 'bloquear' && (isAdmin(userId) || userId === admin.id)) return json({ error: 'No se puede bloquear a un admin.' }, 400);

  const { data: cuenta } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!cuenta?.user) return json({ error: 'La cuenta no existe.' }, 404);
  const meta = cuenta.user.user_metadata || {};
  const nombre = meta.nombre_mostrar || meta.full_name || meta.name || (cuenta.user.email || '').split('@')[0] || 'Sin nombre';

  const cambios = accion === 'bloquear'
    ? { bloqueado_at: new Date().toISOString(), bloqueo_motivo: motivo || null }
    : { bloqueado_at: null, bloqueo_motivo: null };
  const { error } = await supabaseAdmin.from('perfiles').upsert({ user_id: userId, ...cambios }, { onConflict: 'user_id' });
  if (error) {
    console.error('[admin/usuarios]', error);
    return json({ error: 'No se pudo guardar. ¿Ya corriste la migración 9?' }, 500);
  }
  await registrar(admin.id, accion, { usuario_id: userId, detalle: motivo ? `${nombre}. ${motivo}` : nombre });
  return json({ success: true });
};
