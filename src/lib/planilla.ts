// Lee las planillas de horarios del centro de estudiantes y saca, para cada
// curso de Sistemas (los que tienen K, como 4K1), qué materias tiene y quién
// las da. Hay dos formatos:
//  - Sistemas: una pestaña por curso (4K1, 4K2...) con una tabla
//    "Materia | Docentes" al costado de la grilla de horarios.
//  - Básicas: una pestaña por materia (Álgebra Anual, Física 1...) con una
//    fila por curso de todas las carreras. De esas solo se leen las de K.
import type { Hoja } from './xlsx';

export type Turno = 'MAÑANA' | 'TARDE' | 'NOCHE';

export type Asignacion = {
  curso: string; // 4K1
  turno: Turno | null;
  materia: string; // como está en la planilla, sin saltos de línea
  docentes: string[];
  formato: 'sistemas' | 'basicas' | 'csv';
  hoja: string;
};

export type LecturaPlanilla = {
  asignaciones: Asignacion[];
  /** Pestañas o cursos que no se leyeron, con el motivo. */
  omitidas: { hoja: string; motivo: string }[];
};

export const limpiar = (s: string) => s.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
export const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const clave = (s: string) => sinAcentos(limpiar(s)).toLowerCase();

const CURSO_K = /^\d+K\d+$/i;
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
    .map(limpiar)
    .filter((l) => l && !ES_HORA.test(l) && !/^(teoric[oa]|practic[oa]|teoria|practica|aula|virtual|laboratorio)\b/i.test(sinAcentos(l)));
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
    for (let r = f + 1; r < h.filas.length; r++) {
      const materia = limpiar(h.filas[r]?.[colMat] || '');
      if (!materia || ES_HORA.test(materia) || /^(materia|asignatura)s?$/i.test(materia)) continue;
      const k = clave(materia);
      if (vistas.has(k)) continue;
      vistas.add(k);
      out.asignaciones.push({ curso, turno, materia, docentes: separarDocentesSistemas(h.filas[r]?.[colDoc] || ''), formato: 'sistemas', hoja: h.nombre });
    }
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
  let dias: number[] = [];
  let turnoBloque: Turno | null = null;
  const porCurso = new Map<string, Asignacion>();
  const otrosK = new Set<string>();

  for (const fila of h.filas) {
    if (!fila) continue;
    const iCurso = fila.findIndex((c) => clave(c) === 'curso');
    if (iCurso >= 0) {
      encontrada = true;
      colCurso = iCurso;
      dias = fila.map((c, i) => (/^(lunes|martes|miercoles|jueves|viernes|sabado)$/.test(clave(c)) ? i : -1)).filter((i) => i >= 0);
      continue;
    }
    // Algunas pestañas separan bloques por turno con un título
    const titulo = fila.filter(Boolean);
    if (titulo.length === 1 && /turno/i.test(titulo[0])) turnoBloque = turnoDe(titulo[0]);
    if (colCurso < 0) continue;
    const celdaCurso = limpiar(fila[colCurso] || '');
    if (!celdaCurso) continue;
    const cursos = celdaCurso.split(/[|/,;\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
    const docentes = new Set<string>();
    for (const i of dias) for (const d of separarDocentesBasicas(fila[i] || '')) docentes.add(d);
    for (const c of cursos) {
      if (!/^\d+K\d+/.test(c)) continue;
      if (!CURSO_K.test(c)) { otrosK.add(c); continue; }
      const prev = porCurso.get(c);
      if (prev) docentes.forEach((d) => { if (!prev.docentes.includes(d)) prev.docentes.push(d); });
      else porCurso.set(c, { curso: c, turno: turnoBloque, materia, docentes: [...docentes], formato: 'basicas', hoja: h.nombre });
    }
  }
  if (!encontrada) return false;
  out.asignaciones.push(...porCurso.values());
  if (otrosK.size) out.omitidas.push({ hoja: h.nombre, motivo: `Subgrupos que no se leen: ${[...otrosK].join(', ')}` });
  return true;
}

export function leerPlanilla(hojas: Hoja[]): LecturaPlanilla {
  const out: LecturaPlanilla = { asignaciones: [], omitidas: [] };
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
 * CSV cargado a mano: columnas curso, materia, docentes y (opcional) turno.
 * Los docentes van separados por " | " o por ";" dentro de la celda.
 */
export function leerCsv(texto: string): LecturaPlanilla {
  const out: LecturaPlanilla = { asignaciones: [], omitidas: [] };
  const filas = partirCsv(texto.replace(/^﻿/, ''));
  const enc = (filas[0] || []).map(clave);
  const iC = enc.findIndex((c) => c === 'curso');
  const iM = enc.findIndex((c) => c === 'materia');
  const iD = enc.findIndex((c) => /^(docentes?|profesor(es)?)$/.test(c));
  const iT = enc.findIndex((c) => c === 'turno');
  if (iC < 0 || iM < 0 || iD < 0) throw new Error('El CSV tiene que tener las columnas curso, materia y docentes.');
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

/** Saca el id de un link de Google Sheets. */
export function idDePlanilla(link: string): string | null {
  const m = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(link.trim());
  return m ? m[1] : null;
}
