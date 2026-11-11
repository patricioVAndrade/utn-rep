import { beforeEach, describe, expect, it, vi } from 'vitest';

// Endpoints de la cuenta (migraciones 5 a 9): Mi cuenta, borrar la cuenta,
// seguir materias, avisos y links compartidos. La base es de mentira
// (tests/base-falsa.ts); lo que controla la base (RLS, triggers) está en
// supabase/pruebas/verificar-todo.sql.

vi.mock('../src/lib/supabase', async () => (await import('./base-falsa')).mockSupabase);
vi.mock('../src/lib/supabase-admin', async () => (await import('./base-falsa')).mockSupabaseAdmin);

const { base, tiene, pedido, llamar } = await import('./base-falsa');
const perfil = (await import('../src/pages/api/perfil')).POST;
const borrar = (await import('../src/pages/api/cuenta/borrar')).POST;
const seguir = (await import('../src/pages/api/seguir')).POST;
const avisos = (await import('../src/pages/api/avisos/index')).POST;
const preferencias = (await import('../src/pages/api/avisos/preferencias')).POST;
const linkMio = (await import('../src/pages/api/links/mio')).GET;
const abrir = (await import('../src/pages/api/links/abrir')).POST;

beforeEach(() => base.reset());

describe('POST /api/perfil (migraciones 5 y 8)', () => {
  const p = (body: unknown) => llamar(perfil, pedido('/api/perfil', body));
  it('sin sesión → 401', async () => {
    base.usuario = null;
    expect((await p({ mostrar_ficha: true })).status).toBe(401);
  });
  it('body roto, dato desconocido o vacío → 400', async () => {
    expect((await llamar(perfil, pedido('/api/perfil', undefined, { crudo: '{', metodo: 'POST' }))).status).toBe(400);
    expect((await p({ es_admin: true })).status).toBe(400);
    expect((await p({ nombre_mostrar: 'A' })).status).toBe(400);
    expect((await p({})).status).toBe(400);
    expect(base.llamadas).toHaveLength(0);
  });
  it('guarda el nombre (limpio) en la cuenta y en la sesión', async () => {
    expect((await p({ nombre_mostrar: '  Sofi   R. ' })).status).toBe(200);
    const u = base.de('perfiles', 'upsert')[0];
    expect(u.cliente).toBe('sesion');
    expect(u.pasos[0][1][0]).toEqual({ user_id: 'u-1', nombre_mostrar: 'Sofi R.' });
    expect(base.nombreSesion).toEqual([{ data: { nombre_mostrar: 'Sofi R.' } }]);
  });
  it('años de cursada sin repetir y ordenados; pausar "¿Cómo te fue?" 30 días', async () => {
    await p({ anios_cursada: [3, 1, 3], pausar_como_te_fue: true });
    const fila: any = base.de('perfiles', 'upsert')[0].pasos[0][1][0];
    expect(fila.anios_cursada).toEqual([1, 3]);
    const dias = (new Date(fila.como_te_fue_pausa_hasta).getTime() - Date.now()) / 86400000;
    expect(Math.round(dias)).toBe(30);
    expect(fila).not.toHaveProperty('pausar_como_te_fue');
  });
  it('foto "google": la URL la guarda el servidor (clave de servicio); otra foto la borra', async () => {
    base.usuario = { id: 'u-1', user_metadata: { avatar_url: 'https://lh3.googleusercontent.com/a/x' } };
    await p({ foto: 'google' });
    const f = base.de('perfiles', 'update')[0];
    expect(f.cliente).toBe('admin');
    expect(f.pasos[0][1][0]).toEqual({ foto_url: 'https://lh3.googleusercontent.com/a/x' });
    expect(tiene(f, 'eq', 'user_id', 'u-1')).toBe(true);
    expect((base.de('perfiles', 'upsert')[0].pasos[0][1][0] as any).dibujo).toBeNull();

    base.reset();
    await p({ foto: 'inicial' });
    expect(base.de('perfiles', 'update')[0].pasos[0][1][0]).toEqual({ foto_url: null });
  });
  it('una URL de foto que no es https no se guarda', async () => {
    base.usuario = { id: 'u-1', user_metadata: { avatar_url: 'javascript:alert(1)' } };
    await p({ foto: 'google' });
    expect(base.de('perfiles', 'update')[0].pasos[0][1][0]).toEqual({ foto_url: null });
  });
  it('cuenta bloqueada → 403; otro error → 500', async () => {
    base.respuestas['perfiles.upsert'] = { error: { code: 'UB001' } };
    const r = await p({ nombre_mostrar: 'Sofía' });
    expect(r.status).toBe(403);
    expect(r.body.error).toContain('bloqueada');
    base.respuestas['perfiles.upsert'] = { error: { code: 'XX000', message: 'x' } };
    expect((await p({ nombre_mostrar: 'Sofía' })).status).toBe(500);
  });
});

