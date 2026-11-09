// Avisos por mail con Brevo (migración 17).
// Brevo manda 300 mails por día en el plan gratis y ahí entran también los
// links de ingreso de Supabase. Por eso: un solo resumen por persona por día,
// a la mañana (cron de Vercel), con lo más importante primero, y guardando
// lugar para los links de ingreso del resto del día. Lo que no entra, mañana.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { TIPOS_AVISO } from './avisos';

/** Mails por día del plan (MAIL_TOPE_DIARIO en Vercel, si cambia el plan). */
export const TOPE_DIARIO = 300;
/** Lo que nunca se usa, por si algo se cuenta de menos (mails de Supabase que no pasan por el sitio). */
export const MARGEN = 20;
/** Lugar mínimo para links de ingreso; si la última semana hubo más, se guarda 1,5 veces el día con más. */
export const RESERVA_LOGIN_MINIMA = 40;
/** Avisos que se listan en un mail; el resto se cuenta ("y 3 más"). */
export const AVISOS_POR_MAIL = 8;
/** Mails que salen a la vez. */
const TANDA = 8;

/** Lo que no se tocó en Mi cuenta: ¿llega por mail? (igual que quiere_mail() en la base) */
export const MAIL_POR_DEFECTO: Record<string, boolean> = {
  pedido_edicion: true,
  respuesta_moderador: true,
  recordatorio: true,
  resena_nueva: true,
  final_nuevo: true,
  te_sirvio: false,
  logro: false,
};

export function topeDiario(): number {
  const n = Number(import.meta.env.MAIL_TOPE_DIARIO);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : TOPE_DIARIO;
}

export interface AvisoMail { id: number; tipo: string; titulo: string; texto: string | null; link: string | null }
export interface PersonaMail { user_id: string; email: string; nombre: string | null; prioridad: number; avisos: AvisoMail[] }
export interface Mail { para: { email: string; nombre?: string }; asunto: string; html: string; texto: string; baja: string }

// ---------------------------------------------------------------- baja
function secreto(): string {
  return import.meta.env.MAIL_SECRETO || import.meta.env.CRON_SECRET || '';
}

/** Firma del link para dejar de recibir mails (no hace falta iniciar sesión). */
export function firmaBaja(userId: string, clave = secreto()): string {
  if (!clave) return '';
  return createHmac('sha256', clave).update(`baja:${userId}`).digest('base64url').slice(0, 32);
}

export function firmaBajaValida(userId: unknown, firma: unknown, clave = secreto()): userId is string {
  if (typeof userId !== 'string' || typeof firma !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) return false;
  const esperada = firmaBaja(userId, clave);
  if (!esperada || firma.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(firma), Buffer.from(esperada));
}

/** Apaga todos los mails de esa persona (los avisos en el sitio siguen). */
export async function darDeBaja(admin: any, userId: string): Promise<boolean> {
  const ahora = new Date().toISOString();
  const filas = TIPOS_AVISO.map((tipo) => ({ user_id: userId, tipo, canal: 'mail', activo: false, updated_at: ahora }));
  const { error } = await admin.from('preferencias_aviso').upsert(filas, { onConflict: 'user_id,tipo,canal' });
  if (error) return false;
  await admin.from('seguimientos').update({ mail: false }).eq('user_id', userId);
  return true;
}

// ---------------------------------------------------------------- el mail
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function asunto(avisos: AvisoMail[]): string {
  if (avisos.length === 1) return avisos[0].titulo;
  const resto = avisos.length - 1;
  return `${avisos[0].titulo} (y ${resto} aviso${resto === 1 ? '' : 's'} más)`;
}

export function armarResumen(p: PersonaMail, origen: string): Mail {
  const avisos = p.avisos.slice(0, AVISOS_POR_MAIL);
  const resto = p.avisos.length - avisos.length;
  const baja = `${origen}/baja?u=${p.user_id}&t=${firmaBaja(p.user_id)}`;
  const url = (link: string | null) => origen + (link && link.startsWith('/') ? link : '/avisos');
  const nombre = (p.nombre || '').trim().split(/\s+/)[0];
  const hola = nombre ? `Hola, ${nombre}:` : 'Hola:';
  const intro = avisos.length === 1 ? 'Tenés un aviso nuevo en UTN REP.' : `Tenés ${p.avisos.length} avisos nuevos en UTN REP.`;

  const items = avisos.map((a) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid #d2dbe4">
        <a href="${esc(url(a.link))}" style="color:#133d68;font-weight:bold;text-decoration:none">${esc(a.titulo)}</a>
        ${a.texto ? `<div style="color:#566271;font-size:13px;margin-top:2px">${esc(a.texto)}</div>` : ''}
      </td></tr>`).join('');
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#eef2f6;font:14px/1.5 Verdana,Arial,sans-serif;color:#1f2833">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6"><tr><td align="center" style="padding:16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #a9b8c8">
      <tr><td style="background:#133d68;border-bottom:3px solid #e2a11e;padding:12px 18px;color:#ffffff;font:bold 18px Arial,sans-serif">UTN <span style="color:#ffc63f">REP</span></td></tr>
      <tr><td style="padding:16px 18px 4px">
        <p style="margin:0 0 6px">${esc(hola)}</p>
        <p style="margin:0">${esc(intro)}</p>
      </td></tr>
      <tr><td style="padding:0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>
      ${resto > 0 ? `<tr><td style="padding:8px 18px 0;color:#566271">Y ${resto} más en Avisos.</td></tr>` : ''}
      <tr><td style="padding:16px 18px">
        <a href="${esc(origen)}/avisos" style="display:inline-block;background:#133d68;color:#ffffff;padding:8px 16px;text-decoration:none;font-weight:bold">Ver mis avisos</a>
      </td></tr>
      <tr><td style="padding:12px 18px;background:#f5f7fa;border-top:1px solid #d2dbe4;color:#566271;font-size:11.5px">
        Te mandamos como mucho un mail por día, con todo junto. Elegí qué te llega en <a href="${esc(origen)}/mi-cuenta#avisos" style="color:#133d68">Mi cuenta</a>
        o <a href="${esc(baja)}" style="color:#133d68">dejá de recibir mails</a>.<br>
        UTN REP es un sitio hecho por estudiantes. No es un sitio oficial de la UTN.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  const texto = [
    hola, '', intro, '',
    ...avisos.map((a) => `- ${a.titulo}${a.texto ? `${/[.?!:]$/.test(a.titulo) ? '' : '.'} ${a.texto}` : ''}\n  ${url(a.link)}`),
    ...(resto > 0 ? [`Y ${resto} más en ${origen}/avisos`] : []),
    '', `Ver mis avisos: ${origen}/avisos`,
    '', 'Te mandamos como mucho un mail por día.',
    `Elegí qué te llega: ${origen}/mi-cuenta#avisos`,
    `Dejar de recibir mails: ${baja}`,
  ].join('\n');

  return { para: { email: p.email, ...(p.nombre ? { nombre: p.nombre } : {}) }, asunto: asunto(p.avisos), html, texto, baja };
}

