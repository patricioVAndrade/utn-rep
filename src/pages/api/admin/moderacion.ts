import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { requireAdmin } from '../../../lib/admin-guards';
import { json } from '../../../lib/http';
import { registrar } from '../../../lib/moderacion';
import { limpiarPalabra } from '../../../lib/palabras';

/**
 * POST /api/admin/moderacion (migración 4)
 * - responder / borrar_respuesta: respuesta del moderador en una reseña o experiencia de final
 * - pedir_edicion / quitar_pedido: "Pedirle que la edite" (lo ve solo quien la escribió)
 * - agregar_palabra / quitar_palabra: lista de palabras marcadas
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
  const accion = String(body?.accion || '');
  const resenaId = Number(body?.resena_id) || null;
  const finalId = Number(body?.final_id) || null;
  const texto = typeof body?.texto === 'string' ? body.texto.trim() : '';
  const sobre = resenaId ? { resena_id: resenaId } : { final_id: finalId };
  const columna = resenaId ? 'resena_id' : 'final_id';
  const objetivo = resenaId ?? finalId;

  if (accion === 'responder') {
    if (!objetivo) return json({ error: 'Falta la reseña o el final.' }, 400);
    if (texto.length < 3 || texto.length > 1000) return json({ error: 'La respuesta tiene que tener entre 3 y 1000 caracteres.' }, 400);
    const { data: ya } = await supabaseAdmin.from('respuestas_moderador').select('id').eq(columna, objetivo).maybeSingle();
    const { error } = ya
      ? await supabaseAdmin.from('respuestas_moderador').update({ texto, updated_at: new Date().toISOString() }).eq('id', ya.id)
      : await supabaseAdmin.from('respuestas_moderador').insert({ ...sobre, texto });
    if (error) {
      console.error('Error guardando respuesta:', error);
      return json({ error: 'No se pudo guardar la respuesta.' }, 500);
    }
    await registrar(user.id, 'responder', { ...sobre, detalle: texto });
    return json({ success: true });
  }

  if (accion === 'borrar_respuesta') {
    if (!objetivo) return json({ error: 'Falta la reseña o el final.' }, 400);
    const { error } = await supabaseAdmin.from('respuestas_moderador').delete().eq(columna, objetivo);
    if (error) return json({ error: 'No se pudo borrar la respuesta.' }, 500);
    await registrar(user.id, 'borrar_respuesta', sobre);
    return json({ success: true });
  }

  if (accion === 'pedir_edicion' || accion === 'quitar_pedido') {
    if (!resenaId) return json({ error: 'Falta la reseña.' }, 400);
    const pedir = accion === 'pedir_edicion';
    if (pedir && (texto.length < 3 || texto.length > 500)) return json({ error: 'Contale qué cambiar (entre 3 y 500 caracteres).' }, 400);
    const { error } = await supabaseAdmin
      .from('resenas')
      .update(pedir ? { pedido_edicion: texto, pedido_edicion_at: new Date().toISOString() } : { pedido_edicion: null, pedido_edicion_at: null })
      .eq('id', resenaId);
    if (error) {
      console.error('Error en pedido de edición:', error);
      return json({ error: 'No se pudo guardar el pedido.' }, 500);
    }
    await registrar(user.id, accion, { resena_id: resenaId, detalle: pedir ? texto : null });
    return json({ success: true });
  }

  if (accion === 'agregar_palabra') {
    const palabra = limpiarPalabra(body?.palabra);
    if (palabra.length < 2 || palabra.length > 60) return json({ error: 'La palabra tiene que tener entre 2 y 60 caracteres.' }, 400);
    const { data, error } = await supabaseAdmin.from('palabras_marcadas').insert({ palabra }).select('id, palabra').single();
    if (error) {
      if (error.code === '23505') return json({ error: 'Esa palabra ya está en la lista.' }, 409);
      return json({ error: 'No se pudo agregar.' }, 500);
    }
    await registrar(user.id, 'agregar_palabra', { detalle: palabra });
    return json({ success: true, data });
  }

  if (accion === 'quitar_palabra') {
    const id = Number(body?.id);
    if (!id) return json({ error: 'Falta la palabra.' }, 400);
    const { data } = await supabaseAdmin.from('palabras_marcadas').select('palabra').eq('id', id).maybeSingle();
    const { error } = await supabaseAdmin.from('palabras_marcadas').delete().eq('id', id);
    if (error) return json({ error: 'No se pudo quitar.' }, 500);
    await registrar(user.id, 'quitar_palabra', { detalle: data?.palabra || null });
    return json({ success: true });
  }

  return json({ error: 'Acción no válida.' }, 400);
};
