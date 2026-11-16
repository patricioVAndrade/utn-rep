// Interacciones de la página /dictado/[id]: orden, paginación, edición, borrado, reportes y votos.
import { editadaEl } from '../lib/format';
function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido';
}

// ========== ORDEN Y PÁGINAS ==========
const POR_PAGINA = 10;
const reviewsList = document.getElementById('reviews-list') as HTMLElement | null;
const botonesOrden = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-orden]'));
const pagers = Array.from(document.querySelectorAll<HTMLElement>('[data-pager]'));
let pagina = 0;

function tarjetas(): HTMLElement[] {
  return Array.from(reviewsList?.querySelectorAll<HTMLElement>('.review-card') || []);
}

function ordenar(criterio: string) {
  if (!reviewsList) return;
  const cards = tarjetas();
  const num = (el: Element, k: string) => parseFloat(el.getAttribute(k) || '0');
  const fecha = (el: Element) => el.getAttribute('data-date') || '';
  cards.sort((a, b) => {
    if (criterio === 'newest') return fecha(b).localeCompare(fecha(a));
    if (criterio === 'lowest') return num(a, 'data-rating') - num(b, 'data-rating') || fecha(b).localeCompare(fecha(a));
    return num(b, 'data-votos') - num(a, 'data-votos') || fecha(b).localeCompare(fecha(a));
  });
  cards.forEach((c) => reviewsList.appendChild(c));
}

function paginar(p: number, subir = false) {
  const cards = tarjetas();
  const total = Math.max(1, Math.ceil(cards.length / POR_PAGINA));
  pagina = Math.min(Math.max(p, 0), total - 1);
  cards.forEach((c, i) => c.classList.toggle('hidden', Math.floor(i / POR_PAGINA) !== pagina));
  pagers.forEach((pg) => {
    pg.innerHTML = '';
    if (total < 2) return;
    const label = document.createElement('span');
    label.className = 'sub';
    label.textContent = 'Página';
    pg.appendChild(label);
    for (let i = 0; i < total; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pg';
      b.textContent = String(i + 1);
      if (i === pagina) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => paginar(i, true));
      pg.appendChild(b);
    }
    if (pagina < total - 1) {
      const sig = document.createElement('button');
      sig.type = 'button';
      sig.className = 'pg';
      sig.textContent = 'Siguiente';
      sig.addEventListener('click', () => paginar(pagina + 1, true));
      pg.appendChild(sig);
    }
  });
  if (subir) document.getElementById('resenas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

botonesOrden.forEach((b) => b.addEventListener('click', () => {
  botonesOrden.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  ordenar(b.dataset.orden || 'useful');
  paginar(0);
}));

if (reviewsList) {
  ordenar(botonesOrden.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.orden || 'useful');
  // Si el link apunta a una reseña, abrir la página donde está
  const destino = location.hash.startsWith('#resena-') ? document.querySelector(location.hash) : null;
  const idx = destino ? tarjetas().indexOf(destino as HTMLElement) : -1;
  paginar(idx >= 0 ? Math.floor(idx / POR_PAGINA) : 0);
  if (destino) destino.scrollIntoView({ block: 'start' });
}

// ========== EDIT ==========
const CONDICIONES: Record<string, [string, string]> = { PROMOCIONADO: ['Promocionó', 'prom'], REGULAR: ['Regularizó', 'reg'], LIBRE: ['Quedó libre', 'libre'] };
function pintarCondicion(card: HTMLElement, valor: string) {
  let pill = card.querySelector('.author .cond') as HTMLElement | null;
  const c = CONDICIONES[valor];
  if (!c) { pill?.remove(); return; }
  if (!pill) {
    pill = document.createElement('span');
    card.querySelector('.author')?.append(pill);
  }
  pill.className = `cond ${c[1]}`;
  pill.textContent = c[0];
}

document.querySelectorAll('.edit-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.review-card') as HTMLElement | null;
    if (!card) return;
    const comment = card.querySelector('.review-comment') as HTMLElement | null;
    const editForm = card.querySelector('.review-edit-form') as HTMLElement | null;
    if (comment) comment.classList.add('hidden');
    if (editForm) editForm.classList.remove('hidden');
  });
});

document.querySelectorAll('.cancel-edit-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.review-card') as HTMLElement | null;
    if (!card) return;
    const comment = card.querySelector('.review-comment') as HTMLElement | null;
    const editForm = card.querySelector('.review-edit-form') as HTMLElement | null;
    if (comment) comment.classList.remove('hidden');
    if (editForm) editForm.classList.add('hidden');
  });
});

