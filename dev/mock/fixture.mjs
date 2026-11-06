// Datos de mentira para ver el rediseño sin base real.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const MAT = {
  1: ['Análisis Matemático I', 'Álgebra y Geometría Analítica', 'Física I', 'Inglés I', 'Lógica y Estructuras Discretas', 'Algoritmos y Estructuras de Datos', 'Arquitectura de Computadoras', 'Sistemas y Procesos de Negocio'],
  2: ['Análisis Matemático II', 'Física II', 'Ingeniería y Sociedad', 'Inglés II', 'Sintaxis y Semántica de los Lenguajes', 'Paradigmas de Programación', 'Sistemas Operativos', 'Análisis de Sistemas de Información'],
  3: ['Probabilidad y Estadística', 'Economía', 'Bases de Datos', 'Desarrollo de Software', 'Comunicación de Datos', 'Análisis Numérico', 'Diseño de Sistemas de Información', 'Desarrollo de Aplicaciones con Objetos'],
  4: ['Legislación', 'Ingeniería y Calidad de Software', 'Redes de Datos', 'Investigación Operativa', 'Simulación', 'Tecnologías para la Automatización', 'Administración de Sistemas de Información'],
  5: ['Inteligencia Artificial', 'Ciencia de Datos', 'Sistemas de Gestión', 'Gestión Gerencial', 'Seguridad en los Sistemas de Información', 'Proyecto Final', 'Blockchain'],
};
const NOMBRES = ['Ana', 'Carlos', 'Marta', 'Jorge', 'Lucía', 'Pablo', 'Silvia', 'Diego', 'Laura', 'Gustavo', 'Paula', 'Ricardo', 'Valeria', 'Hernán', 'Carla', 'Martín'];
const APELLIDOS = ['García', 'Pérez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Parada', 'Molina'];
const ALUMNOS = ['Sofía Rivas', 'Tomás Quiroga', 'Mica Ledesma', 'Juan Cruz Paz', 'Agus Ferreyra', 'Valen Ortiz', 'Nico Bustos', 'Cami Vera', 'Fede Luna', 'Lu Ponce'];
const TEXTOS = [
  'Las clases son muy ordenadas y el profe explica con ejemplos. Los parciales son parecidos a la práctica, si hacés las guías aprobás.',
  'Mucho contenido y poco tiempo. Recomiendo ir al día con los TPs porque se acumulan. La ayudante responde rápido por el aula virtual.',
  'Buena onda en general, pero los parciales son bastante más difíciles que lo que se ve en clase. Estudien de los parciales viejos.',
  'Excelente cátedra. Se nota que les importa que aprendas. Promocioné haciendo todos los trabajos prácticos y yendo a consulta.',
  'Muy teórica. Las clases son largas y se hace pesado a la noche, pero el final es justo y toman lo que dieron.',
  'El TP integrador lleva mucho tiempo, arranquen temprano. El parcial tiene un ejercicio de cada tema y corrigen con criterio.',
  'No me gustó: llegan tarde, cambian las fechas y las devoluciones tardan semanas. Igual la materia se aprueba.',
  'Si te organizás, se promociona. Hay que leer el apunte antes de clase porque si no te perdés.',
];
export const materias = []; export const cursos = []; export const dictados = []; export const profesores = []; export const dictado_profesores = []; export const resenas = []; export const experiencias_finales = [];
let mid = 1, cid = 1, did = 1, rid = 1;
for (let p = 0; p < 60; p++) profesores.push({ id: p + 1, nombre_completo: `${pick(APELLIDOS)}, ${pick(NOMBRES)}` });
const TURNOS = ['MAÑANA', 'TARDE', 'NOCHE'];
const cursoIds = {};
for (const n of [1, 2, 3, 4, 5]) {
  for (let k = 1; k <= 10; k++) {
    const ident = `${n}K${k}`; const c = { id: cid++, identificador: ident, anio_carrera: n, turno: TURNOS[(k - 1) % 3] }; cursos.push(c); cursoIds[ident] = c.id;
  }
  MAT[n].forEach((nombre, i) => {
    const elec = (n === 5 && nombre === 'Blockchain') || (n === 3 && nombre === 'Desarrollo de Aplicaciones con Objetos');
    const m = { id: mid++, nombre, nivel: n, es_electiva: elec, puntos_electiva: elec ? 4 : null };
    materias.push(m);
    const ncursos = elec ? 2 : 3 + Math.floor(rnd() * 6);
    for (let k = 1; k <= ncursos; k++) {
      const d = { id: did++, curso_id: cursoIds[`${n}K${k}`], materia_id: m.id, periodo_dictado: pick(['PRIMER_CUATRIMESTRE', 'SEGUNDO_CUATRIMESTRE', 'ANUAL', null]), es_contracuatrimestral: rnd() < .1, es_intensivo: rnd() < .05, created_at: '2026-02-20T10:00:00Z', updated_at: '2026-03-02T10:00:00Z' };
      dictados.push(d);
      const np = 1 + Math.floor(rnd() * 3);
      const usados = new Set();
      for (let j = 0; j < np; j++) { const pid = 1 + Math.floor(rnd() * 60); if (usados.has(pid)) continue; usados.add(pid); dictado_profesores.push({ dictado_id: d.id, profesor_id: pid, created_at: '2026-02-20T10:00:00Z', updated_at: null }); }
      const nres = (i === 3 && n === 4) ? 0 : Math.floor(rnd() * (n === 5 ? 3 : 9));
      for (let r = 0; r < nres; r++) {
        const anon = rnd() < .3; const autor = pick(ALUMNOS);
        const dias = Math.floor(rnd() * 200);
        resenas.push({ id: rid++, dictado_id: d.id, calificacion_general: 1 + Math.floor(rnd() * 5 * 0.8 + rnd() * 1.4) > 5 ? 5 : 1 + Math.floor(rnd() * 5 * 0.8 + rnd() * 1.4), anio_cursado: 2026 - Math.floor(rnd() * 4), comentario: pick(TEXTOS), es_anonima: anon, nombre_usuario: autor, es_alumno_utn: rnd() < .4, condicion_final: pick(['PROMOCIONADO', 'REGULAR', 'LIBRE', null, null]), votos_utilidad: Math.floor(rnd() * 12), created_at: new Date(Date.UTC(2026, 10, 6) - dias * 86400000 - r * 3600000).toISOString(), user_id: autor === 'Sofía Rivas' ? 'u-demo' : null });
      }
    }
  });
}
for (let i = 0; i < 14; i++) {
  const m = pick(materias);
  experiencias_finales.push({ id: `f${i}`, user_id: i === 0 ? 'u-demo' : 'otro', materia_id: m.id, anio: 2026 - Math.floor(rnd() * 3), mesa: pick(['Diciembre', 'Febrero', 'Julio', 'Especial']), profesor_nombre: rnd() < .3 ? null : pick(profesores).nombre_completo, comentario: pick(['Tomaron dos ejercicios prácticos y una pregunta de teoría. Duró tres horas, corrigieron en el día.', 'Oral con el titular. Pregunta mucho sobre los TPs, tené todo fresco.', 'Escrito largo, el práctico fue más difícil que en los parciales. Repasen series y límites.']), created_at: new Date(Date.UTC(2026, 10, 6) - i * 5 * 86400000).toISOString() });
}
export const votos_resenas = [{ user_id: 'u-demo', resena_id: 3 }];
