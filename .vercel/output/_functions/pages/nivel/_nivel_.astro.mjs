import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute, l as Fragment } from '../../chunks/astro/server_Cd2165UI.mjs';
import 'piccolore';
import { a as $$Layout, $ as $$HeaderNav } from '../../chunks/HeaderNav_BRe9A8mI.mjs';
import { s as supabase } from '../../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$nivel = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$nivel;
  const user = Astro2.locals.user;
  const { nivel } = Astro2.params;
  const nivelNum = parseInt(nivel || "1");
  if (isNaN(nivelNum) || nivelNum < 1 || nivelNum > 5) {
    return Astro2.redirect("/");
  }
  const { data: materias, error } = await supabase.from("materias").select("id, nombre, nivel").eq("nivel", nivelNum).order("nombre");
  if (error) console.error("Error trayendo materias:", error.message);
  const materiaIds = materias?.map((m) => m.id) || [];
  const materiaStats = {};
  if (materiaIds.length > 0) {
    const { data: resenas } = await supabase.from("resenas").select("calificacion_general, dictados!inner(materia_id)").in("dictados.materia_id", materiaIds);
    if (resenas) {
      resenas.forEach((r) => {
        const mid = r.dictados?.materia_id;
        if (!mid) return;
        if (!materiaStats[mid]) materiaStats[mid] = { promedio: 0, count: 0 };
        materiaStats[mid].count++;
        materiaStats[mid].promedio += r.calificacion_general;
      });
      Object.keys(materiaStats).forEach((id) => {
        const s = materiaStats[Number(id)];
        s.promedio = s.count > 0 ? s.promedio / s.count : 0;
      });
    }
  }
  const nivelesInfo = {
    1: { label: "1er A\xF1o", color: "from-blue-500 to-blue-600" },
    2: { label: "2do A\xF1o", color: "from-green-500 to-green-600" },
    3: { label: "3er A\xF1o", color: "from-orange-500 to-orange-600" },
    4: { label: "4to A\xF1o", color: "from-red-500 to-red-600" },
    5: { label: "5to A\xF1o", color: "from-purple-500 to-purple-600" }
  };
  const infoNivel = nivelesInfo[nivelNum];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `Materias de ${infoNivel.label} - UTN REP` }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<header${addAttribute(`bg-gradient-to-r ${infoNivel.color} text-white relative overflow-hidden`, "class")}> <div class="absolute inset-0 dot-pattern opacity-30"></div> <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 lg:pb-12"> ${renderComponent($$result2, "HeaderNav", $$HeaderNav, { "user": user })} <div class="flex items-center gap-4"> <div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center"> <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> </div> <div> <h1 class="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight"> ${infoNivel.label} </h1> <p class="text-white/80 mt-2"> ${materias?.length || 0} materias encontradas
</p> </div> </div> </div> </header> <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"> ${materias && materias.length > 0 ? renderTemplate`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> ${materias.map((materia) => {
    const stats = materiaStats[materia.id];
    const hasReviews = stats && stats.count > 0;
    return renderTemplate`<a${addAttribute(`/materia/${materia.id}?from=nivel`, "href")} class="group bg-[#242424] p-5 sm:p-6 rounded-2xl border border-neutral-700/60 hover:border-amber-300 hover:shadow-xl transition-all duration-300"> <div class="flex items-start justify-between gap-4"> <div class="flex-1 min-w-0"> <h3 class="font-heading font-bold text-white group-hover:text-amber-400 transition-colors"> ${materia.nombre} </h3> <div class="flex items-center gap-2 mt-2"> ${hasReviews ? renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <span class="text-xs text-amber-400 flex items-center gap-1 font-semibold"> <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg> ${stats.promedio.toFixed(1)} </span> <span class="text-xs text-neutral-500">
· ${stats.count} reseña${stats.count !== 1 ? "s" : ""} </span> ` })}` : renderTemplate`<span class="text-xs text-neutral-500">Sin reseñas aún</span>`} </div> </div> <svg class="w-5 h-5 text-neutral-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path> </svg> </div> </a>`;
  })} </div>` : renderTemplate`<div class="text-center py-16"> <div class="flex justify-center mb-4"> <svg class="w-16 h-16 text-neutral-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg> </div> <h2 class="text-xl font-heading font-bold text-neutral-300 mb-2">No hay materias cargadas</h2> <p class="text-neutral-500">Todavía no hay materias registradas para este nivel.</p> </div>`} <!-- Navegación entre niveles --> <nav class="mt-12 pt-8 border-t border-neutral-700"> <h3 class="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Otros niveles</h3> <div class="flex flex-wrap gap-3"> ${[1, 2, 3, 4, 5].filter((n) => n !== nivelNum).map((n) => renderTemplate`<a${addAttribute(`/nivel/${n}`, "href")}${addAttribute(`bg-gradient-to-br ${nivelesInfo[n].color} text-white px-4 py-2 rounded-xl font-semibold hover:scale-105 transition-all shadow-md flex items-center gap-1.5`, "class")}> <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> ${nivelesInfo[n].label} </a>`)} </div> </nav> </main> ` })}`;
}, "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/nivel/[nivel].astro", void 0);

const $$file = "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/nivel/[nivel].astro";
const $$url = "/nivel/[nivel]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$nivel,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
