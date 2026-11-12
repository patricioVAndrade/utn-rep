// Lee las planillas de horarios del centro de estudiantes y saca, para cada
// curso de Sistemas (los que tienen K, como 4K1, y los intensivos de Básicas
// con H, como 1H10/11), qué materias tiene y quién las da. Hay dos formatos:
//  - Sistemas: una pestaña por curso (4K1, 4K2...) con una tabla
//    "Materia | Docentes" al costado de la grilla de horarios.
//  - Básicas: una pestaña por materia (Álgebra Anual, Física 1...) con una
//    fila por curso de todas las carreras. De esas solo se leen las de K y
//    los intensivos (H), que son de todas las ingenierías.
import { rellenarCombinadas, type Hoja } from './xlsx';
import { diaDe, hora, juntarBloques, materiaDeCelda, type Bloque } from './horarios';

export type Turno = 'MAÑANA' | 'TARDE' | 'NOCHE';

export type Asignacion = {
  curso: string; // 4K1
  turno: Turno | null;
  materia: string; // como está en la planilla, sin saltos de línea
  docentes: string[];
  formato: 'sistemas' | 'basicas' | 'csv';
  hoja: string;
};

/** Horario de una materia en un curso (migración 12). */
export type HorarioLeido = {
  curso: string;
  materia: string; // como está en la tabla de materias de la pestaña
  bloques: Bloque[];
  formato: 'sistemas' | 'basicas' | 'csv';
  hoja: string;
};

export type LecturaPlanilla = {
  asignaciones: Asignacion[];
  horarios: HorarioLeido[];
  /** Pestañas o cursos que no se leyeron, con el motivo. */
  omitidas: { hoja: string; motivo: string }[];
};

export const limpiar = (s: string) => s.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
export const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const clave = (s: string) => sinAcentos(limpiar(s)).toLowerCase();

const CURSO_K = /^\d+K\d+$/i;
/** Intensivo: "1H10/11", "1H9" */
export const CURSO_H = /^\d+H\d+(\/\d+)?$/;

