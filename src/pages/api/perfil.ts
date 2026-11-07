import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { json, readJson } from '../../lib/http';
import { parseBody, perfilSchema } from '../../lib/validation';

const DIAS_30 = 30 * 24 * 60 * 60 * 1000;

/**
 * POST /api/perfil (migración 5)
 * Guarda lo que cambia en Mi cuenta. Crea la fila la primera vez.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión para guardar.' }, 401);

  const body = await readJson(request);
  if (body === undefined) return json({ error: 'Body inválido.' }, 400);
  const parsed = parseBody(perfilSchema, body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const { pausar_como_te_fue, ...campos } = parsed.data;
  const cambios: Record<string, unknown> = { ...campos };
  if (pausar_como_te_fue) cambios.como_te_fue_pausa_hasta = new Date(Date.now() + DIAS_30).toISOString();
  if (campos.foto && campos.foto !== 'dibujo') cambios.dibujo = null;
  if (!Object.keys(cambios).length) return json({ error: 'No hay nada para guardar.' }, 400);

  const { error } = await client.from('perfiles').upsert({ user_id: user.id, ...cambios }, { onConflict: 'user_id' });
  if (error) {
    console.error('Error guardando perfil:', error);
    return json({ error: 'No se pudo guardar. Probá de nuevo.' }, 500);
  }

  // La foto de Google la guarda el servidor (nadie la puede escribir desde el sitio):
  // solo si la persona eligió mostrarla, y se borra si elige otra cosa (migración 8)
  if ('foto' in campos) {
    const url = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
    const valida = typeof url === 'string' && url.startsWith('https://') && url.length <= 500;
    const foto_url = campos.foto === 'google' && valida ? url : null;
    const { error: e2 } = await supabaseAdmin.from('perfiles').update({ foto_url }).eq('user_id', user.id);
    if (e2) console.error('Error guardando foto_url:', e2.message);
  }

  // El nombre también va a la sesión, para que el saludo de arriba lo use enseguida
  if ('nombre_mostrar' in campos) {
    await client.auth.updateUser({ data: { nombre_mostrar: campos.nombre_mostrar } }).catch(() => null);
  }
  return json({ success: true });
};
