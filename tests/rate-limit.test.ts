import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../src/lib/supabase-admin', () => ({ supabaseAdmin: { rpc } }));

const { checkMemoryRateLimit, checkRateLimit } = await import('../src/lib/rate-limit');

describe('checkMemoryRateLimit', () => {
  it('permite hasta el límite y se resetea al vencer la ventana', () => {
    const key = `test:${Math.random()}`;
    expect(checkMemoryRateLimit(key, 2, 1000, 0)).toBe(true);
    expect(checkMemoryRateLimit(key, 2, 1000, 10)).toBe(true);
    expect(checkMemoryRateLimit(key, 2, 1000, 20)).toBe(false);
    expect(checkMemoryRateLimit(key, 2, 1000, 1001)).toBe(true);
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => rpc.mockReset());

  it('usa la RPC de Postgres con la ventana en segundos', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(checkRateLimit('login:1.1.1.1', 5, 60_000)).resolves.toBe(false);
    expect(rpc).toHaveBeenCalledWith('check_rate_limit', { p_key: 'login:1.1.1.1', p_limit: 5, p_window_seconds: 60 });
  });

  it('cae al límite en memoria si la RPC falla', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    const key = `fallback:${Math.random()}`;
    await expect(checkRateLimit(key, 1, 60_000)).resolves.toBe(true);
    await expect(checkRateLimit(key, 1, 60_000)).resolves.toBe(false);
  });
});
