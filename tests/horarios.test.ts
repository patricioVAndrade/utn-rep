import { describe, expect, it } from 'vitest';
import { leerXlsx, rellenarCombinadas } from '../src/lib/xlsx';
import { leerPlanilla } from '../src/lib/planilla';
import { compararConBase } from '../src/lib/importar';
import {
  bloquesDeBase, bloquesValidos, costoSigla, hora, horaTexto, juntarBloques, mismoHorario, superposiciones, textoBloques, type Bloque,
} from '../src/lib/horarios';
import { crearXlsx } from './xlsx-de-prueba';

// Migración 12: horarios de cada curso (desde las planillas) y Mi inscripción.

const b = (dia: number, desde: string, hasta: string, cuatri: 1 | 2 | null = null): Bloque => ({ cuatri, dia, desde: hora(desde)!, hasta: hora(hasta)! });

describe('horas', () => {
  it('lee "8:00", "08.45" y la fracción del día que exporta Google', () => {
    expect(hora('8:00')).toBe(480);
    expect(hora('08.45')).toBe(525);
    expect(hora('0.5034722222222222')).toBe(725); // 12:05
    expect(hora('0.6215277777777778')).toBe(895); // 14:55
    expect(hora('Lunes')).toBeNull();
    expect(hora('25:00')).toBeNull();
    expect(hora('')).toBeNull();
  });
  it('escribe la hora', () => {
    expect(horaTexto(480)).toBe('8:00');
    expect(horaTexto(1385)).toBe('23:05');
  });
});

describe('siglas de la planilla', () => {
  it('reconoce las siglas de las materias', () => {
    expect(costoSigla('ADSI', 'Administración de Sistemas')).not.toBeNull();
    expect(costoSigla('AS', 'Administración de Sistemas')).not.toBeNull();
    expect(costoSigla('IOP', 'Investigación Operativa')).not.toBeNull();
    expect(costoSigla('SIM', 'Simulación')).not.toBeNull();
    expect(costoSigla('RED', 'Redes de Datos')).not.toBeNull();
    expect(costoSigla('ICS', 'Ingeniería y calidad de Software')).not.toBeNull();
    expect(costoSigla('TPA', 'Tecnología para la Automatización')).not.toBeNull();
    expect(costoSigla('SDS', 'Seguridad en el Desarrollo de Software (electiva)')).not.toBeNull();
  });
  it('no confunde materias', () => {
    expect(costoSigla('SIM', 'Sistemas Operativos')).toBeNull();
    expect(costoSigla('RED', 'Investigación Operativa')).toBeNull();
    expect(costoSigla('IOP', 'Simulación')).toBeNull();
    // Con palabras cortas ("de") cuesta más: gana la que no las usa
    expect(costoSigla('ADSI', 'Administración de Sistemas')!).toBeLessThan(costoSigla('ADSI', 'Análisis de Sistemas')!);
  });
});

