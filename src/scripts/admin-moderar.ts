// Responder como moderador y "Pedirle que la edite" (ver ModerarAcciones.astro).
import { adminFetch, aviso } from './admin-api';

const ETIQUETAS: Record<string, [string, number]> = {
  responder: ['Respuesta del moderador. La ve todo el mundo debajo de la reseña, sin tu nombre.', 1000],
  pedir_edicion: ['Qué tiene que cambiar. Lo ve solo quien la escribió, en Mis reseñas.', 500],
};

document.querySelectorAll<HTMLElement>('.moderar').forEach((box) => {
  const form = box.querySelector<HTMLElement>('.moderar-form')!;
  const ta = form.querySelector('textarea')!;
  const etiqueta = form.querySelector<HTMLElement>('[data-etiqueta]')!;
  const sobre = box.dataset.resena ? { resena_id: Number(box.dataset.resena) } : { final_id: Number(box.dataset.final) };
  let modo = '';

  box.querySelectorAll<HTMLButtonElement>('[data-abrir]').forEach((b) => b.addEventListener('click', () => {
    modo = b.dataset.abrir || '';
    const [texto, max] = ETIQUETAS[modo];
    etiqueta.textContent = texto;
    ta.maxLength = max;
    ta.value = (modo === 'responder' ? box.dataset.respuesta : box.dataset.pedido) || '';
    form.classList.remove('hidden');
    ta.focus();
  }));
  form.querySelector('[data-cerrar]')!.addEventListener('click', () => form.classList.add('hidden'));

  form.querySelector<HTMLButtonElement>('[data-enviar]')!.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    b.disabled = true;
    try {
      await adminFetch('/api/admin/moderacion', { accion: modo, ...sobre, texto: ta.value });
      if (modo === 'responder') box.dataset.respuesta = ta.value.trim();
      else box.dataset.pedido = ta.value.trim();
      form.classList.add('hidden');
      aviso(modo === 'responder' ? 'Respuesta publicada.' : 'Pedido guardado. Lo va a ver en Mis reseñas.');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo guardar.', true);
    } finally {
      b.disabled = false;
    }
  });

  box.querySelectorAll<HTMLButtonElement>('[data-quitar]').forEach((b) => b.addEventListener('click', async () => {
    const accion = b.dataset.quitar!;
    if (!confirm(accion === 'borrar_respuesta' ? '¿Sacar la respuesta del moderador?' : '¿Sacar el pedido de edición?')) return;
    b.disabled = true;
    try {
      await adminFetch('/api/admin/moderacion', { accion, ...sobre });
      if (accion === 'borrar_respuesta') box.dataset.respuesta = '';
      else box.dataset.pedido = '';
      b.remove();
      aviso('Listo.');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No se pudo.', true);
      b.disabled = false;
    }
  }));
});
