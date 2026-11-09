// Contador "en línea" (migración 10): cada pestaña visible avisa una vez por
// minuto que sigue ahí y actualiza los [data-en-linea] de la página.
import { visitante } from './links';

const CADA_MS = 60 * 1000;

async function avisar() {
  if (document.visibilityState !== 'visible') return;
  try {
    const res = await fetch('/api/en-linea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitante: visitante() }),
    });
    if (!res.ok) return;
    const { n, texto, corto } = await res.json();
    document.querySelectorAll<HTMLElement>('[data-en-linea]').forEach((el) => {
      const t = el.dataset.enLinea === 'corto' ? corto : texto;
      const span = el.querySelector<HTMLElement>('[data-texto]');
      if (span && t) span.textContent = t;
      // Punto verde; gris si no hay nadie
      el.querySelector('.live')?.classList.toggle('off', !n);
    });
  } catch { /* sin red: queda lo que había */ }
}

export function iniciarEnLinea() {
  avisar();
  setInterval(avisar, CADA_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') avisar(); });
}