describe('POST /api/cuenta/borrar (migración 5)', () => {
  const b = (body: unknown) => llamar(borrar, pedido('/api/cuenta/borrar', body));
  it('sin sesión → 401; sin escribir BORRAR o sin elegir → 400', async () => {
    base.usuario = null;
    expect((await b({ resenas: 'anonimas', confirmacion: 'BORRAR' })).status).toBe(401);
    base.reset();
    expect((await b({ resenas: 'anonimas', confirmacion: 'borrar' })).status).toBe(400);
    expect((await b({ confirmacion: 'BORRAR' })).status).toBe(400);
    expect(base.llamadas).toHaveLength(0);
  });
  it('dejando lo publicado como anónimo: no borra reseñas, anonimiza y borra la cuenta', async () => {
    expect((await b({ resenas: 'anonimas', confirmacion: 'BORRAR' })).status).toBe(200);
    expect(base.de('resenas', 'delete')).toHaveLength(0);
    expect(base.de('rpc', 'anonimizar_usuario')[0].pasos[0][1][0]).toEqual({ p_user: 'u-1' });
    expect(base.de('auth', 'deleteUser')[0].pasos[0][1]).toEqual(['u-1']);
  });
  it('borrando todo: borra reseñas y finales propios antes de la cuenta', async () => {
    expect((await b({ resenas: 'borrar', confirmacion: 'BORRAR' })).status).toBe(200);
    expect(tiene(base.de('resenas', 'delete')[0], 'eq', 'user_id', 'u-1')).toBe(true);
    expect(tiene(base.de('experiencias_finales', 'delete')[0], 'eq', 'user_id', 'u-1')).toBe(true);
    expect(base.de('auth', 'deleteUser')).toHaveLength(1);
  });
  it('si falla anonimizar no borra la cuenta (500)', async () => {
    base.respuestas['rpc.anonimizar_usuario'] = { error: { message: 'x' } };
    const r = await b({ resenas: 'anonimas', confirmacion: 'BORRAR' });
    expect(r.status).toBe(500);
    expect(r.body.error).toContain('sigue como estaba');
    expect(base.de('auth', 'deleteUser')).toHaveLength(0);
  });
});

describe('POST /api/seguir (migración 6)', () => {
  const s = (body: unknown) => llamar(seguir, pedido('/api/seguir', body));
  it('sin sesión → 401; materia inválida o nada para cambiar → 400', async () => {
    base.usuario = null;
    expect((await s({ materia_id: 1, seguir: true })).status).toBe(401);
    base.reset();
    expect((await s({ materia_id: 'x', seguir: true })).status).toBe(400);
    expect((await s({ materia_id: 1 })).status).toBe(400);
  });
  it('seguir guarda a nombre propio; repetido no es error; materia inexistente → 404', async () => {
    const r = await s({ materia_id: 4, seguir: true });
    expect(r.body).toEqual({ success: true, sigue: true });
    expect(base.de('seguimientos', 'insert')[0].pasos[0][1][0]).toEqual({ user_id: 'u-1', materia_id: 4, mail: false });
    base.respuestas['seguimientos.insert'] = { error: { code: '23505' } };
    expect((await s({ materia_id: 4, seguir: true })).status).toBe(200);
    base.respuestas['seguimientos.insert'] = { error: { code: '23503' } };
    expect((await s({ materia_id: 999, seguir: true })).status).toBe(404);
  });
  it('dejar de seguir y cambiar el mail tocan solo la fila propia', async () => {
    expect((await s({ materia_id: 4, seguir: false })).body).toEqual({ success: true, sigue: false });
    const d = base.de('seguimientos', 'delete')[0];
    expect(tiene(d, 'eq', 'user_id', 'u-1') && tiene(d, 'eq', 'materia_id', 4)).toBe(true);
    expect((await s({ materia_id: 4, mail: false })).status).toBe(200);
    const u = base.de('seguimientos', 'update')[0];
    expect(u.pasos[0][1][0]).toEqual({ mail: false });
    expect(tiene(u, 'eq', 'user_id', 'u-1')).toBe(true);
  });
});

