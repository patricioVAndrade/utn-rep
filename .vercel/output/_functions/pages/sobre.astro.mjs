import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead } from '../chunks/astro/server_Cd2165UI.mjs';
import 'piccolore';
import { a as $$Layout, $ as $$HeaderNav } from '../chunks/HeaderNav_BRe9A8mI.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Sobre = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Sobre;
  const user = Astro2.locals.user;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Sobre UTN REP", "description": "Conoc\xE9 qu\xE9 es UTN REP, c\xF3mo funciona y qui\xE9n lo cre\xF3." }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<header class="bg-gradient-to-r from-stone-700 to-stone-900 text-white relative overflow-hidden"> <div class="absolute inset-0 dot-pattern opacity-30"></div> <div class="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 lg:pb-10"> ${renderComponent($$result2, "HeaderNav", $$HeaderNav, { "user": user })} <h1 class="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3"> <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
Sobre UTN REP
</h1> </div> </header> <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8"> <section class="bg-[#242424] rounded-2xl border border-neutral-700/60 p-6 sm:p-8"> <h2 class="font-heading font-bold text-xl text-neutral-100 mb-4">¿Qué es UTN REP?</h2> <div class="space-y-4 text-neutral-400 text-sm leading-relaxed"> <p> <strong class="text-neutral-200">UTN REP</strong> es una plataforma donde los estudiantes de
<strong class="text-neutral-200">Ingeniería en Sistemas de Información</strong> de la
<strong class="text-neutral-200">UTN — Facultad Regional Córdoba</strong> pueden compartir 
          sus experiencias sobre materias, cátedras y profesores.
</p> <p>
La idea es simple: que puedas elegir mejor tu cursada basándote en opiniones reales 
          de otros estudiantes que ya pasaron por ahí.
</p> </div> </section> <section class="bg-[#242424] rounded-2xl border border-neutral-700/60 p-6 sm:p-8"> <h2 class="font-heading font-bold text-xl text-neutral-100 mb-4">¿Cómo funciona?</h2> <div class="space-y-4 text-neutral-400 text-sm leading-relaxed"> <div class="flex gap-4 items-start"> <span class="flex-shrink-0 w-8 h-8 bg-amber-900/30 text-amber-400 rounded-lg flex items-center justify-center font-bold text-sm">1</span> <div> <p class="font-semibold text-neutral-200 mb-1">Explorá las materias</p> <p>Navegá por año de carrera o usá el buscador para encontrar una materia o profesor.</p> </div> </div> <div class="flex gap-4 items-start"> <span class="flex-shrink-0 w-8 h-8 bg-amber-900/30 text-amber-400 rounded-lg flex items-center justify-center font-bold text-sm">2</span> <div> <p class="font-semibold text-neutral-200 mb-1">Leé las reseñas</p> <p>Cada cátedra tiene reseñas con calificación (1-5 estrellas) y comentarios de estudiantes que ya cursaron.</p> </div> </div> <div class="flex gap-4 items-start"> <span class="flex-shrink-0 w-8 h-8 bg-amber-900/30 text-amber-400 rounded-lg flex items-center justify-center font-bold text-sm">3</span> <div> <p class="font-semibold text-neutral-200 mb-1">Compartí tu experiencia</p> <p>Iniciá sesión con Google o GitHub y escribí tu propia reseña. Tu nombre aparecerá junto a tu opinión.</p> </div> </div> </div> </section> <section class="bg-[#242424] rounded-2xl border border-neutral-700/60 p-6 sm:p-8"> <h2 class="font-heading font-bold text-xl text-neutral-100 mb-4">Consideraciones</h2> <div class="space-y-4 text-neutral-400 text-sm leading-relaxed"> <ul class="list-disc list-inside space-y-2"> <li>Las opiniones son <strong class="text-neutral-200">responsabilidad exclusiva de los usuarios</strong> que las publican.</li> <li>Las calificaciones no representan una evaluación oficial de la universidad ni de los docentes.</li> <li>Se espera <strong class="text-neutral-200">respeto y buena fe</strong> en todas las reseñas. No se toleran agresiones ni difamación.</li> <li>Nos reservamos el derecho de <strong class="text-neutral-200">moderar o eliminar</strong> contenido que viole estas normas.</li> </ul> </div> </section> <section class="bg-[#242424] rounded-2xl border border-neutral-700/60 p-6 sm:p-8"> <h2 class="font-heading font-bold text-xl text-neutral-100 mb-4">Creador</h2> <div class="flex items-center gap-4"> <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-lg">P</div> <div> <p class="font-semibold text-neutral-200">Patricio Valentín Andrade</p> <p class="text-sm text-neutral-500">Estudiante de Ingeniería en Sistemas — UTN FRC</p> <a href="https://github.com/patricioVAndrade" target="_blank" rel="noopener noreferrer" class="text-xs text-amber-400 hover:text-amber-300 transition-colors mt-1 inline-flex items-center gap-1"> <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"></path></svg>
GitHub
</a> </div> </div> </section> <div class="text-center"> <a href="/" class="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-semibold text-sm transition-colors"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
Volver al inicio
</a> </div> </main> ` })}`;
}, "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/sobre.astro", void 0);

const $$file = "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/sobre.astro";
const $$url = "/sobre";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Sobre,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
