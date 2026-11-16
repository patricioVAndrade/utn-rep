import { describe, expect, it } from 'vitest';
import {
  borrarCuentaSchema,
  finalAccionSchema,
  finalCreateSchema,
  parseBody,
  perfilSchema,
  reporteSchema,
  resenaCreateSchema,
  resenaEditSchema,
  votoSchema,
} from '../src/lib/validation';

const YEAR = 2026;
const resenaValida = {
  dictado_id: 12,
  calificacion_general: 4,
  anio_cursado: 2025,
  comentario: 'Muy buena cátedra, explican bien.',
  es_anonima: true,
  condicion_final: 'REGULAR',
};

describe('resenaCreateSchema', () => {
  const schema = resenaCreateSchema(YEAR);

  it('acepta una reseña válida y recorta el comentario', () => {
    const r = parseBody(schema, { ...resenaValida, comentario: '   ' + resenaValida.comentario + '  ' });
    expect(r).toEqual({ ok: true, data: { ...resenaValida } });
  });

  it('normaliza condicion_final vacía o ausente a null', () => {
    const vacia = parseBody(schema, { ...resenaValida, condicion_final: '' });
    const ausente = parseBody(schema, { ...resenaValida, condicion_final: undefined });
    expect(vacia.ok && vacia.data.condicion_final).toBeNull();
    expect(ausente.ok && ausente.data.condicion_final).toBeNull();
  });

  it.each([
    [{ calificacion_general: 3.7 }, 'Calificación debe ser entre 1 y 5.'],
    [{ calificacion_general: '5' }, 'Calificación debe ser entre 1 y 5.'],
    [{ calificacion_general: 6 }, 'Calificación debe ser entre 1 y 5.'],
    [{ anio_cursado: YEAR + 1 }, 'Año de cursado inválido.'],
    [{ anio_cursado: YEAR - 11 }, 'Año de cursado inválido.'],
    [{ dictado_id: '12' }, 'Dictado inválido.'],
    [{ comentario: 'corto' }, 'El comentario debe tener al menos 10 caracteres.'],
    [{ comentario: 'x'.repeat(2001) }, 'El comentario no puede superar los 2000 caracteres.'],
    [{ condicion_final: 'APROBADO' }, 'Condición final inválida.'],
  ])('rechaza %o', (cambio, mensaje) => {
    expect(parseBody(schema, { ...resenaValida, ...cambio })).toEqual({ ok: false, error: mensaje });
  });

  it('ignora campos que el cliente no debería poder setear', () => {
    const r = parseBody(schema, { ...resenaValida, votos_utilidad: 9999, es_alumno_utn: true });
    expect(r.ok && 'votos_utilidad' in r.data).toBe(false);
    expect(r.ok && 'es_alumno_utn' in r.data).toBe(false);
  });
});

describe('resenaEditSchema', () => {
  it('valida el largo del comentario', () => {
    expect(parseBody(resenaEditSchema, { comentario: 'muy corto' }).ok).toBe(false);
    expect(parseBody(resenaEditSchema, { comentario: 'Ahora sí es largo' })).toEqual({ ok: true, data: { comentario: 'Ahora sí es largo' } });
  });

  it('deja completar "¿Cómo te fue?" sin tocar el texto', () => {
    expect(parseBody(resenaEditSchema, { condicion_final: 'REGULAR' })).toEqual({ ok: true, data: { condicion_final: 'REGULAR' } });
    expect(parseBody(resenaEditSchema, { condicion_final: '' })).toEqual({ ok: true, data: { condicion_final: null } });
    expect(parseBody(resenaEditSchema, { condicion_final: 'APROBADO' }).ok).toBe(false);
  });

  it('no deja cambiar las estrellas ni mandar nada vacío', () => {
    expect(parseBody(resenaEditSchema, {})).toEqual({ ok: false, error: 'No hay nada para cambiar.' });
    const r = parseBody(resenaEditSchema, { comentario: 'Texto nuevo y largo', calificacion_general: 5 });
    expect(r.ok && 'calificacion_general' in r.data).toBe(false);
  });
});

describe('votoSchema', () => {
  it('acepta ids numéricos o string y la acción por defecto es votar', () => {
    expect(parseBody(votoSchema, { resena_id: '7' })).toEqual({ ok: true, data: { resena_id: 7, accion: 'votar' } });
    expect(parseBody(votoSchema, { resena_id: 7, accion: 'desvotar' })).toEqual({ ok: true, data: { resena_id: 7, accion: 'desvotar' } });
  });

  it('rechaza ids inválidos y acciones desconocidas', () => {
    expect(parseBody(votoSchema, {}).ok).toBe(false);
    expect(parseBody(votoSchema, { resena_id: 'abc' }).ok).toBe(false);
    expect(parseBody(votoSchema, { resena_id: 1, accion: 'borrar' }).ok).toBe(false);
  });
});

