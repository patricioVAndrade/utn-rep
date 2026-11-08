import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';
import { json, readJson } from '../../lib/http';
import { MAX_INSCRIPCION, idsDeTexto } from '../../lib/inscripcion';

/**
 * POST /api/inscripcion (F29, migración 12): "Lo estoy pensando".
 * { accion: 'agregar' | 'quitar' | 'elegir' | 'no_elegir', dictado_id }
 * { accion: 'quitar_materia', materia_id }
 * { accion: 'traer', dictados: [..], elegidos: [..] } pasa la lista del navegador a la cuenta.
 * Cada persona toca solo su lista (RLS); la materia de cada curso la completa la base.
 */
const ACCIONES = new Set(['agregar', 'quitar', 'elegir', 'no_elegir', 'quitar_materia', 'traer']);
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
  async function elegir(dictadoId: number) {
    const { data: fila, error } = await tabla().select('materia_id').eq('user_id', user!.id).eq('dictado_id', dictadoId).maybeSingle();
    if (error) return fallo(error, 'elegir');
    if (!fila) return json({ error: 'Ese curso no está en tu lista.' }, 404);
    const { error: e1 } = await tabla().update({ elegido: false }).eq('user_id', user!.id).eq('materia_id', (fila as any).materia_id).eq('elegido', true);
    if (e1) return fallo(e1, 'elegir');
    const { error: e2 } = await tabla().update({ elegido: true }).eq('user_id', user!.id).eq('dictado_id', dictadoId);
    if (e2) return fallo(e2, 'elegir');
    return null;
  }

  if (accion === 'traer') {
    const dictados = idsDeTexto((Array.isArray(body.dictados) ? body.dictados : []).join(','));
    const elegidos = idsDeTexto((Array.isArray(body.elegidos) ? body.elegidos : []).join(',')).filter((x) => dictados.includes(x));
    if (dictados.length) {
      const { error } = await tabla().upsert(dictados.map((d) => ({ user_id: user.id, dictado_id: d })), { onConflict: 'user_id,dictado_id', ignoreDuplicates: true });
      if (error && error.code !== 'IN001') return fallo(error, 'traer');
    }
    for (const d of elegidos) await elegir(d);
    return json({ success: true });
  }

  if (accion === 'quitar_materia') {
    const materiaId = id(body.materia_id);
    if (!materiaId) return json({ error: 'Materia inválida.' }, 400);
    const { error } = await tabla().delete().eq('user_id', user.id).eq('materia_id', materiaId);
    return error ? fallo(error, 'quitar materia') : json({ success: true });
  }

  const dictadoId = id(body.dictado_id);
  if (!dictadoId) return json({ error: 'Curso inválido.' }, 400);

  if (accion === 'agregar') return (await agregar(dictadoId)) || json({ success: true, esta: true });
  if (accion === 'quitar') {
    const { error } = await tabla().delete().eq('user_id', user.id).eq('dictado_id', dictadoId);
    return error ? fallo(error, 'quitar') : json({ success: true, esta: false });
  }
  if (accion === 'no_elegir') {
    const { error } = await tabla().update({ elegido: false }).eq('user_id', user.id).eq('dictado_id', dictadoId);
    return error ? fallo(error, 'no elegir') : json({ success: true });
  }
  // elegir: si no estaba en la lista, primero se suma
  const r = await agregar(dictadoId);
  if (r) return r;
  return (await elegir(dictadoId)) || json({ success: true, elegido: true });
};
