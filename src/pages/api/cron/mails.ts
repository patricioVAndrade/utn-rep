import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { json } from '../../../lib/http';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { enviarResumenes, remitente } from '../../../lib/mail';
import { despacharTelegram } from '../../../lib/telegram';

/**
 * GET /api/cron/mails (migración 17)
 * La llama el cron de Vercel una vez por día (vercel.json, 12:00 UTC = 9:00 en Córdoba)
 * con "Authorization: Bearer CRON_SECRET". Manda el resumen de avisos a quien
 * tenga algo pendiente, sin pasarse del tope diario de Brevo. Antes manda por
 * Telegram lo que haya quedado pendiente (quien tiene Telegram no recibe mail).
 * Con ?prueba=1, o si falta BREVO_API_KEY o MAIL_REMITENTE, no manda nada:
 * dice cuántos saldrían y con qué asunto.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const secreto = import.meta.env.CRON_SECRET || '';
  const dado = request.headers.get('authorization') || '';
  const esperado = `Bearer ${secreto}`;
  if (!secreto || dado.length !== esperado.length || !timingSafeEqual(Buffer.from(dado), Buffer.from(esperado))) {
    return json({ error: 'No autorizado.' }, 401);
  }

  const apiKey = import.meta.env.BREVO_API_KEY || '';
  const de = remitente();
  const prueba = url.searchParams.get('prueba') === '1' || !apiKey || !de;
  // Telegram no gasta mails: sale aunque Brevo no esté configurado (salvo con ?prueba=1)
  const telegram = url.searchParams.get('prueba') === '1' ? null : await despacharTelegram(supabaseAdmin, url.origin);
  const r = await enviarResumenes(supabaseAdmin, { origen: url.origin, prueba, apiKey, de });
  if (!r.ok) {
    console.error('[mails]', r.error);
    return json({ error: r.error }, 500);
  }
  console.log('[mails]', JSON.stringify({ prueba: r.prueba, presupuesto: r.presupuesto, enviados: r.enviados, fallidos: r.fallidos, frenado: r.frenado }));
  return json({ ...r, telegram, faltaConfigurar: [!apiKey && 'BREVO_API_KEY', !de && 'MAIL_REMITENTE'].filter(Boolean) });
};
