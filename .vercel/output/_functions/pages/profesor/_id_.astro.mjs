import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../../chunks/astro/server_Cd2165UI.mjs';
import 'piccolore';
import { a as $$Layout, $ as $$HeaderNav } from '../../chunks/HeaderNav_BRe9A8mI.mjs';
import { s as supabase } from '../../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const user = Astro2.locals.user;
  const { id } = Astro2.params;
  const { data: profesor } = await supabase.from("profesores").select("id, nombre_completo").eq("id", id).single();
  if (!profesor) {
    return Astro2.redirect("/404");
  }
  const { data: dictadoProfesores } = await supabase.from("dictado_profesores").select(`
    dictados (
      id,
      materia_id,
      materias ( id, nombre, nivel ),
      cursos ( identificador, turno ),
      dictado_profesores (
        profesores ( nombre_completo )
      )
    )
  `).eq("profesor_id", id);
  const dictadosPorMateria = {};
  (dictadoProfesores || []).forEach((dp) => {
    const d = dp.dictados;
    if (!d || !d.materias) return;
    const mid = d.materias.id;
    if (!dictadosPorMateria[mid]) {
      dictadosPorMateria[mid] = { materia: d.materias, dictados: [] };
    }
    dictadosPorMateria[mid].dictados.push(d);
  });
  Object.values(dictadosPorMateria).forEach((group) => {
    group.dictados.sort((a, b) => a.cursos.identificador.localeCompare(b.cursos.identificador));
  });
  const materiasOrdenadas = Object.values(dictadosPorMateria).sort((a, b) => a.materia.nivel - b.materia.nivel);
  const dictadoIds = (dictadoProfesores || []).map((dp) => dp.dictados?.id).filter(Boolean);
  let dictadoStats = {};
  if (dictadoIds.length > 0) {
    const { data: resenas } = await supabase.from("resenas").select("calificacion_general, dictado_id").in("dictado_id", dictadoIds);
    if (resenas) {
      resenas.forEach((r) => {
        if (!dictadoStats[r.dictado_id]) dictadoStats[r.dictado_id] = { promedio: 0, count: 0 };
        dictadoStats[r.dictado_id].count++;
        dictadoStats[r.dictado_id].promedio += r.calificacion_general;
      });
      Object.keys(dictadoStats).forEach((did) => {
        const s = dictadoStats[Number(did)];
        s.promedio = s.count > 0 ? s.promedio / s.count : 0;
      });
    }
  }
  const allStats = Object.values(dictadoStats);
  const totalResenas = allStats.reduce((acc, s) => acc + s.count, 0);
  const promedioGeneral = totalResenas > 0 ? (allStats.reduce((acc, s) => acc + s.promedio * s.count, 0) / totalResenas).toFixed(1) : "0.0";
  const nivelColors = {
    1: { bg: "from-blue-500 to-blue-600", accent: "bg-blue-900/30 text-blue-400" },
    2: { bg: "from-green-500 to-green-600", accent: "bg-green-900/30 text-green-400" },
    3: { bg: "from-orange-500 to-orange-600", accent: "bg-orange-900/30 text-orange-400" },
    4: { bg: "from-red-500 to-red-600", accent: "bg-red-900/30 text-red-400" },
    5: { bg: "from-purple-500 to-purple-600", accent: "bg-purple-900/30 text-purple-400" }
  };
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `${profesor.nombre_completo} - UTN REP` }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<header class="bg-gradient-to-r from-stone-700 to-stone-900 text-white relative overflow-hidden"> <div class="absolute inset-0 dot-pattern opacity-30"></div> <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 lg:pb-12"> ${renderComponent($$result2, "HeaderNav", $$HeaderNav, { "user": user })} <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"> <div class="flex items-center gap-4"> <div class="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl font-bold"> ${profesor.nombre_completo.charAt(0)} </div> <div> <span class="text-sm font-medium text-white/60 uppercase tracking-wider">Profesor/a</span> <h1 class="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight"> ${profesor.nombre_completo} </h1> </div> </div> <div class="flex items-center gap-4"> <div class="bg-white/10 backdrop-blur rounded-2xl px-5 py-3 text-center"> <span class="text-2xl font-extrabold block">${materiasOrdenadas.length}</span> <span class="text-xs text-white/60 uppercase tracking-wider">Materia${materiasOrdenadas.length !== 1 ? "s" : ""}</span> </div> ${totalResenas > 0 && renderTemplate`<div class="bg-white/10 backdrop-blur rounded-2xl px-5 py-3 text-center"> <span class="text-2xl font-extrabold block">★ ${promedioGeneral}</span> <span class="text-xs text-white/60 uppercase tracking-wider">${totalResenas} reseña${totalResenas !== 1 ? "s" : ""}</span> </div>`} </div> </div> </div> </header> <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"> ${materiasOrdenadas.length > 0 ? renderTemplate`<div class="space-y-10"> ${materiasOrdenadas.map(({ materia, dictados }) => {
    const nColors = nivelColors[materia.nivel] || nivelColors[1];
    return renderTemplate`<section> <div class="flex items-center gap-3 mb-4"> <span${addAttribute(`text-xs font-bold ${nColors.accent} px-3 py-1 rounded-lg uppercase tracking-wide`, "class")}> ${materia.nivel}º Año
</span> <a${addAttribute(`/materia/${materia.id}`, "href")} class="text-lg sm:text-xl font-heading font-bold text-neutral-100 hover:text-amber-400 transition-colors"> ${materia.nombre} </a> </div> <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> ${dictados.map((d) => {
      const stats = dictadoStats[d.id];
      const hasReviews = stats && stats.count > 0;
      const otrosProfes = (d.dictado_profesores || []).map((dp) => dp.profesores.nombre_completo).filter((name) => name !== profesor.nombre_completo);
      return renderTemplate`<a${addAttribute(`/dictado/${d.id}`, "href")} class="bg-[#242424] rounded-2xl border border-neutral-700/60 p-5 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300 transition-all duration-300 block"> <div class="flex justify-between items-start mb-3"> <h3 class="font-heading font-extrabold text-2xl text-white">${d.cursos.identificador}</h3> <span${addAttribute(`text-xs font-bold ${nColors.accent} px-3 py-1 rounded-lg uppercase tracking-wide`, "class")}> ${d.cursos.turno} </span> </div> ${otrosProfes.length > 0 && renderTemplate`<div class="mb-3"> <p class="text-xs text-neutral-500 mb-1">También da clases:</p> <ul class="space-y-1"> ${otrosProfes.map((name) => renderTemplate`<li class="flex items-center gap-1.5 text-sm text-neutral-400"> <span class="w-1.5 h-1.5 bg-stone-300 rounded-full"></span> ${name} </li>`)} </ul> </div>`} <div class="pt-3 border-t border-neutral-700 flex justify-between items-center text-sm"> ${hasReviews ? renderTemplate`<span class="text-yellow-500 font-bold flex items-center gap-1"> <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg> ${stats.promedio.toFixed(1)} <span class="text-neutral-500 font-medium text-xs ml-1">(${stats.count})</span> </span>` : renderTemplate`<span class="text-neutral-500 font-medium text-xs">Sin reseñas</span>`} <span class="text-amber-400 font-semibold text-sm">
Ver Reseñas →
</span> </div> </a>`;
    })} </div> </section>`;
  })} </div>` : renderTemplate`<div class="text-center py-16"> <div class="flex justify-center mb-4"> <svg class="w-16 h-16 text-neutral-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg> </div> <h2 class="text-xl font-heading font-bold text-neutral-300 mb-2">Sin cursos asignados</h2> <p class="text-neutral-500">Este profesor no tiene cursos asignados actualmente.</p> </div>`} </main> ` })}`;
}, "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/profesor/[id].astro", void 0);

const $$file = "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/profesor/[id].astro";
const $$url = "/profesor/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
