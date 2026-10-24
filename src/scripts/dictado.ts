// Interacciones de la página /dictado/[id]: orden, paginación, edición, borrado, reportes y votos.
function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido';
}

// ========== PAGINATION ==========
const showMoreBtn = document.getElementById('show-more-btn') as HTMLButtonElement | null;
if (showMoreBtn) {
  showMoreBtn.addEventListener('click', () => {
    document.querySelectorAll('.review-extra').forEach(el => {
      el.classList.remove('hidden', 'review-extra');
    });
    showMoreBtn.remove();
  });
}

// ========== SORT ==========
const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;
const reviewsList = document.getElementById('reviews-list') as HTMLElement | null;

if (sortSelect && reviewsList) {
  sortSelect.addEventListener('change', () => {
    // Show all when sorting
    document.querySelectorAll('.review-extra').forEach(el => {
      el.classList.remove('hidden', 'review-extra');
    });
    showMoreBtn?.remove();

    const cards = Array.from(reviewsList.querySelectorAll('.review-card'));

    cards.sort((a, b) => {
      const dateA = a.getAttribute('data-date') || '';
      const dateB = b.getAttribute('data-date') || '';
      const ratingA = parseFloat(a.getAttribute('data-rating') || '0');
      const ratingB = parseFloat(b.getAttribute('data-rating') || '0');
      const votosA = parseInt(a.getAttribute('data-votos') || '0');
      const votosB = parseInt(b.getAttribute('data-votos') || '0');

      switch (sortSelect.value) {
        case 'newest': return dateB.localeCompare(dateA);
        case 'oldest': return dateA.localeCompare(dateB);
        case 'highest': return ratingB - ratingA;
        case 'lowest': return ratingA - ratingB;
        case 'useful': return votosB - votosA;
        default: return 0;
      }
    });

    cards.forEach(card => reviewsList.appendChild(card));
  });
}

// ========== EDIT ==========
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
        body: JSON.stringify({ _method: 'PUT', comentario: newComment }),
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
      btn.classList.remove('text-neutral-600', 'hover:text-red-400');
      btn.classList.add('text-neutral-500');
      (btn as HTMLButtonElement).disabled = true;
    } catch (err) {
      alert(getErrorMessage(err));
      (btn as HTMLButtonElement).disabled = false;
    }
  });
});

// ========== VOTOS ==========
// El estado inicial viene del servidor (data-votada); la base guarda un voto por usuario.
const VOTADA_CLASSES = ['bg-amber-500/10', 'text-amber-400', 'border-amber-500/30'];
const NEUTRA_CLASSES = ['bg-[#2a2a2a]', 'hover:bg-[#333333]', 'text-neutral-400', 'border-neutral-700/50'];

function pintarVoto(btn: HTMLButtonElement, votada: boolean, votos: number) {
  btn.dataset.votada = votada ? 'true' : 'false';
  btn.setAttribute('aria-pressed', votada ? 'true' : 'false');
  btn.classList.remove(...(votada ? NEUTRA_CLASSES : VOTADA_CLASSES));
  btn.classList.add(...(votada ? VOTADA_CLASSES : NEUTRA_CLASSES));
  btn.querySelector('svg')?.setAttribute('fill', votada ? 'currentColor' : 'none');
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
