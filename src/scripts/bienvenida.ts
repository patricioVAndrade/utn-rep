/**
 * Acompañar el cambio de diseño:
 * - Cartel de bienvenida: una sola vez, solo a quien ya usaba UTN REP.
 * - Recorrido de 30 segundos: cuatro paradas (distintas en compu y celular).
 * - Etiquetas "Nuevo" en lo nuevo, hasta el 30 de abril de 2027.
 * Todo se guarda en este navegador.
 */
const HASTA = new Date('2027-05-01T03:00:00Z').getTime(); // 30/4 a la medianoche de Argentina
const VISTA = 'bienvenidaVista';
const NUEVOS = 'nuevosVistos';

const leer = <T,>(k: string, def: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : def; } catch { return def; }
};
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

// ---------- Recorrido ----------
type Parada = { sel: string; t: string; x: string };
const COMPU: Parada[] = [
  { sel: '.banner .search', t: 'El buscador está arriba, en todas las páginas', x: 'Escribí una materia, un curso como 1K3 o el apellido de un profe. Antes estaba solo en el inicio.' },
  { sel: '.banner .tabs', t: 'Las secciones ahora son pestañas', x: '<b>Materias</b>: todas, por año. <b>Experiencias de finales</b>: lo que antes era el cartel amarillo del inicio. <b>Mi espacio</b>: tus reseñas (antes, el iconito al lado de tu nombre), Mi inscripción y Mi cuenta. <b>Avisos</b>: lo nuevo en las materias que seguís.' },
  { sel: '.banner .write-tab', t: 'Escribir una reseña, siempre a mano', x: 'El botón amarillo está en todas las páginas. En el celular, en el centro de la barra de abajo.' },
  { sel: '.userbar .me-link, .userbar [data-login]', t: 'Tu cuenta está en tu nombre', x: 'Tocalo para ir a <b>Mi cuenta</b>, donde elegís qué años cursás. A la derecha está el <b>Modo noche</b>, por si te gustaba el sitio oscuro como antes.' },
];
const CELU: Parada[] = [
  { sel: '.banner .search', t: 'El buscador, arriba de todo', x: 'Materia, curso como 1K3 o apellido de un profe.' },
  { sel: '.jump', t: 'Tu año, a un toque', x: 'Los años tienen color. Tocá el tuyo y vas directo a sus materias.' },
  { sel: '.bottombar .write', t: 'Escribir, en el centro', x: 'Desde cualquier pantalla, sin buscar el botón.' },
  { sel: '.bottombar > :last-child', t: 'Lo tuyo y los finales, abajo', x: 'En "Mi espacio" están tus reseñas, Mi inscripción y Mi cuenta. En "Finales", las experiencias de mesa.' },
];

let paso = 0;
let paradas: Parada[] = [];
let tip: HTMLDivElement | null = null;
let foco: HTMLElement | null = null;

function terminar() {
  foco?.classList.remove('spot');
  foco = null;
  tip?.remove();
  tip = null;
  document.removeEventListener('keydown', teclas);
  window.removeEventListener('resize', ubicar);
}
function teclas(e: KeyboardEvent) {
  if (e.key === 'Escape') terminar();
  if (e.key === 'ArrowRight') mostrar(paso + 1);
  if (e.key === 'ArrowLeft') mostrar(paso - 1);
}
function ubicar() {
  if (!tip || !foco) return;
  const r = foco.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const abajo = r.bottom + 14 + h < window.innerHeight || r.top < h + 14;
  let left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  if (r.left + r.width / 2 > window.innerWidth * 0.6) left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
  tip.style.left = `${left}px`;
  tip.style.top = `${abajo ? r.bottom + 14 : r.top - h - 14}px`;
  tip.dataset.lado = abajo ? 'abajo' : 'arriba';
  const flecha = Math.min(Math.max(14, r.left + r.width / 2 - left - 6), w - 26);
  tip.style.setProperty('--flecha', `${flecha}px`);
}
function mostrar(n: number) {
  if (n < 0) return;
  if (n >= paradas.length) return terminar();
  const el = document.querySelector<HTMLElement>(paradas[n].sel);
  if (!el || !el.offsetParent) return mostrar(n + (n >= paso ? 1 : -1));
  paso = n;
  foco?.classList.remove('spot');
  foco = el;
  el.scrollIntoView({ block: 'nearest' });
  el.classList.add('spot');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tip';
    tip.setAttribute('role', 'dialog');
    document.body.append(tip);
    document.addEventListener('keydown', teclas);
    window.addEventListener('resize', ubicar);
  }
  const p = paradas[n];
  const ultimo = n === paradas.length - 1;
  tip.setAttribute('aria-label', p.t);
  tip.innerHTML = `<span class="step">Paso ${n + 1} de ${paradas.length}</span><b class="tt-h"></b><span class="tt-x"></span>
    <div class="tacts"><span class="dots">${paradas.map((_, i) => `<i${i === n ? ' class="on"' : ''}></i>`).join('')}</span>
    <span class="tbtns"><button type="button" class="btn quiet" data-atras>${n ? 'Anterior' : 'Salir'}</button><button type="button" class="btn primary" data-sig>${ultimo ? 'Listo' : 'Siguiente'}</button></span></div>`;
  tip.querySelector('.tt-h')!.textContent = p.t;
  tip.querySelector('.tt-x')!.innerHTML = p.x; // texto fijo de este archivo
  tip.querySelector('[data-atras]')!.addEventListener('click', () => (n ? mostrar(n - 1) : terminar()));
  const sig = tip.querySelector<HTMLButtonElement>('[data-sig]')!;
  sig.addEventListener('click', () => mostrar(n + 1));
  ubicar();
  sig.focus({ preventScroll: true });
}