describe('reporteSchema', () => {
  it('recorta y limita el motivo', () => {
    expect(parseBody(reporteSchema, { resena_id: 3, motivo: '  spam  ' })).toEqual({ ok: true, data: { resena_id: 3, motivo: 'spam' } });
    expect(parseBody(reporteSchema, { resena_id: 3 })).toEqual({ ok: true, data: { resena_id: 3, motivo: null } });
    expect(parseBody(reporteSchema, { resena_id: 3, motivo: 'x'.repeat(501) }).ok).toBe(false);
  });
});

describe('finalCreateSchema', () => {
  const schema = finalCreateSchema(YEAR);
  const final = { materia_id: '4', anio: '2024', mesa: 'Febrero', profesor_nombre: '', comentario: 'Tomaron un práctico largo.' };

  it('convierte ids y años que llegan como string', () => {
    expect(parseBody(schema, final)).toEqual({
      ok: true,
      data: { materia_id: 4, anio: 2024, mesa: 'Febrero', profesor_nombre: null, comentario: 'Tomaron un práctico largo.', con_nombre: false },
    });
  });

  it('es anónima salvo que pida publicar con su nombre', () => {
    const r = parseBody(schema, { ...final, con_nombre: true });
    expect(r.ok && r.data.con_nombre).toBe(true);
    expect(parseBody(schema, { ...final, con_nombre: 'si' }).ok).toBe(false);
  });

  it('rechaza materia inválida, año fuera de rango y textos largos', () => {
    expect(parseBody(schema, { ...final, materia_id: 'x' }).ok).toBe(false);
    expect(parseBody(schema, { ...final, anio: '2014' }).ok).toBe(false);
    expect(parseBody(schema, { ...final, mesa: 'x'.repeat(101) }).ok).toBe(false);
    expect(parseBody(schema, { ...final, profesor_nombre: 'x'.repeat(121) }).ok).toBe(false);
  });
});

describe('finalAccionSchema', () => {
  it('distingue eliminar y editar', () => {
    expect(parseBody(finalAccionSchema, { accion: 'eliminar', id: 2 })).toEqual({ ok: true, data: { accion: 'eliminar', id: 2 } });
    expect(parseBody(finalAccionSchema, { accion: 'editar', id: 2, comentario: 'corto' }).ok).toBe(false);
    expect(parseBody(finalAccionSchema, { accion: 'otra', id: 2 })).toEqual({ ok: false, error: 'Acción no válida.' });
  });
});

describe('perfilSchema', () => {
  it('limpia el nombre y lo deja vacío para volver al de Google', () => {
    expect(parseBody(perfilSchema, { nombre_mostrar: '  Pato   A. ' })).toEqual({ ok: true, data: { nombre_mostrar: 'Pato A.' } });
    expect(parseBody(perfilSchema, { nombre_mostrar: '' })).toEqual({ ok: true, data: { nombre_mostrar: null } });
    expect(parseBody(perfilSchema, { nombre_mostrar: 'P' }).ok).toBe(false);
    expect(parseBody(perfilSchema, { nombre_mostrar: 'x'.repeat(41) }).ok).toBe(false);
  });

  it('ordena los años sin repetir y rechaza años que no existen', () => {
    expect(parseBody(perfilSchema, { anios_cursada: [3, '1', 3] })).toEqual({ ok: true, data: { anios_cursada: [1, 3] } });
    expect(parseBody(perfilSchema, { anios_cursada: [6] }).ok).toBe(false);
  });

  it('no deja tocar otros campos', () => {
    expect(parseBody(perfilSchema, { user_id: 'otro' }).ok).toBe(false);
    expect(parseBody(perfilSchema, { foto: 'otra' }).ok).toBe(false);
  });
});

describe('borrarCuentaSchema', () => {
  it('pide elegir qué pasa con las reseñas y escribir BORRAR', () => {
    expect(parseBody(borrarCuentaSchema, { resenas: 'anonimas', confirmacion: 'BORRAR' }).ok).toBe(true);
    expect(parseBody(borrarCuentaSchema, { resenas: 'anonimas', confirmacion: 'borrar' })).toEqual({ ok: false, error: 'Escribí BORRAR para confirmar.' });
    expect(parseBody(borrarCuentaSchema, { confirmacion: 'BORRAR' }).ok).toBe(false);
  });
});
