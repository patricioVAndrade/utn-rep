/**
 * Imagen al compartir (1200 x 630), como la vista previa de WhatsApp de la V6:
 * fondo de cuaderno azul, el nombre, etiquetas (curso, turno, año) y la nota grande.
 * Se arma con satori (a SVG) y resvg (a PNG). No toca la base: recibe los datos ya listos.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { REGULAR, BOLD } from './og-fuentes';
import { LOGO_ALTO, LOGO_ANCHO, LOGO_SVG } from './logo';

export type Etiqueta = { texto: string; tipo?: 'curso' | 'turno' | 'anio' | 'gris'; anio?: number };
export type DatosOg = {
  titulo: string;
  arriba?: string; // línea chica arriba del título (por ejemplo "Profesor")
  etiquetas?: Etiqueta[];
  nota?: number | null; // promedio 1 a 5
  resenas?: number;
  pie?: string; // texto chico abajo a la izquierda si no hay nota
};

const NAVY = '#133d68';
const AMBER = '#f0a91c';
const ROJO = '#d9453b';
const ANIOS: Record<number, string> = { 1: '#2f6fb5', 2: '#2c8549', 3: '#1b7a8c', 4: '#a63d5a', 5: '#6f4fb8' };

type Nodo = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Nodo => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children },
});

// Logo F2 (src/lib/logo.ts) como imagen: satori dibuja el SVG tal cual
const logo = (alto: number): Nodo => ({
  type: 'img',
  props: {
    src: 'data:image/svg+xml;base64,' + Buffer.from(LOGO_SVG).toString('base64'),
    width: Math.round((alto * LOGO_ANCHO) / LOGO_ALTO),
    height: alto,
  },
});

const estrella = (llena: number, size: number): Nodo => {
  // llena: 0 a 1
  const id = `g${Math.round(llena * 100)}`;
  return {
    type: 'svg',
    props: {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      children: [
        { type: 'defs', props: { children: { type: 'linearGradient', props: { id, children: [
          { type: 'stop', props: { offset: `${llena * 100}%`, stopColor: AMBER } },
          { type: 'stop', props: { offset: `${llena * 100}%`, stopColor: 'rgba(255,255,255,.28)' } },
        ] } } } },
        { type: 'path', props: { d: 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z', fill: `url(#${id})` } },
      ],
    },
  };
};

function etiqueta(e: Etiqueta): Nodo {
  const base = { fontSize: 30, fontWeight: 700, padding: '6px 16px', borderRadius: 6, lineHeight: 1.15 };
  if (e.tipo === 'curso') return h('div', { ...base, background: '#fff', color: NAVY }, e.texto);
  if (e.tipo === 'turno') return h('div', { ...base, background: '#fff6dc', color: '#5a3d00' }, e.texto);
  if (e.tipo === 'anio') return h('div', { ...base, background: ANIOS[e.anio || 1] || ANIOS[1], color: '#fff' }, e.texto);
  return h('div', { ...base, fontWeight: 400, background: 'rgba(255,255,255,.14)', color: '#fff' }, e.texto);
}

const coma = (n: number) => n.toFixed(1).replace('.', ',');

export async function imagenOg(d: DatosOg): Promise<Uint8Array> {
  const titulo = d.titulo.length > 70 ? d.titulo.slice(0, 68).replace(/\s+\S*$/, '') + '…' : d.titulo;
  const tam = titulo.length > 42 ? 58 : titulo.length > 26 ? 68 : 80;
  const hayNota = typeof d.nota === 'number' && (d.resenas ?? 0) > 0;

  const arbol = h(
    'div',
    {
      width: 1200, height: 630, flexDirection: 'column', fontFamily: 'DejaVu Sans', color: '#fff',
      backgroundColor: NAVY,
      backgroundImage: `linear-gradient(90deg, transparent 0, transparent 92px, ${ROJO} 92px, ${ROJO} 96px, transparent 96px), linear-gradient(rgba(255,255,255,.09) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.09) 2px, transparent 2px)`,
      backgroundSize: '1200px 630px, 28px 28px, 28px 28px',
      borderBottom: `14px solid ${AMBER}`,
      padding: '48px 64px 40px 140px',
    },
    // Agujeros del cuaderno
    h('div', { position: 'absolute', left: 30, top: 0, bottom: 0, flexDirection: 'column', justifyContent: 'space-around' },
      ...[0, 1, 2].map(() => h('div', { width: 30, height: 30, borderRadius: 15, background: '#e8eef4', boxShadow: 'inset 0 3px 4px rgba(0,0,0,.45)' }))),
    h('div', { alignItems: 'center', gap: 26 }, logo(92),
      h('div', { flexDirection: 'column', gap: 4 },
        h('div', { fontSize: 26, fontWeight: 700 }, 'Reseñas de estudiantes, para estudiantes'),
        h('div', { fontSize: 24, color: '#cfdced', alignItems: 'baseline' }, 'Ingeniería en Sistemas de Información · UTN-', h('span', { color: '#ffc63f', fontWeight: 700 }, 'FRC')))),
    h('div', { flexDirection: 'column', flexGrow: 1, justifyContent: 'center', gap: 22 },
      d.arriba ? h('div', { fontSize: 30, opacity: 0.85 }, d.arriba) : h('div', {}),
      h('div', { fontSize: tam, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1 }, titulo),
      d.etiquetas?.length ? h('div', { gap: 14, flexWrap: 'wrap' }, ...d.etiquetas.map(etiqueta)) : h('div', {})),
    hayNota
      ? h('div', { alignItems: 'center', gap: 22 },
          h('div', { fontSize: 96, fontWeight: 700, lineHeight: 1 }, coma(d.nota as number)),
          h('div', { gap: 4 }, ...[1, 2, 3, 4, 5].map((i) => estrella(Math.max(0, Math.min(1, (d.nota as number) - i + 1)), 52))),
          h('div', { fontSize: 34, opacity: 0.9, marginLeft: 8 }, `${d.resenas} reseña${d.resenas === 1 ? '' : 's'}`))
      : h('div', { fontSize: 32, opacity: 0.9 }, d.pie || 'utnrep.app'),
  );

  const svg = await satori(arbol as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'DejaVu Sans', data: Buffer.from(REGULAR, 'base64'), weight: 400, style: 'normal' },
      { name: 'DejaVu Sans', data: Buffer.from(BOLD, 'base64'), weight: 700, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
