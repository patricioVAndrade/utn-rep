// Datos de mentira para ver el rediseño sin base real.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const MAT = {
  1: ['Análisis Matemático I', 'Álgebra y Geometría Analítica', 'Física I', 'Inglés I', 'Lógica y Estructuras Discretas', 'Algoritmos y Estructuras de Datos', 'Arquitectura de Computadoras', 'Sistemas y Procesos de Negocio'],
  2: ['Análisis Matemático II', 'Física II', 'Ingeniería y Sociedad', 'Inglés II', 'Sintaxis y Semántica de los Lenguajes', 'Paradigmas de Programación', 'Sistemas Operativos', 'Análisis de Sistemas de Información'],
  3: ['Probabilidad y Estadística', 'Economía', 'Bases de Datos', 'Desarrollo de Software', 'Comunicación de Datos', 'Análisis Numérico', 'Diseño de Sistemas de Información', 'Desarrollo de Aplicaciones con Objetos'],
  4: ['Legislación', 'Ingeniería y Calidad de Software', 'Redes de Datos', 'Investigación Operativa', 'Simulación', 'Tecnologías para la Automatización', 'Administración de Sistemas de Información', 'Gestión de la Mejora de Procesos', 'Green Software', 'DevOps'],
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
    const elec = ['Blockchain', 'Desarrollo de Aplicaciones con Objetos', 'Gestión de la Mejora de Procesos', 'Green Software', 'DevOps'].includes(nombre);
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
        resenas.push({ id: rid++, dictado_id: d.id, calificacion_general: 1 + Math.floor(rnd() * 5 * 0.8 + rnd() * 1.4) > 5 ? 5 : 1 + Math.floor(rnd() * 5 * 0.8 + rnd() * 1.4), anio_cursado: 2026 - Math.floor(rnd() * 4), comentario: pick(TEXTOS), es_anonima: anon, nombre_usuario: autor, es_alumno_utn: rnd() < .4, condicion_final: pick(['PROMOCIONADO', 'REGULAR', 'LIBRE', null, null]), votos_utilidad: Math.floor(rnd() * 12), created_at: new Date(Date.UTC(2026, 10, 6) - dias * 86400000 - r * 3600000).toISOString(), user_id: autor === 'Sofía Rivas' ? 'u-demo' : 'u-' + autor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '-') });
      }
    }
  });
}
for (let i = 0; i < 14; i++) {
  const m = pick(materias);
  experiencias_finales.push({ id: i + 1, votos_utilidad: Math.floor(rnd() * 6), user_id: i === 0 ? 'u-demo' : 'otro', es_anonima: i % 3 !== 1, nombre_usuario: i === 0 ? 'Sofía Rivas' : pick(ALUMNOS), materia_id: m.id, anio: 2026 - Math.floor(rnd() * 3), mesa: pick(['Diciembre', 'Febrero', 'Julio', 'Especial']), profesor_nombre: rnd() < .3 ? null : pick(profesores).nombre_completo, comentario: pick(['Tomaron dos ejercicios prácticos y una pregunta de teoría. Duró tres horas, corrigieron en el día.', 'Oral con el titular. Pregunta mucho sobre los TPs, tené todo fresco.', 'Escrito largo, el práctico fue más difícil que en los parciales. Repasen series y límites.']), created_at: new Date(Date.UTC(2026, 10, 6) - i * 5 * 86400000).toISOString() });
}
// Final en la reseña (migración 13): el final de u-demo es de la materia de una de sus reseñas (sin sumar todavía)
// y una reseña de otra persona ya lo tiene sumado.
{
  const matDe = (r) => dictados.find((d) => d.id === r.dictado_id)?.materia_id;
  const mia = resenas.find((r) => r.user_id === 'u-demo');
  if (mia) experiencias_finales[0].materia_id = matDe(mia);
  const otra = resenas.find((r) => r.user_id !== 'u-demo' && r.dictado_id === 2) || resenas.find((r) => r.user_id !== 'u-demo');
  if (otra) { experiencias_finales[1].materia_id = matDe(otra); experiencias_finales[1].user_id = otra.user_id; experiencias_finales[1].mesa = 'Julio'; experiencias_finales[1].anio = 2026; otra.final_id = experiencias_finales[1].id; }
}
export const votos_resenas = [{ user_id: 'u-demo', resena_id: 3 }];
export const votos_finales = [];
export const reportes_finales = [{ id: 1, final_id: 3, user_id: 'otro', motivo: 'Tiene el nombre de un compañero', created_at: '2026-11-05T12:00:00Z' }];

