import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

// ── Dominios de email permitidos ──
const ALLOWED_DOMAINS = new Set([
  // Institucionales UTN
  'frc.utn.edu.ar',
  'utn.edu.ar',
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

// ── Validación de nombre ──
function validarNombre(nombre: string): string | null {
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

  return null; // válido
}

// ── Rate limit en memoria (por IP) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora
const RATE_LIMIT_MAX = 3; // máx 3 magic links por hora por IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/auth/magic-link
 * Sends a magic link email. Validates email domain and name.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  // 1. Rate limit
  const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({
      error: 'Demasiados intentos. Esperá un rato antes de intentar de nuevo.'
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Parse body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { email, nombre } = body;

  // 3. Validate email format
  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Email requerido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const emailLower = email.toLowerCase().trim();
  const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(emailLower)) {
    return new Response(JSON.stringify({ error: 'Email inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. Validate email domain
  const domain = emailLower.split('@')[1];
  if (!ALLOWED_DOMAINS.has(domain)) {
    return new Response(JSON.stringify({
      error: 'Dominio de email no permitido. Usá Gmail, Hotmail, Outlook o tu email de UTN.'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 5. Validate name
  if (!nombre || typeof nombre !== 'string') {
    return new Response(JSON.stringify({ error: 'Nombre requerido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const errorNombre = validarNombre(nombre);
  if (errorNombre) {
    return new Response(JSON.stringify({ error: errorNombre }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Capitalize first letter of each word
  const nombreFormateado = nombre.trim()
    .split(/\s+/)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  // 6. Send magic link via Supabase
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { error } = await supabase.auth.signInWithOtp({
    email: emailLower,
    options: {
      data: {
        full_name: nombreFormateado,
      },
      emailRedirectTo: new URL('/', request.url).origin,
    },
  });

  if (error) {
    console.error('[Magic Link] Error:', error.message);

    if (error.message.includes('rate') || error.message.includes('limit')) {
      return new Response(JSON.stringify({
        error: 'Demasiados intentos. Esperá unos minutos.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'No se pudo enviar el email. Intentá de nuevo.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Te enviamos un link de acceso a tu email. Revisá tu bandeja de entrada (y spam).'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