describe('POST /api/avisos y /api/avisos/preferencias (migración 7)', () => {
  const a = (body: unknown) => llamar(avisos, pedido('/api/avisos', body));
  const pr = (body: unknown) => llamar(preferencias, pedido('/api/avisos/preferencias', body));
  it('sin sesión → 401', async () => {
    base.usuario = null;
    expect((await a({ accion: 'leer' })).status).toBe(401);
    expect((await pr({ tipos: ['te_sirvio'], activo: false })).status).toBe(401);
  });
  it('marcar todos como leídos: solo los propios sin leer', async () => {
    expect((await a({ accion: 'leer' })).status).toBe(200);
    const u = base.de('notificaciones', 'update')[0];
    expect(tiene(u, 'eq', 'user_id', 'u-1') && tiene(u, 'is', 'leida_at', null)).toBe(true);
    expect(tiene(u, 'eq', 'id')).toBe(false);
  });
  it('marcar uno y borrar uno; borrar sin id o acción rara → 400', async () => {
    await a({ accion: 'leer', id: 3 });
    expect(tiene(base.de('notificaciones', 'update')[0], 'eq', 'id', 3)).toBe(true);
    expect((await a({ accion: 'borrar', id: 3 })).status).toBe(200);
    const d = base.de('notificaciones', 'delete')[0];
    expect(tiene(d, 'eq', 'user_id', 'u-1') && tiene(d, 'eq', 'id', 3)).toBe(true);
    expect((await a({ accion: 'borrar' })).status).toBe(400);
    expect((await a({ accion: 'vaciar' })).status).toBe(400);
  });
  it('preferencias: apaga un tipo por canal; los pedidos de la moderación no se apagan', async () => {
    expect((await pr({ tipos: ['resena_nueva', 'final_nuevo'], canal: 'mail', activo: false })).status).toBe(200);
    const filas: any[] = base.de('preferencias_aviso', 'upsert')[0].pasos[0][1][0] as any;
    expect(filas.map((f) => [f.user_id, f.tipo, f.canal, f.activo])).toEqual([['u-1', 'resena_nueva', 'mail', false], ['u-1', 'final_nuevo', 'mail', false]]);
    expect((await pr({ tipos: ['pedido_edicion'], activo: false })).status).toBe(400);
    expect((await pr({ tipos: ['te_sirvio'], canal: 'paloma', activo: false })).status).toBe(400);
  });
});

describe('Links compartidos (migración 9)', () => {
  it('GET /api/links/mio: sin sesión → { codigo: null }', async () => {
    base.usuario = null;
    expect((await llamar(linkMio, pedido('/api/links/mio'))).body).toEqual({ codigo: null });
  });
  it('GET /api/links/mio: devuelve el que ya tiene, o crea uno', async () => {
    base.respuestas['links_compartidos.select'] = { data: { codigo: 'k7p2x' } };
    expect((await llamar(linkMio, pedido('/api/links/mio'))).body).toEqual({ codigo: 'k7p2x' });
    expect(base.de('links_compartidos', 'insert')).toHaveLength(0);

    base.reset();
    const r = await llamar(linkMio, pedido('/api/links/mio'));
    expect(r.body.codigo).toMatch(/^[a-z0-9]{5}$/);
    expect(base.de('links_compartidos', 'insert')[0].pasos[0][1][0]).toEqual({ codigo: r.body.codigo, user_id: 'u-1' });
  });
  const ab = (body: unknown) => llamar(abrir, pedido('/api/links/abrir', body));
  const BIEN = { codigo: 'k7p2x', visitante: 'v-12345678', ruta: '/dictado/2' };
  it('POST /api/links/abrir: código, visitante o ruta inválidos → 400', async () => {
    expect((await ab({ ...BIEN, codigo: 'K7!' })).status).toBe(400);
    expect((await ab({ ...BIEN, visitante: 'corto' })).status).toBe(400);
    expect((await ab({ ...BIEN, ruta: 'https://otro.sitio' })).status).toBe(400);
  });
  it('POST /api/links/abrir: el código de otra persona suma una apertura (una por visitante)', async () => {
    base.usuario = null;
    base.respuestas['links_compartidos.select'] = { data: { user_id: 'u-2' } };
    expect((await ab(BIEN)).body).toEqual({ ok: true });
    const u = base.de('aperturas_link', 'upsert')[0];
    expect(u.pasos[0][1]).toEqual([{ codigo: 'k7p2x', visitante: 'v-12345678', ruta: '/dictado/2' }, { onConflict: 'codigo,visitante', ignoreDuplicates: true }]);
  });
  it('POST /api/links/abrir: el código propio o uno que no existe no suma', async () => {
    base.respuestas['links_compartidos.select'] = { data: { user_id: 'u-1' } };
    expect((await ab(BIEN)).body).toEqual({ ok: false });
    base.respuestas['links_compartidos.select'] = { data: null };
    expect((await ab(BIEN)).body).toEqual({ ok: false });
    expect(base.de('aperturas_link')).toHaveLength(0);
  });
  it('POST /api/links/abrir: demasiadas aperturas desde una IP → 429', async () => {
    base.respuestas['rpc.check_rate_limit'] = { data: false };
    expect((await ab(BIEN)).status).toBe(429);
  });
});
