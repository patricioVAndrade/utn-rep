import { describe, expect, it } from 'vitest';
import { formatearNombre, normalizarEmail, validarNombre } from '../src/lib/auth-validation';

describe('normalizarEmail', () => {
  it('quita puntos y alias en Gmail', () => {
    expect(normalizarEmail('Juan.Perez+utn@Gmail.com')).toEqual({ ok: true, email: 'juanperez@gmail.com' });
  });

  it('quita alias en otros dominios pero conserva los puntos', () => {
    expect(normalizarEmail('juan.perez+x@hotmail.com')).toEqual({ ok: true, email: 'juan.perez@hotmail.com' });
  });

  it('rechaza dominios no permitidos y formatos inválidos', () => {
    expect(normalizarEmail('juan@mailinator.com').ok).toBe(false);
    expect(normalizarEmail('no-es-un-email').ok).toBe(false);
    expect(normalizarEmail(undefined).ok).toBe(false);
  });

  it('rechaza locales con pinta de generados o muy cortos', () => {
    expect(normalizarEmail('xkcdqwrt@gmail.com').ok).toBe(false);
    expect(normalizarEmail('ana@gmail.com').ok).toBe(false);
  });
});

describe('validarNombre', () => {
  it('pide nombre y apellido con letras', () => {
    expect(validarNombre('María José')).toBeNull();
    expect(validarNombre('Juan')).toBe('Ingresá tu nombre y apellido.');
    expect(validarNombre('<b>Hack</b> er')).toBe('El nombre solo puede contener letras y espacios.');
    expect(validarNombre('ab')).toBe('El nombre debe tener entre 4 y 50 caracteres.');
  });
});

describe('formatearNombre', () => {
  it('capitaliza cada palabra', () => {
    expect(formatearNombre('  juan   PÉREZ ')).toBe('Juan Pérez');
  });
});
