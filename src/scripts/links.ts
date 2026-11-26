// Links compartidos (migración 9).
// - Quien comparte: su código corto (?de=) se suma a los links. Se pide una vez y queda en el navegador.
// - Quien llega por un link: se anota la apertura (una por navegador) y se saca el ?de= de la dirección,
//   así si lo vuelve a compartir no lleva el código de otro.

const CLAVE_CODIGO = 'miCodigoLink';
const CLAVE_VISITANTE = 'visitante';

const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

/** Tu código, si ya lo tenemos (sin esperar). */
export function miCodigo(): string | null {
  if (document.body.dataset.sesion !== '1') return null;
  return leer(CLAVE_CODIGO);
}

/** Pide el código si hay sesión y todavía no lo tenemos. */
export async function prepararCodigo() {
  if (document.body.dataset.sesion !== '1' || leer(CLAVE_CODIGO)) return;
  try {
    const res = await fetch('/api/links/mio');
    const { codigo } = await res.json();
    if (typeof codigo === 'string' && /^[a-z0-9]{4,8}$/.test(codigo)) guardar(CLAVE_CODIGO, codigo);
  } catch { /* se comparte sin código */ }
}

/** Agrega ?de=tu-código a un link del sitio. */
export function conCodigo(url: string): string {
  const codigo = miCodigo();
  if (!codigo) return url;
  const u = new URL(url, location.origin);
  if (u.origin !== location.origin) return url;
  u.searchParams.set('de', codigo);
  return u.href;
}

export function visitante(): string {
  let v = leer(CLAVE_VISITANTE);
  if (!v || !/^[a-zA-Z0-9-]{8,64}$/.test(v)) {
    v = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^a-zA-Z0-9-]/g, '');
    guardar(CLAVE_VISITANTE, v);
  }
  return v;
}

export function iniciarLinks() {
  // Cuando se cierra sesión, el código de otro no tiene que quedar
  if (document.body.dataset.sesion !== '1') { try { localStorage.removeItem(CLAVE_CODIGO); } catch { /* nada */ } }

  const de = document.body.dataset.de;
  if (de) {
    const ruta = location.pathname;
    fetch('/api/links/abrir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: de, visitante: visitante(), ruta }),
      keepalive: true,
    }).catch(() => null);
    const u = new URL(location.href);
    u.searchParams.delete('de');
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  }
  document.querySelector('[data-de-cerrar]')?.addEventListener('click', () => document.getElementById('de-bar')?.remove());

  if (document.querySelector('[data-share], [data-con-codigo]')) prepararCodigo();
}
