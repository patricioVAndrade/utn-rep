// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://utnrep.app',
  // Astro solo confía en el Host / X-Forwarded-Host de la petición si el dominio
  // está en esta lista. Sin ella arma request.url con "https://localhost", y todo
  // lo que compara el origen del navegador contra el del servidor falla: el POST de
  // /api/auth/logout (chequeo de origen de Astro) y el CSRF de las acciones de admin.
  // Va solo `hostname` (sin `protocol`): con protocol Astro cae a http:// detrás de Vercel.
  security: {
    allowedDomains: [
      { hostname: 'utnrep.app' },
      { hostname: 'www.utnrep.app' },
      { hostname: '**.vercel.app' }, // deploys de Preview
    ],
  },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  }
});