describe('bloques', () => {
  it('junta los módulos seguidos (con el recreo de 10 minutos) y separa los que tienen un hueco', () => {
    const j = juntarBloques([b(1, '8:45', '9:30'), b(1, '8:00', '8:45'), b(1, '9:40', '10:25'), b(1, '12:05', '12:50'), b(2, '8:00', '8:45')]);
    expect(j).toEqual([b(1, '8:00', '10:25'), b(1, '12:05', '12:50'), b(2, '8:00', '8:45')]);
  });
  it('lo escribe para mostrar', () => {
    expect(textoBloques([b(4, '8:00', '10:25'), b(1, '8:00', '9:30')])).toBe('Lunes 8:00 a 9:30 · Jueves 8:00 a 10:25');
    expect(textoBloques([b(1, '8:00', '9:30', 1), b(2, '8:00', '9:30', 2)])).toBe('1.er cuatri: Lunes 8:00 a 9:30 · 2.º cuatri: Martes 8:00 a 9:30');
    expect(textoBloques([])).toBe('');
  });
  it('lee lo que guarda la base y compara', () => {
    const base = bloquesDeBase([{ cuatri: null, dia: 1, desde: '08:00:00', hasta: '10:25:00' }]);
    expect(base).toEqual([b(1, '8:00', '10:25')]);
    expect(mismoHorario(base, [b(1, '8:00', '10:25')])).toBe(true);
    expect(mismoHorario(base, [b(1, '8:00', '9:30')])).toBe(false);
  });
  it('valida lo que manda el admin', () => {
    expect(bloquesValidos([{ cuatri: 1, dia: 1, desde: 480, hasta: 565 }])).toEqual([{ cuatri: 1, dia: 1, desde: 480, hasta: 565 }]);
    expect(bloquesValidos([{ cuatri: null, dia: 6, desde: 480, hasta: 565 }])).not.toBeNull();
    expect(bloquesValidos([{ dia: 7, desde: 480, hasta: 565 }])).toBeNull();
    expect(bloquesValidos([{ dia: 1, desde: 600, hasta: 500 }])).toBeNull();
    expect(bloquesValidos('nada')).toBeNull();
    expect(bloquesValidos([])).toEqual([]);
  });
});

describe('superposiciones', () => {
  it('avisa cuando dos cursos se pisan, con día y horario', () => {
    const r = superposiciones([
      { id: 1, nombre: 'Paradigmas 2K4', bloques: [b(2, '14:00', '15:40')] },
      { id: 2, nombre: 'Sistemas Operativos 2K3', bloques: [b(2, '15:00', '17:20'), b(4, '8:00', '9:00')] },
      { id: 3, nombre: 'Análisis II 2K2', bloques: [b(2, '15:40', '17:00')] },
    ]);
    expect(r).toEqual([
      { a: 'Paradigmas 2K4', b: 'Sistemas Operativos 2K3', dia: 2, desde: hora('15:00'), hasta: hora('15:40'), cuatri: null },
      { a: 'Sistemas Operativos 2K3', b: 'Análisis II 2K2', dia: 2, desde: hora('15:40'), hasta: hora('17:00'), cuatri: null },
    ]);
  });
  it('si terminan y empiezan a la misma hora, no se pisan; y en cuatrimestres distintos tampoco', () => {
    expect(superposiciones([
      { id: 1, nombre: 'A', bloques: [b(1, '8:00', '10:25')] },
      { id: 2, nombre: 'B', bloques: [b(1, '10:25', '12:00')] },
    ])).toEqual([]);
    expect(superposiciones([
      { id: 1, nombre: 'A', bloques: [b(1, '8:00', '10:25', 1)] },
      { id: 2, nombre: 'B', bloques: [b(1, '8:00', '10:25', 2)] },
    ])).toEqual([]);
    // Uno anual (sin cuatrimestre) choca con cualquiera
    expect(superposiciones([
      { id: 1, nombre: 'A', bloques: [b(1, '8:00', '10:25')] },
      { id: 2, nombre: 'B', bloques: [b(1, '9:00', '10:00', 2)] },
    ])).toHaveLength(1);
  });
});

