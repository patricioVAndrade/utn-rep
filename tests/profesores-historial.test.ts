import { beforeEach, describe, expect, it, vi } from 'vitest';

// Migración 11: rol de cada profe en el curso e historial (desde / hasta).
// El historial lo lleva la base sola (triggers); acá se prueba lo que muestra
// el sitio y la acción del admin para poner el rol.

const update = vi.fn();
const eq2 = vi.fn();
const eq1 = vi.fn(() => ({ eq: eq2 }));
update.mockImplementation(() => ({ eq: eq1 }));
vi.mock('../src/lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn(() => ({ update })) } }));
const requireAdmin = vi.fn();
vi.mock('../src/lib/admin-guards', () => ({ requireAdmin }));
const registrar = vi.fn();
vi.mock('../src/lib/moderacion', () => ({ registrar }));

const { ROLES, rolTexto, normalizarRol, cuatriDe, periodoTexto } = await import('../src/lib/profesores');
const { POST } = await import('../src/pages/api/admin/dictados');

const pedir = (body: unknown) =>
  POST({ request: new Request('http://x/api/admin/dictados', { method: 'POST', body: JSON.stringify(body) }), cookies: {} } as any);

describe('roles', () => {
  it('son Titular, Adjunto, JTP y Ayudante', () => {
    expect(ROLES.map((r) => r.valor)).toEqual(['TITULAR', 'ADJUNTO', 'JTP', 'AYUDANTE']);
    expect(rolTexto('TITULAR')).toBe('Titular');
    expect(rolTexto('JTP')).toBe('JTP');
    expect(rolTexto(null)).toBe('');
    expect(rolTexto('OTRA COSA')).toBe('');
  });
  it('acepta cómo lo escribiría una persona', () => {
    expect(normalizarRol('titular')).toBe('TITULAR');
    expect(normalizarRol(' Jefe de trabajos prácticos ')).toBe('JTP');
    expect(normalizarRol('ayudante')).toBe('AYUDANTE');
    expect(normalizarRol('')).toBeNull();
    expect(normalizarRol(null)).toBeNull();
    expect(normalizarRol('decano')).toBeUndefined();
  });
});

describe('cuatrimestre', () => {
  it('de enero a julio es el primero y de agosto a diciembre el segundo (hora de Córdoba)', () => {
    expect(cuatriDe(new Date('2026-03-10T12:00:00Z'))).toEqual({ anio: 2026, cuatri: 1 });
    expect(cuatriDe(new Date('2026-07-31T12:00:00Z'))).toEqual({ anio: 2026, cuatri: 1 });
    expect(cuatriDe(new Date('2026-08-01T12:00:00Z'))).toEqual({ anio: 2026, cuatri: 2 });
    // 1/1 a las 01:00 UTC todavía es 31/12 en Córdoba
    expect(cuatriDe(new Date('2027-01-01T01:00:00Z'))).toEqual({ anio: 2026, cuatri: 2 });
  });
  it('arma el texto del período', () => {
    expect(periodoTexto({ desde_anio: 2026, desde_cuatri: null, hasta_anio: null, hasta_cuatri: null })).toBe('Desde 2026');
    expect(periodoTexto({ desde_anio: 2026, desde_cuatri: 1, hasta_anio: null, hasta_cuatri: null })).toBe('Desde el 1.er cuatri de 2026');
    expect(periodoTexto({ desde_anio: 2026, desde_cuatri: null, hasta_anio: 2027, hasta_cuatri: 1 })).toBe('2026 al 1.er cuatri de 2027');
    expect(periodoTexto({ desde_anio: 2026, desde_cuatri: 2, hasta_anio: 2026, hasta_cuatri: 2 })).toBe('2.º cuatri de 2026');
  });
});

describe('POST /api/admin/dictados { action: set_rol }', () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue({ id: 'admin-1' });
    update.mockClear(); eq1.mockClear(); eq2.mockReset();
    eq2.mockResolvedValue({ error: null });
  });

  it('sin ser admin → 403', async () => {
    requireAdmin.mockResolvedValue(null);
    expect((await pedir({ action: 'set_rol', dictado_id: 1, profesor_id: 2, rol: 'JTP' })).status).toBe(403);
  });
  it('falta el curso o el profe → 400', async () => {
    expect((await pedir({ action: 'set_rol', profesor_id: 2, rol: 'JTP' })).status).toBe(400);
  });
  it('rol que no existe → 400', async () => {
    expect((await pedir({ action: 'set_rol', dictado_id: 1, profesor_id: 2, rol: 'decano' })).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
  it('guarda el rol normalizado', async () => {
    const res = await pedir({ action: 'set_rol', dictado_id: 1, profesor_id: 2, rol: 'Jefe de trabajos prácticos' });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ rol: 'JTP' });
    expect(eq1).toHaveBeenCalledWith('dictado_id', 1);
    expect(eq2).toHaveBeenCalledWith('profesor_id', 2);
  });
  it('vacío lo borra', async () => {
    await pedir({ action: 'set_rol', dictado_id: 1, profesor_id: 2, rol: '' });
    expect(update).toHaveBeenCalledWith({ rol: null });
  });
  it('si la base falla → 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    eq2.mockResolvedValue({ error: { message: 'column rol does not exist' } });
    expect((await pedir({ action: 'set_rol', dictado_id: 1, profesor_id: 2, rol: 'JTP' })).status).toBe(500);
  });
});
