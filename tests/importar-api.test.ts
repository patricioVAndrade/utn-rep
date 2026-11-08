import { beforeEach, describe, expect, it, vi } from 'vitest';

// Importador del admin: la vista previa con un CSV de horarios (los PDF
// oficiales pasados a CSV). La base es de mentira.

let esAdmin = true;
const tablas: Record<string, unknown[]> = {};

vi.mock('../src/lib/admin-guards', () => ({ requireAdmin: async () => (esAdmin ? { id: 'admin' } : null) }));
vi.mock('../src/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => {
      const q: any = {};
      for (const m of ['select', 'eq', 'range']) q[m] = () => q;
      q.then = (ok: any) => Promise.resolve({ data: tablas[t] ?? [], error: null }).then(ok);
      return q;
    },
  },
}));

const { POST } = await import('../src/pages/api/admin/importar');

const subir = async (nombre: string, texto: string) => {
  const form = new FormData();
  form.append('archivo', new File([texto], nombre, { type: 'text/csv' }));
  const res = await POST({ request: new Request('http://x/api/admin/importar', { method: 'POST', body: form }), cookies: {} } as any);
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  esAdmin = true;
  tablas.materias = [{ id: 1, nombre: 'Economía', nivel: 3 }];
  tablas.cursos = [{ id: 10, identificador: '3K1', turno: 'MAÑANA', anio_carrera: 3 }];
  tablas.profesores = [];
  tablas.dictados = [{ id: 100, materia_id: 1, curso_id: 10, dictado_profesores: [] }];
  tablas.horarios = [];
});

describe('POST /api/admin/importar (vista previa)', () => {
  it('sin ser admin → 403', async () => {
    esAdmin = false;
    expect((await subir('h.csv', 'curso,materia,cuatrimestre,dia,desde,hasta\n3K1,Economía,1,Lunes,8:00,8:45\n')).status).toBe(403);
  });
  it('un CSV que trae solo horarios se puede revisar', async () => {
    const r = await subir('h.csv', 'curso,materia,cuatrimestre,dia,desde,hasta\n3K1,Economía,1,Lunes,8:00,8:45\n3K1,Economía,1,Lunes,8:45,9:30\n');
    expect(r.status).toBe(200);
    expect(r.body.previa.horarios).toEqual([expect.objectContaining({ curso: '3K1', materia: 'Economía', dictado_id: 100, ahora: '1.er cuatri: Lunes 8:00 a 9:30' })]);
  });
  it('si no hay ni equipos ni horarios de cursos K → 400', async () => {
    const r = await subir('h.csv', 'curso,materia,cuatrimestre,dia,desde,hasta\n3R1,Química,1,Lunes,8:00,8:45\n');
    expect(r.status).toBe(400);
  });
});
