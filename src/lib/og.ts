/**
 * Imagen al compartir (1200 x 630), como la vista previa de WhatsApp de la V6:
 * fondo de cuaderno azul, el nombre, etiquetas (curso, turno, año) y la nota grande.
 * Se arma con satori (a SVG) y resvg (a PNG). No toca la base: recibe los datos ya listos.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { REGULAR, BOLD } from './og-fuentes';
import { LOGO_ALTO, LOGO_ANCHO, LOGO_SVG } from './logo';
import { carriles, escalaSemana, minutosVisibles } from './semana';

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
  // border-box explícito: con Astro 7, en el servidor de desarrollo satori tomaba content-box por defecto
  props: { style: { display: 'flex', boxSizing: 'border-box', ...style }, children: children.length === 1 ? children[0] : children },
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

  const arbol = marco(
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
  return png(arbol);
}

/** Fondo de cuaderno, agujeros, logo y bajada; abajo, lo de cada imagen. */
function marco(...contenido: Nodo[]): Nodo {
  return h(
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
    ...contenido,
  );
}

async function png(arbol: Nodo): Promise<Uint8Array> {
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

// ── La semana de Mi inscripción (6.4, Pato 16/11): la imagen al compartir
// muestra los cursos elegidos como en el simulador ──
export type BloqueOg = { dia: number; desde: number; hasta: number; curso: string; sigla: string; nota: number | null; color: number; pisa: boolean };
export type SemanaOg = { cuatri: string; bloques: BloqueOg[] };

// Los mismos colores de las materias que en el simulador (.m1 a .m6 de foro.css)
const MATERIA = [
  ['#2f6fb5', '#e6effa'], ['#2c8549', '#e5f3e9'], ['#8a5a1c', '#f7eedf'],
  ['#6f4fb8', '#eee8fa'], ['#1b7a8c', '#e2f2f4'], ['#5f6b1d', '#eef1dc'],
];
const DIAS_OG = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const icono = (d: string, color: string, size: number): Nodo => ({
  type: 'svg',
  props: { width: size, height: size, viewBox: '0 0 24 24', children: { type: 'path', props: { d, fill: 'none', stroke: color, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } } },
});

export async function imagenSemana(s: SemanaOg): Promise<Uint8Array> {
  // Alto para la grilla: 630 - borde - márgenes - encabezado - título
  const ALTO = 318;
  const HUECO = 26;
  const base = escalaSemana(s.bloques, 1, HUECO);
  const ppm = Math.min(0.78, (ALTO - base.cortos.length * HUECO) / Math.max(60, minutosVisibles(base)));
  const e = escalaSemana(s.bloques, ppm, HUECO);
  const ANCHO_DIA = (1200 - 140 - 64 - 44) / 6;
  // Cuántos cursos se pisan con otro (uno por materia)
  const pisan = new Set(s.bloques.filter((b) => b.pisa).map((b) => b.color)).size;

  const horas: Nodo[] = [];
  for (let t = e.desde; t < e.hasta; t += 60) {
    if (e.enHueco(t) || e.cortos.some(([a]) => a === t && t !== e.desde)) continue;
    horas.push(h('div', { position: 'absolute', right: 6, top: e.y(t) - 2, fontSize: 14, color: '#6b7a8c' }, String(t / 60)));
  }

  const columnas = [1, 2, 3, 4, 5, 6].map((d) => {
    const hijos: Nodo[] = [];
    for (let t = e.desde + 60; t < e.hasta; t += 60) if (!e.enHueco(t)) hijos.push(h('div', { position: 'absolute', left: 0, right: 0, top: e.y(t), height: 1, background: '#e6ebf1' }));
    const del = s.bloques.filter((b) => b.dia === d);
    const lugar = carriles(del);
    for (const b of del) {
      const { k, n } = lugar.get(b)!;
      const [mc, mbg] = MATERIA[b.color % 6];
      const alto = (b.hasta - b.desde) * ppm - 3;
      const ancho = (ANCHO_DIA - 8) / n;
      const lineas = alto >= 62 ? 3 : alto >= 40 ? 2 : 1;
      const tinta = b.pisa ? ROJO : mc;
      // La barra de color va aparte: satori dibuja el borde izquierdo en diagonal
      hijos.push(h('div', {
        position: 'absolute', top: e.y(b.desde) + 2, left: 4 + k * ancho, width: ancho - (n > 1 ? 2 : 0), height: alto,
        overflow: 'hidden', borderRadius: 2, background: b.pisa ? '#fbe3e1' : mbg,
        ...(b.pisa ? { border: `2px solid ${ROJO}` } : {}),
      },
        h('div', { width: 5, height: '100%', background: tinta, flexShrink: 0 }),
        h('div', { flexDirection: 'column', padding: '3px 8px', color: '#1d2a3a', fontSize: 15, lineHeight: 1.25 },
          lineas === 1
            ? h('div', { gap: 6 }, h('span', { fontWeight: 700, color: tinta }, b.curso), h('span', {}, b.sigla))
            : h('div', { fontWeight: 700, fontSize: 17, color: tinta }, b.curso),
          lineas >= 2 ? h('div', {}, b.sigla) : h('div', {}),
          lineas >= 3 && b.nota !== null ? h('div', { alignItems: 'center', gap: 4, color: '#5d6b7c', fontSize: 14 }, estrellaGris(14), coma(b.nota)) : h('div', {})),
      ));
    }
    return h('div', { position: 'relative', width: ANCHO_DIA, height: e.alto, borderLeft: '1px solid #d6dee8' }, ...hijos);
  });

  const huecos = e.cortos.map(([a, z]) => h('div', {
    position: 'absolute', left: 44, right: 0, top: 34 + e.y(a), height: HUECO, alignItems: 'center', justifyContent: 'center',
    background: '#f4f6f9', borderTop: '1px dashed #b9c4d2', borderBottom: '1px dashed #b9c4d2', fontSize: 14, color: '#6b7a8c',
  }, `Sin clases de ${a / 60} a ${z / 60}`));

  const arbol = marco(
    h('div', { alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 14 },
      h('div', { alignItems: 'baseline', gap: 12 },
        h('span', { fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }, 'Mi inscripción'),
        h('span', { fontSize: 28, color: '#c9d8ea' }, `· ${s.cuatri}`)),
      h('div', { alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 4, background: pisan ? ROJO : '#2c8549', fontSize: 22, fontWeight: 700, flexShrink: 0 },
        pisan ? icono('M12 5v9M12 19v.5', '#fff', 22) : icono('M5 12.5l4.5 4.5L19 7.5', '#fff', 22),
        pisan ? `${pisan} cursos se pisan` : 'No se pisa nada')),
    h('div', { position: 'relative', flexDirection: 'column', background: '#fff', borderRadius: 6, overflow: 'hidden' },
      h('div', { height: 34, background: '#d6e1ee', color: '#1d2a3a', fontSize: 17, fontWeight: 700 },
        h('div', { width: 44 }),
        ...DIAS_OG.map((d) => h('div', { width: ANCHO_DIA, alignItems: 'center', justifyContent: 'center' }, d))),
      h('div', {},
        h('div', { position: 'relative', width: 44, height: e.alto }, ...horas),
        ...columnas),
      ...huecos),
  );
  return png(arbol);
}

function estrellaGris(size: number): Nodo {
  return { type: 'svg', props: { width: size, height: size, viewBox: '0 0 24 24', children: { type: 'path', props: { d: 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z', fill: '#e0a21a' } } } };
}
