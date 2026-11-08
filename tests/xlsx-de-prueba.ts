// Arma .xlsx chiquitos para las pruebas, como los que exporta Google.
import { deflateRawSync } from 'node:zlib';

// Celdas de texto compartido (o número si el valor es un number) y celdas combinadas.
export function crearXlsx(hojas: { nombre: string; celdas: Record<string, string | number>; combinadas?: string[] }[]): Uint8Array {
  const strings: string[] = [];
  const idx = (s: string) => { let i = strings.indexOf(s); if (i < 0) { i = strings.length; strings.push(s); } return i; };
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const archivos: Record<string, string> = {};
  hojas.forEach((h, n) => {
    const celdas = Object.entries(h.celdas).map(([ref, v]) => (typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="s"><v>${idx(v)}</v></c>`)).join('');
    const comb = h.combinadas?.length ? `<mergeCells count="${h.combinadas.length}">${h.combinadas.map((r) => `<mergeCell ref="${r}"/>`).join('')}</mergeCells>` : '';
    archivos[`xl/worksheets/sheet${n + 1}.xml`] = `<worksheet><sheetData><row>${celdas}</row></sheetData>${comb}</worksheet>`;
  });
  archivos['xl/workbook.xml'] = `<workbook><sheets>${hojas.map((h, n) => `<sheet name="${esc(h.nombre)}" sheetId="${n + 1}" r:id="rId${n + 1}"/>`).join('')}</sheets></workbook>`;
  archivos['xl/_rels/workbook.xml.rels'] = `<Relationships>${hojas.map((_, n) => `<Relationship Id="rId${n + 1}" Target="worksheets/sheet${n + 1}.xml"/>`).join('')}</Relationships>`;
  archivos['xl/sharedStrings.xml'] = `<sst>${strings.map((s) => `<si><t>${esc(s)}</t></si>`).join('')}</sst>`;

  const enc = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;
  for (const [nombre, xml] of Object.entries(archivos)) {
    const n = enc.encode(nombre);
    const datos = deflateRawSync(enc.encode(xml));
    const local = new Uint8Array(30 + n.length);
    const dl = new DataView(local.buffer);
    dl.setUint32(0, 0x04034b50, true); dl.setUint16(8, 8, true); dl.setUint32(18, datos.length, true); dl.setUint16(26, n.length, true);
    local.set(n, 30);
    const central = new Uint8Array(46 + n.length);
    const dc = new DataView(central.buffer);
    dc.setUint32(0, 0x02014b50, true); dc.setUint16(10, 8, true); dc.setUint32(20, datos.length, true); dc.setUint16(28, n.length, true); dc.setUint32(42, offset, true);
    central.set(n, 46);
    locales.push(local, datos);
    centrales.push(central);
    offset += local.length + datos.length;
  }
  const tamCentral = centrales.reduce((a, c) => a + c.length, 0);
  const fin = new Uint8Array(22);
  const df = new DataView(fin.buffer);
  df.setUint32(0, 0x06054b50, true); df.setUint16(8, centrales.length, true); df.setUint16(10, centrales.length, true); df.setUint32(12, tamCentral, true); df.setUint32(16, offset, true);
  const partes = [...locales, ...centrales, fin];
  const out = new Uint8Array(partes.reduce((a, p) => a + p.length, 0));
  let p = 0;
  for (const parte of partes) { out.set(parte, p); p += parte.length; }
  return out;
}

