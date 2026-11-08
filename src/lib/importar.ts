// Compara lo que dice la planilla con lo que hay en la base y arma la
// vista previa de "Importar cuatrimestre". No escribe nada.
import { limpiar, sinAcentos, type Asignacion, type HorarioLeido, type Turno } from './planilla';
import { bloquesDeBase, mismoHorario, textoBloques, type Bloque } from './horarios';

export type BaseMateria = { id: number; nombre: string; nivel: number; es_electiva?: boolean | null };
export type BaseCurso = { id: number; identificador: string; turno: string | null; anio_carrera: number | null };
export type BaseProfesor = { id: number; nombre_completo: string };
export type BaseDictado = { id: number; materia_id: number; curso_id: number; profesores: number[] };

export type Base = {
  materias: BaseMateria[];
  cursos: BaseCurso[];
  profesores: BaseProfesor[];
  dictados: BaseDictado[];
  /** Horarios cargados (migración 12); vacío si todavía no existe la tabla */
  horarios?: { dictado_id: number; cuatri: number | null; dia: number; desde: string; hasta: string }[];
};

/** Un curso cuyo horario es nuevo o cambió (migración 12). */
export type CambioHorario = {
  clave: string;
  curso: string;
  curso_id: number;
  materia: string; // nombre en la base, o el de la planilla si no se encontró
  materia_planilla: string;
  materia_id: number | null;
  dictado_id: number | null;
  antes: string;
  ahora: string;
  bloques: Bloque[];
  hoja: string;
};

export type Entra = {
  nombre: string; // como viene en la planilla
  profesor_id: number | null; // null: hay que crearlo
  sugerido: string; // nombre con el que se crearía ("Apellido, Nombres")
  parecido?: boolean; // se encontró con una coincidencia aproximada
  opciones?: { id: number; nombre: string }[]; // varias coincidencias posibles
};

export type Cambio = {
  clave: string;
  curso: string;
  curso_id: number | null;
  turno: Turno | null;
  anio: number;
  materia: string; // nombre en la base, o el de la planilla si no se encontró
  materia_planilla: string;
  materia_id: number | null;
  dictado_id: number | null;
  entran: Entra[];
  salen: { profesor_id: number; nombre: string }[];
  quedan: string[];
  hoja: string;
};

export type Previa = {
  cursosNuevos: { identificador: string; turno: Turno | null; anio: number }[];
  turnoDistinto: { curso_id: number; identificador: string; antes: string | null; ahora: Turno }[];
  materiasSinCoincidencia: { nombre: string; cursos: string[]; sugerencias: { id: number; nombre: string }[] }[];
  dictadosNuevos: Cambio[];
  cambiosDeEquipo: Cambio[];
  profesoresNuevos: string[];
  sinCambios: number;
  horarios: CambioHorario[];
  horariosIguales: number;
  /** Cursos de los horarios que no están en la base. */
  horariosSinCurso: string[];
  leidos: { cursos: number; materias: number };
};

const norm = (s: string) => sinAcentos(limpiar(s)).toLowerCase().replace(/[.()]/g, ' ').replace(/\s+/g, ' ').trim();
const ROMANOS: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5' };
const VACIAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'para', 'a', 'con', 'electiva']);
const palabras = (s: string) =>
  norm(s)
    .split(/[\s,]+/)
    .map((p) => ROMANOS[p] || p)
    .map((p) => (p.length > 4 && p.endsWith('s') ? p.slice(0, -1) : p))
    .filter((p) => p && !VACIAS.has(p));