/** Celda de curso intensivo: "1H10 / Comisión 50" -> "1H10/50"; "1H8/8 / VIRTUAL" -> "1H8/8"; "1H9 / VIRTUAL" -> "1H9". */
export function cursoIntensivo(celda: string): string | null {
  const t = sinAcentos(limpiar(celda)).toUpperCase().replace(/COMISION|VIRTUAL|RECURSANTES?/g, '/').replace(/[^A-Z0-9/]+/g, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  return CURSO_H.test(t) ? t : null;
}
const ES_HORA = /\d{1,2}[:.]\d{2}/;

export function turnoDe(texto: string): Turno | null {
  const t = clave(texto);
  if (/turno manana|\bmanana\b/.test(t)) return 'MAÑANA';
  if (/turno tarde|\btarde\b/.test(t)) return 'TARDE';
  if (/turno noche|\bnoche\b/.test(t)) return 'NOCHE';
  return null;
}

/**
 * Separa la celda de docentes del formato Sistemas: un docente por línea,
 * "Apellido, Nombres". Una línea sin coma es la continuación de la anterior
 * (pasa cuando el nombre no entra y alguien apretó Enter).
 */
export function separarDocentesSistemas(celda: string): string[] {
  const lineas = celda.split(/\r?\n/).map(limpiar).filter(Boolean);
  const out: string[] = [];
  for (const l of lineas) {
    if (!l.includes(',') && out.length > 0) out[out.length - 1] += ` ${l}`;
    else out.push(l);
  }
  return out.map((d) => d.replace(/\s*,\s*/, ', ')).filter((d) => d.length > 2);
}

/** Celda de un día en Básicas: "Alfredo García\nTeórico\n10:25 a 12:50". Devuelve los nombres. */
export function separarDocentesBasicas(celda: string): string[] {
  return celda
    .split(/\r?\n|\s\|\s/)
    .map((l) => limpiar(l).replace(/\s*\((t|p)\)\s*$/i, ''))
    .filter((l) => l && /[a-z]{2}/i.test(l) && !ES_HORA.test(l) && !/^(teoric[oa]|practic[oa]|teoria|practica|aula|virtual|laboratorio|solo consultas|cada \d+|recursantes?|ingresantes?|comision)\b/i.test(sinAcentos(l)));
}

const CUATRI_DE = (texto: string): 1 | 2 | null => {
  const t = clave(texto);
  if (!/cuatrimestre/.test(t)) return null;
  if (/\b(1|1er|1ro|primer|primero)\b/.test(t)) return 1;
  if (/\b(2|2do|segundo)\b/.test(t)) return 2;
  return null;
};

/** Guarda los bloques de cada materia, ya juntos, y avisa lo que no reconoció. */
function guardarHorarios(curso: string, porMateria: Map<string, Bloque[]>, formato: HorarioLeido['formato'], hoja: string, out: LecturaPlanilla) {
  for (const [materia, bloques] of porMateria) {
    if (bloques.length) out.horarios.push({ curso, materia, bloques: juntarBloques(bloques), formato, hoja });
  }
}

/**
 * Grilla de horarios de una pestaña de Sistemas: uno o más bloques
 * ("1er Cuatrimestre - Turno Tarde"), cada uno con su fila de días y una
 * fila por módulo (desde, hasta y la materia de cada día, con el nombre
 * completo o la sigla). Los recreos son filas vacías.
 */
function leerGrillaSistemas(h: Hoja, curso: string, materias: string[], etiquetas: Map<string, string[]>, out: LecturaPlanilla) {
  const g = rellenarCombinadas(h);
  const porMateria = new Map<string, Bloque[]>();
  const raras = new Set<string>();
  let cuatri: 1 | 2 | null = null;
  let dias: Map<number, number> | null = null;
  for (const fila of g) {
    if (!fila) continue;
    const titulo = fila.find((c) => CUATRI_DE(c || '') !== null);
    if (titulo) { cuatri = CUATRI_DE(titulo); dias = null; continue; }
    const enc = new Map<number, number>();
    fila.forEach((c, i) => { const d = diaDe(c || ''); if (d) enc.set(i, d); });
    if (enc.size >= 3) { dias = enc; continue; }
    if (!dias) continue;
    const primera = Math.min(...dias.keys());
    const horas = fila.slice(0, primera).map((c) => hora(c)).filter((x): x is number => x !== null);
    if (horas.length < 2 || horas[1] <= horas[0]) continue;
    const [desde, hasta] = horas;
    const vistas = new Set<string>();
    for (const [col, dia] of dias) {
      const celda = limpiar(fila[col] || '');
      if (!celda) continue;
      let nombres: string[] = [];
      // "Electiva 1" (la de la etiqueta) o "Electiva 1 GMP / GIP" (las que dice)
      const elec = /^electiva\s*(\d)\s*(.*)$/i.exec(celda);
      const partes = elec ? elec[2].split(/\s*[/,|]\s*/).filter(Boolean) : [celda];
      if (elec && !partes.length) nombres = etiquetas.get(`electiva ${elec[1]}`) || [];
      else {
        nombres = partes.map((p) => materiaDeCelda(p, materias)).filter((m): m is string => !!m);
        if (nombres.length < partes.length) nombres = [];
      }
      if (!nombres.length) { raras.add(celda); continue; }
      for (const m of nombres) {
        const k = `${m}|${dia}`;
        if (vistas.has(k)) continue;
        vistas.add(k);
        porMateria.set(m, [...(porMateria.get(m) || []), { cuatri, dia, desde, hasta }]);
      }
    }
  }
  guardarHorarios(curso, porMateria, 'sistemas', h.nombre, out);
  if (raras.size) out.omitidas.push({ hoja: h.nombre, motivo: `Horarios sin materia reconocida: ${[...raras].map((r) => `"${r}"`).join(', ')}` });
}

function leerHojaSistemas(h: Hoja, out: LecturaPlanilla): boolean {
  // Buscamos la fila de encabezado con "Materia" y "Docentes"
  for (let f = 0; f < h.filas.length; f++) {
    const fila = h.filas[f] || [];
    const colMat = fila.findIndex((c) => /^(materia|asignatura)s?$/.test(clave(c)));
    const colDoc = fila.findIndex((c) => /^(docente|profesor)(e?s)?$/.test(clave(c)));
    if (colMat < 0 || colDoc < 0) continue;

    const curso = limpiar(h.nombre).toUpperCase();
    if (!CURSO_K.test(curso)) {
      out.omitidas.push({ hoja: h.nombre, motivo: /^\d+K\d+[A-Z]$/i.test(curso) ? 'Es un subgrupo de electiva' : 'No es un curso de Sistemas (K)' });
      return true;
    }
    let turno: Turno | null = null;
    for (const r of h.filas) for (const c of r || []) if (!turno && /turno/i.test(c)) turno = turnoDe(c);

    const vistas = new Set<string>();
    const materias: string[] = [];
    const etiquetas = new Map<string, string[]>();
    for (let r = f + 1; r < h.filas.length; r++) {
      const materia = limpiar(h.filas[r]?.[colMat] || '');
      if (!materia || ES_HORA.test(materia) || /^(materia|asignatura)s?$/i.test(materia)) continue;
      const k = clave(materia);
      if (vistas.has(k)) continue;
      vistas.add(k);
      out.asignaciones.push({ curso, turno, materia, docentes: separarDocentesSistemas(h.filas[r]?.[colDoc] || ''), formato: 'sistemas', hoja: h.nombre });
      // "Electiva 1" al costado de los docentes: esa materia va en ese lugar de la grilla
      const etiqueta = limpiar(h.filas[r]?.[colDoc + 1] || '');
      const m = /^electiva\s*(\d)/i.exec(etiqueta);
      if (m) etiquetas.set(`electiva ${m[1]}`, [...(etiquetas.get(`electiva ${m[1]}`) || []), materia]);
      materias.push(materia);
    }
    leerGrillaSistemas(h, curso, materias, etiquetas, out);
    return true;
  }
  return false;
}

/** "Álgebra Anual " -> "Álgebra"; "Ingeniería y Sociedad Cuatrimes" -> "Ingeniería y Sociedad" */
export function materiaDePestana(nombre: string): string {
  return limpiar(nombre).replace(/\s+(anual|cuatrimestral|cuatrimes\w*|cuatri)$/i, '').trim();
}

function leerHojaBasicas(h: Hoja, out: LecturaPlanilla): boolean {
  const materia = materiaDePestana(h.nombre);
  let encontrada = false;
  let colCurso = -1;
  let filaDias = -1;
  let dias: number[] = [];
  let turnoBloque: Turno | null = null;
  let cuatri: 1 | 2 | null = null;
  const porCurso = new Map<string, Asignacion>();
  const bloquesDe = new Map<string, Bloque[]>();
  const otrosK = new Set<string>();

  for (const fila of h.filas) {
    if (!fila) continue;
    const iCurso = fila.findIndex((c) => clave(c) === 'curso');
    if (iCurso >= 0) {
      encontrada = true;
      colCurso = iCurso;
      dias = fila.map((c, i) => (/^(lunes|martes|miercoles|jueves|viernes|sabado)$/.test(clave(c)) ? i : -1)).filter((i) => i >= 0);
      filaDias = h.filas.indexOf(fila);
      continue;
    }
    // Algunas pestañas separan bloques por turno con un título
    const titulo = fila.filter(Boolean);
    if (titulo.length === 1 && /turno/i.test(titulo[0])) turnoBloque = turnoDe(titulo[0]);
    if (titulo.length === 1 && CUATRI_DE(titulo[0])) cuatri = CUATRI_DE(titulo[0]);
    if (colCurso < 0) continue;
    const celdaCurso = limpiar(fila[colCurso] || '');
    if (!celdaCurso) continue;
    const intensivo = cursoIntensivo(celdaCurso);
    const cursos = intensivo ? [intensivo] : celdaCurso.split(/[|/,;\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
    const docentes = new Set<string>();
    for (const i of dias) for (const d of separarDocentesBasicas(fila[i] || '')) docentes.add(d);
    const bloques: Bloque[] = [];
    for (const i of dias) {
      const dia = diaDe(h.filas[filaDias]?.[i] || '');
      if (!dia) continue;
      for (const m of (fila[i] || '').matchAll(/(\d{1,2}[:.]\d{2})\s*a\s*(\d{1,2}[:.]\d{2})/g)) {
        const desde = hora(m[1]);
        const hasta = hora(m[2]);
        if (desde !== null && hasta !== null && hasta > desde) bloques.push({ cuatri, dia, desde, hasta });
      }
    }
    for (const c of cursos) {
      if (!CURSO_H.test(c)) {
        if (!/^\d+K\d+/.test(c)) continue;
        if (!CURSO_K.test(c)) { otrosK.add(c); continue; }
      }
      if (bloques.length) bloquesDe.set(c, [...(bloquesDe.get(c) || []), ...bloques]);
      const prev = porCurso.get(c);
      if (prev) docentes.forEach((d) => { if (!prev.docentes.includes(d)) prev.docentes.push(d); });
      else porCurso.set(c, { curso: c, turno: turnoBloque, materia, docentes: [...docentes], formato: 'basicas', hoja: h.nombre });
    }
  }
  if (!encontrada) return false;
  out.asignaciones.push(...porCurso.values());
  for (const [c, bloques] of bloquesDe) guardarHorarios(c, new Map([[materia, bloques]]), 'basicas', h.nombre, out);
  if (otrosK.size) out.omitidas.push({ hoja: h.nombre, motivo: `Subgrupos que no se leen: ${[...otrosK].join(', ')}` });
  return true;
}

export function leerPlanilla(hojas: Hoja[]): LecturaPlanilla {
  const out: LecturaPlanilla = { asignaciones: [], horarios: [], omitidas: [] };
  for (const h of hojas) {
    if (leerHojaSistemas(h, out)) continue;
    if (leerHojaBasicas(h, out)) continue;
    if (h.filas.some((f) => f?.some(Boolean))) out.omitidas.push({ hoja: h.nombre, motivo: /^\d+K\d+[A-Z]$/i.test(limpiar(h.nombre)) ? 'Es un subgrupo de electiva' : 'No encontré la tabla de materias y docentes' });
  }
  return out;
}

/** Parte un CSV simple (con comillas) en filas. */
export function partirCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let comillas = false;
  const sep = (texto.split('\n')[0].match(/;/g)?.length || 0) > (texto.split('\n')[0].match(/,/g)?.length || 0) ? ';' : ',';
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
      else if (ch === '"') comillas = false;
      else celda += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(celda); celda = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda); filas.push(fila); fila = []; celda = '';
    } else celda += ch;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}

