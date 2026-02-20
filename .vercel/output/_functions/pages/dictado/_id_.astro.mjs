import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute, l as Fragment, n as renderScript } from '../../chunks/astro/server_Cd2165UI.mjs';
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
  const { data: dictado, error } = await supabase.from("dictados").select(`
    id, curso_id, materia_id,
    cursos ( identificador, anio_carrera, turno ),
    materias ( id, nombre, nivel ),
    dictado_profesores (
      profesores ( id, nombre_completo )
    )
  `).eq("id", id).single();
  if (error || !dictado) {
    return Astro2.redirect("/404");
  }
  const { data: resenas } = await supabase.from("resenas").select("*").eq("dictado_id", id).order("created_at", { ascending: false });
  const resenasData = resenas || [];
  const totalResenas = resenasData.length;
  let promedio = 0;
  let distribucion = [0, 0, 0, 0, 0];
  if (totalResenas > 0) {
    const suma = resenasData.reduce((acc, r) => acc + r.calificacion_general, 0);
    promedio = suma / totalResenas;
    resenasData.forEach((r) => {
      const idx = Math.min(Math.max(Math.round(r.calificacion_general) - 1, 0), 4);
      distribucion[idx]++;
    });
  }
  const nivelColors = {
    1: { bg: "from-blue-500 to-blue-600", light: "text-blue-200", accent: "bg-blue-900/30 text-blue-400", badge: "bg-blue-500" },
    2: { bg: "from-green-500 to-green-600", light: "text-green-200", accent: "bg-green-900/30 text-green-400", badge: "bg-green-500" },
    3: { bg: "from-orange-500 to-orange-600", light: "text-orange-200", accent: "bg-orange-900/30 text-orange-400", badge: "bg-orange-500" },
    4: { bg: "from-red-500 to-red-600", light: "text-red-200", accent: "bg-red-900/30 text-red-400", badge: "bg-red-500" },
    5: { bg: "from-purple-500 to-purple-600", light: "text-purple-200", accent: "bg-purple-900/30 text-purple-400", badge: "bg-purple-500" }
  };
  const nivel = dictado?.materias?.nivel || 1;
  const colors = nivelColors[nivel] || nivelColors[1];
  function estrellas(n) {
    return "\u2605".repeat(Math.round(n)) + "\u2606".repeat(5 - Math.round(n));
  }
  function tiempoRelativo(fecha) {
    const diff = Date.now() - new Date(fecha).getTime();
    const dias = Math.floor(diff / (1e3 * 60 * 60 * 24));
    if (dias === 0) return "Hoy";
    if (dias === 1) return "Ayer";
    if (dias < 30) return `Hace ${dias} d\xEDas`;
    if (dias < 365) return `Hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? "es" : ""}`;
    return `Hace ${Math.floor(dias / 365)} a\xF1o${Math.floor(dias / 365) > 1 ? "s" : ""}`;
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `${dictado?.cursos?.identificador} - ${dictado?.materias?.nombre} - UTN REP`, "hasFloatingButton": totalResenas > 0 }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<header${addAttribute(`bg-gradient-to-r ${colors.bg} text-white relative overflow-hidden`, "class")}> <div class="absolute inset-0 dot-pattern opacity-30"></div> <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 lg:pb-12"> ${renderComponent($$result2, "HeaderNav", $$HeaderNav, { "user": user })} <a${addAttribute(`/materia/${dictado?.materias?.id}?from=nivel`, "href")}${addAttribute(`inline-flex items-center gap-2 ${colors.light} hover:text-white mb-2 transition-colors text-sm`, "class")}> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path> </svg>
Volver a ${dictado?.materias?.nombre} </a> <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"> <div> <span${addAttribute(`text-sm font-medium ${colors.light} uppercase tracking-wider`, "class")}> ${dictado?.materias?.nombre} · ${nivel}º Año
</span> <h1 class="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight mt-1"> ${dictado?.cursos?.identificador} </h1> <span class="inline-block mt-2 text-sm font-semibold bg-white/20 backdrop-blur px-3 py-1 rounded-lg uppercase tracking-wide">
Turno ${dictado?.cursos?.turno} </span> </div> ${totalResenas > 0 && renderTemplate`<div class="flex items-center gap-3 bg-white/10 backdrop-blur rounded-2xl px-5 py-4"> <span class="text-4xl font-extrabold">${promedio.toFixed(1)}</span> <div> <div class="text-yellow-300 text-lg tracking-wide">${estrellas(promedio)}</div> <p class="text-white/70 text-sm">${totalResenas} reseña${totalResenas !== 1 ? "s" : ""}</p> </div> </div>`} </div> </div> </header> <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"> <div class="grid grid-cols-1 lg:grid-cols-3 gap-8"> <!-- Sidebar --> <div class="lg:col-span-1 space-y-6"> <!-- Equipo Docente --> <div class="bg-[#242424] rounded-2xl border border-neutral-700/60 p-6"> <h3 class="font-heading font-bold text-neutral-100 mb-4 flex items-center gap-2"> <span class="text-lg"><svg class="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></span> Equipo Docente
</h3> <ul class="space-y-3"> ${dictado?.dictado_profesores?.map((dp) => renderTemplate`<li class="flex items-center gap-3"> <div${addAttribute(`w-9 h-9 ${colors.badge} rounded-full flex items-center justify-center text-white font-bold text-sm`, "class")}> ${dp.profesores.nombre_completo.charAt(0)} </div> <span class="text-sm font-medium text-neutral-300">${dp.profesores.nombre_completo}</span> </li>`)} ${(!dictado?.dictado_profesores || dictado.dictado_profesores.length === 0) && renderTemplate`<li class="text-neutral-500 italic text-sm">Sin profesores asignados</li>`} </ul> </div> <!-- Distribución --> ${totalResenas > 0 && renderTemplate`<div class="bg-[#242424] rounded-2xl border border-neutral-700/60 p-6"> <h3 class="font-heading font-bold text-neutral-100 mb-4 flex items-center gap-2"> <span class="text-lg"><svg class="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></span> Distribución
</h3> <div class="space-y-2"> ${[5, 4, 3, 2, 1].map((star) => {
    const count = distribucion[star - 1];
    const pct = totalResenas > 0 ? count / totalResenas * 100 : 0;
    return renderTemplate`<div class="flex items-center gap-3 text-sm"> <span class="w-4 text-right font-medium text-neutral-400">${star}</span> <span class="text-yellow-500">★</span> <div class="flex-1 bg-neutral-800 rounded-full h-2.5 overflow-hidden"> <div${addAttribute(`h-full ${colors.badge} rounded-full transition-all`, "class")}${addAttribute(`width: ${pct}%`, "style")}></div> </div> <span class="w-8 text-right text-neutral-500 text-xs">${count}</span> </div>`;
  })} </div> </div>`} <!-- Botón escribir reseña (desktop) --> ${totalResenas > 0 && renderTemplate`<div class="hidden lg:block"> <a${addAttribute(`/nueva-resena?dictado=${id}&from=/dictado/${id}`, "href")}${addAttribute(`w-full bg-gradient-to-r ${colors.bg} hover:opacity-90 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2`, "class")}> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"> <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.71 3.71 1.159-1.157a2.625 2.625 0 000-3.711z"></path> <path d="M10.74 15.394l6.5-6.5-3.71-3.71-6.5 6.5a1.5 1.5 0 00-.4.73l-.84 4.2a.75.75 0 00.916.916l4.2-.84a1.5 1.5 0 00.73-.4z"></path> </svg>
Escribir una reseña
</a> </div>`} </div> <!-- Reseñas --> <div class="lg:col-span-2"> <div class="flex items-center justify-between mb-6"> <h2 class="text-xl sm:text-2xl font-heading font-bold text-neutral-100 flex items-center gap-3"> <span class="bg-amber-900/30 text-amber-400 p-2 rounded-xl"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></span>
Reseñas
${totalResenas > 0 && renderTemplate`<span class="text-sm font-normal text-neutral-500">(${totalResenas})</span>`} </h2> ${totalResenas > 1 && renderTemplate`<select id="sort-select" class="text-sm border border-neutral-700 rounded-xl px-3 py-2 bg-[#242424] text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-300"> <option value="newest">Más recientes</option> <option value="oldest">Más antiguas</option> <option value="highest">Mayor calificación</option> <option value="lowest">Menor calificación</option> </select>`} </div> ${resenasData.length > 0 ? renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <div class="space-y-4" id="reviews-list"> ${resenasData.map((resena, idx) => renderTemplate`<div${addAttribute(`review-card bg-[#242424] rounded-2xl border border-neutral-700/60 p-5 sm:p-6 hover:shadow-md transition-shadow ${idx >= 10 ? "review-extra hidden" : ""}`, "class")}${addAttribute(resena.created_at, "data-date")}${addAttribute(resena.calificacion_general, "data-rating")}${addAttribute(resena.id, "data-id")}${addAttribute(resena.user_id, "data-user-id")}> <div class="flex items-start justify-between gap-4 mb-3"> <div class="flex items-center gap-3"> <div${addAttribute(`w-10 h-10 ${colors.badge} rounded-full flex items-center justify-center text-white font-bold text-sm`, "class")}> ${(resena.nombre_usuario || "U").charAt(0).toUpperCase()} </div> <div> <p class="font-semibold text-neutral-100 text-sm">${resena.nombre_usuario || "Estudiante"}</p> <p class="text-xs text-neutral-500"> ${resena.anio_cursado ? `Curs\xF3 en ${resena.anio_cursado}` : ""} ${resena.anio_cursado && resena.created_at ? " \xB7 " : ""} ${resena.created_at ? tiempoRelativo(resena.created_at) : ""} </p> </div> </div> <div class="flex items-center gap-1.5 flex-shrink-0"> <span class="text-yellow-500 text-lg">${estrellas(resena.calificacion_general)}</span> <span class="font-bold text-neutral-300 text-sm">${resena.calificacion_general}</span> </div> </div> ${resena.comentario && renderTemplate`<p class="review-comment text-neutral-400 text-sm leading-relaxed"> ${resena.comentario} </p>`} <!-- Edit form (hidden) --> <div class="review-edit-form hidden mt-3"> <textarea class="edit-textarea w-full px-3 py-2 rounded-xl border border-neutral-700 bg-[#1a1a1a] text-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none" rows="3">${resena.comentario}</textarea> <div class="flex gap-2 mt-2"> <button class="save-edit-btn text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white px-4 py-1.5 rounded-lg transition-colors cursor-pointer">Guardar</button> <button class="cancel-edit-btn text-xs font-semibold text-neutral-400 hover:text-neutral-200 px-3 py-1.5 transition-colors cursor-pointer">Cancelar</button> </div> </div> <!-- Actions --> <div class="flex items-center justify-between mt-3 pt-3 border-t border-neutral-700/40"> ${user?.id === resena.user_id ? renderTemplate`<div class="flex items-center gap-3"> <button class="edit-btn text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"> <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
Editar
</button> <button class="delete-btn text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"> <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
Eliminar
</button> </div>` : renderTemplate`<div></div>`} ${user && user.id !== resena.user_id && renderTemplate`<button class="report-btn text-xs text-neutral-600 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors" title="Reportar reseña"> <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
Reportar
</button>`} </div> </div>`)} </div> ${resenasData.length > 10 && renderTemplate`<div class="text-center mt-6"> <button id="show-more-btn" class="text-sm font-semibold text-amber-400 hover:text-amber-300 bg-amber-900/20 hover:bg-amber-900/30 px-6 py-3 rounded-xl transition-colors cursor-pointer">
Ver más reseñas (${resenasData.length - 10} restantes)
</button> </div>`}` })}` : renderTemplate`<div class="bg-[#242424] p-12 text-center border-2 border-dashed border-neutral-700 rounded-2xl"> <div class="flex justify-center mb-4"> <svg class="w-14 h-14 text-neutral-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg> </div> <h3 class="text-lg font-heading font-bold text-neutral-300 mb-2">Todavía no hay reseñas</h3> <p class="text-neutral-500 mb-6">Sé el primero en compartir tu experiencia con este curso.</p> <a${addAttribute(`/nueva-resena?dictado=${id}&from=/dictado/${id}`, "href")}${addAttribute(`inline-flex items-center gap-2 bg-gradient-to-r ${colors.bg} text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all active:scale-95`, "class")}> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"> <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.71 3.71 1.159-1.157a2.625 2.625 0 000-3.711z"></path> <path d="M10.74 15.394l6.5-6.5-3.71-3.71-6.5 6.5a1.5 1.5 0 00-.4.73l-.84 4.2a.75.75 0 00.916.916l4.2-.84a1.5 1.5 0 00.73-.4z"></path> </svg>
Escribir la primera reseña
</a> </div>`} </div> </div> </main>  ${totalResenas > 0 && renderTemplate`<div class="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-8 sm:w-auto z-20 lg:hidden"> <a${addAttribute(`/nueva-resena?dictado=${id}&from=/dictado/${id}`, "href")}${addAttribute(`w-full sm:w-auto bg-gradient-to-r ${colors.bg} hover:opacity-90 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2`, "class")}> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"> <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.158 3.71 3.71 1.159-1.157a2.625 2.625 0 000-3.711z"></path> <path d="M10.74 15.394l6.5-6.5-3.71-3.71-6.5 6.5a1.5 1.5 0 00-.4.73l-.84 4.2a.75.75 0 00.916.916l4.2-.84a1.5 1.5 0 00.73-.4z"></path> </svg>
Escribir una reseña
</a> </div>`}${renderScript($$result2, "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/dictado/[id].astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/dictado/[id].astro", void 0);

const $$file = "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/dictado/[id].astro";
const $$url = "/dictado/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