/** Busca la materia de la base que corresponde a un nombre de la planilla. */
export function buscarMateria(nombre: string, materias: BaseMateria[], nivel: number) {
  const n = norm(nombre).replace(/\s*electiva\s*$/, '').trim();
  const exacta = materias.filter((m) => norm(m.nombre) === n);
  if (exacta.length === 1) return { materia: exacta[0], sugerencias: [] };
  if (exacta.length > 1) return { materia: exacta.find((m) => m.nivel === nivel) || exacta[0], sugerencias: [] };

  // Aproximada: todas las palabras de la planilla están en el nombre de la base
  // (o al revés), con preferencia por las materias de ese año.
  const pp = palabras(nombre);
  const puntaje = (m: BaseMateria) => {
    const pm = palabras(m.nombre);
    const enBase = pp.filter((p) => pm.some((q) => q === p || (p.length >= 4 && q.startsWith(p)) || (q.length >= 4 && p.startsWith(q)))).length;
    const enPlanilla = pm.filter((q) => pp.some((p) => q === p || (p.length >= 4 && q.startsWith(p)) || (q.length >= 4 && p.startsWith(q)))).length;
    if (!pp.length || !pm.length) return { cubre: 0, s: 0 };
    const cubre = Math.max(enBase / pp.length, enPlanilla / pm.length);
    return { cubre, s: cubre + (m.nivel === nivel ? 0.05 : 0) - Math.abs(pp.length - pm.length) * 0.01 };
  };
  const orden = materias.map((m) => ({ m, ...puntaje(m) })).filter((x) => x.cubre >= 0.6).sort((a, b) => b.s - a.s);
  const completas = orden.filter((x) => x.cubre === 1);
  if (completas.length === 1 || (completas.length > 1 && completas[0].s - completas[1].s >= 0.04)) return { materia: completas[0].m, sugerencias: [] };
  return { materia: null, sugerencias: orden.slice(0, 4).map((x) => ({ id: x.m.id, nombre: x.m.nombre })) };
}

/** "Alfredo García" -> "García, Alfredo". Si ya tiene coma, lo deja. */
export function formatoApellidoNombre(nombre: string): string {
  const n = limpiar(nombre);
  if (n.includes(',')) return n.replace(/\s*,\s*/, ', ');
  const partes = n.split(' ');
  if (partes.length < 2) return n;
  return `${partes[partes.length - 1]}, ${partes.slice(0, -1).join(' ')}`;
}

export type Indice = { prof: BaseProfesor; clave: string; apellidos: string[]; nombres: string[]; todas: string[] };

export function indexar(profesores: BaseProfesor[]): Indice[] {
  return profesores.map((prof) => {
    const n = norm(prof.nombre_completo);
    const [ap, no] = n.includes(',') ? n.split(',', 2) : ['', n];
    const apellidos = ap.split(' ').filter(Boolean);
    const nombres = no.split(' ').filter(Boolean);
    return { prof, clave: [...apellidos, ...nombres].sort().join(' '), apellidos, nombres, todas: [...apellidos, ...nombres] };
  });
}

/** Busca a un docente de la planilla entre los profesores cargados. */
export function buscarProfesor(nombre: string, indice: Indice[]): Entra {
  const sugerido = formatoApellidoNombre(nombre);
  const n = norm(nombre);
  const tokens = n.replace(',', ' ').split(' ').filter(Boolean);
  const claveN = [...tokens].sort().join(' ');
  const exacto = indice.filter((x) => x.clave === claveN);
  if (exacto.length === 1) return { nombre, profesor_id: exacto[0].prof.id, sugerido };
  if (exacto.length > 1) return { nombre, profesor_id: null, sugerido, opciones: exacto.slice(0, 5).map((c) => ({ id: c.prof.id, nombre: c.prof.nombre_completo })) };

  // Aproximado: las palabras completas están todas, las iniciales ("S.") coinciden
  // y al menos un apellido de la base aparece en la planilla.
  const completas = tokens.filter((t) => t.length > 1);
  const iniciales = tokens.filter((t) => t.length === 1);
  const candidatos = indice.filter((x) => {
    if (!completas.length) return false;
    if (!completas.every((t) => x.todas.includes(t))) return false;
    if (!x.apellidos.some((a) => completas.includes(a))) return false;
    const resto = x.todas.filter((t) => !completas.includes(t));
    return iniciales.every((i) => resto.some((t) => t.startsWith(i)));
  });
  if (candidatos.length === 1) return { nombre, profesor_id: candidatos[0].prof.id, sugerido, parecido: true };
  if (candidatos.length > 1) return { nombre, profesor_id: null, sugerido, opciones: candidatos.slice(0, 5).map((c) => ({ id: c.prof.id, nombre: c.prof.nombre_completo })) };
  return { nombre, profesor_id: null, sugerido };
}

