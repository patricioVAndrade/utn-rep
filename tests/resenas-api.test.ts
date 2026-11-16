import { beforeEach, describe, expect, it, vi } from 'vitest';

// Reseñas y finales (lo de antes y migraciones 1 a 4 y 9): escribir, editar,
// borrar, votar y reportar, y que una cuenta bloqueada no pueda escribir.
// La base es de mentira (tests/base-falsa.ts).

vi.mock('../src/lib/supabase', async () => (await import('./base-falsa')).mockSupabase);
vi.mock('../src/lib/supabase-admin', async () => (await import('./base-falsa')).mockSupabaseAdmin);
vi.mock('../src/lib/admin', async () => (await import('./base-falsa')).mockAdmin);

const { base, tiene, pedido, llamar } = await import('./base-falsa');
const crear = (await import('../src/pages/api/resenas')).POST;
const unaResena = await import('../src/pages/api/resenas/[id]');
const votar = (await import('../src/pages/api/resenas/votar')).POST;
const reportar = (await import('../src/pages/api/reportes')).POST;
const votarFinal = (await import('../src/pages/api/finales/votar')).POST;
const reportarFinal = (await import('../src/pages/api/finales/reportar')).POST;

beforeEach(() => base.reset());

const ANIO = new Date().getFullYear();
const RESENA = { dictado_id: 2, calificacion_general: 4, anio_cursado: ANIO, comentario: 'Muy buena cursada, explican bien.', es_anonima: true, condicion_final: 'REGULAR' };
const BLOQUEO = { error: { code: 'UB001' } };

describe('POST /api/resenas', () => {
  const c = (body: unknown) => llamar(crear, pedido('/api/resenas', body));
  it('sin sesión → 401; datos inválidos → 400', async () => {
    base.usuario = null;
    expect((await c(RESENA)).status).toBe(401);
    base.reset();
    expect((await c({ ...RESENA, calificacion_general: 6 })).status).toBe(400);
    expect((await c({ ...RESENA, comentario: 'corto' })).status).toBe(400);
    expect((await c({ ...RESENA, anio_cursado: ANIO + 1 })).status).toBe(400);
  });
  it('curso inexistente → 404', async () => {
    expect((await c(RESENA)).status).toBe(404);
  });
  it('publica a nombre de quien está (201) y revisa las palabras marcadas', async () => {
    base.respuestas['dictados.select'] = { data: { id: 2 } };
    base.respuestas['resenas.insert'] = { data: { id: 50 } };
    expect((await c(RESENA)).status).toBe(201);
    expect(base.de('resenas', 'insert')[0].pasos[0][1][0]).toMatchObject({ dictado_id: 2, user_id: 'u-1', es_anonima: true });
    expect(base.de('palabras_marcadas', 'select')).toHaveLength(1);
  });
  it('8 en la última hora → 429; segunda del mismo curso → 409; cuenta bloqueada → 403', async () => {
    base.respuestas['dictados.select'] = { data: { id: 2 } };
    base.respuestas['resenas.select'] = { count: 8 };
    expect((await c(RESENA)).status).toBe(429);
    base.respuestas['resenas.select'] = { count: 0 };
    base.respuestas['resenas.insert'] = { error: { code: '23505' } };
    expect((await c(RESENA)).status).toBe(409);
    base.respuestas['resenas.insert'] = BLOQUEO;
    expect((await c(RESENA)).status).toBe(403);
  });
});