describe('horarios de la planilla de Sistemas', () => {
  // Como la pestaña 4k2 real: horas como fracción del día, celdas combinadas,
  // siglas y los nombres completos, recreos y una tabla de materias al costado.
  const T = (h: string) => { const [a, m] = h.split(':').map(Number); return (a * 60 + m) / 1440; };
  const hoja = {
    nombre: '4k2',
    celdas: {
      B2: '1er Cuatrimestre - Turno Tarde', L2: 'Materia', M2: 'Docentes',
      D3: 'Lunes', E3: 'Martes', F3: 'Miércoles', G3: 'Jueves', H3: 'Viernes',
      L3: 'Administración\nde Sistemas ', M3: 'Diaz, Gustavo Ismael',
      B4: T('12:05'), C4: T('12:50'), D4: 'IOP', E4: 'SIM',
      B5: T('12:50'), C5: T('13:15'),
      L5: 'Investigación\nOperativa', M5: 'Carignano, Claudia Etna',
      B6: T('13:15'), C6: T('14:00'), D6: 'IOP', E6: 'Simulación', F6: 'Administración\nde Sistemas ', G6: 'Electiva 2',
      B7: T('14:00'), C7: T('14:45'), D7: 'RED',
      L7: 'Simulación', M7: 'Magris, Sergio Victor',
      B8: T('14:45'), C8: T('14:55'),
      B9: T('14:55'), C9: T('15:40'), D9: 'Cosa Rara',
      L9: 'Redes de\nDatos', M9: 'Sanchez, Cecilia Beatriz',
      B12: '2do Cuatrimestre - Turno Tarde',
      D13: 'Lunes', E13: 'Martes', F13: 'Miércoles', H13: 'Jueves', I13: 'Viernes',
      B14: T('12:05'), C14: T('12:50'), D14: 'IOP', I14: 'Simulación', J14: 'SIM',
    },
    // Simulación y Administración ocupan dos módulos; el recreo es una fila
    // combinada de lado a lado; Miércoles del 2.º bloque ocupa dos columnas
    combinadas: ['B2:H2', 'E6:E7', 'F6:F7', 'D5:H5', 'D8:H8', 'L3:L4', 'M3:M4', 'F13:G13', 'I13:J13'],
  };

  it('rellena las celdas combinadas', () => {
    const h = leerXlsx(crearXlsx([hoja]))[0];
    const g = rellenarCombinadas(h);
    expect(g[6][4]).toBe('Simulación'); // E7, combinada con E6
    expect(g[12][6]).toBe('Miércoles'); // G13
  });

  it('saca los bloques de cada materia, por cuatrimestre, y avisa lo que no reconoce', () => {
    const { horarios, omitidas } = leerPlanilla(leerXlsx(crearXlsx([hoja])));
    const de = (materia: string) => horarios.find((x) => x.curso === '4K2' && x.materia === materia)?.bloques;
    expect(de('Investigación Operativa')).toEqual([b(1, '12:05', '12:50', 1), b(1, '13:15', '14:00', 1), b(1, '12:05', '12:50', 2)]);
    expect(de('Simulación')).toEqual([b(2, '12:05', '12:50', 1), b(2, '13:15', '14:45', 1), b(5, '12:05', '12:50', 2)]);
    expect(de('Administración de Sistemas')).toEqual([b(3, '13:15', '14:45', 1)]);
    expect(de('Redes de Datos')).toEqual([b(1, '14:00', '14:45', 1)]);
    const aviso = omitidas.find((o) => o.hoja === '4k2')?.motivo || '';
    expect(aviso).toContain('Cosa Rara');
    expect(aviso).toContain('Electiva 2');
  });

  it('"Electiva 1" usa la etiqueta de la tabla, o las siglas si las dice', () => {
    const conEtiquetas = {
      nombre: '4K1',
      celdas: {
        B2: '1er Cuatrimestre - Turno Mañana', K2: 'Materia', L2: 'Docentes',
        D3: 'Lunes', E3: 'Martes', F3: 'Miércoles',
        K3: 'Gestión de la Mejora de Procesos', L3: 'Bratti, Alicia', M3: 'Electiva 1',
        K4: 'Gestión Industrial de la Producción', L4: 'Flores, Nora',
        B4: '8:00', C4: '8:45', D4: 'Electiva 1', E4: 'Electiva 1 GMP / GIP',
      },
    };
    const { horarios } = leerPlanilla(leerXlsx(crearXlsx([conEtiquetas])));
    expect(horarios.find((h) => h.materia === 'Gestión de la Mejora de Procesos')?.bloques).toEqual([b(1, '8:00', '8:45', 1), b(2, '8:00', '8:45', 1)]);
    expect(horarios.find((h) => h.materia === 'Gestión Industrial de la Producción')?.bloques).toEqual([b(2, '8:00', '8:45', 1)]);
  });

  it('las asignaciones (materia y docentes) siguen igual', () => {
    const { asignaciones } = leerPlanilla(leerXlsx(crearXlsx([hoja])));
    expect(asignaciones.map((a) => a.materia)).toEqual(['Administración de Sistemas', 'Investigación Operativa', 'Simulación', 'Redes de Datos']);
  });
});

