import { describe, expect, it } from 'vitest';
import { safeReturnTo } from '../src/lib/redirect';

describe('safeReturnTo', () => {
  it('acepta rutas relativas del sitio', () => {
    expect(safeReturnTo('/dictado/12')).toBe('/dictado/12');
    expect(safeReturnTo('/nueva-resena?dictado=3&from=/dictado/3')).toBe('/nueva-resena?dictado=3&from=/dictado/3');
  });

  it('decodifica valores que vienen de cookies', () => {
    expect(safeReturnTo(encodeURIComponent('/materia/5?x=1'))).toBe('/materia/5?x=1');
  });

  it('rechaza URLs absolutas y protocol-relative (open redirect)', () => {
    expect(safeReturnTo('https://evil.com')).toBe('/');
    expect(safeReturnTo('//evil.com')).toBe('/');
    expect(safeReturnTo(encodeURIComponent('//evil.com'))).toBe('/');
    expect(safeReturnTo('/\\evil.com')).toBe('/');
    expect(safeReturnTo('javascript:alert(1)')).toBe('/');
  });

  it('rechaza caracteres de control y encoding inválido', () => {
    expect(safeReturnTo('/\tevil')).toBe('/');
    expect(safeReturnTo('%E0%A4%A')).toBe('/');
  });

  it('usa el fallback cuando no hay valor', () => {
    expect(safeReturnTo(null)).toBe('/');
    expect(safeReturnTo('', '/inicio')).toBe('/inicio');
  });
});
