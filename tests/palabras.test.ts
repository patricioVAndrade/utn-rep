import { describe, expect, it } from 'vitest';
import { encontrarPalabra, limpiarPalabra } from '../src/lib/palabras';

describe('encontrarPalabra', () => {
  const lista = ['boludo', 'no vayan', 'inútil'];

  it('encuentra palabras sin importar mayúsculas, acentos ni signos', () => {
    expect(encontrarPalabra('El profe es un BOLUDO.', lista)).toBe('boludo');
    expect(encontrarPalabra('Un inutil total', lista)).toBe('inútil');
    expect(encontrarPalabra('¡No   vayan! a esa comisión', lista)).toBe('no vayan');
  });

  it('no marca palabras que solo empiezan igual', () => {
    expect(encontrarPalabra('Fue una boludez de parcial', lista)).toBeNull();
    expect(encontrarPalabra('Muy buena cátedra', lista)).toBeNull();
    expect(encontrarPalabra('cualquier cosa', [])).toBeNull();
  });

  it('limpia lo que escribe el admin', () => {
    expect(limpiarPalabra('  No   Vayan ')).toBe('no vayan');
  });
});
