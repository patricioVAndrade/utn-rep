import { beforeEach, describe, expect, it, vi } from 'vitest';

// Contar un final (migración 1) y, desde la 13 (F34), avisar si se puede
// sumar a una reseña tuya de la misma materia.

let usuario: { id: string; email: string; user_metadata: any } | null;
const tablas: Record<string, any> = {};
const insertados: any[] = [];

vi.mock('../src/lib/rate-limit', () => ({ checkRateLimit: async () => true }));
vi.mock('../src/lib/supabase', () => ({
  createSupabaseServerClient: () => ({ client: { auth: { getUser: async () => ({ data: { user: usuario } }) } } }),
}));
vi.mock('../src/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => {
      const q: any = { filtros: [] as [string, unknown][] };
      for (const m of ['select', 'eq', 'in', 'is', 'limit']) q[m] = (...a: unknown[]) => { if (m !== 'select') q.filtros.push([m, a]); return q; };
      q.insert = (fila: any) => { insertados.push({ t, fila }); q.insertado = fila; return q; };
      q.maybeSingle = () => q;
      q.single = () => q;
      q.then = (ok: any) => {
        if (q.insertado) return Promise.resolve({ data: { id: 'f-nuevo' }, error: null }).then(ok);
        const v = tablas[t];
        return Promise.resolve(typeof v === 'function' ? v(q.filtros) : v ?? { data: null, error: null }).then(ok);
      };
      return q;
    },
  },
}));

const { POST } = await import('../src/pages/api/finales/crear');

const anio = new Date().getFullYear();
const body = { materia_id: 3, anio, mesa: 'Julio', profesor_nombre: '', comentario: 'Tomaron un práctico largo y una pregunta de teoría al final.', con_nombre: false };
const pedir = async (b: unknown) => {
  const res = await POST({ request: new Request('http://x/api/finales/crear', { method: 'POST', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } }), cookies: {} } as any);
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  usuario = { id: 'u-1', email: 'a@b.com', user_metadata: { full_name: 'Ana' } };
  insertados.length = 0;
  tablas.materias = { data: { id: 3 }, error: null };
  tablas.dictados = { data: [{ id: 30 }, { id: 31 }], error: null };
  tablas.resenas = { data: [], error: null };
});

describe('POST /api/finales/crear', () => {
  it('sin sesión → 401', async () => {
    usuario = null;
    expect((await pedir(body)).status).toBe(401);
  });
  it('guarda el final anónimo por defecto y devuelve su id', async () => {
    const r = await pedir(body);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ success: true, id: 'f-nuevo', sumar: null });
    expect(insertados[0].fila).toMatchObject({ user_id: 'u-1', materia_id: 3, es_anonima: true });
  });
  it('si tenés una reseña de esa materia sin final, avisa que se puede sumar', async () => {
    tablas.resenas = (filtros: [string, unknown[]][]) => {
      const ok = filtros.some(([m, a]) => m === 'eq' && a[0] === 'user_id' && a[1] === 'u-1') && filtros.some(([m, a]) => m === 'in' && a[0] === 'dictado_id');
      return { data: ok ? [{ id: 9, final_id: null }] : [], error: null };
    };
    expect((await pedir(body)).body.sumar).toBe(9);
  });
  it('si las reseñas de esa materia ya tienen final (o falta la migración 13), no ofrece nada', async () => {
    tablas.resenas = { data: [{ id: 9, final_id: 'otro' }], error: null };
    expect((await pedir(body)).body.sumar).toBeNull();
    tablas.resenas = { data: null, error: { code: '42703' } };
    expect((await pedir(body)).body.sumar).toBeNull();
  });
  it('materia que no existe → 404', async () => {
    tablas.materias = { data: null, error: null };
    expect((await pedir(body)).status).toBe(404);
  });
});