export function compararConBase(asignaciones: Asignacion[], base: Base, horarios: HorarioLeido[] = []): Previa {
  const previa: Previa = { cursosNuevos: [], turnoDistinto: [], materiasSinCoincidencia: [], dictadosNuevos: [], cambiosDeEquipo: [], profesoresNuevos: [], sinCambios: 0, horarios: [], horariosIguales: 0, horariosSinCurso: [], leidos: { cursos: 0, materias: 0 } };
  const cursoPorIdent = new Map(base.cursos.map((c) => [c.identificador.toUpperCase(), c]));
  const profPorId = new Map(base.profesores.map((p) => [p.id, p]));
  const dictadoPor = new Map(base.dictados.map((d) => [`${d.curso_id}-${d.materia_id}`, d]));
  const indice = indexar(base.profesores);

  // Si un curso y una materia aparecen en las dos planillas, gana la de Sistemas
  // (tiene los nombres completos).
  const prioridad = { sistemas: 0, csv: 1, basicas: 2 } as const;
  const elegidas = new Map<string, Asignacion>();
  const sinMateria = new Map<string, { nombre: string; cursos: Set<string>; sugerencias: { id: number; nombre: string }[] }>();
  const materiaDe = new Map<Asignacion, BaseMateria | null>();
  for (const a of asignaciones) {
    const nivel = parseInt(a.curso, 10) || 0;
    const { materia, sugerencias } = buscarMateria(a.materia, base.materias, nivel);
    materiaDe.set(a, materia);
    const k = `${a.curso}|${materia ? `m${materia.id}` : norm(a.materia)}`;
    const prev = elegidas.get(k);
    if (!prev || prioridad[a.formato] < prioridad[prev.formato]) elegidas.set(k, a);
    if (!materia) {
      const km = norm(a.materia);
      const s = sinMateria.get(km) || { nombre: a.materia, cursos: new Set<string>(), sugerencias };
      s.cursos.add(a.curso);
      sinMateria.set(km, s);
    }
  }

  const cursosVistos = new Set<string>();
  const nuevosProf = new Map<string, string>();
  for (const [k, a] of elegidas) {
    const anio = parseInt(a.curso, 10) || 0;
    const curso = cursoPorIdent.get(a.curso);
    if (!cursosVistos.has(a.curso)) {
      cursosVistos.add(a.curso);
      if (!curso) previa.cursosNuevos.push({ identificador: a.curso, turno: a.turno, anio });
      else if (a.turno && curso.turno && curso.turno.toUpperCase() !== a.turno) previa.turnoDistinto.push({ curso_id: curso.id, identificador: curso.identificador, antes: curso.turno, ahora: a.turno });
    }
    const materia = materiaDe.get(a) || null;
    const dictado = curso && materia ? dictadoPor.get(`${curso.id}-${materia.id}`) : undefined;
    const actuales = new Set(dictado?.profesores || []);

    const entran: Entra[] = [];
    const siguen = new Set<number>();
    for (const nombre of a.docentes) {
      const e = buscarProfesor(nombre, indice);
      // Si hay dos cargados con el mismo nombre y uno ya está en el curso, es ese
      const yaEsta = e.opciones?.find((o) => actuales.has(o.id));
      if (yaEsta) { siguen.add(yaEsta.id); continue; }
      if (e.profesor_id && actuales.has(e.profesor_id)) { siguen.add(e.profesor_id); continue; }
      if (e.profesor_id && entran.some((x) => x.profesor_id === e.profesor_id)) continue;
      entran.push(e);
      if (!e.profesor_id && !e.opciones) nuevosProf.set(norm(e.sugerido), e.sugerido);
    }
    const salen = [...actuales].filter((id) => !siguen.has(id)).map((id) => ({ profesor_id: id, nombre: profPorId.get(id)?.nombre_completo || `Profesor ${id}` }));
    const cambio: Cambio = {
      clave: k,
      curso: a.curso,
      curso_id: curso?.id ?? null,
      turno: a.turno,
      anio,
      materia: materia?.nombre || a.materia,
      materia_planilla: a.materia,
      materia_id: materia?.id ?? null,
      dictado_id: dictado?.id ?? null,
      entran,
      salen,
      quedan: [...siguen].map((id) => profPorId.get(id)?.nombre_completo || ''),
      hoja: a.hoja,
    };
    if (!dictado) previa.dictadosNuevos.push(cambio);
    else if (entran.length || salen.length) previa.cambiosDeEquipo.push(cambio);
    else previa.sinCambios++;
  }

  const porCurso = (a: Cambio, b: Cambio) => a.curso.localeCompare(b.curso, 'es', { numeric: true }) || a.materia.localeCompare(b.materia, 'es');
  previa.dictadosNuevos.sort(porCurso);
  previa.cambiosDeEquipo.sort(porCurso);
  previa.cursosNuevos.sort((a, b) => a.identificador.localeCompare(b.identificador, 'es', { numeric: true }));
  previa.materiasSinCoincidencia = [...sinMateria.values()].map((s) => ({ nombre: s.nombre, cursos: [...s.cursos].sort(), sugerencias: s.sugerencias }));
  previa.profesoresNuevos = [...nuevosProf.values()].sort((a, b) => a.localeCompare(b, 'es'));
  previa.leidos = { cursos: cursosVistos.size, materias: elegidas.size };
  compararHorarios(horarios, base, previa);
  return previa;
}