/**
 * CSV cargado a mano, de dos clases:
 *  - Equipos: columnas curso, materia, docentes y (opcional) turno. Los
 *    docentes van separados por " | " o por ";" dentro de la celda.
 *  - Horarios (por ejemplo, los PDF oficiales pasados a CSV): columnas curso,
 *    materia, cuatrimestre (1, 2 o vacío si es anual), dia, desde y hasta. Una
 *    fila por módulo; se juntan los de cada curso y materia.
 */
export function leerCsv(texto: string): LecturaPlanilla {
  const out: LecturaPlanilla = { asignaciones: [], horarios: [], omitidas: [] };
  const filas = partirCsv(texto.replace(/^\ufeff/, ''));
  const enc = (filas[0] || []).map(clave);
  const iC = enc.findIndex((c) => c === 'curso');
  const iM = enc.findIndex((c) => c === 'materia');
  const iD = enc.findIndex((c) => /^(docentes?|profesor(es)?)$/.test(c));
  const iT = enc.findIndex((c) => c === 'turno');
  const iDia = enc.findIndex((c) => c === 'dia');
  const iDesde = enc.findIndex((c) => c === 'desde');
  const iHasta = enc.findIndex((c) => c === 'hasta');
  if (iC >= 0 && iM >= 0 && iD < 0 && iDia >= 0 && iDesde >= 0 && iHasta >= 0) return leerCsvHorarios(filas, iC, iM, enc.findIndex((c) => /^cuatri(mestre)?$/.test(c)), iDia, iDesde, iHasta);
  if (iC < 0 || iM < 0 || iD < 0) throw new Error('El CSV tiene que tener las columnas curso, materia y docentes (o curso, materia, cuatrimestre, dia, desde y hasta).');
  for (const f of filas.slice(1)) {
    const curso = limpiar(f[iC] || '').toUpperCase();
    const materia = limpiar(f[iM] || '');
    if (!curso || !materia) continue;
    if (!CURSO_K.test(curso)) { out.omitidas.push({ hoja: curso, motivo: 'No es un curso de Sistemas (K)' }); continue; }
    const docentes = (f[iD] || '').split(/\s*[|;]\s*|\r?\n/).map(limpiar).filter(Boolean);
    out.asignaciones.push({ curso, turno: iT >= 0 ? turnoDe(f[iT] || '') : null, materia, docentes, formato: 'csv', hoja: 'CSV' });
  }
  return out;
}

