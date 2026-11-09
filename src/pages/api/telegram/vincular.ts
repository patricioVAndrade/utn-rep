import type { APIRoute } from 'astro';
import { json, readJson } from '../../../lib/http';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { llamar, nuevoCodigo, telegramListo, usuarioBot } from '../../../lib/telegram';

/**
 * POST /api/telegram/vincular (migración 18)
 *  - { accion: "conectar" }: devuelve { link } al bot con un código de un solo uso (30 minutos).
 *  - { accion: "desconectar" }: borra el Telegram de la cuenta y le avisa por ahí.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Iniciá sesión.' }, 401);
  const body = (await readJson(request)) as { accion?: string } | undefined;

  if (body?.accion === 'desconectar') {
    const { data: fila } = await supabaseAdmin.from('telegram_cuentas').select('chat_id').eq('user_id', user.id).maybeSingle();
    if (!fila) return json({ success: true });
    const { error } = await supabaseAdmin.rpc('desvincular_telegram', { p_chat: fila.chat_id });
    if (error) return json({ error: 'No se pudo desconectar. Probá de nuevo.' }, 500);
    await llamar('sendMessage', { chat_id: fila.chat_id, text: 'Desconectaste UTN REP de este Telegram. Tus avisos siguen en el sitio.' });
    return json({ success: true });
  }

  if (body?.accion !== 'conectar') return json({ error: 'Acción inválida.' }, 400);
  if (!telegramListo()) return json({ error: 'Telegram todavía no está disponible.' }, 503);
  const codigo = nuevoCodigo();
  const { error } = await supabaseAdmin.from('telegram_codigos').insert({ codigo, user_id: user.id });
  if (error) {
    console.error('[telegram] No se pudo crear el código:', error.message);
    return json({ error: 'No se pudo. Probá de nuevo.' }, 500);
  }
  return json({ link: `https://t.me/${usuarioBot()}?start=${codigo}` });
};
