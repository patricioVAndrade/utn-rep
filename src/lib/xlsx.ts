// Lector mínimo de archivos .xlsx (lo que exporta Google Sheets).
// Solo saca el texto de cada celda, por pestaña. No necesita dependencias:
// un .xlsx es un zip con XML adentro, y Node trae zlib.
import { inflateRawSync } from 'node:zlib';

export type Hoja = {
  nombre: string;
  /** filas[fila][columna], empezando en 0. Las celdas vacías quedan como ''. */
  filas: string[][];
};

const MAX_ARCHIVO = 20 * 1024 * 1024;

/** Lee las entradas de un zip (sin soporte para zip64 ni cifrado, que Google no usa). */
function leerZip(buf: Uint8Array): Map<string, Uint8Array> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Fin del directorio central: firma 0x06054b50, en los últimos 64 KB
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error('El archivo no es un .xlsx válido.');
  const cantidad = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, Uint8Array>();
  for (let n = 0; n < cantidad; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('El archivo .xlsx está dañado.');
    const metodo = dv.getUint16(p + 10, true);
    const comprimido = dv.getUint32(p + 20, true);
    const largoNombre = dv.getUint16(p + 28, true);
    const largoExtra = dv.getUint16(p + 30, true);
    const largoComent = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nombre = dec.decode(buf.subarray(p + 46, p + 46 + largoNombre));
    p += 46 + largoNombre + largoExtra + largoComent;
    if (!nombre.endsWith('.xml') && !nombre.endsWith('.rels')) continue;
    const inicio = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const datos = buf.subarray(inicio, inicio + comprimido);
    if (metodo === 0) out.set(nombre, datos);
    else if (metodo === 8) out.set(nombre, new Uint8Array(inflateRawSync(datos, { maxOutputLength: 64 * 1024 * 1024 })));
  }
  return out;
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function desescapar(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e] ?? m;
  });
}

/** Junta el texto de todos los <t> de un fragmento (texto simple o con formato). */
function textoDe(xml: string): string {
  let out = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1];
  return desescapar(out);
}

/** "AB12" -> [fila 11, columna 27] */
function posicion(ref: string): [number, number] {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return [-1, -1];
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return [parseInt(m[2], 10) - 1, col - 1];
}

export function leerXlsx(buf: Uint8Array): Hoja[] {
  if (buf.length > MAX_ARCHIVO) throw new Error('El archivo es demasiado grande.');
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error('El archivo no es un .xlsx.');
  const zip = leerZip(buf);
  const dec = new TextDecoder();
  const leer = (ruta: string) => { const b = zip.get(ruta); return b ? dec.decode(b) : ''; };

  const compartidos: string[] = [];
  for (const m of leer('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) compartidos.push(textoDe(m[1]));

  const rels = new Map<string, string>();
  for (const m of leer('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) rels.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }

  const hojas: Hoja[] = [];
  for (const m of leer('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const nombre = desescapar(/name="([^"]*)"/.exec(m[0])?.[1] || '');
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1] || '';
    const xml = leer(rels.get(rid) || '');
    const filas: string[][] = [];
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const cuerpo = c[2] || '';
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref || !cuerpo) continue;
      const tipo = /t="(\w+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
      let texto = '';
      if (tipo === 's') texto = compartidos[parseInt(v || '-1', 10)] ?? '';
      else if (tipo === 'inlineStr') texto = textoDe(cuerpo);
      else if (v !== undefined) texto = desescapar(v);
      if (!texto) continue;
      const [f, col] = posicion(ref);
      if (f < 0 || f > 5000 || col > 200) continue;
      while (filas.length <= f) filas.push([]);
      const fila = filas[f];
      while (fila.length <= col) fila.push('');
      fila[col] = texto;
    }
    hojas.push({ nombre, filas });
  }
  return hojas;
}
