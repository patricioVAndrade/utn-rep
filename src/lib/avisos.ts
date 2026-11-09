// Avisos dentro del sitio (migración 7)
export const TIPOS_AVISO = ['resena_nueva', 'final_nuevo', 'te_sirvio', 'respuesta_moderador', 'pedido_edicion', 'logro', 'recordatorio'] as const;
export const CANALES_AVISO = ['sitio', 'mail', 'telegram', 'push'] as const;

/** Las preferencias que se pueden cambiar en Mi cuenta (los pedidos de la moderación siempre llegan). */
export const PREFERENCIAS_EDITABLES: { tipos: string[]; texto: string; detalle?: string }[] = [
  { tipos: ['resena_nueva', 'final_nuevo'], texto: 'Reseñas y finales nuevos en las materias que seguís' },
  { tipos: ['te_sirvio'], texto: 'Cuando tus reseñas le sirven a alguien', detalle: 'una vez por semana como máximo' },
  { tipos: ['respuesta_moderador'], texto: 'Cuando la moderación responde lo que escribiste' },
  { tipos: ['recordatorio'], texto: 'Al terminar el cuatrimestre, cómo te fue en tus cursos', detalle: 'los que elegiste en Mi inscripción' },
];

export const ICONO_AVISO: Record<string, string> = {
  resena_nueva: 'pen',
  final_nuevo: 'final',
  te_sirvio: 'thumb',
  respuesta_moderador: 'info',
  pedido_edicion: 'alert',
  logro: 'check',
  recordatorio: 'clock',
};

/** Cuántos avisos sin leer tiene (RLS: solo los suyos). Si la tabla no existe todavía, 0. */
export async function avisosSinLeer(client: any, userId: string): Promise<number> {
  const { count, error } = await client
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('leida_at', null);
  return error ? 0 : count || 0;
}
