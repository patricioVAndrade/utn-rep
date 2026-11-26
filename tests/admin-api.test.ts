import { beforeEach, describe, expect, it, vi } from 'vitest';

// Admin (migraciones 4 y 9): moderación y bloqueo de cuentas. Acá el control
// de admin y de CSRF es el de verdad (src/lib/admin-guards.ts); la base es de
// mentira (tests/base-falsa.ts).

vi.mock('../src/lib/supabase', async () => (await import('./base-falsa')).mockSupabase);
vi.mock('../src/lib/supabase-admin', async () => (await import('./base-falsa')).mockSupabaseAdmin);
vi.mock('../src/lib/admin', async () => (await import('./base-falsa')).mockAdmin);

const { base, tiene, pedido, llamar } = await import('./base-falsa');
const moderacion = (await import('../src/pages/api/admin/moderacion')).POST;
const usuarios = (await import('../src/pages/api/admin/usuarios')).POST;

beforeEach(() => {
  base.reset();
  base.usuario = { id: 'admin-1' };
});

const mod = (body: unknown, csrf: boolean | string = true) => llamar(moderacion, pedido('/api/admin/moderacion', body, { csrf }));
const usr = (body: unknown, csrf: boolean | string = true) => llamar(usuarios, pedido('/api/admin/usuarios', body, { csrf }));
const registro = () => base.de('registro_moderacion', 'insert').map((l) => l.pasos[0][1][0] as any);

describe('Control de admin y CSRF', () => {
  it('quien no es admin → 403, aunque tenga el token', async () => {
    base.usuario = { id: 'u-1' };
    expect((await mod({ accion: 'responder', resena_id: 5, texto: 'Hola' })).status).toBe(403);
    expect((await usr({ accion: 'bloquear', user_id: 'u-1234' })).status).toBe(403);
  });
  it('admin sin token o con otro token → 403', async () => {
    expect((await mod({ accion: 'responder', resena_id: 5, texto: 'Hola' }, false)).status).toBe(403);
    expect((await usr({ accion: 'bloquear', user_id: 'u-1234' }, 'otro')).status).toBe(403);
    expect(base.llamadas).toHaveLength(0);
  });
});

describe('POST /api/admin/moderacion (migración 4)', () => {
  it('responder una reseña: crea la respuesta y la anota', async () => {
    expect((await mod({ accion: 'responder', resena_id: 5, texto: 'Ya lo revisamos.' })).status).toBe(200);
    expect(base.de('respuestas_moderador', 'insert')[0].pasos[0][1][0]).toEqual({ resena_id: 5, texto: 'Ya lo revisamos.' });
    expect(registro()[0]).toMatchObject({ moderador_id: 'admin-1', accion: 'responder', resena_id: 5, detalle: 'Ya lo revisamos.' });
  });
  it('responder otra vez cambia la misma respuesta; también en un final', async () => {
    base.respuestas['respuestas_moderador.select'] = { data: { id: 9 } };
    await mod({ accion: 'responder', final_id: 3, texto: 'Corregido.' });
    const u = base.de('respuestas_moderador', 'update')[0];
    expect((u.pasos[0][1][0] as any).texto).toBe('Corregido.');
    expect(tiene(u, 'eq', 'id', 9)).toBe(true);
    expect(tiene(base.de('respuestas_moderador', 'select')[0], 'eq', 'final_id', 3)).toBe(true);
  });
  it('respuesta muy corta o sin reseña → 400; acción desconocida → 400', async () => {
    expect((await mod({ accion: 'responder', resena_id: 5, texto: 'ok' })).status).toBe(400);
    expect((await mod({ accion: 'responder', texto: 'Ya lo revisamos.' })).status).toBe(400);
    expect((await mod({ accion: 'banear', resena_id: 5 })).status).toBe(400);
  });
  it('borrar la respuesta', async () => {
    expect((await mod({ accion: 'borrar_respuesta', resena_id: 5 })).status).toBe(200);
    expect(tiene(base.de('respuestas_moderador', 'delete')[0], 'eq', 'resena_id', 5)).toBe(true);
    expect(registro()[0].accion).toBe('borrar_respuesta');
  });
  it('pedir edición y quitar el pedido', async () => {
    await mod({ accion: 'pedir_edicion', resena_id: 5, texto: 'Sacá el apellido.' });
    const u = base.de('resenas', 'update')[0];
    expect((u.pasos[0][1][0] as any).pedido_edicion).toBe('Sacá el apellido.');
    expect(tiene(u, 'eq', 'id', 5)).toBe(true);
    await mod({ accion: 'quitar_pedido', resena_id: 5 });
    expect(base.de('resenas', 'update')[1].pasos[0][1][0]).toEqual({ pedido_edicion: null, pedido_edicion_at: null });
    expect(registro().map((r) => r.accion)).toEqual(['pedir_edicion', 'quitar_pedido']);
    expect((await mod({ accion: 'pedir_edicion', final_id: 3, texto: 'Sacá el apellido.' })).status).toBe(400);
  });
  it('palabras marcadas: agregar (limpia), repetida → 409, quitar', async () => {
    base.respuestas['palabras_marcadas.insert'] = { data: { id: 4, palabra: 'boludo' } };
    const r = await mod({ accion: 'agregar_palabra', palabra: '  BOLUDO ' });
    expect(r.body).toEqual({ success: true, data: { id: 4, palabra: 'boludo' } });
    expect(base.de('palabras_marcadas', 'insert')[0].pasos[0][1][0]).toEqual({ palabra: 'boludo' });
    base.respuestas['palabras_marcadas.insert'] = { error: { code: '23505' } };
    expect((await mod({ accion: 'agregar_palabra', palabra: 'boludo' })).status).toBe(409);
    expect((await mod({ accion: 'agregar_palabra', palabra: 'x' })).status).toBe(400);
    base.respuestas['palabras_marcadas.select'] = { data: { palabra: 'boludo' } };
    expect((await mod({ accion: 'quitar_palabra', id: 4 })).status).toBe(200);
    expect(tiene(base.de('palabras_marcadas', 'delete')[0], 'eq', 'id', 4)).toBe(true);
    expect(registro().at(-1)).toMatchObject({ accion: 'quitar_palabra', detalle: 'boludo' });
  });
});