describe('horarios de la planilla de Básicas', () => {
  it('saca los horarios de cada celda, también dos en la misma', () => {
    const buf = crearXlsx([
      { nombre: 'Álgebra Anual', celdas: { B3: 'Curso', D3: 'Lunes', F3: 'Miércoles ', B4: '1K1', D4: 'Alfredo García\nTeórico\n10:25 a 12:50', F4: 'Lorena Peralta\nPráctico\n12:05 a 14:00', B5: '1Q1', D5: 'Otro\n08:00 a 09:30' } },
      { nombre: 'Álgebra Cuatrimestral', celdas: { B2: 'Primer Cuatrimestre', B3: 'Curso', D3: 'Lunes', E3: 'Martes', B4: '1K9', E4: 'Pablo Ochoa\n08:00 a 09:30\nEliana Diguilio\n09:40 a 11:10' } },
    ]);
    const { horarios } = leerPlanilla(leerXlsx(buf));
    expect(horarios.map((h) => [h.curso, h.materia, h.bloques])).toEqual([
      ['1K1', 'Álgebra', [b(1, '10:25', '12:50'), b(3, '12:05', '14:00')]],
      ['1K9', 'Álgebra', [b(2, '8:00', '11:10', 1)]],
    ]);
  });
});

describe('importar: horarios que cambian', () => {
  const base = {
    materias: [{ id: 1, nombre: 'Simulación', nivel: 4 }, { id: 2, nombre: 'Redes de Datos', nivel: 4 }],
    cursos: [{ id: 10, identificador: '4K2', turno: 'TARDE', anio_carrera: 4 }],
    profesores: [],
    dictados: [{ id: 100, materia_id: 1, curso_id: 10, profesores: [] }, { id: 101, materia_id: 2, curso_id: 10, profesores: [] }],
    horarios: [
      { dictado_id: 100, cuatri: 1, dia: 2, desde: '13:15:00', hasta: '14:45:00' },
      { dictado_id: 101, cuatri: 1, dia: 1, desde: '14:00:00', hasta: '14:45:00' },
    ],
  };
  it('muestra solo los cursos con horario nuevo o distinto', () => {
    const previa = compararConBase([], base, [
      { curso: '4K2', materia: 'Simulación', bloques: [b(2, '12:05', '12:50', 1), b(2, '13:15', '14:45', 1)], formato: 'sistemas', hoja: '4k2' },
      { curso: '4K2', materia: 'Redes de Datos', bloques: [b(1, '14:00', '14:45', 1)], formato: 'sistemas', hoja: '4k2' },
    ]);
    expect(previa.horarios).toHaveLength(1);
    expect(previa.horarios[0]).toMatchObject({ curso: '4K2', materia: 'Simulación', dictado_id: 100, materia_id: 1, antes: '1.er cuatri: Martes 13:15 a 14:45' });
    expect(previa.horarios[0].ahora).toBe('1.er cuatri: Martes 12:05 a 12:50 · Martes 13:15 a 14:45');
    expect(previa.horariosIguales).toBe(1);
  });
  it('si la materia no está en la base, no se puede guardar el horario', () => {
    const previa = compararConBase([], base, [{ curso: '4K2', materia: 'Green Software', bloques: [b(1, '8:00', '9:00', 1)], formato: 'sistemas', hoja: '4k2' }]);
    expect(previa.horarios).toEqual([]);
  });
});
