// Perfil y preferencias (migración 5)

/** Los dibujos para la foto, como en la V6 (trazos de 24 x 24). */
export const DIBUJOS: { id: number; nombre: string; svg: string }[] = [
  { id: 1, nombre: 'Mate', svg: '<path d="M4 9h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5zM16 11h2a2.5 2.5 0 010 5h-2" stroke-linejoin="round"/><path d="M8 3c0 1.5 1.5 1.5 1.5 3M12 3c0 1.5 1.5 1.5 1.5 3" stroke-linecap="round"/>' },
  { id: 2, nombre: 'Libro', svg: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5" stroke-linejoin="round"/><path d="M8 7h7" stroke-linecap="round"/>' },
  { id: 3, nombre: 'Gato', svg: '<path d="M5 4l3 2h8l3-2v9a7 7 0 01-14 0z" stroke-linejoin="round"/><circle cx="9" cy="11" r="2"/><circle cx="15" cy="11" r="2"/><path d="M11 15l1 1 1-1" stroke-linecap="round"/>' },
  { id: 4, nombre: 'Barras', svg: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke-linecap="round"/>' },
  { id: 5, nombre: 'Apunte', svg: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h3" stroke-linecap="round"/>' },
  { id: 6, nombre: 'Capas', svg: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" stroke-linejoin="round"/>' },
  { id: 7, nombre: 'Compu', svg: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4M7 9l2 2-2 2M12 13h4" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 8, nombre: 'Café', svg: '<path d="M5 8h11v5a5 5 0 01-5 5h-1a5 5 0 01-5-5zM16 9h1.5a2.5 2.5 0 010 5H16M4 21h14" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 9, nombre: 'Birrete', svg: '<path d="M2 9l10-5 10 5-10 5z" stroke-linejoin="round"/><path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5M22 9v6" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 10, nombre: 'Cohete', svg: '<path d="M12 2c4 3 5 8 3 13H9C7 10 8 5 12 2z" stroke-linejoin="round"/><circle cx="12" cy="9" r="1.8"/><path d="M9 15l-3 3 1 3 3-2M15 15l3 3-1 3-3-2M10.5 19h3" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 11, nombre: 'Estrella', svg: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" stroke-linejoin="round"/>' },
  { id: 12, nombre: 'Llaves', svg: '<path d="M8 4C5 4 5 7 5 9s-2 3-2 3 2 1 2 3 0 5 3 5M16 4c3 0 3 3 3 5s2 3 2 3-2 1-2 3 0 5-3 5" stroke-linecap="round" stroke-linejoin="round"/>' },
];

/** Colores para la inicial o el dibujo (migración 20). Vacío es el azul de siempre. */
export const COLORES = [
  { id: 'azul', nombre: 'Azul' },
  { id: 'verde', nombre: 'Verde' },
  { id: 'rojo', nombre: 'Rojo' },
  { id: 'violeta', nombre: 'Violeta' },
  { id: 'naranja', nombre: 'Naranja' },
  { id: 'gris', nombre: 'Gris' },
] as const;
export type ColorAvatar = (typeof COLORES)[number]['id'];
export const claseColor = (c?: string | null) => (c && c !== 'azul' && COLORES.some((x) => x.id === c) ? `c-${c}` : '');

export type Perfil = {
  nombre_mostrar: string | null;
  foto: 'inicial' | 'google' | 'dibujo';
  dibujo: number | null;
  color: string | null;
  mostrar_ficha: boolean;
  anios_cursada: number[];
  preguntar_como_te_fue: boolean;
  como_te_fue_pausa_hasta: string | null;
};

export const PERFIL_VACIO: Perfil = {
  nombre_mostrar: null,
  foto: 'inicial',
  dibujo: null,
  color: null,
  mostrar_ficha: true,
  anios_cursada: [],
  preguntar_como_te_fue: true,
  como_te_fue_pausa_hasta: null,
};

/** Lee el perfil con la sesión de la persona (RLS: solo el suyo). Si todavía no guardó nada, devuelve el de por defecto. */
export async function leerPerfil(client: any, userId: string): Promise<Perfil & { guardado: boolean }> {
  const columnas = 'nombre_mostrar, foto, dibujo, mostrar_ficha, anios_cursada, preguntar_como_te_fue, como_te_fue_pausa_hasta';
  let { data, error } = await client.from('perfiles').select(`${columnas}, color`).eq('user_id', userId).maybeSingle();
  // Sin la migración 20 todavía no hay color
  if (error) ({ data, error } = await client.from('perfiles').select(columnas).eq('user_id', userId).maybeSingle());
  if (error || !data) return { ...PERFIL_VACIO, guardado: false };
  return { ...PERFIL_VACIO, ...data, anios_cursada: (data.anios_cursada || []).map(Number), guardado: true };
}

/** ¿Hay que preguntarle "¿Cómo te fue?" en el inicio? */
export const preguntarComoTeFue = (p: Perfil, ahora = Date.now()) =>
  p.preguntar_como_te_fue && !(p.como_te_fue_pausa_hasta && new Date(p.como_te_fue_pausa_hasta).getTime() > ahora);

/** ¿La cuenta está bloqueada? (migración 9). Cada uno puede leer su propio perfil. */
export async function estaBloqueada(client: any, userId: string): Promise<boolean> {
  const { data, error } = await client.from('perfiles').select('bloqueado_at').eq('user_id', userId).maybeSingle();
  return !error && !!data?.bloqueado_at;
}