describe('PUT, POST con _method y DELETE /api/resenas/{id} (migración 3)', () => {
  const editar = (id: string, body: unknown) => llamar(unaResena.PUT, pedido(`/api/resenas/${id}`, body, { metodo: 'PUT' }), { id });
  const borrar = (id: string) => llamar(unaResena.DELETE, pedido(`/api/resenas/${id}`, undefined, { metodo: 'DELETE' }), { id });
  it('sin sesión → 401; id inválido o sin cambios → 400', async () => {
    base.usuario = null;
    expect((await editar('5', { comentario: 'Texto nuevo y más largo.' })).status).toBe(401);
    base.reset();
    expect((await editar('x', { comentario: 'Texto nuevo y más largo.' })).status).toBe(400);
    expect((await editar('5', {})).status).toBe(400);
  });
  it('editar la propia: cambia texto o "¿Cómo te fue?" (no las estrellas)', async () => {
    base.respuestas['resenas.select'] = { data: { id: 5, user_id: 'u-1' } };
    base.respuestas['resenas.update'] = { data: { updated_at: '2026-11-09T00:00:00Z' } };
    const r = await editar('5', { comentario: 'Texto nuevo y más largo.', calificacion_general: 1 });
    expect(r.body).toEqual({ success: true, updated_at: '2026-11-09T00:00:00Z' });
    expect(base.de('resenas', 'update')[0].pasos[0][1][0]).toEqual({ comentario: 'Texto nuevo y más largo.' });
    await editar('5', { condicion_final: 'PROMOCIONADO' });
    expect(base.de('resenas', 'update')[1].pasos[0][1][0]).toEqual({ condicion_final: 'PROMOCIONADO' });
  });
  it('editar una ajena → 403; una que no existe → 404; cuenta bloqueada → 403', async () => {
    expect((await editar('5', { condicion_final: 'LIBRE' })).status).toBe(404);
    base.respuestas['resenas.select'] = { data: { id: 5, user_id: 'u-2' } };
    expect((await editar('5', { condicion_final: 'LIBRE' })).status).toBe(403);
    expect(base.de('resenas', 'update')).toHaveLength(0);
    base.respuestas['resenas.select'] = { data: { id: 5, user_id: 'u-1' } };
    base.respuestas['resenas.update'] = BLOQUEO;
    const r = await editar('5', { condicion_final: 'LIBRE' });
    expect(r.status).toBe(403);
    expect(r.body.error).toContain('bloqueada');
  });
  it('POST con _method PUT edita; con otro método → 405', async () => {
    base.respuestas['resenas.select'] = { data: { id: 5, user_id: 'u-1' } };
    expect((await llamar(unaResena.POST, pedido('/api/resenas/5', { _method: 'PUT', condicion_final: 'LIBRE' }), { id: '5' })).status).toBe(200);
    expect((await llamar(unaResena.POST, pedido('/api/resenas/5', { _method: 'PATCH' }), { id: '5' })).status).toBe(405);
  });
  it('borrar la propia; si después sigue estando (RLS) → 403', async () => {
    let veces = 0;
    base.respuestas['resenas.select'] = () => (veces++ === 0 ? { data: { id: 5, user_id: 'u-1' } } : { data: null });
    expect((await borrar('5')).status).toBe(200);
    expect(base.de('resenas', 'delete')[0].cliente).toBe('sesion');
    veces = 0;
    base.respuestas['resenas.select'] = () => ({ data: { id: 5, user_id: 'u-1' } });
    expect((await borrar('5')).status).toBe(403);
  });
  it('borrar una ajena → 403; el admin la borra con la clave de servicio y queda en el registro', async () => {
    base.respuestas['resenas.select'] = { data: { id: 5, user_id: 'u-2' } };
    expect((await borrar('5')).status).toBe(403);
    expect(base.de('resenas', 'delete')).toHaveLength(0);

    base.usuario = { id: 'admin-1' };
    let veces = 0;
    base.respuestas['resenas.select'] = () => (veces++ === 0 ? { data: { id: 5, user_id: 'u-2' } } : { data: null });
    expect((await borrar('5')).status).toBe(200);
    expect(base.de('resenas', 'delete')[0].cliente).toBe('admin');
    expect(base.de('registro_moderacion', 'insert')[0].pasos[0][1][0]).toMatchObject({ moderador_id: 'admin-1', accion: 'borrar', resena_id: 5 });
  });
});