// ---------------------------------------------------------------- Brevo
/** "UTN REP <avisos@utnrep.app>" o "avisos@utnrep.app" */
export function remitente(valor = import.meta.env.MAIL_REMITENTE || ''): { name: string; email: string } | null {
  const m = valor.trim().match(/^(?:(.*?)\s*<([^>]+)>|([^\s<>]+@[^\s<>]+))$/);
  if (!m) return null;
  const email = (m[2] || m[3]).trim();
  return { name: (m[1] || 'UTN REP').replace(/^"|"$/g, '').trim() || 'UTN REP', email };
}

export type ResultadoEnvio = { ok: true } | { ok: false; status: number; frenar: boolean };

export async function enviarBrevo(mail: Mail, apiKey: string, de: { name: string; email: string }): Promise<ResultadoEnvio> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: de,
        to: [{ email: mail.para.email, ...(mail.para.nombre ? { name: mail.para.nombre } : {}) }],
        subject: mail.asunto,
        htmlContent: mail.html,
        textContent: mail.texto,
        // Sin List-Unsubscribe-Post: Astro frena los POST de otro sitio, así que el
        // "Desuscribirse" del correo abre /baja, que pide confirmar.
        headers: { 'List-Unsubscribe': `<${mail.baja}>` },
        tags: ['resumen'],
      }),
    });
    if (res.ok) return { ok: true };
    console.error('[mails] Brevo respondió', res.status, (await res.text().catch(() => '')).slice(0, 300));
    // Sin cupo, clave mal o demasiados pedidos: no seguir esta vez. Un mail raro (400) se saltea.
    return { ok: false, status: res.status, frenar: res.status !== 400 };
  } catch (e) {
    console.error('[mails] No se pudo llegar a Brevo:', (e as Error).message);
    return { ok: false, status: 0, frenar: true };
  }
}

export interface Presupuesto { usados: number; logins_hoy: number; pico_logins: number; reserva: number; disponible: number }

/** Una corrida del envío: pide el presupuesto, arma los resúmenes y los manda (o solo los cuenta, en prueba). */
export async function enviarResumenes(admin: any, opts: { origen: string; prueba: boolean; apiKey?: string; de?: { name: string; email: string } | null }) {
  const { data: pres, error: e1 } = await admin.rpc('presupuesto_mails', { p_tope: topeDiario(), p_margen: MARGEN, p_reserva_minima: RESERVA_LOGIN_MINIMA });
  if (e1) return { ok: false as const, error: 'No se pudo leer el presupuesto (¿falta la migración 17?).' };
  const presupuesto: Presupuesto = Array.isArray(pres) ? pres[0] : pres;
  if (!presupuesto || presupuesto.disponible <= 0) return { ok: true as const, prueba: opts.prueba, presupuesto, enviados: 0, fallidos: 0, frenado: false, muestra: [] };

  const { data: gente, error: e2 } = await admin.rpc('mails_pendientes', { p_limite: presupuesto.disponible, p_dias: 7 });
  if (e2) return { ok: false as const, error: 'No se pudo armar la lista de pendientes.' };
  const personas = (gente || []) as PersonaMail[];

  let enviados = 0, fallidos = 0, frenado = false;
  const muestra: { asunto: string; avisos: number; prioridad: number }[] = [];
  for (let i = 0; i < personas.length && !frenado; i += TANDA) {
    const tanda = personas.slice(i, i + TANDA);
    await Promise.all(tanda.map(async (p) => {
      const mail = armarResumen(p, opts.origen);
      if (muestra.length < 20) muestra.push({ asunto: mail.asunto, avisos: p.avisos.length, prioridad: p.prioridad });
      if (opts.prueba) return;
      const r = await enviarBrevo(mail, opts.apiKey!, opts.de!);
      if (r.ok) {
        enviados++;
        const { error } = await admin.rpc('marcar_mail_enviado', { p_user: p.user_id, p_ids: p.avisos.map((a) => a.id) });
        if (error) console.error('[mails] No se pudo marcar el envío:', error.message);
      } else {
        fallidos++;
        if (r.frenar) frenado = true;
      }
    }));
  }
  return { ok: true as const, prueba: opts.prueba, presupuesto, personas: personas.length, enviados, fallidos, frenado, muestra };
}