describe('POST /api/admin/usuarios (migración 9)', () => {
  beforeEach(() => {
    base.respuestas['auth.getUserById'] = { data: { user: { id: 'u-1234', email: 'sofi@x.com', user_metadata: { nombre_mostrar: 'Sofía' } } } };
  });
  it('cuenta o acción inválidas → 400; no se puede bloquear a un admin', async () => {
    expect((await usr({ accion: 'bloquear', user_id: '' })).status).toBe(400);
    expect((await usr({ accion: 'borrar', user_id: 'u-1234' })).status).toBe(400);
    expect((await usr({ accion: 'bloquear', user_id: 'admin-2' })).status).toBe(400);
    expect((await usr({ accion: 'bloquear', user_id: 'admin-1' })).status).toBe(400);
  });
  it('cuenta que no existe → 404', async () => {
    base.respuestas['auth.getUserById'] = { data: { user: null } };
    expect((await usr({ accion: 'bloquear', user_id: 'u-9999' })).status).toBe(404);
  });
  it('bloquear guarda fecha y motivo, y lo anota con el nombre', async () => {
    expect((await usr({ accion: 'bloquear', user_id: 'u-1234', motivo: 'Spam' })).status).toBe(200);
    const [fila, opciones] = base.de('perfiles', 'upsert')[0].pasos[0][1] as any;
    expect(fila.user_id).toBe('u-1234');
    expect(fila.bloqueo_motivo).toBe('Spam');
    expect(Number.isNaN(Date.parse(fila.bloqueado_at))).toBe(false);
    expect(opciones).toEqual({ onConflict: 'user_id' });
    expect(registro()[0]).toMatchObject({ accion: 'bloquear', usuario_id: 'u-1234', detalle: 'Sofía. Spam' });
  });
  it('desbloquear limpia el bloqueo', async () => {
    expect((await usr({ accion: 'desbloquear', user_id: 'u-1234' })).status).toBe(200);
    expect(base.de('perfiles', 'upsert')[0].pasos[0][1][0]).toEqual({ user_id: 'u-1234', bloqueado_at: null, bloqueo_motivo: null });
  });
  it('si la base falla (sin migración 9) → 500 y no lo anota', async () => {
    base.respuestas['perfiles.upsert'] = { error: { message: 'column does not exist' } };
    const r = await usr({ accion: 'bloquear', user_id: 'u-1234' });
    expect(r.status).toBe(500);
    expect(r.body.error).toContain('migración 9');
    expect(registro()).toHaveLength(0);
  });
});