/** Horarios de la planilla contra los de la base: solo los nuevos o distintos. */
function compararHorarios(horarios: HorarioLeido[], base: Base, previa: Previa) {
  const cursoPorIdent = new Map(base.cursos.map((c) => [c.identificador.toUpperCase(), c]));
  const dictadoPor = new Map(base.dictados.map((d) => [`${d.curso_id}-${d.materia_id}`, d]));
  const deBase = new Map<number, Base['horarios']>();
  (base.horarios || []).forEach((h) => deBase.set(h.dictado_id, [...(deBase.get(h.dictado_id) || []), h]));
  // Si una materia está en varias fuentes, gana el CSV (los PDF oficiales),
  // después la planilla de Sistemas y por último la de Básicas.
  const prioridad = { csv: 0, sistemas: 1, basicas: 2 } as const;
  const elegidos = new Map<string, { h: HorarioLeido; materia: BaseMateria | null }>();
  const sinCurso = new Set<string>();
  for (const h of horarios) {
    if (!cursoPorIdent.has(h.curso)) { sinCurso.add(h.curso); continue; }
    const { materia, sugerencias } = buscarMateria(h.materia, base.materias, parseInt(h.curso, 10) || 0);
    if (!materia) {
      // Se pide en "Materias que no encontré", junto con las de los equipos
      const s = previa.materiasSinCoincidencia.find((x) => norm(x.nombre) === norm(h.materia));
      if (s) { if (!s.cursos.includes(h.curso)) s.cursos = [...s.cursos, h.curso].sort(); }
      else previa.materiasSinCoincidencia.push({ nombre: h.materia, cursos: [h.curso], sugerencias });
    }
    const k = `${h.curso}|${materia ? `m${materia.id}` : norm(h.materia)}`;
    const prev = elegidos.get(k);
    if (!prev || prioridad[h.formato] < prioridad[prev.h.formato]) elegidos.set(k, { h, materia });
  }
  previa.horariosSinCurso = [...sinCurso].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  for (const [k, { h, materia }] of elegidos) {
    const curso = cursoPorIdent.get(h.curso)!;
    const dictado = materia ? dictadoPor.get(`${curso.id}-${materia.id}`) : undefined;
    const antes = dictado ? bloquesDeBase(deBase.get(dictado.id) || []) : [];
    if (antes.length && mismoHorario(antes, h.bloques)) { previa.horariosIguales++; continue; }
    previa.horarios.push({
      clave: k,
      curso: h.curso,
      curso_id: curso.id,
      materia: materia?.nombre ?? h.materia,
      materia_planilla: h.materia,
      materia_id: materia?.id ?? null,
      dictado_id: dictado?.id ?? null,
      antes: textoBloques(antes),
      ahora: textoBloques(h.bloques),
      bloques: h.bloques,
      hoja: h.hoja,
    });
  }
  previa.horarios.sort((a, b) => a.curso.localeCompare(b.curso, 'es', { numeric: true }) || a.materia.localeCompare(b.materia, 'es'));
}
