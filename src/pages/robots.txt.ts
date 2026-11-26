import type { APIRoute } from 'astro';
import { DOMINIO, esSitioDePrueba } from '../lib/seo';

/** GET /robots.txt. En los Preview no se deja indexar nada. */
export const GET: APIRoute = ({ url }) => {
  const texto = esSitioDePrueba(url)
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ${DOMINIO}/sitemap.xml\n`;
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
