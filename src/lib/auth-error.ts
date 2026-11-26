// Por qué no se pudo entrar, en palabras. El motivo viaja en "/?auth_error=…"
// y el Layout lo muestra arriba de la página.

export const TEXTO_AUTH_ERROR: Record<string, string> = {
  otro_navegador: 'No pudimos iniciar tu sesión: ese link se abrió en un navegador distinto al que lo pidió. Pedí un link nuevo y abrilo en el mismo navegador (si el mail lo abre en otra app, copiá el link y pegalo).',
  link_vencido: 'No pudimos iniciar tu sesión: ese link ya venció o ya se usó. Pedí uno nuevo desde "Ingresar".',
  exchange_failed: 'No pudimos iniciar tu sesión. Probá de nuevo desde "Ingresar".',
  oauth_failed: 'No pudimos conectar con esa cuenta. Probá de nuevo.',
  rate_limit: 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.',
  login_required: 'Iniciá sesión para ver esa página.',
};

/** El texto para mostrar; si el motivo no se conoce, uno general. */
export function textoAuthError(motivo: string | null | undefined): string | null {
  if (!motivo) return null;
  return TEXTO_AUTH_ERROR[motivo] || TEXTO_AUTH_ERROR.exchange_failed;
}

/** ¿Vino la cookie con la que se pidió el link? (PKCE: sin ella, Supabase no cambia el código por la sesión) */
export function traeVerificador(cookieHeader: string | null): boolean {
  return /-auth-token-code-verifier(\.\d+)?=/.test(cookieHeader || '');
}

/** Motivo de un intercambio de código que falló. */
export function motivoIntercambio(cookieHeader: string | null, mensaje = ''): string {
  if (!traeVerificador(cookieHeader)) return 'otro_navegador';
  if (/expired|invalid|not found|already/i.test(mensaje)) return 'link_vencido';
  return 'exchange_failed';
}

/** Motivo cuando Supabase vuelve con ?error=…&error_code=…&error_description=… */
export function motivoDeSupabase(codigo: string | null, descripcion: string | null): string {
  if (codigo === 'otp_expired' || /expired|invalid/i.test(descripcion || '')) return 'link_vencido';
  return 'exchange_failed';
}
