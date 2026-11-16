// Links compartidos (migración 9): cada persona tiene un código corto que va
// en lo que comparte (?de=k7p2). No dice quién es. Solo el servidor lo lee.
import { supabaseAdmin } from './supabase-admin';

const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789';
export const CODIGO_VALIDO = /^[a-z0-9]{4,8}$/;
export const VISITANTE_VALIDO = /^[a-zA-Z0-9-]{8,64}$/;

function codigoNuevo(largo = 5) {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return [...bytes].map((b) => LETRAS[b % LETRAS.length]).join('');
}

/** El código de la persona. Lo crea la primera vez. */
export async function codigoDe(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('links_compartidos').select('codigo').eq('user_id', userId).maybeSingle();
  if (data?.codigo) return data.codigo;
  for (let i = 0; i < 5; i++) {
    const codigo = codigoNuevo(i < 3 ? 5 : 6);
    const { error } = await supabaseAdmin.from('links_compartidos').insert({ codigo, user_id: userId });
    if (!error) return codigo;
    if (error.code !== '23505') { console.error('[links]', error.message); return null; }
    // Puede ser que otra pestaña lo creó recién
    const { data: ya } = await supabaseAdmin.from('links_compartidos').select('codigo').eq('user_id', userId).maybeSingle();
    if (ya?.codigo) return ya.codigo;
  }
  return null;
}

/** ¿De quién es el código? */
export async function duenioDe(codigo: string): Promise<string | null> {
  if (!CODIGO_VALIDO.test(codigo)) return null;
  const { data } = await supabaseAdmin.from('links_compartidos').select('user_id').eq('codigo', codigo).maybeSingle();
  return data?.user_id || null;
}

/** Anota una apertura (una por visitante). Las del dueño no cuentan. */
export async function anotarApertura(codigo: string, visitante: string, ruta: string, userId?: string | null) {
  const duenio = await duenioDe(codigo);
  if (!duenio || duenio === userId) return false;
  const { error } = await supabaseAdmin
    .from('aperturas_link')
    .upsert({ codigo, visitante, ruta: ruta.slice(0, 200) }, { onConflict: 'codigo,visitante', ignoreDuplicates: true });
  if (error) console.error('[links] apertura', error.message);
  return !error;
}
