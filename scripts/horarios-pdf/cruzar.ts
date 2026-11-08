// Cruza el CSV de los PDF con lo que ya está cargado (las planillas del centro
// de estudiantes), curso por curso, y avisa qué materias del PDF no están en
// ese curso y qué materias cargadas no tienen horario. No cambia el CSV: los
// nombres de la base pueden no ser los de las planillas (Pato los limpió, por
// ejemplo "Elec Backend" es "Backend de Aplicaciones"), y el importador ya
// busca la materia aunque el nombre no sea igual.
//
//   npx tsx scripts/horarios-pdf/cruzar.ts horarios.csv sistemas1.xlsx ... basicas.xlsx
//
// Las planillas de Sistemas van antes que la de Básicas.
import { readFileSync } from 'node:fs';
import { leerXlsx } from '../../src/lib/xlsx';
import { leerCsv, leerPlanilla } from '../../src/lib/planilla';
import { buscarMateria } from '../../src/lib/importar';

// Lo que el buscador no puede adivinar (Pato, 8/11/2026)
const MISMA: Record<string, string[]> = {
  'Backend de Aplicaciones': ['Elec Backend', 'Backend'],
  // Errores de tipeo de las planillas, que pueden estar así en la base
  'Probabilidad y Estadística': ['Probabilidad y Estadísitica'],
  'Sistemas y Procesos de Negocio': ['Sistemas y Procesos de Negocios', 'Sitemas y Procesos de Negocios'],
};

const [entrada, ...planillas] = process.argv.slice(2);
// curso -> nombres de cada planilla, en el orden en que se pasaron
const porPlanilla = new Map<string, string[][]>();
planillas.forEach((f, i) => {
  const r = leerPlanilla(leerXlsx(new Uint8Array(readFileSync(f))));
  for (const a of r.asignaciones) {
    const l = porPlanilla.get(a.curso) || planillas.map(() => [] as string[]);
    if (!l[i].includes(a.materia)) l[i].push(a.materia);
    porPlanilla.set(a.curso, l);
  }
});
const deCurso = new Map([...porPlanilla].map(([c, l]) => [c, [...new Set(l.flat())]]));
/** Busca primero entre los nombres de la primera planilla que tenga el curso, después en las demás. */
function cargada(curso: string, materia: string): string | null {
  return enListas(porPlanilla.get(curso) || [], materia);
}
/** La materia en otros cursos del mismo año (cuando el curso no la tiene cargada). */
function deOtroCurso(curso: string, materia: string): string | null {
  const anio = parseInt(curso, 10);
  const listas = planillas.map((_, i) => [...new Set([...porPlanilla].filter(([c]) => parseInt(c, 10) === anio).flatMap(([, l]) => l[i]))]);
  return enListas(listas, materia);
}
function enListas(listas: string[][], materia: string): string | null {
  for (const l of listas) {
    if (!l.length) continue;
    const alias = (MISMA[materia] || []).find((x) => l.includes(x));
    if (alias) return alias;
    const { materia: m } = buscarMateria(materia, l.map((nombre, i) => ({ id: i + 1, nombre, nivel: 0 })), 0);
    if (m) return m.nombre;
  }
  return null;
}
const leidos = leerCsv(readFileSync(entrada, 'utf8'));
const nuevo = new Map<string, string>(); // curso|materia -> nombre cargado
const sinCruce: string[] = [];
for (const h of leidos.horarios) {
  const cargadas = deCurso.get(h.curso);
  if (!cargadas) { sinCruce.push(`${h.curso}: el curso no está en las planillas (${h.materia})`); continue; }
  const m = cargada(h.curso, h.materia);
  if (m) { nuevo.set(`${h.curso}|${h.materia}`, m); continue; }
  const otro = deOtroCurso(h.curso, h.materia);
  if (otro) nuevo.set(`${h.curso}|${h.materia}`, otro);
  sinCruce.push(`${h.curso}: ${h.materia} no está cargada en ese curso${otro ? ` (en otros cursos se llama "${otro}")` : ''}`);
}
const usadas = new Set([...nuevo.entries()].map(([k, v]) => `${k.split('|')[0]}|${v}`));
const faltan: string[] = [];
for (const [curso, l] of porPlanilla) {
  if (!leidos.horarios.some((h) => h.curso === curso)) continue;
  // De cada planilla, lo que no tiene horario (se saltea un nombre si otra planilla ya lo cubrió con otro nombre)
  const principal = l.find((x) => x.length) || [];
  for (const m of principal) if (!usadas.has(`${curso}|${m}`)) faltan.push(`${curso}: ${m}`);
}
console.log(`Cruzadas ${nuevo.size} de ${leidos.horarios.length}.`);
console.log('--- del PDF sin cruce:\n' + sinCruce.join('\n'));
console.log('--- cargadas sin horario en el PDF:\n' + faltan.join('\n'));
const cambios = new Map<string, Set<string>>();
for (const [k, v] of nuevo) { const m = k.split('|')[1]; if (m !== v) cambios.set(`${m} -> ${v}`, (cambios.get(`${m} -> ${v}`) || new Set()).add(k.split('|')[0])); }
console.log('--- nombre en las planillas:'); for (const [k, v] of cambios) console.log(k, `(${v.size})`);
