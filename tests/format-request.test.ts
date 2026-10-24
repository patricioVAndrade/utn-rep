import { describe, expect, it } from 'vitest';
import { estrellas, nivelColor, tiempoRelativo } from '../src/lib/format';
import { getClientIp } from '../src/lib/request';

const DIA = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-24T12:00:00Z').getTime();
const hace = (ms: number) => new Date(NOW - ms).toISOString();

describe('tiempoRelativo', () => {
  it.each([
    [0, 'Hoy'],
    [DIA, 'Ayer'],
    [5 * DIA, 'Hace 5 días'],
    [31 * DIA, 'Hace 1 mes'],
    [65 * DIA, 'Hace 2 meses'],
    [400 * DIA, 'Hace 1 año'],
    [800 * DIA, 'Hace 2 años'],
  ])('%i ms atrás → %s', (ms, esperado) => {
    expect(tiempoRelativo(hace(ms), NOW)).toBe(esperado);
  });
});

describe('estrellas', () => {
  it('redondea y limita entre 0 y 5', () => {
    expect(estrellas(3.6)).toBe('★★★★☆');
    expect(estrellas(9)).toBe('★★★★★');
    expect(estrellas(-1)).toBe('☆☆☆☆☆');
  });
});

describe('nivelColor', () => {
  it('cae al nivel 1 si no existe', () => {
    expect(nivelColor(9)).toBe(nivelColor(1));
    expect(nivelColor(undefined).label).toBe('1er Año');
  });
});

describe('getClientIp', () => {
  const req = (headers: Record<string, string>) => new Request('https://utnrep.app/', { headers });

  it('prefiere x-real-ip, después el primer x-forwarded-for', () => {
    expect(getClientIp(req({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1');
    expect(getClientIp(req({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2');
  });

  it('usa clientAddress o "unknown" como último recurso', () => {
    expect(getClientIp(req({}), '4.4.4.4')).toBe('4.4.4.4');
    expect(getClientIp(req({}))).toBe('unknown');
  });
});
