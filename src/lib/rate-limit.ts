// Usamos globalThis para que el servidor de desarrollo (Astro/Vite) 
// no borre el mapa de memoria en cada petición.
const globalObj = globalThis as any;

if (!globalObj.__rateLimitCache) {
  globalObj.__rateLimitCache = new Map<string, { count: number, resetTime: number }>();
}
const rateLimitCache = globalObj.__rateLimitCache;

export function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitCache.get(ip);

  // Si no hay registro o el tiempo de bloqueo ya pasó
  if (!record || record.resetTime < now) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + windowMs });
    return true; // Permitido
  }

  // Si ya superó el límite
  if (record.count >= limit) {
    return false; // Bloqueado
  }

  // Aún no supera el límite, sumamos 1
  record.count += 1;
  return true; // Permitido
}