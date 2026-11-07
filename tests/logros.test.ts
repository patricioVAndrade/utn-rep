import { describe, expect, it } from 'vitest';
import { progresoRango, rango } from '../src/lib/logros';

describe('rango', () => {
  it('sale de contar reseñas', () => {
    expect(rango(0)).toBeNull();
    expect(rango(1)?.nombre).toBe('Ingresante');
    expect(rango(2)?.nombre).toBe('Cursante');
    expect(rango(4)?.nombre).toBe('Cursante');
    expect(rango(5)?.nombre).toBe('Referente');
    expect(rango(14)?.nombre).toBe('Referente');
    expect(rango(15)?.nombre).toBe('Leyenda');
  });
  it('dice cuánto falta para el próximo', () => {
    expect(progresoRango(4)).toMatchObject({ faltan: 1, pct: 80, siguiente: { nombre: 'Referente' } });
    expect(progresoRango(0)).toMatchObject({ faltan: 1, pct: 0 });
    expect(progresoRango(20)).toMatchObject({ siguiente: null, pct: 100 });
  });
});
