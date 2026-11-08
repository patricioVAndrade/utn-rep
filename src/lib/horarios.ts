// Horarios de cada curso (migración 12) y superposiciones de Mi inscripción.
// Las horas van en minutos desde las 0:00 (8:00 = 480). El día va de 1
// (lunes) a 6 (sábado). cuatri null = todo el período del curso.

export type Bloque = { cuatri: 1 | 2 | null; dia: number; desde: number; hasta: number };

export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const clave = (s: string) => sinAcentos(s).toLowerCase().replace(/\s+/g, ' ').trim();

/** Día de la semana de un encabezado ("Miércoles " -> 3). */
export function diaDe(texto: string): number | null {
  const i = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].indexOf(clave(texto));
  return i < 0 ? null : i + 1;
}

/** "8:00", "08.45" o la fracción del día que exporta Google (0.5 = 12:00). */
export function hora(celda: string | number | null | undefined): number | null {
  const t = String(celda ?? '').trim();
  if (!t) return null;
  const m = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(t);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h < 24 && min < 60 ? h * 60 + min : null;
  }
  if (/^0?\.\d+$/.test(t)) {
    const x = Math.round(Number(t) * 1440);
    return x > 0 && x < 1440 ? x : null;
  }
  return null;
}

export const horaTexto = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

const ordenCuatri = (c: 1 | 2 | null) => (c === null ? 0 : c);
const ordenar = (a: Bloque, b: Bloque) => ordenCuatri(a.cuatri) - ordenCuatri(b.cuatri) || a.dia - b.dia || a.desde - b.desde || a.hasta - b.hasta;

/** Ordena y junta los módulos seguidos del mismo día (con un recreo de hasta `hueco` minutos). */
export function juntarBloques(bloques: Bloque[], hueco = 15): Bloque[] {
  const out: Bloque[] = [];
  for (const x of [...bloques].sort(ordenar)) {
    const prev = out[out.length - 1];
    if (prev && prev.cuatri === x.cuatri && prev.dia === x.dia && x.desde <= prev.hasta + hueco) prev.hasta = Math.max(prev.hasta, x.hasta);
    else out.push({ ...x });
  }
  return out;
}

const CUATRI_TEXTO = { 1: '1.er cuatri', 2: '2.º cuatri' } as const;

/** "Lunes 8:00 a 9:30 · Jueves 8:00 a 10:25"; si dice el cuatrimestre, lo antepone. */
export function textoBloques(bloques: Bloque[]): string {
  const orden = [...bloques].sort(ordenar);
  const partes: string[] = [];
  let actual: 1 | 2 | null | undefined;
  for (const x of orden) {
    const t = `${DIAS[x.dia]} ${horaTexto(x.desde)} a ${horaTexto(x.hasta)}`;
    if (x.cuatri !== actual && x.cuatri !== null) partes.push(`${CUATRI_TEXTO[x.cuatri]}: ${t}`);
    else partes.push(t);
    actual = x.cuatri;
  }
  return partes.join(' · ');
}

/** Filas de la tabla horarios ("08:00:00") a bloques. */
export function bloquesDeBase(filas: { cuatri: number | null; dia: number; desde: string; hasta: string }[]): Bloque[] {
  return juntarBloques(
    filas
      .map((f) => ({ cuatri: f.cuatri === 1 || f.cuatri === 2 ? f.cuatri : null, dia: f.dia, desde: hora(f.desde) ?? -1, hasta: hora(f.hasta) ?? -1 }) as Bloque)
      .filter((f) => f.desde >= 0 && f.hasta > f.desde),
    0,
  );
}

export function mismoHorario(a: Bloque[], b: Bloque[]): boolean {
  const x = juntarBloques(a, 0);
  const y = juntarBloques(b, 0);
  return x.length === y.length && x.every((v, i) => v.cuatri === y[i].cuatri && v.dia === y[i].dia && v.desde === y[i].desde && v.hasta === y[i].hasta);
}

/** Lo que manda el admin al guardar: una lista de bloques válidos, o null si algo no cierra. */
export function bloquesValidos(x: unknown): Bloque[] | null {
  if (!Array.isArray(x) || x.length > 40) return null;
  const out: Bloque[] = [];
  for (const v of x as any[]) {
    const cuatri = v?.cuatri === 1 || v?.cuatri === 2 ? v.cuatri : v?.cuatri == null ? null : undefined;
    const ok = cuatri !== undefined && Number.isInteger(v?.dia) && v.dia >= 1 && v.dia <= 6
      && Number.isInteger(v?.desde) && Number.isInteger(v?.hasta) && v.desde >= 0 && v.hasta < 1440 && v.hasta > v.desde;
    if (!ok) return null;
    out.push({ cuatri, dia: v.dia, desde: v.desde, hasta: v.hasta });
  }
  return out;
}

