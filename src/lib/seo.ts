// Lo que necesita Google para mostrar bien el sitio: dirección canónica,
// qué páginas no se indexan y los datos estructurados comunes.

/**
 * El dominio que muestra Google (con www). Va en la dirección canónica, el
 * sitemap y robots.txt aunque el pedido llegue por utnrep.app o por un Preview,
 * para que Google junte todo en una sola dirección por página.
 */
export const DOMINIO = 'https://www.utnrep.app';

export function origenCanonico(_url?: URL): string {
  return DOMINIO;
}

/** La dirección sin parámetros (?de=, ?q=...) y sin barra final. */
export function urlCanonica(url: URL): string {
  const ruta = url.pathname.replace(/\/+$/, '') || '/';
  return origenCanonico(url) + ruta;
}

/** Un deploy que no es el de producción (Preview de Vercel o la compu) no se indexa. */
export function esSitioDePrueba(url: URL): boolean {
  return !/(^|\.)utnrep\.app$/i.test(url.hostname);
}

/** Organización y sitio, con el logo para Google. */
export function datosDelSitio(origen: string) {
  const organizacion = {
    '@type': 'Organization',
    '@id': `${origen}/#organizacion`,
    name: 'UTN REP',
    url: `${origen}/`,
    logo: { '@type': 'ImageObject', url: `${origen}/icono-512.png`, width: 512, height: 512 },
  };
  const sitio = {
    '@type': 'WebSite',
    '@id': `${origen}/#sitio`,
    name: 'UTN REP',
    alternateName: ['UTNREP', 'UTN REP FRC'],
    url: `${origen}/`,
    description: 'Opiniones y reseñas de estudiantes sobre cursos, materias y profesores de Ingeniería en Sistemas de la UTN FRC.',
    inLanguage: 'es-AR',
    publisher: { '@id': organizacion['@id'] },
  };
  return { '@context': 'https://schema.org', '@graph': [organizacion, sitio] };
}

/** Migas de pan para Google (las mismas de "Estás en:"). */
export function migasDePan(origen: string, crumbs: { label: string; href?: string }[], actual: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: c.href ? origen + c.href : actual,
    })),
  };
}

/** Para un JSON-LD dentro de <script>: que un "<" del texto no lo cierre. */
export const jsonLd = (dato: unknown) => JSON.stringify(dato).replace(/</g, '\\u003c');
