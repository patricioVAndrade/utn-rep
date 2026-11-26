// Vista previa local con datos inventados, sin Supabase ni claves.
// Uso: npm run dev:mock   (con sesión de prueba: MOCK_USER=1 ADMIN_IDS=u-demo npm run dev:mock)
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const mock = fileURLToPath(new URL('./dev/mock/supabase-mock.ts', import.meta.url));

export default defineConfig({
  output: 'server',
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        { find: /^(\.\.?\/)+lib\/supabase$/, replacement: mock },
        { find: /^(\.\.?\/)+lib\/supabase-admin$/, replacement: mock },
        { find: /^\.\/supabase$/, replacement: mock },
        { find: /^\.\/supabase-admin$/, replacement: mock },
      ],
    },
  },
});
