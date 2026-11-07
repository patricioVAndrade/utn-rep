// Perfil y preferencias (migración 5)

/** Los dibujos para la foto, como en la V6 (trazos de 24 x 24). */
export const DIBUJOS: { id: number; nombre: string; svg: string }[] = [
  { id: 1, nombre: 'Mate', svg: '<path d="M4 9h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5zM16 11h2a2.5 2.5 0 010 5h-2" stroke-linejoin="round"/><path d="M8 3c0 1.5 1.5 1.5 1.5 3M12 3c0 1.5 1.5 1.5 1.5 3" stroke-linecap="round"/>' },
  { id: 2, nombre: 'Libro', svg: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5" stroke-linejoin="round"/><path d="M8 7h7" stroke-linecap="round"/>' },
  { id: 3, nombre: 'Gato', svg: '<path d="M5 4l3 2h8l3-2v9a7 7 0 01-14 0z" stroke-linejoin="round"/><circle cx="9" cy="11" r="2"/><circle cx="15" cy="11" r="2"/><path d="M11 15l1 1 1-1" stroke-linecap="round"/>' },
  { id: 4, nombre: 'Barras', svg: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke-linecap="round"/>' },
  { id: 5, nombre: 'Apunte', svg: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h3" stroke-linecap="round"/>' },
  { id: 6, nombre: 'Capas', svg: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" stroke-linejoin="round"/>' },
];

export type Perfil = {
  nombre_mostrar: string | null;
  foto: 'inicial' | 'google' | 'dibujo';
  dibujo: number | null;
  mostrar_ficha: boolean;
  anios_cursada: number[];
  preguntar_como_te_fue: boolean;
  como_te_fue_pausa_hasta: string | null;
};

export const PERFIL_VACIO: Perfil = {
  nombre_mostrar: null,
  foto: 'inicial',
  dibujo: null,
  mostrar_ficha: true,
  anios_cursada: [],
  preguntar_como_te_fue: true,
  como_te_fue_pausa_hasta: null,
};

/** Lee el perfil con la sesión de la persona (RLS: solo el suyo). Si todavía no guardó nada, devuelve el de por defecto. */
export async function leerPerfil(client: any, userId: string): Promise<Perfil & { guardado: boolean }> {
  const { data, error } = await client
    .from('perfiles')
    .select('nombre_mostrar, foto, dibujo, mostrar_ficha, anios_cursada, preguntar_como_te_fue, como_te_fue_pausa_hasta')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return { ...PERFIL_VACIO, guardado: false };
  return { ...PERFIL_VACIO, ...data, anios_cursada: (data.anios_cursada || []).map(Number), guardado: true };
}

/** ¿Hay que preguntarle "¿Cómo te fue?" en el inicio? */
export const preguntarComoTeFue = (p: Perfil, ahora = Date.now()) =>
  p.preguntar_como_te_fue && !(p.como_te_fue_pausa_hasta && new Date(p.como_te_fue_pausa_hasta).getTime() > ahora);
