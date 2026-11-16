// Moderación (migración 4): registro de lo que hace el admin y reportes automáticos.
import { supabaseAdmin } from './supabase-admin';
import { encontrarPalabra } from './palabras';

export type AccionModeracion =
  | 'borrar' | 'dejar' | 'editar_texto' | 'responder' | 'borrar_respuesta'
  | 'pedir_edicion' | 'quitar_pedido' | 'marcada_automatica' | 'agregar_palabra' | 'quitar_palabra'
  | 'bloquear' | 'desbloquear';

/** Anota en el registro. Si falla, no frena la acción: solo queda en el log del servidor. */
export async function registrar(
  moderadorId: string | null,
  accion: AccionModeracion,
  sobre: { resena_id?: number | null; final_id?: number | string | null; usuario_id?: string | null; detalle?: string | null } = {},
) {
  const { error } = await supabaseAdmin.from('registro_moderacion').insert({
    moderador_id: moderadorId,
    accion,
    resena_id: sobre.resena_id ?? null,
    final_id: sobre.final_id ?? null,
    ...(sobre.usuario_id ? { usuario_id: sobre.usuario_id } : {}),
    detalle: sobre.detalle ? String(sobre.detalle).slice(0, 1000) : null,
  });
  if (error) console.error('[moderacion] no se pudo registrar', accion, error);
}

/**
 * Si el texto trae una palabra marcada, la reseña entra sola a Reportes (una vez).
 * Se llama después de publicar o editar. Nunca hace fallar la publicación.
 */
export async function revisarPalabras(resenaId: number, texto: string) {
  try {
    const { data: lista } = await supabaseAdmin.from('palabras_marcadas').select('palabra');
    const palabra = encontrarPalabra(texto, (lista || []).map((p: any) => p.palabra));
    if (!palabra) return;
    const { data: ya } = await supabaseAdmin
      .from('reportes_resenas').select('id').eq('resena_id', resenaId).eq('automatico', true).maybeSingle();
    if (ya) return;
    await supabaseAdmin.from('reportes_resenas').insert({ resena_id: resenaId, user_id: null, automatico: true, motivo: `Palabra marcada: ${palabra}` });
    await registrar(null, 'marcada_automatica', { resena_id: resenaId, detalle: palabra });
  } catch (e) {
    console.error('[moderacion] revisarPalabras', e);
  }
}
