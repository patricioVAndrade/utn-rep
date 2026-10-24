/**
 * Returns `value` only if it's a same-site relative path.
 * Rejects protocol-relative URLs (`//evil.com`) and backslash tricks
 * (`/\evil.com`) that browsers treat as another origin.
 */
export function safeReturnTo(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith('/')) return fallback;
  if (decoded.startsWith('//') || decoded.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f]/.test(decoded)) return fallback;

  return decoded;
}
