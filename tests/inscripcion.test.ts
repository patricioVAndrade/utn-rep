import { beforeEach, describe, expect, it, vi } from 'vitest';

// Migración 12: Mi inscripción ("Lo estoy pensando"). La lista es de cada
// persona (RLS); acá se prueba el endpoint con un cliente de Supabase de
// mentira y las cuentas de la pantalla. La parte de la base está en
// supabase/pruebas/migracion-12.sql.

type Llamada = { tabla: string; op: string; pasos: [string, unknown[]][] };
const llamadas: Llamada[] = [];
let respuestas: Record<string, { data?: unknown; error?: unknown }> = {};
let usuario: { id: string } | null = { id: 'u-1' };

function consulta(tabla: string) {
  const q: any = { op: '', pasos: [] as [string, unknown[]][] };
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'maybeSingle', 'single']) {
    q[m] = (...args: unknown[]) => {
      if (['select', 'insert', 'update', 'delete', 'upsert'].includes(m) && !q.op) q.op = m;
      q.pasos.push([m, args]);
      return q;
    };
  }
  q.then = (ok: any, mal: any) => {
    llamadas.push({ tabla, op: q.op, pasos: q.pasos });
    return Promise.resolve(respuestas[`${tabla}.${q.op}`] ?? { data: null, error: null }).then(ok, mal);
  };
  return q;
}

vi.mock('../src/lib/supabase', () => ({
  createSupabaseServerClient: () => ({
    client: { auth: { getUser: async () => ({ data: { user: usuario } }) }, from: (t: string) => consulta(t) },
  }),
}));

const { POST } = await import('../src/pages/api/inscripcion');
const { idsDeTexto, textoCombinacion, notaPromedio } = await import('../src/lib/inscripcion');

const pedir = async (body: unknown) => {
  const res = await POST({ request: new Request('http://x/api/inscripcion', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }), cookies: {} } as any);
  return { status: res.status, body: await res.json() };
};
const de = (op: string) => llamadas.filter((l) => l.op === op);
const tiene = (l: Llamada, paso: string, ...args: unknown[]) => l.pasos.some(([m, a]) => m === paso && JSON.stringify(a) === JSON.stringify(args));

beforeEach(() => {
  llamadas.length = 0;
  respuestas = {};
  usuario = { id: 'u-1' };
});