// Moderación (migración 4)
{
  const mia = resenas.find((r) => r.user_id === 'u-demo');
  if (mia) { mia.pedido_edicion = 'Sacá el apellido del ayudante, no lo pongas con nombre y apellido.'; mia.pedido_edicion_at = '2026-11-06T15:00:00Z'; }
}
export const respuestas_moderador = [
  { id: 1, resena_id: 3, final_id: null, texto: 'Desde el 2.º cuatrimestre de 2026 la promoción pide 8 en cada parcial. Revisá el reglamento en el aula virtual.', created_at: '2026-11-05T10:00:00Z' },
  { id: 2, resena_id: null, final_id: 2, texto: 'Ojo: desde diciembre de 2026 el final es solo escrito.', created_at: '2026-11-05T10:00:00Z' },
];
export const palabras_marcadas = [{ id: 1, palabra: 'boludo', created_at: '2026-11-01T10:00:00Z' }, { id: 2, palabra: 'no vayan', created_at: '2026-11-01T10:00:00Z' }];
export const registro_moderacion = [
  { id: 1, moderador_id: 'u-demo', accion: 'responder', resena_id: 3, final_id: null, detalle: 'Desde el 2.º cuatrimestre de 2026 la promoción pide 8…', created_at: '2026-11-05T10:00:00Z' },
  { id: 2, moderador_id: null, accion: 'marcada_automatica', resena_id: 12, final_id: null, detalle: 'boludo', created_at: '2026-11-04T18:20:00Z' },
  { id: 3, moderador_id: 'u-demo', accion: 'dejar', resena_id: 7, final_id: null, detalle: 'Desde Reportes', created_at: '2026-11-03T09:10:00Z' },
];
export const reportes_resenas = [
  { id: 1, resena_id: 12, user_id: null, automatico: true, motivo: 'Palabra marcada: boludo', created_at: '2026-11-04T18:20:00Z' },
  { id: 2, resena_id: 20, user_id: 'otro', automatico: false, motivo: 'Tiene datos personales', created_at: '2026-11-05T11:00:00Z' },
];
export const perfiles = [
  { user_id: 'u-tomas-quiroga', nombre_mostrar: null, foto: 'dibujo', dibujo: 3, foto_url: null, mostrar_ficha: true, anios_cursada: [], preguntar_como_te_fue: true, como_te_fue_pausa_hasta: null },
  { user_id: 'u-mica-ledesma', nombre_mostrar: null, foto: 'inicial', dibujo: null, foto_url: null, mostrar_ficha: false, anios_cursada: [], preguntar_como_te_fue: true, como_te_fue_pausa_hasta: null },
];

// Logros (migración 8): los mismos criterios que revisar_logros en la base
export const logros_usuario = [];
{
  const dar = (u, l) => { if (u && !logros_usuario.some((x) => x.user_id === u && x.logro === l)) logros_usuario.push({ user_id: u, logro: l, ganado_at: '2026-11-07T12:00:00Z' }); };
  const nivelDe = new Map(dictados.map((d) => [d.id, materias.find((m) => m.id === d.materia_id)?.nivel]));
  const matDe = new Map(dictados.map((d) => [d.id, d.materia_id]));
  const primeraDeMateria = new Map();
  [...resenas].sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach((r) => { const m = matDe.get(r.dictado_id); if (!primeraDeMateria.has(m)) primeraDeMateria.set(m, r.user_id); });
  primeraDeMateria.forEach((u) => dar(u, 'L2'));
  const usuarios = [...new Set(resenas.map((r) => r.user_id))];
  usuarios.forEach((u) => {
    const suyas = resenas.filter((r) => r.user_id === u);
    if (suyas.length) dar(u, 'L1');
    if (suyas.reduce((a, r) => a + r.votos_utilidad, 0) >= 10) dar(u, 'L3');
    if (suyas.some((r) => { const h = (new Date(r.created_at).getUTCHours() + 21) % 24; return h >= 2 && h <= 4; })) dar(u, 'L5');
    if (new Set(suyas.map((r) => nivelDe.get(r.dictado_id)).filter((n) => n >= 1 && n <= 5)).size === 5) dar(u, 'L6');
    // Migración 16 (algunos, para ver cómo quedan)
    const ayudadas = suyas.reduce((a, r) => a + r.votos_utilidad, 0);
    if (ayudadas >= 50) dar(u, 'L19');
    if (ayudadas >= 100) dar(u, 'L20');
    if (suyas.length >= 2) dar(u, 'L12');
    if (suyas.some((r) => (r.comentario || '').length > 400 && r.votos_utilidad >= 5)) dar(u, 'L17');
  });
  dar('u-demo', 'L8');
  dar('u-demo', 'L10');
  experiencias_finales.forEach((f) => dar(f.user_id, 'L4'));
}
export const seguimientos = [{ user_id: 'u-demo', materia_id: 1, mail: true, created_at: '2026-11-01T10:00:00Z' }];
export const preferencias_aviso = [];
export const notificaciones = [
  { id: 4, user_id: 'u-demo', tipo: 'recordatorio', titulo: '¿Cómo te fue en Paradigmas de Programación, 2K1?', texto: 'Terminó el 1.er cuatrimestre. Lo elegiste en Mi inscripción: tu reseña le sirve a quien elige curso.', link: '/nueva-resena?dictado=5', leida_at: null, created_at: '2026-11-09T00:10:00Z' },
  { id: 1, user_id: 'u-demo', tipo: 'resena_nueva', titulo: 'Reseña nueva en Álgebra y Geometría Analítica', texto: 'Del curso 1K2.', link: '/dictado/2#resena-3', leida_at: null, created_at: '2026-11-07T14:10:00Z' },
  { id: 2, user_id: 'u-demo', tipo: 'te_sirvio', titulo: 'Tu reseña le sirvió a 5 personas', texto: 'La de Análisis Matemático I.', link: '/mis-resenas', leida_at: null, created_at: '2026-11-06T20:00:00Z' },
  { id: 3, user_id: 'u-demo', tipo: 'respuesta_moderador', titulo: 'La moderación respondió tu reseña', texto: 'Gracias, ya lo revisamos con la cátedra.', link: '/mis-resenas', leida_at: '2026-11-05T12:00:00Z', created_at: '2026-11-05T10:00:00Z' },
];

