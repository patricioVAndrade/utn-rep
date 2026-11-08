// Cambia los nombres de materia del CSV de los PDF por los que ya están
// cargados (los de las planillas del centro de estudiantes, que son los de la
// base), buscando solo entre las materias de ese curso. Avisa lo que no cruza.
//
//   npx tsx scripts/horarios-pdf/nombres.ts horarios.csv salida.csv sistemas1.xlsx ... basicas.xlsx
//
// Las planillas de Sistemas van antes que la de Básicas (sus nombres ganan).
import { readFileSync, writeFileSync } from 'node:fs';
import { leerXlsx } from '../../src/lib/xlsx';
import { leerCsv, leerPlanilla, partirCsv } from '../../src/lib/planilla';
import { buscarMateria } from '../../src/lib/importar';

// Lo que el buscador no puede adivinar (Pato, 8/11/2026)
const MISMA: Record<string, string[]> = {
  'Backend de Aplicaciones': ['Elec Backend', 'Backend'],
  // Errores de tipeo de las planillas, que pueden estar así en la base
  'Probabilidad y Estadística': ['Probabilidad y Estadísitica'],
  'Sistemas y Procesos de Negocio': ['Sistemas y Procesos de Negocios', 'Sitemas y Procesos de Negocios'],
};

const [entrada, salida, ...planillas] = process.argv.slice(2);
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
  for (const l of porPlanilla.get(curso) || []) {
    if (!l.length) continue;
    const alias = (MISMA[materia] || []).find((x) => l.includes(x));
    if (alias) return alias;
    const { materia: m } = buscarMateria(materia, l.map((nombre, i) => ({ id: i + 1, nombre, nivel: 0 })), 0);
    if (m) return m.nombre;
  }
  return null;
}
const filas = partirCsv(readFileSync(entrada, 'utf8')).filter((f) => f.some(Boolean));
const leidos = leerCsv(readFileSync(entrada, 'utf8'));
const nuevo = new Map<string, string>(); // curso|materia -> nombre cargado
const sinCruce: string[] = [];
for (const h of leidos.horarios) {
  const cargadas = deCurso.get(h.curso);
  if (!cargadas) { sinCruce.push(`${h.curso}: el curso no está en las planillas (${h.materia})`); continue; }
  const m = cargada(h.curso, h.materia);
  if (m) nuevo.set(`${h.curso}|${h.materia}`, m);
  else sinCruce.push(`${h.curso}: ${h.materia} no está cargada en ese curso`);
}
const usadas = new Set([...nuevo.entries()].map(([k, v]) => `${k.split('|')[0]}|${v}`));
const faltan: string[] = [];
for (const [curso, l] of porPlanilla) {
  if (!leidos.horarios.some((h) => h.curso === curso)) continue;
  // De cada planilla, lo que no tiene horario (se saltea un nombre si otra planilla ya lo cubrió con otro nombre)
  const principal = l.find((x) => x.length) || [];
  for (const m of principal) if (!usadas.has(`${curso}|${m}`)) faltan.push(`${curso}: ${m}`);
}
const out = [filas[0], ...filas.slice(1).map((f) => [f[0], nuevo.get(`${f[0].toUpperCase()}|${f[1]}`) ?? f[1], ...f.slice(2)])];
writeFileSync(salida, out.map((f) => f.map((x) => (/[",;\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(',')).join('\n') + '\n');
console.log(`Cruzadas ${nuevo.size} de ${leidos.horarios.length}.`);
console.log('--- del PDF sin cruce:\n' + sinCruce.join('\n'));
console.log('--- cargadas sin horario en el PDF:\n' + faltan.join('\n'));
const cambios = new Map<string, Set<string>>();
for (const [k, v] of nuevo) { const m = k.split('|')[1]; if (m !== v) cambios.set(`${m} -> ${v}`, (cambios.get(`${m} -> ${v}`) || new Set()).add(k.split('|')[0])); }
console.log('--- nombres cambiados:'); for (const [k, v] of cambios) console.log(k, `(${v.size})`);
