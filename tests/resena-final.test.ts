import { beforeEach, describe, expect, it, vi } from 'vitest';

// Migración 13 (F34): sumar el final a tu reseña. La base controla que el
// final sea tuyo y de la misma materia (FN001) y que esté en una sola reseña;
// acá se prueba el endpoint con un cliente de Supabase de mentira. La parte
// de la base está en supabase/pruebas/migracion-13.sql.

type Llamada = { tabla: string; op: string; pasos: [string, unknown[]][] };
const llamadas: Llamada[] = [];
let respuesta: { data?: unknown; error?: unknown } = {};
let usuario: { id: string } | null = { id: 'u-1' };

function consulta(tabla: string) {
  const q: any = { op: '', pasos: [] as [string, unknown[]][] };
  for (const m of ['select', 'update', 'eq']) {
    q[m] = (...args: unknown[]) => {
      if (m === 'update' || (m === 'select' && !q.op)) q.op = q.op || m;
      q.pasos.push([m, args]);
      return q;
    };
  }
  q.then = (ok: any, mal: any) => {
    llamadas.push({ tabla, op: q.op, pasos: q.pasos });
    return Promise.resolve(respuesta).then(ok, mal);
  };
  return q;
}

vi.mock('../src/lib/supabase', () => ({
  createSupabaseServerClient: () => ({
    client: { auth: { getUser: async () => ({ data: { user: usuario } }) }, from: (t: string) => consulta(t) },
  }),
}));

const { POST } = await import('../src/pages/api/resenas/final');
const { rindioTexto } = await import('../src/lib/format');

const UUID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const pedir = async (body: unknown) => {
  const res = await POST({ request: new Request('http://x/api/resenas/final', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }), cookies: {} } as any);
  return { status: res.status, body: await res.json() };
};
const tiene = (l: Llamada, paso: string, ...args: unknown[]) => l.pasos.some(([m, a]) => m === paso && JSON.stringify(a) === JSON.stringify(args));

beforeEach(() => {
  llamadas.length = 0;
  respuesta = { data: [{ id: 7 }], error: null };
  usuario = { id: 'u-1' };
});

describe('POST /api/resenas/final', () => {
  it('sin sesión → 401', async () => {
    usuario = null;
    expect((await pedir({ resena_id: 7, final_id: UUID })).status).toBe(401);
  });
  it('reseña o final inválidos → 400, sin tocar la base', async () => {
    expect((await pedir({ resena_id: 'x', final_id: UUID })).status).toBe(400);
    expect((await pedir({ resena_id: 7, final_id: 'no es un id' })).status).toBe(400);
    expect((await pedir({ resena_id: 7 })).status).toBe(400);
    expect(llamadas).toHaveLength(0);
  });
  it('suma el final a la reseña propia (uuid o número)', async () => {
    expect((await pedir({ resena_id: 7, final_id: UUID })).status).toBe(200);
    const u = llamadas[0];
    expect(u.tabla).toBe('resenas');
    expect(u.pasos[0]).toEqual(['update', [{ final_id: UUID }]]);
    expect(tiene(u, 'eq', 'id', 7) && tiene(u, 'eq', 'user_id', 'u-1')).toBe(true);
    expect((await pedir({ resena_id: 7, final_id: 12 })).status).toBe(200);
  });
  it('final_id null lo saca', async () => {
    expect((await pedir({ resena_id: 7, final_id: null })).status).toBe(200);
    expect(llamadas[0].pasos[0]).toEqual(['update', [{ final_id: null }]]);
  });
  it('una reseña que no es tuya o no existe → 404', async () => {
    respuesta = { data: [], error: null };
    expect((await pedir({ resena_id: 7, final_id: UUID })).status).toBe(404);
  });
  it('final de otra persona o materia → 400; ya está en otra reseña → 409', async () => {
    respuesta = { data: null, error: { code: 'FN001', message: 'Ese final no es tuyo o es de otra materia.' } };
    const r = await pedir({ resena_id: 7, final_id: UUID });
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('otra materia');
    respuesta = { data: null, error: { code: '23505' } };
    expect((await pedir({ resena_id: 7, final_id: UUID })).status).toBe(409);
  });
  it('si la base falla → 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuesta = { data: null, error: { code: 'XX000', message: 'boom' } };
    expect((await pedir({ resena_id: 7, final_id: UUID })).status).toBe(500);
  });
});

describe('texto en la reseña', () => {
  it('dice en qué mesa rindió', () => {
    expect(rindioTexto('Julio', 2026)).toBe('Rindió en julio 2026');
    expect(rindioTexto('Febrero', 2027)).toBe('Rindió en febrero / marzo 2027');
    expect(rindioTexto('Especial', 2026)).toBe('Rindió en una mesa especial 2026');
    expect(rindioTexto(null, null)).toBe('');
  });
});
