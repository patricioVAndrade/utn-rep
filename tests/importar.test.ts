import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { leerXlsx } from '../src/lib/xlsx';
import { idDePlanilla, leerCsv, leerPlanilla, materiaDePestana, separarDocentesBasicas, separarDocentesSistemas } from '../src/lib/planilla';
import { buscarMateria, buscarProfesor, compararConBase, formatoApellidoNombre } from '../src/lib/importar';

// Arma un .xlsx mínimo, como el que exporta Google, con celdas de texto compartido
function crearXlsx(hojas: { nombre: string; celdas: Record<string, string> }[]): Uint8Array {
  const strings: string[] = [];
  const idx = (s: string) => { let i = strings.indexOf(s); if (i < 0) { i = strings.length; strings.push(s); } return i; };
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const archivos: Record<string, string> = {};
  hojas.forEach((h, n) => {
    const celdas = Object.entries(h.celdas).map(([ref, v]) => `<c r="${ref}" t="s"><v>${idx(v)}</v></c>`).join('');
    archivos[`xl/worksheets/sheet${n + 1}.xml`] = `<worksheet><sheetData><row>${celdas}</row></sheetData></worksheet>`;
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

const MATERIAS = [
  { id: 1, nombre: 'Administración de Sistemas', nivel: 4 },
  { id: 2, nombre: 'Legislación', nivel: 4 },
  { id: 3, nombre: 'Desarrollo de Aplicaciones con Objetos', nivel: 3 },
  { id: 4, nombre: 'Análisis Matemático I', nivel: 1 },
  { id: 5, nombre: 'Física I', nivel: 1 },
  { id: 6, nombre: 'Física II', nivel: 2 },
  { id: 7, nombre: 'Álgebra y Geometría Analítica', nivel: 1 },
];

describe('lector de .xlsx', () => {
  it('lee pestañas y celdas con saltos de línea', () => {
    const buf = crearXlsx([{ nombre: '4K1', celdas: { K2: 'Materia', L2: 'Docentes', K3: 'Administración\nde Sistemas', L3: 'Pérez, Ana\nGómez, Luis' } }]);
    const hojas = leerXlsx(buf);
    expect(hojas).toHaveLength(1);
    expect(hojas[0].nombre).toBe('4K1');
    expect(hojas[0].filas[2][10]).toBe('Administración\nde Sistemas');
  });

  it('rechaza lo que no es un .xlsx', () => {
    expect(() => leerXlsx(new TextEncoder().encode('<html>Iniciá sesión</html>'))).toThrow();
  });
});

describe('planilla de Sistemas', () => {
  it('saca materia, docentes y turno de cada curso, y saltea lo que no es K', () => {
    const buf = crearXlsx([
      { nombre: '4k1', celdas: { B2: '1er Cuatrimestre - Turno Mañana', K2: 'Materia', L2: 'Docentes', K3: 'Administración\nde Sistemas ', L3: 'Pérez, Ana\nGómez, Luis', K5: 'Legislación', L5: 'Zanatta, Valentin\nSantiago' } },
      { nombre: '4K1A', celdas: { K2: 'Materia', L2: 'Docentes', K3: 'Una electiva' } },
      { nombre: '3R1', celdas: { K2: 'Materia', L2: 'Docentes', K3: 'Otra' } },
    ]);
    const { asignaciones, omitidas } = leerPlanilla(leerXlsx(buf));
    expect(asignaciones).toEqual([
      { curso: '4K1', turno: 'MAÑANA', materia: 'Administración de Sistemas', docentes: ['Pérez, Ana', 'Gómez, Luis'], formato: 'sistemas', hoja: '4k1' },
      { curso: '4K1', turno: 'MAÑANA', materia: 'Legislación', docentes: ['Zanatta, Valentin Santiago'], formato: 'sistemas', hoja: '4k1' },
    ]);
    expect(omitidas.map((o) => o.hoja)).toEqual(['4K1A', '3R1']);
  });

  it('junta un nombre partido en dos líneas', () => {
    expect(separarDocentesSistemas('Romero, Ruben\nBalut Cabezas, Jorge Ariel\n')).toEqual(['Romero, Ruben', 'Balut Cabezas, Jorge Ariel']);
    expect(separarDocentesSistemas('Zanatta, Valentin\nSantiago')).toEqual(['Zanatta, Valentin Santiago']);
  });
});

describe('planilla de Básicas', () => {
  it('lee solo los cursos K de cada materia', () => {
    const buf = crearXlsx([{
      nombre: 'Álgebra Anual',
      celdas: { A1: 'ÁLGEBRA ANUAL', B3: 'Curso', D3: 'Lunes', F3: 'Miércoles ', B4: '1K1', D4: 'Alfredo García\nTeórico\n10:25 a 12:50', F4: 'Lorena Peralta\nPráctico\n12:05 a 14:00', B5: '1K1B', D5: 'Otra Persona\nTeórico', B6: '1Q1', D6: 'Alguien\nTeórico', B7: '1K12 / 2D3', F7: 'Verónica de Loredo\n15:40 a 17:20' },
    }]);
    const { asignaciones, omitidas } = leerPlanilla(leerXlsx(buf));
    expect(asignaciones.map((a) => [a.curso, a.materia, a.docentes])).toEqual([
      ['1K1', 'Álgebra', ['Alfredo García', 'Lorena Peralta']],
      ['1K12', 'Álgebra', ['Verónica de Loredo']],
    ]);
    expect(omitidas[0].motivo).toContain('1K1B');
  });

  it('limpia el nombre de la pestaña y las celdas', () => {
    expect(materiaDePestana('Ingeniería y Sociedad Cuatrimes')).toBe('Ingeniería y Sociedad');
    expect(materiaDePestana('Física 2 Anual ')).toBe('Física 2');
    expect(separarDocentesBasicas('H. Zanatta\nS. Vazquez\n08:00 a 11:10')).toEqual(['H. Zanatta', 'S. Vazquez']);
  });
});

describe('coincidencias con la base', () => {
  it('encuentra la materia aunque el nombre no sea igual', () => {
    expect(buscarMateria('Desarrollo de Aplicaciones', MATERIAS, 4).materia?.id).toBe(3);
    expect(buscarMateria('Análisis 1', MATERIAS, 1).materia?.id).toBe(4);
    expect(buscarMateria('Fisica 2', MATERIAS, 1).materia?.id).toBe(6);
    expect(buscarMateria('Álgebra', MATERIAS, 1).materia?.id).toBe(7);
    expect(buscarMateria('Green Software', MATERIAS, 4).materia).toBeNull();
  });

  it('encuentra las electivas cargadas, con o sin "Electiva" en el nombre', () => {
    const conElectivas = [...MATERIAS, { id: 8, nombre: 'Gestión de la Mejora de Procesos', nivel: 4, es_electiva: true }, { id: 9, nombre: 'Green Software', nivel: 4, es_electiva: true }];
    expect(buscarMateria('Gestion de la Mejora de Procesos', conElectivas, 4).materia?.id).toBe(8);
    expect(buscarMateria('Gestión de la Mejora de Procesos (Electiva)', conElectivas, 4).materia?.id).toBe(8);
    expect(buscarMateria('GREEN SOFTWARE - Electiva', conElectivas, 4).materia?.id).toBe(9);
  });

  it('encuentra al profesor con otro orden, sin acentos o con iniciales', () => {
    const indice = [
      { id: 1, nombre_completo: 'Vazquez De Novoa, Santiago Roberto' },
      { id: 2, nombre_completo: 'García, Alfredo' },
      { id: 3, nombre_completo: 'Gallardo, Conrado Faustino' },
      { id: 4, nombre_completo: 'Gallardo, Carlos Federico' },
    ];
    const base = compararConBase([], { materias: [], cursos: [], profesores: indice, dictados: [] });
    expect(base.sinCambios).toBe(0);
    const idx = (n: string) => {
      const r = compararConBase([{ curso: '4K1', turno: null, materia: 'X', docentes: [n], formato: 'basicas', hoja: 'h' }], { materias: [], cursos: [], profesores: indice, dictados: [] });
      return r.dictadosNuevos[0].entran[0];
    };
    expect(idx('Alfredo Garcìa').profesor_id).toBe(2);
    expect(idx('S. Vazquez').profesor_id).toBe(1);
    expect(idx('S. Vazquez').parecido).toBe(true);
    expect(idx('Gallardo').opciones?.length).toBe(2);
    expect(idx('Romina Paz').profesor_id).toBeNull();
    expect(idx('Romina Paz').sugerido).toBe('Paz, Romina');
    expect(buscarProfesor).toBeTypeOf('function');
  });

  it('pasa "Nombre Apellido" a "Apellido, Nombre"', () => {
    expect(formatoApellidoNombre('Alfredo García')).toBe('García, Alfredo');
    expect(formatoApellidoNombre('Pérez,Ana')).toBe('Pérez, Ana');
  });
});

describe('vista previa', () => {
  const base = {
    materias: MATERIAS,
    cursos: [{ id: 10, identificador: '4K1', turno: 'MAÑANA', anio_carrera: 4 }],
    profesores: [{ id: 1, nombre_completo: 'Pérez, Ana' }, { id: 2, nombre_completo: 'Gómez, Luis' }, { id: 3, nombre_completo: 'Díaz, Marta' }],
    dictados: [{ id: 100, curso_id: 10, materia_id: 1, profesores: [1, 3] }, { id: 101, curso_id: 10, materia_id: 2, profesores: [2] }],
  };

  it('dice quién entra, quién sale y qué no cambió', () => {
    const p = compararConBase([
      { curso: '4K1', turno: 'MAÑANA', materia: 'Administración de Sistemas', docentes: ['Pérez, Ana', 'Gómez, Luis'], formato: 'sistemas', hoja: '4K1' },
      { curso: '4K1', turno: 'MAÑANA', materia: 'Legislación', docentes: ['Gomez, Luis'], formato: 'sistemas', hoja: '4K1' },
      { curso: '4K2', turno: 'TARDE', materia: 'Legislación', docentes: ['Nuevo, Profe'], formato: 'sistemas', hoja: '4K2' },
    ], base);
    expect(p.sinCambios).toBe(1);
    expect(p.cambiosDeEquipo).toHaveLength(1);
    expect(p.cambiosDeEquipo[0].entran.map((e) => e.profesor_id)).toEqual([2]);
    expect(p.cambiosDeEquipo[0].salen).toEqual([{ profesor_id: 3, nombre: 'Díaz, Marta' }]);
    expect(p.cursosNuevos).toEqual([{ identificador: '4K2', turno: 'TARDE', anio: 4 }]);
    expect(p.dictadosNuevos[0].curso).toBe('4K2');
    expect(p.profesoresNuevos).toEqual(['Nuevo, Profe']);
  });

  it('si algo está en las dos planillas, gana la de Sistemas', () => {
    const p = compararConBase([
      { curso: '4K1', turno: null, materia: 'Legislación', docentes: ['L. Gómez'], formato: 'basicas', hoja: 'Legislación' },
      { curso: '4K1', turno: 'MAÑANA', materia: 'Legislación', docentes: ['Gómez, Luis'], formato: 'sistemas', hoja: '4K1' },
    ], base);
    expect(p.sinCambios).toBe(1);
    expect(p.cambiosDeEquipo).toHaveLength(0);
  });

  it('avisa si el turno de un curso no coincide', () => {
    const p = compararConBase([{ curso: '4K1', turno: 'NOCHE', materia: 'Legislación', docentes: ['Gómez, Luis'], formato: 'sistemas', hoja: '4K1' }], base);
    expect(p.turnoDistinto).toEqual([{ curso_id: 10, identificador: '4K1', antes: 'MAÑANA', ahora: 'NOCHE' }]);
  });
});

describe('CSV y links', () => {
  it('lee un CSV cargado a mano', () => {
    const { asignaciones, omitidas } = leerCsv('curso,materia,docentes,turno\n4K1,Legislación,"Gómez, Luis | Pérez, Ana",Mañana\n3R1,Otra,X,Noche\n');
    expect(asignaciones).toEqual([{ curso: '4K1', turno: 'MAÑANA', materia: 'Legislación', docentes: ['Gómez, Luis', 'Pérez, Ana'], formato: 'csv', hoja: 'CSV' }]);
    expect(omitidas).toHaveLength(1);
  });

  it('saca el id del link de Google Sheets', () => {
    expect(idDePlanilla('https://docs.google.com/spreadsheets/d/1d7cmVHpu0GsMiyRMpf98lRI94_Q-RCqGHx20u2ER-eU/edit?gid=0#gid=0')).toBe('1d7cmVHpu0GsMiyRMpf98lRI94_Q-RCqGHx20u2ER-eU');
    expect(idDePlanilla('https://example.com/spreadsheets/d/abc')).toBeNull();
  });
});