// Usuarios y links compartidos (migración 9)
{
  const p = perfiles.find((x) => x.user_id === 'u-mica-ledesma');
  if (p) { p.bloqueado_at = '2026-11-05T10:00:00Z'; p.bloqueo_motivo = 'Insultos en dos reseñas'; }
}
export const links_compartidos = [{ codigo: 'k7p2', user_id: 'u-demo', created_at: '2026-11-01T10:00:00Z' }];
export const aperturas_link = [
  { codigo: 'k7p2', visitante: 'v-aaaaaaaa1', ruta: '/dictado/1', created_at: '2026-11-06T18:42:00Z' },
  { codigo: 'k7p2', visitante: 'v-aaaaaaaa2', ruta: '/dictado/1', created_at: '2026-11-07T09:10:00Z' },
];

// Historial de profesores (migración 11): los de hoy desde 2026 y uno que ya no está
export const profesores_historial = [
  ...dictado_profesores.map((dp, i) => ({ id: i + 1, dictado_id: dp.dictado_id, profesor_id: dp.profesor_id, desde_anio: 2026, desde_cuatri: null, hasta_anio: null, hasta_cuatri: null })),
  { id: 9999, dictado_id: 1, profesor_id: 60, desde_anio: 2025, desde_cuatri: 1, hasta_anio: 2026, hasta_cuatri: 1 },
];

// Horarios (migración 12): dos días por curso, según el turno del curso
const INICIO = { MAÑANA: '08:00', TARDE: '13:15', NOCHE: '18:15' };
const sumar = (h, min) => { const [a, b] = h.split(':').map(Number); const t = a * 60 + b + min; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}:00`; };
export const horarios = [];
dictados.forEach((d) => {
  const c = cursos.find((x) => x.id === d.curso_id);
  const ini = INICIO[c?.turno] || '08:00';
  const corrido = (d.materia_id % 2) * 145;
  [1 + (d.materia_id % 5), 1 + ((d.materia_id + 2) % 5)].forEach((dia) => {
    horarios.push({ id: horarios.length + 1, dictado_id: d.id, cuatri: null, dia, desde: sumar(ini, corrido), hasta: sumar(ini, corrido + 145) });
  });
});

// Mi inscripción de la cuenta de prueba: tres materias de 2.º año
export const inscripcion_cursos = [];
['Paradigmas de Programación', 'Sistemas Operativos', 'Análisis Matemático II'].forEach((nombre, i) => {
  const m = materias.find((x) => x.nombre === nombre);
  dictados.filter((d) => d.materia_id === m.id).slice(0, 3).forEach((d, j) => {
    inscripcion_cursos.push({ user_id: 'u-demo', dictado_id: d.id, materia_id: m.id, elegido: j === (i === 2 ? 1 : 0), created_at: `2026-11-0${i + 1}T12:00:00Z` });
  });
});