/** Arranca el recorrido. Fuera del inicio, lleva al inicio y arranca ahí. */
export function iniciarRecorrido() {
  if (location.pathname !== '/') {
    location.href = '/?recorrido=1';
    return;
  }
  const celu = !!document.querySelector<HTMLElement>('.bottombar')?.offsetParent;
  paradas = celu ? CELU : COMPU;
  window.scrollTo(0, 0);
  mostrar(0);
}

// ---------- Cartel ----------
function yaUsabaElSitio(conSesion: boolean) {
  if (conSesion) return true;
  try {
    // El sitio anterior guardaba esto al iniciar sesión; Supabase guarda la sesión con "sb-".
    if (localStorage.getItem('auth_returnTo') !== null) return true;
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith('sb-')) return true;
  } catch { /* sin almacenamiento */ }
  return false;
}

function cartel() {
  const box = document.getElementById('bienvenida');
  if (!box) return;
  const params = new URLSearchParams(location.search);
  const forzar = params.has('bienvenida');
  if (!forzar && (Date.now() > HASTA || leer(VISTA, false) || !yaUsabaElSitio(!!box.dataset.conSesion))) return;
  const cerrar = () => {
    guardar(VISTA, true);
    box.classList.add('hidden');
    document.removeEventListener('keydown', esc);
  };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
  box.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));
  box.querySelector('[data-recorrido]')?.addEventListener('click', () => { cerrar(); iniciarRecorrido(); });
  document.addEventListener('keydown', esc);
  box.classList.remove('hidden');
  box.querySelector<HTMLElement>('[data-recorrido]')?.focus();
}

// ---------- Etiquetas "Nuevo" ----------
// Cada una se apaga al tocarla, al tocar "Entendido" o después de 3 visitas en que se vio.
type Vistos = Record<string, number>; // clave -> veces vista; -1 = apagada
const NUEVO_LUGAR = new Set(['finales']);
const GLOBOS: Record<string, [string, string]> = {
  compartir: ['Nuevo: compartir', 'Mandale esta página a tu grupo de WhatsApp, con la nota y las estrellas en la vista previa.'],
};

function etiquetas() {
  if (Date.now() > HASTA) return;
  const vistos = leer<Vistos>(NUEVOS, {});
  const contadas = new Set<string>();
  let globo = false;
  document.querySelectorAll<HTMLElement>('[data-nuevo]').forEach((el) => {
    const k = el.dataset.nuevo!;
    if ((vistos[k] ?? 0) < 0 || (vistos[k] ?? 0) >= 3) return;
    if (el.querySelector('.nuevo-tag')) return; // ya muestra "N nuevas"
    if (!contadas.has(k)) { vistos[k] = (vistos[k] ?? 0) + 1; contadas.add(k); }
    const pill = document.createElement('span');
    pill.className = 'nuevo-pill';
    pill.textContent = NUEVO_LUGAR.has(k) ? 'Nuevo lugar' : 'Nuevo';
    el.append(pill);
    const apagar = () => {
      const v = leer<Vistos>(NUEVOS, {});
      v[k] = -1;
      guardar(NUEVOS, v);
      document.querySelectorAll(`[data-nuevo="${k}"] .nuevo-pill, .tip.plain[data-de="${k}"]`).forEach((x) => x.remove());
    };
    el.addEventListener('click', apagar, { once: true });
    // Un solo globo abierto a la vez
    if (!globo && GLOBOS[k] && el.offsetParent) {
      globo = true;
      const g = document.createElement('div');
      g.className = 'tip plain';
      g.dataset.de = k;
      g.setAttribute('role', 'note');
      g.innerHTML = '<b class="tt-h"></b><span></span><div class="tacts"><span></span><button type="button" class="btn quiet">Entendido</button></div>';
      g.querySelector('b')!.textContent = GLOBOS[k][0];
      g.querySelector('span')!.textContent = GLOBOS[k][1];
      g.querySelector('button')!.addEventListener('click', apagar);
      document.body.append(g);
      const ubicarGlobo = () => {
        const r = el.getBoundingClientRect();
        if (!r.width) { g.remove(); return; }
        const w = g.offsetWidth;
        const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
        g.style.position = 'absolute';
        g.style.left = `${left}px`;
        g.style.top = `${r.bottom + window.scrollY + 12}px`;
        g.style.setProperty('--flecha', `${Math.min(Math.max(14, r.left + r.width / 2 - left - 6), w - 26)}px`);
        g.dataset.lado = 'abajo';
      };
      ubicarGlobo();
      window.addEventListener('resize', ubicarGlobo);
    }
  });
  guardar(NUEVOS, vistos);
}

export function iniciarBienvenida() {
  document.querySelectorAll('[data-ver-recorrido]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); iniciarRecorrido(); }));
  const params = new URLSearchParams(location.search);
  if (params.has('recorrido')) {
    history.replaceState(null, '', location.pathname + location.hash);
    guardar(VISTA, true);
    iniciarRecorrido();
  } else {
    cartel();
  }
  etiquetas();
}
