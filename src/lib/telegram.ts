// Avisos por Telegram (migración 18).
// Telegram no tiene tope diario como Brevo: quien conecta el bot recibe sus
// avisos al instante por ahí, con el link directo, y deja de recibir el mail.
// El bot lo crea Pato con @BotFather (ver docs/TELEGRAM.md); el sitio solo
// necesita TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME y TELEGRAM_WEBHOOK_SECRET.
import { randomBytes, timingSafeEqual } from 'node:crypto';

export const token = () => import.meta.env.TELEGRAM_BOT_TOKEN || '';
export const usuarioBot = () => (import.meta.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
export const secretoWebhook = () => import.meta.env.TELEGRAM_WEBHOOK_SECRET || '';
export const telegramListo = () => Boolean(token() && usuarioBot());

/** Avisos que se mandan por corrida (Telegram deja ~30 mensajes por segundo). */
const POR_CORRIDA = 120;
/** Avisos que se listan en un solo mensaje; el resto se cuenta. */
const POR_MENSAJE = 6;

export type RespuestaTelegram = { ok: boolean; status: number; descripcion?: string };

export async function llamar(metodo: string, cuerpo: Record<string, unknown>): Promise<RespuestaTelegram & { result?: any }> {
  const t = token();
  if (!t) return { ok: false, status: 0, descripcion: 'Falta TELEGRAM_BOT_TOKEN' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${t}/${metodo}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const data: any = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok === true, status: res.status, descripcion: data.description, result: data.result };
  } catch (e) {
    return { ok: false, status: 0, descripcion: (e as Error).message };
  }
}

export function secretoValido(dado: string | null): boolean {
  const s = secretoWebhook();
  if (!s || !dado || dado.length !== s.length) return false;
  return timingSafeEqual(Buffer.from(dado), Buffer.from(s));
}

export const nuevoCodigo = () => randomBytes(18).toString('base64url');

// ---------------------------------------------------------------- mensajes
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const BOTON: Record<string, string> = {
  resena_nueva: 'Ver la reseña',
  final_nuevo: 'Ver el final',
  te_sirvio: 'Ver mis reseñas',
  respuesta_moderador: 'Ver la respuesta',
  pedido_edicion: 'Editar mi reseña',
  logro: 'Ver mis logros',
  recordatorio: 'Escribir la reseña',
};

export interface AvisoTelegram { id: number; user_id: string; chat_id: number; tipo: string; titulo: string; texto: string | null; link: string | null }

/** Un mensaje por persona: con un aviso lleva botón; con varios, un link en cada uno. */
export function armarMensaje(avisos: AvisoTelegram[], origen: string) {
  const url = (link: string | null) => origen + (link && link.startsWith('/') ? link : '/avisos');
  // Telegram no acepta botones a localhost: en desarrollo van solo como texto
  const botones = origen.startsWith('https://');
  if (avisos.length === 1) {
    const a = avisos[0];
    const text = `<b>${esc(a.titulo)}</b>${a.texto ? `\n${esc(a.texto)}` : ''}${botones ? '' : `\n${url(a.link)}`}`;
    return {
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(botones ? { reply_markup: { inline_keyboard: [[{ text: BOTON[a.tipo] || 'Abrir en UTN REP', url: url(a.link) }]] } } : {}),
    };
  }
  const lista = avisos.slice(0, POR_MENSAJE);
  const resto = avisos.length - lista.length;
  const lineas = lista.map((a) => `• <a href="${esc(url(a.link))}">${esc(a.titulo)}</a>${a.texto ? `\n   ${esc(a.texto)}` : ''}`);
  const text = `<b>Tenés ${avisos.length} avisos nuevos en UTN REP</b>\n\n${lineas.join('\n')}${resto > 0 ? `\n\nY ${resto} más.` : ''}`;
  return {
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...(botones ? { reply_markup: { inline_keyboard: [[{ text: 'Ver mis avisos', url: `${origen}/avisos` }]] } } : {}),
  };
}

export const botonSitio = (origen: string, texto = 'Ir a Mi cuenta', ruta = '/mi-cuenta#avisos') =>
  origen.startsWith('https://') ? { reply_markup: { inline_keyboard: [[{ text: texto, url: origen + ruta }]] } } : {};

/**
 * Manda lo pendiente de quienes tienen Telegram. La base marca cada aviso al
 * tomarlo (reclamar_telegram), así dos corridas a la vez no lo mandan dos veces.
 * Si alguien bloqueó al bot, se lo desconecta y lo suyo vuelve a ir por mail.
 */
export async function despacharTelegram(admin: any, origen: string) {
  if (!token()) return { ok: true as const, enviados: 0, sinConfigurar: true };
  const { data, error } = await admin.rpc('reclamar_telegram', { p_limite: POR_CORRIDA });
  if (error) return { ok: false as const, error: 'No se pudieron leer los avisos (¿falta la migración 18?).' };
  const porChat = new Map<number, AvisoTelegram[]>();
  for (const a of (data || []) as AvisoTelegram[]) {
    const lista = porChat.get(a.chat_id) || [];
    lista.push(a);
    porChat.set(a.chat_id, lista);
  }
  let enviados = 0, desconectados = 0, devueltos = 0;
  const chats = [...porChat.entries()];
  for (let i = 0; i < chats.length; i += 20) {
    await Promise.all(chats.slice(i, i + 20).map(async ([chat, avisos]) => {
      const r = await llamar('sendMessage', { chat_id: chat, ...armarMensaje(avisos, origen) });
      if (r.ok) { enviados++; return; }
      if (r.status === 403) {
        desconectados++;
        await admin.rpc('desvincular_telegram', { p_chat: chat });
      } else {
        devueltos += avisos.length;
        console.error('[telegram] No salió el mensaje:', r.status, r.descripcion);
        await admin.rpc('liberar_telegram', { p_ids: avisos.map((a) => a.id) });
      }
    }));
  }
  return { ok: true as const, enviados, desconectados, devueltos };
}
