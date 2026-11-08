import { describe, expect, it } from 'vitest';

// Migración 11: historial de profes en cada curso (desde / hasta), sin rol.
// El historial lo lleva la base sola (triggers); acá se prueba el texto que
// muestra el sitio. La parte de la base está en supabase/pruebas/migracion-11.sql.

const { cuatriDe, periodoTexto } = await import('../src/lib/profesores');

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
