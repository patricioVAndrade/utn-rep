import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/admin-guards';
import { json, readJson } from '../../../lib/http';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { llamar, secretoWebhook, token, usuarioBot } from '../../../lib/telegram';

/**
 * POST /api/admin/telegram (migración 18), admin + CSRF
 *  - { accion: "estado" }: si el bot está conectado, a qué dirección y cuántos lo usan.
 *  - { accion: "conectar" }: le dice a Telegram que mande los mensajes del bot a este
 *    sitio (con el secreto), carga los comandos y guarda la dirección del sitio en la
 *    base para el aviso inmediato. Se toca una vez en cada entorno (prueba y real).
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  const admin = await requireAdmin(request, cookies, { requireCsrf: true });
  if (!admin) return json({ error: 'No autorizado.' }, 403);
  const body = (await readJson(request)) as { accion?: string } | undefined;
  const falta = [!token() && 'TELEGRAM_BOT_TOKEN', !usuarioBot() && 'TELEGRAM_BOT_USERNAME', !secretoWebhook() && 'TELEGRAM_WEBHOOK_SECRET'].filter(Boolean);

  if (body?.accion === 'conectar') {
    if (falta.length) return json({ error: `Falta cargar en Vercel: ${falta.join(', ')}.` }, 400);
    if (!url.origin.startsWith('https://')) return json({ error: 'Telegram solo acepta direcciones https.' }, 400);
    const hook = await llamar('setWebhook', {
      url: `${url.origin}/api/telegram/webhook`,
      secret_token: secretoWebhook(),
      allowed_updates: ['message', 'my_chat_member'],
      drop_pending_updates: true,
    });
    if (!hook.ok) return json({ error: `Telegram dijo: ${hook.descripcion || hook.status}` }, 502);
    await llamar('setMyCommands', { commands: [
      { command: 'start', description: 'Cómo conectar tu cuenta de UTN REP' },
      { command: 'stop', description: 'Dejar de recibir avisos acá' },
    ] });
    await llamar('setMyDescription', { description: 'Avisos de UTN REP: reseñas y finales nuevos de las materias que seguís, respuestas de la moderación y más. Se conecta desde Mi cuenta en el sitio.' });
    await llamar('setMyShortDescription', { short_description: 'Avisos de UTN REP, reseñas de estudiantes para estudiantes.' });
    const { error } = await supabaseAdmin.from('ajustes_sitio').upsert({ clave: 'url_sitio', valor: url.origin });
    return json({ success: true, url_sitio: error ? null : url.origin });
  }

  if (body?.accion === 'estado') {
    const [info, { count }, { data: ajuste }] = await Promise.all([
      token() ? llamar('getWebhookInfo', {}) : Promise.resolve(null),
      supabaseAdmin.from('telegram_cuentas').select('user_id', { count: 'exact', head: true }),
      supabaseAdmin.from('ajustes_sitio').select('valor').eq('clave', 'url_sitio').maybeSingle(),
    ]);
    return json({
      falta,
      bot: usuarioBot() || null,
      webhook: info?.result?.url || null,
      ultimoError: info?.result?.last_error_message || null,
      conectados: count ?? 0,
      url_sitio: ajuste?.valor || null,
    });
  }

  return json({ error: 'Acción inválida.' }, 400);
};
