import { beforeEach, describe, expect, it, vi } from 'vitest';

// Migración 10: contador "Hay X estudiantes en línea" (F13).
// La base cuenta visitantes de los últimos 5 minutos; el sitio lo muestra solo desde 5.

const rpc = vi.fn();
vi.mock('../src/lib/supabase-admin', () => ({ supabaseAdmin: { rpc } }));
const permitido = vi.fn(async () => true);
vi.mock('../src/lib/rate-limit', () => ({ checkRateLimit: permitido }));

const { MINIMO_EN_LINEA, textoEnLinea, enLinea, latido } = await import('../src/lib/en-linea');
const { POST } = await import('../src/pages/api/en-linea');

const pedir = (body: unknown) =>
  POST({
    request: new Request('http://x/api/en-linea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    clientAddress: '1.2.3.4',
  } as any);

describe('textoEnLinea', () => {
  it('no muestra nada con menos de 5 personas (para no exponer a nadie)', () => {
    expect(MINIMO_EN_LINEA).toBe(5);
    for (const n of [0, 1, 4]) expect(textoEnLinea(n)).toBeNull();
  });
  it('desde 5 dice cuántas hay, con separador de miles', () => {
    expect(textoEnLinea(5)).toBe('Hay 5 estudiantes en línea');
    expect(textoEnLinea(1284)).toBe('Hay 1.284 estudiantes en línea');
  });
  it('tiene una versión corta para el celular', () => {
    expect(textoEnLinea(23, true)).toBe('23 en línea');
    expect(textoEnLinea(3, true)).toBeNull();
  });
  it('ignora valores raros', () => {
    expect(textoEnLinea(Number.NaN)).toBeNull();
    expect(textoEnLinea(-8)).toBeNull();
  });
});

describe('enLinea y latido', () => {
  beforeEach(() => rpc.mockReset());

  it('enLinea pregunta a la base cuántos hay', async () => {
    rpc.mockResolvedValue({ data: 7, error: null });
    await expect(enLinea()).resolves.toBe(7);
    expect(rpc).toHaveBeenCalledWith('en_linea');
  });
  it('si la base falla, cuenta 0 (y no se muestra)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: 'no existe' } });
    await expect(enLinea()).resolves.toBe(0);
  });
  it('latido anota al visitante y devuelve el total', async () => {
    rpc.mockResolvedValue({ data: 12, error: null });
    await expect(latido('v-12345678')).resolves.toBe(12);
    expect(rpc).toHaveBeenCalledWith('latido', { p_visitante: 'v-12345678' });
  });
});

describe('POST /api/en-linea', () => {
  beforeEach(() => { rpc.mockReset(); permitido.mockResolvedValue(true); });

  it('rechaza un visitante inválido', async () => {
    const res = await pedir({ visitante: 'x' });
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rechaza un body que no es JSON', async () => {
    const res = await POST({ request: new Request('http://x', { method: 'POST', body: 'hola' }), clientAddress: '1.2.3.4' } as any);
    expect(res.status).toBe(400);
  });
  it('anota el latido y devuelve el número y el texto', async () => {
    rpc.mockResolvedValue({ data: 9, error: null });
    const res = await pedir({ visitante: 'v-abcdefgh' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ n: 9, texto: 'Hay 9 estudiantes en línea', corto: '9 en línea' });
  });
  it('con pocas personas no manda el número', async () => {
    rpc.mockResolvedValue({ data: 2, error: null });
    const res = await pedir({ visitante: 'v-abcdefgh' });
    expect(await res.json()).toEqual({ n: null, texto: null, corto: null });
  });
  it('frena a quien manda demasiados latidos', async () => {
    permitido.mockResolvedValue(false);
    const res = await pedir({ visitante: 'v-abcdefgh' });
    expect(res.status).toBe(429);
    expect(rpc).not.toHaveBeenCalled();
  });
});
