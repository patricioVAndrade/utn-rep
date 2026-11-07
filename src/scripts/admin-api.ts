/** Llamadas a la API del admin con el token CSRF que deja la página en #admin-csrf. */
export async function adminFetch<T = any>(url: string, body: unknown, method = 'POST'): Promise<T> {
  const el = document.getElementById('admin-csrf');
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (el?.dataset.h && el.dataset.t) headers.set(el.dataset.h, el.dataset.t);
  const res = await fetch(url, { method, credentials: 'same-origin', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
  return data as T;
}

/** Aviso chico abajo a la derecha. */
export function aviso(texto: string, error = false) {
  let t = document.getElementById('atoast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'atoast';
    t.setAttribute('role', 'status');
    document.body.append(t);
  }
  t.textContent = texto;
  t.className = error ? 'atoast bad' : 'atoast';
  clearTimeout(Number(t.dataset.timer));
  t.dataset.timer = String(window.setTimeout(() => t?.classList.add('hidden'), 3500));
}

/** Filtra filas por texto (sin acentos) y por valores de data-atributos. */
export const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
