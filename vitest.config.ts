import { getViteConfig } from 'astro/config';

// Los tipos de Astro 7 no conocen la clave `test` de Vitest; Vitest la lee igual.
export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
} as Parameters<typeof getViteConfig>[0]);