function leerCsvHorarios(filas: string[][], iC: number, iM: number, iQ: number, iDia: number, iDesde: number, iHasta: number): LecturaPlanilla {
  const out: LecturaPlanilla = { asignaciones: [], horarios: [], omitidas: [] };
  const grupos = new Map<string, { curso: string; materia: string; bloques: Bloque[] }>();
  filas.slice(1).forEach((f, i) => {
    const curso = limpiar(f[iC] || '').toUpperCase();
    const materia = limpiar(f[iM] || '');
    if (!curso && !materia) return;
    if (!CURSO_K.test(curso)) { out.omitidas.push({ hoja: curso || '?', motivo: 'No es un curso de Sistemas (K)' }); return; }
    const q = clave(iQ >= 0 ? f[iQ] || '' : '');
    const cuatri = /^(1|1er|1ro|primer)/.test(q) ? 1 : /^(2|2do|segundo)/.test(q) ? 2 : !q || q === 'anual' ? null : undefined;
    const d = limpiar(f[iDia] || '');
    const dia = /^[1-6]$/.test(d) ? Number(d) : diaDe(d);
    const desde = hora(f[iDesde]);
    const hasta = hora(f[iHasta]);
    if (!materia || cuatri === undefined || !dia || desde === null || hasta === null || hasta <= desde) {
      out.omitidas.push({ hoja: curso, motivo: `Fila ${i + 2}: no entendí el horario` });
      return;
    }
    const k = `${curso}|${clave(materia)}`;
    const g = grupos.get(k) || { curso, materia, bloques: [] };
    g.bloques.push({ cuatri, dia, desde, hasta });
    grupos.set(k, g);
  });
  for (const g of grupos.values()) out.horarios.push({ ...g, bloques: juntarBloques(g.bloques), formato: 'csv', hoja: 'CSV' });
  return out;
}

/** Saca el id de un link de Google Sheets. */
export function idDePlanilla(link: string): string | null {
  const m = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(link.trim());
  return m ? m[1] : null;
}