export const horaBase = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export type Choque = { a: string; b: string; dia: number; desde: number; hasta: number; cuatri: 1 | 2 | null };

/** Pares de cursos que se pisan, con el día y el tramo en común. */
export function superposiciones(cursos: { id: number; nombre: string; bloques: Bloque[] }[]): Choque[] {
  const out: Choque[] = [];
  for (let i = 0; i < cursos.length; i++) {
    for (let j = i + 1; j < cursos.length; j++) {
      for (const x of cursos[i].bloques) {
        for (const y of cursos[j].bloques) {
          if (x.dia !== y.dia) continue;
          if (x.cuatri !== null && y.cuatri !== null && x.cuatri !== y.cuatri) continue;
          const desde = Math.max(x.desde, y.desde);
          const hasta = Math.min(x.hasta, y.hasta);
          if (desde < hasta) out.push({ a: cursos[i].nombre, b: cursos[j].nombre, dia: x.dia, desde, hasta, cuatri: x.cuatri ?? y.cuatri });
        }
      }
    }
  }
  return out;
}

export function textoChoque(c: Choque): string {
  return `${c.a} y ${c.b} se pisan el ${DIAS[c.dia].toLowerCase()} de ${horaTexto(c.desde)} a ${horaTexto(c.hasta)}${c.cuatri ? ` (${CUATRI_TEXTO[c.cuatri]})` : ''}.`;
}

// ── Siglas de la planilla (ADSI, IOP, SIM, ICS…) ──

const CORTAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'para', 'a', 'con']);

/** Nombre de materia sin "(electiva)" ni el subgrupo ("4K2A") del final. */
export function limpiarMateria(s: string): string {
  return s.replace(/[\r\n\t]+/g, ' ').replace(/\(\s*electiva\s*\)/gi, ' ').replace(/\s+\d+K\d+[A-Z]?\s*$/i, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Cuánto "cuesta" leer la sigla como iniciales de la materia, o null si no
 * se puede. Cada parte de la sigla es el comienzo de una palabra, en orden y
 * empezando por la primera ("ADSI" = AD-ministración SI-stemas). Usar una
 * palabra corta ("de", "para") cuesta 1 y dejar una palabra larga sin usar,
 * 0,5: así, entre dos materias, gana la más natural.
 */
export function costoSigla(sigla: string, nombre: string): number | null {
  const s = clave(sigla).replace(/[^a-z]/g, '');
  const pal = clave(limpiarMateria(nombre)).replace(/[^a-z\s]/g, ' ').split(' ').filter(Boolean);
  if (s.length < 2 || !pal.length) return null;
  let mejor: number | null = null;
  // i: letra de la sigla; w: palabra actual; k: letras usadas de esa palabra; costo acumulado
  const buscar = (i: number, w: number, k: number, costo: number) => {
    if (mejor !== null && costo >= mejor) return;
    if (i === s.length) {
      const sinUsar = pal.slice(w + 1).filter((p) => !CORTAS.has(p)).length * 0.5;
      if (mejor === null || costo + sinUsar < mejor) mejor = costo + sinUsar;
      return;
    }
    // Seguir en la misma palabra
    if (pal[w][k] === s[i]) buscar(i + 1, w, k + 1, costo);
    // Pasar a una palabra siguiente
    for (let v = w + 1; v < pal.length; v++) {
      if (pal[v][0] !== s[i]) continue;
      const salteadas = pal.slice(w + 1, v).filter((p) => !CORTAS.has(p)).length * 0.5;
      buscar(i + 1, v, 1, costo + salteadas + (CORTAS.has(pal[v]) ? 1 : 0));
    }
  };
  if (pal[0][0] === s[0]) buscar(1, 0, 1, 0);
  return mejor;
}

/** Busca la materia de una celda de la grilla entre las de la pestaña. */
export function materiaDeCelda(celda: string, materias: string[]): string | null {
  const t = limpiarMateria(celda);
  if (!t) return null;
  const k = clave(t);
  const exacta = materias.find((m) => clave(limpiarMateria(m)) === k);
  if (exacta) return exacta;
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,6}$/.test(t)) return null;
  const costos = materias.map((m) => ({ m, c: costoSigla(t, m) })).filter((x): x is { m: string; c: number } => x.c !== null).sort((a, b) => a.c - b.c);
  if (!costos.length) return null;
  if (costos.length > 1 && costos[1].c === costos[0].c) return null; // no se sabe cuál
  return costos[0].m;
}
