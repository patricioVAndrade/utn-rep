import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_lENYh_O5.mjs';
import { manifest } from './manifest_CgTxaLs-.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/api/auth/callback.astro.mjs');
const _page3 = () => import('./pages/api/auth/login.astro.mjs');
const _page4 = () => import('./pages/api/auth/logout.astro.mjs');
const _page5 = () => import('./pages/api/reportes.astro.mjs');
const _page6 = () => import('./pages/api/resenas/_id_.astro.mjs');
const _page7 = () => import('./pages/api/resenas.astro.mjs');
const _page8 = () => import('./pages/dictado/_id_.astro.mjs');
const _page9 = () => import('./pages/materia/_id_.astro.mjs');
const _page10 = () => import('./pages/nivel/_nivel_.astro.mjs');
const _page11 = () => import('./pages/nueva-resena.astro.mjs');
const _page12 = () => import('./pages/profesor/_id_.astro.mjs');
const _page13 = () => import('./pages/sitemap.xml.astro.mjs');
const _page14 = () => import('./pages/sobre.astro.mjs');
const _page15 = () => import('./pages/terminos.astro.mjs');
const _page16 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/api/auth/callback.ts", _page2],
    ["src/pages/api/auth/login.ts", _page3],
    ["src/pages/api/auth/logout.ts", _page4],
    ["src/pages/api/reportes.ts", _page5],
    ["src/pages/api/resenas/[id].ts", _page6],
    ["src/pages/api/resenas.ts", _page7],
    ["src/pages/dictado/[id].astro", _page8],
    ["src/pages/materia/[id].astro", _page9],
    ["src/pages/nivel/[nivel].astro", _page10],
    ["src/pages/nueva-resena.astro", _page11],
    ["src/pages/profesor/[id].astro", _page12],
    ["src/pages/sitemap.xml.ts", _page13],
    ["src/pages/sobre.astro", _page14],
    ["src/pages/terminos.astro", _page15],
    ["src/pages/index.astro", _page16]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "middlewareSecret": "5811c396-bf33-4bba-8566-e69cf2ea2f17",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