describe('POST /api/inscripcion', () => {
  it('sin sesión → 401', async () => {
    usuario = null;
    expect((await pedir({ accion: 'agregar', dictado_id: 5 })).status).toBe(401);
  });
  it('acción o curso inválido → 400', async () => {
    expect((await pedir({ accion: 'inscribirme', dictado_id: 5 })).status).toBe(400);
    expect((await pedir({ accion: 'agregar', dictado_id: -1 })).status).toBe(400);
    expect((await pedir({ accion: 'agregar' })).status).toBe(400);
    expect(llamadas).toHaveLength(0);
  });
  it('agregar guarda el curso a nombre de quien está (la materia la pone la base)', async () => {
    const r = await pedir({ accion: 'agregar', dictado_id: 5 });
    expect(r.status).toBe(200);
    expect(de('insert')[0].pasos[0]).toEqual(['insert', [{ user_id: 'u-1', dictado_id: 5 }]]);
  });
  it('agregar dos veces no es error; un curso que no existe → 404; pasarse del tope → 400', async () => {
    respuestas['inscripcion_cursos.insert'] = { error: { code: '23505' } };
    expect((await pedir({ accion: 'agregar', dictado_id: 5 })).status).toBe(200);
    respuestas['inscripcion_cursos.insert'] = { error: { code: '23503' } };
    expect((await pedir({ accion: 'agregar', dictado_id: 5 })).status).toBe(404);
    respuestas['inscripcion_cursos.insert'] = { error: { code: 'IN001' } };
    const r = await pedir({ accion: 'agregar', dictado_id: 5 });
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('80');
  });
  it('quitar borra solo ese curso de la lista propia', async () => {
    expect((await pedir({ accion: 'quitar', dictado_id: 5 })).status).toBe(200);
    const d = de('delete')[0];
    expect(tiene(d, 'eq', 'user_id', 'u-1') && tiene(d, 'eq', 'dictado_id', 5)).toBe(true);
  });
  it('quitar una materia borra todos sus cursos', async () => {
    expect((await pedir({ accion: 'quitar_materia', materia_id: 9 })).status).toBe(200);
    const d = de('delete')[0];
    expect(tiene(d, 'eq', 'user_id', 'u-1') && tiene(d, 'eq', 'materia_id', 9)).toBe(true);
  });
  it('elegir desmarca el elegido anterior de esa materia y marca el nuevo', async () => {
    respuestas['inscripcion_cursos.select'] = { data: { materia_id: 9 } };
    expect((await pedir({ accion: 'elegir', dictado_id: 5 })).status).toBe(200);
    const [antes, ahora] = de('update');
    expect(antes.pasos[0]).toEqual(['update', [{ elegido: false }]]);
    expect(tiene(antes, 'eq', 'materia_id', 9) && tiene(antes, 'eq', 'user_id', 'u-1')).toBe(true);
    expect(ahora.pasos[0]).toEqual(['update', [{ elegido: true }]]);
    expect(tiene(ahora, 'eq', 'dictado_id', 5)).toBe(true);
  });
  it('elegir un curso que no estaba en la lista lo agrega primero', async () => {
    respuestas['inscripcion_cursos.select'] = { data: { materia_id: 9 } };
    await pedir({ accion: 'elegir', dictado_id: 5 });
    expect(de('insert')).toHaveLength(1);
  });
  it('no_elegir lo deja en la lista sin marcar', async () => {
    expect((await pedir({ accion: 'no_elegir', dictado_id: 5 })).status).toBe(200);
    expect(de('update')[0].pasos[0]).toEqual(['update', [{ elegido: false }]]);
  });
  it('traer pasa la lista del navegador a la cuenta (sin repetir) y marca los elegidos', async () => {
    respuestas['inscripcion_cursos.select'] = { data: { materia_id: 9 } };
    const r = await pedir({ accion: 'traer', dictados: [5, 6, 6, 'x', 7], elegidos: [6, 99] });
    expect(r.status).toBe(200);
    const up = de('upsert')[0];
    expect(up.pasos[0][1][0]).toEqual([{ user_id: 'u-1', dictado_id: 5 }, { user_id: 'u-1', dictado_id: 6 }, { user_id: 'u-1', dictado_id: 7 }]);
    // Solo se elige lo que está en la lista
    expect(de('update').filter((l) => tiene(l, 'update', { elegido: true }))).toHaveLength(1);
  });
  it('si la base falla → 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuestas['inscripcion_cursos.delete'] = { error: { code: 'XX000', message: 'boom' } };
    expect((await pedir({ accion: 'quitar', dictado_id: 5 })).status).toBe(500);
  });
});

describe('cuentas de la pantalla', () => {
  it('lee la lista del link (?c=1,2,3) sin repetir ni basura, con tope', () => {
    expect(idsDeTexto('5,6,6,abc,-3,7')).toEqual([5, 6, 7]);
    expect(idsDeTexto(null)).toEqual([]);
    expect(idsDeTexto(Array.from({ length: 100 }, (_, i) => i + 1).join(','))).toHaveLength(80);
  });
  it('dice cómo queda la combinación de turnos', () => {
    expect(textoCombinacion(['TARDE', 'TARDE', 'TARDE'])).toBe('Las tres a la tarde.');
    expect(textoCombinacion(['NOCHE', 'NOCHE'])).toBe('Las dos a la noche.');
    expect(textoCombinacion(['MAÑANA'])).toBe('A la mañana.');
    expect(textoCombinacion(['TARDE', 'NOCHE', 'TARDE'])).toBe('2 a la tarde y 1 a la noche.');
    expect(textoCombinacion(Array(6).fill('NOCHE'))).toBe('Todas a la noche.');
    expect(textoCombinacion([])).toBe('');
  });
  it('promedia la nota de los elegidos que tienen reseñas', () => {
    expect(notaPromedio([4.5, 3.9, null, 3.0])).toBe(3.8);
    expect(notaPromedio([null])).toBeNull();
  });
});