document.querySelectorAll('.save-edit-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const card = btn.closest('.review-card') as HTMLElement | null;
    if (!card) return;
    const resenaId = card.getAttribute('data-id');
    const textarea = card.querySelector('.edit-textarea') as HTMLTextAreaElement | null;
    const newComment = textarea?.value?.trim();
    const condSelect = card.querySelector('.edit-condicion') as HTMLSelectElement | null;

    if (!newComment || newComment.length < 10) {
      alert('El comentario debe tener al menos 10 caracteres.');
      return;
    }

    (btn as HTMLButtonElement).disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const res = await fetch('/api/resenas/' + resenaId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _method: 'PUT', comentario: newComment, condicion_final: condSelect?.value ?? undefined }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Error del servidor. Recargá la página e intentá de nuevo.'); }
      if (!res.ok) throw new Error(data.error || 'Error');

      // Update the displayed comment
      const comment = card.querySelector('.review-comment') as HTMLElement | null;
      if (comment) {
        comment.textContent = newComment;
        comment.classList.remove('hidden');
      }
      card.querySelector('.review-edit-form')?.classList.add('hidden');
      pintarCondicion(card, condSelect?.value || '');
      const editada = card.querySelector('.editada');
      if (editada && data.updated_at) editada.textContent = ` · ${editadaEl(data.updated_at)}`;
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      (btn as HTMLButtonElement).disabled = false;
      btn.textContent = 'Guardar';
    }
  });
});

// ========== DELETE ==========
document.querySelectorAll('.delete-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!confirm('¿Seguro que querés eliminar esta reseña? Esta acción no se puede deshacer.')) return;

    const card = btn.closest('.review-card') as HTMLElement | null;
    if (!card) return;
    const resenaId = card.getAttribute('data-id');

    (btn as HTMLButtonElement).disabled = true;

    try {
      const res = await fetch('/api/resenas/' + resenaId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _method: 'DELETE' }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Error del servidor. Recargá la página e intentá de nuevo.'); }
      if (!res.ok) throw new Error(data.error || 'Error al eliminar.');

      card.style.transition = 'opacity 0.3s, transform 0.3s';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(() => card.remove(), 300);
    } catch (err) {
      alert(getErrorMessage(err));
      (btn as HTMLButtonElement).disabled = false;
    }
  });
});

// ========== REPORT ==========
document.querySelectorAll('.report-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const card = btn.closest('.review-card') as HTMLElement | null;
    if (!card) return;
    const resenaId = parseInt(card.getAttribute('data-id') || '0');

    if (!confirm('¿Querés reportar esta reseña como inapropiada?')) return;

    (btn as HTMLButtonElement).disabled = true;

    try {
      const res = await fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resena_id: resenaId, motivo: 'Contenido inapropiado' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');

      btn.textContent = '✓ Reportada';
      (btn as HTMLButtonElement).disabled = true;
    } catch (err) {
      alert(getErrorMessage(err));
      (btn as HTMLButtonElement).disabled = false;
    }
  });
});

// ========== VOTOS ==========
// El estado inicial viene del servidor (data-votada); la base guarda un voto por usuario.
function pintarVoto(btn: HTMLButtonElement, votada: boolean, votos: number) {
  btn.dataset.votada = votada ? 'true' : 'false';
  btn.setAttribute('aria-pressed', votada ? 'true' : 'false');
  btn.classList.toggle('pressed', votada);
  btn.classList.toggle('quiet', !votada);
  const countSpan = btn.querySelector('.votos-count');
  if (countSpan) countSpan.textContent = String(Math.max(0, votos));
  btn.closest('.review-card')?.setAttribute('data-votos', String(Math.max(0, votos)));
}

document.querySelectorAll<HTMLButtonElement>('.btn-votar').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (btn.dataset.logueado !== 'true') {
      (window as any).openLoginModal?.();
      return;
    }
    if (btn.disabled) return;

    const id = btn.dataset.id;
    const votadaAntes = btn.dataset.votada === 'true';
    const votosAntes = parseInt(btn.querySelector('.votos-count')?.textContent || '0') || 0;

    // UI optimista: se revierte si el servidor falla
    pintarVoto(btn, !votadaAntes, votosAntes + (votadaAntes ? -1 : 1));
    btn.disabled = true;

    try {
      const res = await fetch('/api/resenas/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resena_id: Number(id), accion: votadaAntes ? 'desvotar' : 'votar' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar el voto.');
      if (typeof data.votos === 'number') pintarVoto(btn, !votadaAntes, data.votos);
    } catch (err) {
      pintarVoto(btn, votadaAntes, votosAntes);
      alert(getErrorMessage(err));
    } finally {
      btn.disabled = false;
    }
  });
});
export {};
