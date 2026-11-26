// Arma los íconos PNG que usa Google (resultados de búsqueda) y los celulares
// a partir de public/favicon.svg. Uso: node scripts/iconos/armar.mjs
// Google pide un ícono cuadrado de 48 px o múltiplo (48, 96, 144, 192...).
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync('public/favicon.svg', 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/, '');
for (const [lado, archivo] of [[48, 'favicon-48x48.png'], [96, 'favicon-96x96.png'], [192, 'icono-192.png'], [512, 'icono-512.png']]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: lado } }).render().asPng();
  writeFileSync(`public/${archivo}`, png);
  console.log(archivo, png.length, 'bytes');
}
