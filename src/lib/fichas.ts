// Fichas de quienes escriben reseñas (migración 8).
// Se arman en el servidor con la clave de servicio: el user_id nunca llega al
// navegador. Las reseñas anónimas no tienen ficha (muestran el cartel de
// "Anónimo") y quien apagó "Mostrar mi ficha" solo muestra su nombre.

import { supabaseAdmin } from './supabase-admin';
import { LOGROS } from './logros';

export type Ficha = {
  privada: boolean;
  resenas: number;
  finales: number;
  votos: number;
  /** Año de su primera reseña o final */
  desde: number | null;
  logros: string[];
};

export type Autor = {
  foto: 'inicial' | 'google' | 'dibujo';
  dibujo: number | null;
  /** Foto de Google, solo si eligió mostrarla */
  google: string | null;
  ficha: Ficha;
};

const ORDEN = new Map(LOGROS.map((l, i) => [l.id, i]));

/** Datos públicos de cada autor, por id de reseña. Las anónimas no aparecen. */
export async function autoresDeResenas(resenaIds: number[]): Promise<Map<number, Autor>> {
  const out = new Map<number, Autor>();
  const ids = [...new Set(resenaIds)].filter((x) => Number.isFinite(x));
  if (ids.length === 0) return out;
  try {
    const { data: filas } = await supabaseAdmin
      .from('resenas')
      .select('id, user_id, es_anonima')
      .in('id', ids);
    const deResena = new Map<number, string>();
    (filas || []).forEach((f: any) => { if (!f.es_anonima && f.user_id) deResena.set(f.id, f.user_id); });
    const usuarios = [...new Set(deResena.values())];
    if (usuarios.length === 0) return out;

    const [{ data: perfiles }, { data: resenas }, { data: finales }, { data: logros }] = await Promise.all([
      supabaseAdmin.from('perfiles').select('user_id, foto, dibujo, foto_url, mostrar_ficha').in('user_id', usuarios),
      supabaseAdmin.from('resenas').select('user_id, created_at, votos_utilidad').in('user_id', usuarios),
      supabaseAdmin.from('experiencias_finales').select('user_id, created_at').in('user_id', usuarios),
      supabaseAdmin.from('logros_usuario').select('user_id, logro').in('user_id', usuarios),
    ]);

    const porUsuario = new Map<string, Autor>();
    for (const u of usuarios) {
      const p: any = (perfiles || []).find((x: any) => x.user_id === u) || {};
      const suyas = (resenas || []).filter((r: any) => r.user_id === u);
      const susFinales = (finales || []).filter((r: any) => r.user_id === u);
      const fechas = [...suyas, ...susFinales].map((r: any) => new Date(r.created_at).getTime()).filter(Number.isFinite);
      const foto = p.foto === 'google' && p.foto_url ? 'google' : p.foto === 'dibujo' ? 'dibujo' : 'inicial';
      porUsuario.set(u, {
        foto,
        dibujo: p.dibujo ?? null,
        google: foto === 'google' ? p.foto_url : null,
        ficha: {
          privada: p.mostrar_ficha === false,
          resenas: suyas.length,
          finales: susFinales.length,
          votos: suyas.reduce((acc: number, r: any) => acc + (r.votos_utilidad || 0), 0),
          desde: fechas.length ? new Date(Math.min(...fechas)).getFullYear() : null,
          logros: (logros || [])
            .filter((l: any) => l.user_id === u && ORDEN.has(l.logro))
            .map((l: any) => l.logro as string)
            .sort((a, b) => ORDEN.get(a as any)! - ORDEN.get(b as any)!),
        },
      });
    }
    deResena.forEach((u, id) => out.set(id, porUsuario.get(u)!));
  } catch (e) {
    console.error('[fichas]', (e as Error).message);
  }
  return out;
}
