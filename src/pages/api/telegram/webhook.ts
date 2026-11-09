import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { botonSitio, llamar, secretoValido } from '../../../lib/telegram';

/**
 * POST /api/telegram/webhook (migración 18)
 * Lo que la gente le escribe al bot. Telegram manda el secreto que se le dio
 * al conectar el bot (TELEGRAM_WEBHOOK_SECRET); sin él, no se hace nada.
 *  - /start CÓDIGO: vincula ese chat con la cuenta que pidió el link en Mi cuenta.
 *  - /start sin código: explica cómo conectarse.
 *  - /stop: desconecta.
 *  - Si alguien bloquea al bot, se lo desconecta.
 * Siempre responde 200 para que Telegram no reintente.
 */
export const POST: APIRoute = async ({ request, url }) => {
  if (!secretoValido(request.headers.get('x-telegram-bot-api-secret-token'))) return json({ error: 'No autorizado.' }, 401);
  const update: any = await request.json().catch(() => null);
  const origen = url.origin;
  try {
    // Bloqueó al bot o lo sacó
    const miembro = update?.my_chat_member;
    if (miembro && ['kicked', 'left'].includes(miembro.new_chat_member?.status)) {
      await supabaseAdmin.rpc('desvincular_telegram', { p_chat: miembro.chat.id });
      return json({ ok: true });
    }

    const msg = update?.message;
    if (!msg?.chat?.id || msg.chat.type !== 'private') return json({ ok: true });
    const chat = msg.chat.id as number;
    const texto = String(msg.text || '').trim();
    const responder = (text: string, extra: Record<string, unknown> = {}) =>
      llamar('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra });

    if (texto.startsWith('/start')) {
      const codigo = texto.slice(6).trim();
      if (!codigo) {
        await responder('Hola, soy el bot de <b>UTN REP</b>. Te aviso acá de lo nuevo en las materias que seguís, de las respuestas de la moderación y más.\n\nPara conectarte, entrá a Mi cuenta en el sitio y tocá <b>Conectar Telegram</b>.', botonSitio(origen));
        return json({ ok: true });
      }
      const { data: user, error } = await supabaseAdmin.rpc('vincular_telegram', {
        p_codigo: codigo.slice(0, 64),
        p_chat: chat,
        p_usuario: msg.from?.username || msg.from?.first_name || null,
      });
      if (error || !user) {
        await responder('Ese link ya venció o ya se usó. Generá uno nuevo en Mi cuenta, en <b>Conectar Telegram</b>.', botonSitio(origen));
        return json({ ok: true });
      }
      await responder('¡Listo! Desde ahora tus avisos de UTN REP te llegan acá, con el link directo, y no por mail.\n\nQué te llega lo elegís en Mi cuenta. Para desconectarte, mandá /stop.', botonSitio(origen, 'Elegir qué me llega'));
      return json({ ok: true });
    }

    if (texto === '/stop') {
      await supabaseAdmin.rpc('desvincular_telegram', { p_chat: chat });
      await responder('Listo, no te mandamos más avisos por acá. Los seguís viendo en el sitio (y por mail, si lo tenés prendido). Para volver, tocá Conectar Telegram en Mi cuenta.');
      return json({ ok: true });
    }

    await responder('Acá solo mando avisos. Para ver todo, entrá a UTN REP.', botonSitio(origen, 'Ver mis avisos', '/avisos'));
  } catch (e) {
    console.error('[telegram] Error con un mensaje:', (e as Error).message);
  }
  return json({ ok: true });
};
