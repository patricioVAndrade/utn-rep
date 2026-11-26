import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { checkRateLimit } from '../../../lib/rate-limit';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { despacharTelegram } from '../../../lib/telegram';

/**
 * POST /api/telegram/despachar (migración 18)
 * La llama la base (pg_net) cuando hay un aviso nuevo para alguien con
 * Telegram. No lleva datos ni clave: solo dice "fijate si hay algo", y el
 * sitio busca qué mandar. Llamarla de más no manda nada repetido.
 */
export const POST: APIRoute = async ({ url }) => {
  if (!(await checkRateLimit('telegram-despachar', 60, 60 * 1000))) return json({ error: 'Demasiados pedidos.' }, 429);
  const r = await despacharTelegram(supabaseAdmin, url.origin);
  return r.ok ? json(r) : json({ error: r.error }, 500);
};
