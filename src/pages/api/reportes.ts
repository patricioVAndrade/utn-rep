import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';

/**
 * POST /api/reportes
 * Reports a review. Requires authentication.
 * 
 * Necesitás crear la tabla en Supabase:
 * 
 * CREATE TABLE reportes_resenas (
 *   id SERIAL PRIMARY KEY,
 *   resena_id INTEGER NOT NULL REFERENCES resenas(id) ON DELETE CASCADE,
 *   user_id UUID NOT NULL REFERENCES auth.users(id),
 *   motivo TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * ALTER TABLE reportes_resenas ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Usuarios pueden reportar" ON reportes_resenas
 *   FOR INSERT WITH CHECK (auth.uid() = user_id);
 * CREATE POLICY "Solo el creador ve sus reportes" ON reportes_resenas
 *   FOR SELECT USING (auth.uid() = user_id);
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Tenés que iniciar sesión para reportar.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { resena_id, motivo } = body;

  if (!resena_id || typeof resena_id !== 'number') {
    return new Response(JSON.stringify({ error: 'ID de reseña inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check the user hasn't already reported this review
  const { data: existing } = await supabase
    .from('reportes_resenas')
    .select('id')
    .eq('resena_id', resena_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: 'Ya reportaste esta reseña.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: insertError } = await supabase
    .from('reportes_resenas')
    .insert({
      resena_id,
      user_id: user.id,
      motivo: motivo?.trim()?.slice(0, 500) || null,
    });

  if (insertError) {
    console.error('Error inserting report:', insertError);
    return new Response(JSON.stringify({ error: 'No se pudo enviar el reporte. Intentá de nuevo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
