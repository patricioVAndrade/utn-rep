import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead } from '../chunks/astro/server_Cd2165UI.mjs';
import 'piccolore';
import { $ as $$HeaderNav, a as $$Layout } from '../chunks/HeaderNav_BRe9A8mI.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$404 = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$404;
  const user = Astro2.locals.user;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "P\xE1gina no encontrada - UTN REP" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<header class="bg-gradient-to-r from-stone-700 to-stone-900 text-white relative overflow-hidden"> <div class="absolute inset-0 dot-pattern opacity-30"></div> <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8"> ${renderComponent($$result2, "HeaderNav", $$HeaderNav, { "user": user })} <h1 class="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight">
404
</h1> </div> </header> <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center"> <div class="flex justify-center mb-6"> <svg class="w-20 h-20 text-neutral-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> </div> <h2 class="text-2xl sm:text-3xl font-heading font-bold text-neutral-100 mb-4">Página no encontrada</h2> <p class="text-neutral-500 mb-8 max-w-md mx-auto">
La página que buscás no existe o fue movida. Probá buscando desde el inicio.
</p> <a href="/" class="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all shadow-lg"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path> </svg>
Ir al Inicio
</a> </main> ` })}`;
}, "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/404.astro", void 0);

const $$file = "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
