// ── Dominios de email permitidos para el magic link ──
export const ALLOWED_DOMAINS = new Set([
  // Institucionales UTN (deshabilitados: el mail con el token no llega a la bandeja)
  //'sistemas.frc.utn.edu.ar',
  //'utn.edu.ar',
  // Populares
  'gmail.com',
  'hotmail.com',
  'hotmail.com.ar',
  'outlook.com',
  'outlook.com.ar',
  'outlook.es',
  'live.com',
  'live.com.ar',
  'yahoo.com',
  'yahoo.com.ar',
  'icloud.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
]);

/** Devuelve un mensaje de error, o null si el nombre es válido. */
export function validarNombre(nombre: string): string | null {
  const trimmed = nombre.trim();

  if (trimmed.length < 4 || trimmed.length > 50) {
    return 'El nombre debe tener entre 4 y 50 caracteres.';
  }

  // Solo letras (con acentos), espacios y apóstrofes
  if (!/^[a-záéíóúñüà-ÿ\s']+$/i.test(trimmed)) {
    return 'El nombre solo puede contener letras y espacios.';
  }

  // Debe tener al menos 2 palabras (nombre + apellido)
  const palabras = trimmed.split(/\s+/).filter(p => p.length >= 2);
  if (palabras.length < 2) {
    return 'Ingresá tu nombre y apellido.';
  }

  return null;
}

export function formatearNombre(nombre: string): string {
  return nombre.trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Valida y normaliza un email para el magic link.
 * Quita alias `+tag` (y los puntos en Gmail) para que no se creen cuentas duplicadas.
 */
export function normalizarEmail(email: unknown): { ok: true; email: string } | { ok: false; error: string } {
  if (!email || typeof email !== 'string') return { ok: false, error: 'Email requerido.' };

  const emailLower = email.toLowerCase().trim();
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(emailLower)) {
    return { ok: false, error: 'Email inválido.' };
  }

  const [localPart, domain] = emailLower.split('@');
  if (!ALLOWED_DOMAINS.has(domain)) {
    return { ok: false, error: 'Dominio de email no permitido. Usá Gmail, Hotmail, Outlook o tu email de UTN.' };
  }

  const basePart = localPart.split('+')[0];
  const normalized = domain === 'gmail.com'
    ? `${basePart.replace(/\./g, '')}@gmail.com`
    : `${basePart}@${domain}`;

  // Las cadenas aleatorias suelen tener muchas consonantes seguidas
  const cleanLocal = normalized.split('@')[0];
  if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(cleanLocal)) {
    return { ok: false, error: 'El email parece ser una cuenta temporal o generada. Usá tu email personal.' };
  }

  if (cleanLocal.replace(/[^a-z0-9]/g, '').length < 4) {
    return { ok: false, error: 'El email no parece ser una cuenta válida.' };
  }

  return { ok: true, email: normalized };
}
