import { supabaseAdmin } from './supabase-admin';

// Fallback en memoria: solo se usa si la base no responde. En Vercel cada
// instancia tiene su propio mapa, por eso el límite real vive en Postgres.
const globalObj = globalThis as any;
if (!globalObj.__rateLimitCache) {
  globalObj.__rateLimitCache = new Map<string, { count: number; resetTime: number }>();
}
const rateLimitCache: Map<string, { count: number; resetTime: number }> = globalObj.__rateLimitCache;

export function checkMemoryRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const record = rateLimitCache.get(key);

  if (!record || record.resetTime < now) {
    rateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count += 1;
  return true;
}

/**
 * Rate limit compartido entre instancias (tabla `rate_limits` + RPC
 * `check_rate_limit`). Devuelve true si la acción está permitida.
 * `key` debería incluir la acción, por ej. `login:1.2.3.4`.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (!error && typeof data === 'boolean') return data;
    if (error) console.warn('[rate-limit] RPC falló, uso memoria:', error.message);
  } catch (err) {
    console.warn('[rate-limit] RPC falló, uso memoria:', err);
  }
  return checkMemoryRateLimit(key, limit, windowMs);
}
