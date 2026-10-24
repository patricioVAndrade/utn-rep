/**
 * Client IP for rate limiting. On Vercel, `x-real-ip` and the first entry of
 * `x-forwarded-for` are set by the platform (not by the client).
 */
export function getClientIp(request: Request, clientAddress?: string): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  try {
    if (clientAddress) return clientAddress;
  } catch {
    // Astro throws when the adapter can't provide clientAddress
  }
  return 'unknown';
}