describe('Votar y reportar reseñas', () => {
  it('votar: sin sesión → 401; vota y desvota con la función de la base', async () => {
    base.usuario = null;
    expect((await llamar(votar, pedido('/api/resenas/votar', { resena_id: 5 }))).status).toBe(401);
    base.reset();
    base.respuestas['rpc.votar_resena'] = { data: 4 };
    expect((await llamar(votar, pedido('/api/resenas/votar', { resena_id: 5 }))).body).toEqual({ success: true, votos: 4, votado: true });
    expect(base.de('rpc', 'votar_resena')[0].pasos[0][1][0]).toEqual({ p_resena_id: 5, p_votar: true });
    await llamar(votar, pedido('/api/resenas/votar', { resena_id: 5, accion: 'desvotar' }));
    expect(base.de('rpc', 'votar_resena')[1].pasos[0][1][0]).toEqual({ p_resena_id: 5, p_votar: false });
  });
  it('votar: reseña inexistente → 404; muchos votos → 429; cuenta bloqueada → 403', async () => {
    base.respuestas['rpc.votar_resena'] = { error: { code: '23503' } };
    expect((await llamar(votar, pedido('/api/resenas/votar', { resena_id: 5 }))).status).toBe(404);
    base.respuestas['rpc.votar_resena'] = BLOQUEO;
    expect((await llamar(votar, pedido('/api/resenas/votar', { resena_id: 5 }))).status).toBe(403);
    base.respuestas['rpc.check_rate_limit'] = { data: false };
    expect((await llamar(votar, pedido('/api/resenas/votar', { resena_id: 5 }))).status).toBe(429);
  });
  it('reportar: 201 la primera vez, 409 la segunda; cuenta bloqueada → 403', async () => {
    expect((await llamar(reportar, pedido('/api/reportes', { resena_id: 5, motivo: 'Insulta' }))).status).toBe(201);
    expect(base.de('reportes_resenas', 'insert')[0].pasos[0][1][0]).toEqual({ resena_id: 5, user_id: 'u-1', motivo: 'Insulta' });
    base.respuestas['reportes_resenas.select'] = { data: { id: 1 } };
    expect((await llamar(reportar, pedido('/api/reportes', { resena_id: 5 }))).status).toBe(409);
    base.respuestas['reportes_resenas.select'] = { data: null };
    base.respuestas['reportes_resenas.insert'] = BLOQUEO;
    expect((await llamar(reportar, pedido('/api/reportes', { resena_id: 5 }))).status).toBe(403);
  });
});

describe('Votar y reportar finales (migraciones 1 y 2)', () => {
  const FINAL = 12; // los finales tienen id numérico
  it('votar: sin sesión → 401; vota; inexistente → 404; bloqueada → 403', async () => {
    base.usuario = null;
    expect((await llamar(votarFinal, pedido('/api/finales/votar', { final_id: FINAL }))).status).toBe(401);
    base.reset();
    base.respuestas['rpc.votar_final'] = { data: 2 };
    expect((await llamar(votarFinal, pedido('/api/finales/votar', { final_id: FINAL }))).body).toEqual({ success: true, votos: 2, votado: true });
    base.respuestas['rpc.votar_final'] = { error: { code: '23503' } };
    expect((await llamar(votarFinal, pedido('/api/finales/votar', { final_id: FINAL }))).status).toBe(404);
    base.respuestas['rpc.votar_final'] = BLOQUEO;
    expect((await llamar(votarFinal, pedido('/api/finales/votar', { final_id: FINAL }))).status).toBe(403);
  });
  it('reportar: motivo corto → 400; 201; dos veces → 409; inexistente → 404; bloqueada → 403', async () => {
    const r = (body: unknown) => llamar(reportarFinal, pedido('/api/finales/reportar', body));
    expect((await r({ final_id: FINAL, motivo: 'no' })).status).toBe(400);
    expect((await r({ final_id: FINAL, motivo: 'Tiene un nombre' })).status).toBe(201);
    const ins = base.de('reportes_finales', 'insert')[0];
    expect(ins.cliente).toBe('admin');
    expect(ins.pasos[0][1][0]).toEqual({ final_id: FINAL, user_id: 'u-1', motivo: 'Tiene un nombre' });
    base.respuestas['reportes_finales.insert'] = { error: { code: '23505' } };
    expect((await r({ final_id: FINAL, motivo: 'Tiene un nombre' })).status).toBe(409);
    base.respuestas['reportes_finales.insert'] = { error: { code: '23503' } };
    expect((await r({ final_id: FINAL, motivo: 'Tiene un nombre' })).status).toBe(404);
    base.respuestas['reportes_finales.insert'] = BLOQUEO;
    expect((await r({ final_id: FINAL, motivo: 'Tiene un nombre' })).status).toBe(403);
  });
});
