// Simulá tu inscripción (Pato, 15/11): para cada materia, los cursos que se
// pueden elegir en la próxima inscripción, con su horario, nota y turno.
// Lo usan Mi inscripción y /api/inscripcion/opciones.
import { supabase } from './supabase';
import { bloquesDeBase, sinRecreos, siglaMateria, type Bloque } from './horarios';
import { compararCursos } from './format';

export type Cuatri = 1 | 2;
export type Opcion = {
  id: number;
  curso: string;
  turno: string | null;
  periodo: string | null;
  promedio: number | null;
  cantidad: number;
  /** Todos, cada uno con su cuatrimestre (null: los dos). */
  bloques: Bloque[];
  /** En qué cuatrimestres se cursa (anual: los dos). */
  cuatris: Cuatri[];
  anual: boolean;
  /** Contracuatrimestral: se dicta en el cuatrimestre contrario al habitual. */
  contra: boolean;
};
export type MateriaSim = { id: number; nombre: string; nivel: number; sigla: string; opciones: Opcion[] };

const PERIODOS: Record<string, { texto: string; cuatri: Cuatri | null }> = {
  ANUAL: { texto: 'Anual', cuatri: null },
  PRIMER_CUATRIMESTRE: { texto: '1.er cuatrimestre', cuatri: 1 },
  SEGUNDO_CUATRIMESTRE: { texto: '2.º cuatrimestre', cuatri: 2 },
};

/** La próxima inscripción: de agosto a febrero, el primer cuatrimestre; de marzo a julio, el segundo. */
export function periodoInscripcion(hoy = new Date()): { cuatri: Cuatri; anio: number; texto: string } {
  const mes = hoy.getMonth() + 1;
  const anio = mes >= 8 ? hoy.getFullYear() + 1 : hoy.getFullYear();
  const cuatri: Cuatri = mes >= 3 && mes <= 7 ? 2 : 1;
  return { cuatri, anio, texto: `${cuatri === 1 ? 'primer' : 'segundo'} cuatrimestre ${anio}` };
}

const one = (x: any) => (Array.isArray(x) ? x[0] || null : x || null);

/** Mejor nota primero; a igual nota, el de más reseñas; los sin reseñas al final. */
export function ordenarOpciones(a: Opcion, b: Opcion): number {
  return (b.promedio ?? -1) - (a.promedio ?? -1) || b.cantidad - a.cantidad || compararCursos(a.curso, b.curso);
}

/** Los cursos de esas materias, listos para el simulador (de los dos cuatrimestres). */
export async function materiasSim(materiaIds: number[]): Promise<MateriaSim[]> {
  if (!materiaIds.length) return [];
  const [{ data: materias }, { data: dictados }] = await Promise.all([
    supabase.from('materias').select('id, nombre, nivel').in('id', materiaIds),
    supabase.from('dictados').select('id, materia_id, periodo_dictado, es_contracuatrimestral, cursos ( identificador, turno )').in('materia_id', materiaIds).range(0, 9999),
  ]);
  const ids = (dictados || []).map((d: any) => d.id);
  const [{ data: stats }, { data: horarios }] = ids.length
    ? await Promise.all([
        supabase.from('stats_dictados').select('dictado_id, cantidad, promedio').in('dictado_id', ids),
        supabase.from('horarios').select('dictado_id, cuatri, dia, desde, hasta').in('dictado_id', ids).range(0, 9999),
      ])
    : [{ data: [] }, { data: [] }];
  const st = new Map((stats || []).map((s: any) => [s.dictado_id, s]));
  const horDe = new Map<number, any[]>();
  (horarios || []).forEach((h: any) => horDe.set(h.dictado_id, [...(horDe.get(h.dictado_id) || []), h]));

  const porMateria = new Map<number, Opcion[]>();
  for (const d of dictados || []) {
    const c = one((d as any).cursos);
    const s: any = st.get(d.id);
    let bloques = sinRecreos(bloquesDeBase(horDe.get(d.id) || []));
    const unico = bloques.length && bloques.every((b) => b.cuatri !== null && b.cuatri === bloques[0].cuatri) ? bloques[0].cuatri : null;
    const per = PERIODOS[(d as any).periodo_dictado] || (unico ? PERIODOS[unico === 1 ? 'PRIMER_CUATRIMESTRE' : 'SEGUNDO_CUATRIMESTRE'] : null);
    if (per?.cuatri) bloques = bloques.map((b) => (b.cuatri === null ? { ...b, cuatri: per.cuatri } : b));
    // Un cuatrimestral puede tener días distintos en cada cuatrimestre (3K6): se cursa en los dos
    const cs = new Set<Cuatri>();
    if (per) (per.cuatri ? [per.cuatri] : [1, 2]).forEach((c) => cs.add(c as Cuatri));
    for (const b of bloques) if (b.cuatri) cs.add(b.cuatri);
    // Sin período ni cuatrimestre en el horario: puede ser cualquiera
    if (!cs.size || (!per && bloques.some((b) => b.cuatri === null))) { cs.add(1); cs.add(2); }
    porMateria.set(d.materia_id, [...(porMateria.get(d.materia_id) || []), {
      id: d.id,
      curso: c?.identificador || 'Curso',
      turno: c?.turno ?? null,
      periodo: per?.texto ?? null,
      promedio: s?.cantidad ? Number(s.promedio) : null,
      cantidad: s?.cantidad || 0,
      bloques,
      cuatris: [...cs].sort((a, b) => a - b),
      anual: (d as any).periodo_dictado === 'ANUAL',
      contra: !!(d as any).es_contracuatrimestral && (d as any).periodo_dictado !== 'ANUAL',
    }]);
  }
  return (materias || [])
    .map((m: any) => ({ id: m.id, nombre: m.nombre, nivel: m.nivel, sigla: siglaMateria(m.nombre), opciones: (porMateria.get(m.id) || []).sort(ordenarOpciones) }))
    .sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre, 'es'));
}
