import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';
import { json, readJson } from '../../lib/http';
import { MAX_INSCRIPCION, idsDeTexto } from '../../lib/inscripcion';

/**
 * POST /api/inscripcion (F29, migración 12): "Lo estoy pensando".
 * { accion: 'agregar' | 'quitar', dictado_id }
 * { accion: 'traer', dictados: [..] } pasa la lista del navegador a la cuenta.
 * Cada persona toca solo su lista (RLS); la materia de cada curso la completa la base.
 */
const ACCIONES = new Set(['agregar', 'quitar', 'traer']);
const id = (x: unknown) => (Number.isInteger(x) && (x as number) > 0 ? (x as number) : null);

export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión para guardar tu inscripción en tu cuenta.' }, 401);

  const body: any = await readJson(request);
  const accion = body?.accion;
  if (!ACCIONES.has(accion)) return json({ error: 'Acción inválida.' }, 400);
  const tabla = () => client.from('inscripcion_cursos');
  const fallo = (error: any, que: string) => {
    console.error(`Error en Mi inscripción (${que}):`, error);
    return json({ error: 'No se pudo guardar. Probá de nuevo.' }, 500);
  };

  async function agregar(dictadoId: number) {
    const { error } = await tabla().insert({ user_id: user!.id, dictado_id: dictadoId });
    if (!error || error.code === '23505') return null;
    if (error.code === '23503') return json({ error: 'Ese curso no existe.' }, 404);
    if (error.code === 'IN001') return json({ error: `Llegaste al máximo de ${MAX_INSCRIPCION} cursos. Sacá alguno para sumar otro.` }, 400);
    return fallo(error, 'agregar');
  }

  if (accion === 'traer') {
    const dictados = idsDeTexto((Array.isArray(body.dictados) ? body.dictados : []).join(','));
    if (dictados.length) {
      const { error } = await tabla().upsert(dictados.map((d) => ({ user_id: user.id, dictado_id: d })), { onConflict: 'user_id,dictado_id', ignoreDuplicates: true });
      if (error && error.code !== 'IN001') return fallo(error, 'traer');
    }
    return json({ success: true });
  }

  const dictadoId = id(body.dictado_id);
  if (!dictadoId) return json({ error: 'Curso inválido.' }, 400);

  if (accion === 'agregar') return (await agregar(dictadoId)) || json({ success: true, esta: true });
  const { error } = await tabla().delete().eq('user_id', user.id).eq('dictado_id', dictadoId);
  return error ? fallo(error, 'quitar') : json({ success: true, esta: false });
};
