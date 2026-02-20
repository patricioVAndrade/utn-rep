import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, o as defineScriptVars, g as addAttribute, m as maybeRenderHead } from '../chunks/astro/server_Cd2165UI.mjs';
import 'piccolore';
import { a as $$Layout, $ as $$HeaderNav } from '../chunks/HeaderNav_BRe9A8mI.mjs';
import { s as supabase } from '../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../renderers.mjs';

const cache = /* @__PURE__ */ new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}
function setCache(key, data, ttlMs = 5 * 60 * 1e3) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const user = Astro2.locals.user;
  const CACHE_TTL = 5 * 60 * 1e3;
  let allMaterias = getCached("index:materias");
  if (!allMaterias) {
    const { data } = await supabase.from("materias").select("id, nombre, nivel").order("nivel").order("nombre");
    allMaterias = data || [];
    setCache("index:materias", allMaterias, CACHE_TTL);
  }
  let allResenas = getCached("index:resenas");
  if (!allResenas) {
    const { data } = await supabase.from("resenas").select("calificacion_general, dictado_id, dictados!inner(materia_id)");
    allResenas = data || [];
    setCache("index:resenas", allResenas, CACHE_TTL);
  }
  const materiaStats = {};
  if (allResenas) {
    allResenas.forEach((r) => {
      const materiaId = r.dictados?.materia_id;
      if (!materiaId) return;
      if (!materiaStats[materiaId]) materiaStats[materiaId] = { promedio: 0, count: 0 };
      materiaStats[materiaId].count++;
      materiaStats[materiaId].promedio += r.calificacion_general;
    });
    Object.keys(materiaStats).forEach((id) => {
      const s = materiaStats[Number(id)];
      s.promedio = s.count > 0 ? s.promedio / s.count : 0;
    });
  }
  const topMaterias = (allMaterias || []).filter((m) => materiaStats[m.id]?.count > 0).sort((a, b) => (materiaStats[b.id]?.count || 0) - (materiaStats[a.id]?.count || 0)).slice(0, 3);
  if (topMaterias.length < 3 && allMaterias) {
    for (const m of allMaterias) {
      if (topMaterias.length >= 3) break;
      if (!topMaterias.find((t) => t.id === m.id)) topMaterias.push(m);
    }
  }
  const totalResenas = allResenas?.length || 0;
  allMaterias?.length || 0;
  const aniosCarrera = [
    { nivel: 1, label: "1er A\xF1o", color: "from-blue-500 to-blue-600" },
    { nivel: 2, label: "2do A\xF1o", color: "from-green-500 to-green-600" },
    { nivel: 3, label: "3er A\xF1o", color: "from-orange-500 to-orange-600" },
    { nivel: 4, label: "4to A\xF1o", color: "from-red-500 to-red-600" },
    { nivel: 5, label: "5to A\xF1o", color: "from-purple-500 to-purple-600" }
  ];
  let allProfesores = getCached("index:profesores");
  if (!allProfesores) {
    const { data } = await supabase.from("profesores").select("id, nombre_completo, dictado_profesores(dictados(id, materia_id, materias(nombre, nivel), cursos(identificador)))").order("nombre_completo");
    allProfesores = data || [];
    setCache("index:profesores", allProfesores, CACHE_TTL);
  }
  const materiasSearch = (allMaterias || []).map((m) => ({ id: m.id, nombre: m.nombre, nivel: m.nivel }));
  const profesSearch = (allProfesores || []).map((p) => {
    const materiasList = (p.dictado_profesores || []).map((dp) => ({
      dictadoId: dp.dictados?.id,
      materiaNombre: dp.dictados?.materias?.nombre,
      nivel: dp.dictados?.materias?.nivel,
      curso: dp.dictados?.cursos?.identificador
    })).filter((m) => m.materiaNombre);
    const seen = /* @__PURE__ */ new Set();
    const unique = materiasList.filter((m) => {
      if (seen.has(m.materiaNombre)) return false;
      seen.add(m.materiaNombre);
      return true;
    });
    return { id: p.id, nombre: p.nombre_completo, materias: unique };
  });
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "UTN REP \u2014 Opiniones y rese\xF1as de materias y profesores | UTN FRC Sistemas", "description": "Opiniones y rese\xF1as reales de materias, c\xE1tedras y profesores de Ingenier\xEDa en Sistemas de Informaci\xF3n \u2014 UTN Facultad Regional C\xF3rdoba. Eleg\xED mejor tu cursada." }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template(["  ", '<header class="bg-stone-900 text-white relative z-50"> <!-- Geometric background pattern --> <div class="absolute inset-0 hero-pattern dot-pattern opacity-60 overflow-hidden"></div> <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 lg:pb-8"> ', ' <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"> <div class="max-w-xl"> <h1 class="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight leading-tight">\nUTN <span class="text-amber-400">REP</span> </h1> <p class="text-neutral-300 mt-2 text-base sm:text-lg lg:text-xl leading-relaxed">\nCompart\xED tu experiencia y eleg\xED mejor tu cursada &mdash; <strong class="text-white">UTN&nbsp;FRC</strong> </p> <!-- Animated review counter --> <div class="flex items-center gap-2 mt-4"> <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg> <span class="text-amber-400 text-2xl font-heading font-extrabold tabular-nums" id="stat-reviews">0</span> <span class="text-neutral-500 text-sm" id="stat-reviews-label">rese\xF1as de estudiantes</span> </div> </div> <!-- Buscador --> <div class="w-full lg:w-96 relative z-50" id="search-container"> <div class="relative"> <input type="text" id="search-input" placeholder="Buscar materia o profesor..." autocomplete="off" class="w-full px-5 py-4 pl-12 rounded-2xl text-white bg-[#242424]/95 backdrop-blur shadow-lg focus:outline-none focus:ring-4 focus:ring-amber-400/30 transition-all placeholder:text-neutral-500 border border-white/20"> <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path> </svg> </div> <div id="search-results" class="hidden absolute top-full left-0 right-0 mt-2 bg-[#242424] rounded-2xl shadow-2xl border border-neutral-700 overflow-hidden z-[100] max-h-80 overflow-y-auto"></div> </div> </div> </div> </header>  <nav class="bg-[#242424] border-b border-neutral-700 sticky top-0 z-40 shadow-sm"> <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3"> <div class="flex items-center justify-center"> <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0"> ', ' </div> </div> </div> </nav> <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"> <!-- Materias Destacadas --> <section class="mb-12"> <h2 class="text-xl sm:text-2xl font-heading font-bold text-neutral-100 mb-6 flex items-center gap-3"> <span class="bg-amber-900/30 text-amber-400 p-2 rounded-xl">&#11088;</span>\nMaterias Destacadas\n</h2> <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> ', ' </div> </section> <!-- CTA Section --> <section class="bg-gradient-to-r from-stone-800 to-stone-900 rounded-3xl p-8 sm:p-12 text-white text-center shadow-xl mb-12 relative overflow-hidden"> <div class="absolute inset-0 dot-pattern opacity-30"></div> <div class="relative"> <h2 class="text-2xl sm:text-3xl font-heading font-bold mb-4">\n&iquest;Ya cursaste alguna materia?\n</h2> <p class="text-neutral-300 mb-6 max-w-xl mx-auto">\nCompart&iacute; tu experiencia y ayud&aacute; a otros estudiantes a elegir mejor sus c&aacute;tedras\n</p> <a href="/nueva-resena" class="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-4 rounded-xl hover:scale-105 transition-all shadow-lg"> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path> </svg>\nEscribir Rese&ntilde;a\n</a> </div> </section> </main> <script>(function(){', `
    // ========== ANIMATED REVIEW COUNTER ==========
    (function() {
      const el = document.getElementById('stat-reviews');
      const labelEl = document.getElementById('stat-reviews-label');
      if (!el) return;

      const total = totalResenas;

      // Format: under 500 show exact, 500+ round to nearest 500
      function formatCount(n) {
        if (n >= 500) {
          const rounded = Math.floor(n / 500) * 500;
          return '+ ' + rounded.toLocaleString('es-AR');
        }
        return n.toString();
      }

      // Animate counting up from 0 to target
      const duration = 1800; // ms
      const fps = 60;
      const steps = Math.ceil(duration / (1000 / fps));
      // For display \u2265500 we animate to the rounded number, otherwise to exact
      const displayTarget = total >= 500 ? Math.floor(total / 500) * 500 : total;
      let step = 0;

      function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
      }

      function tick() {
        step++;
        const progress = Math.min(step / steps, 1);
        const eased = easeOutQuart(progress);
        const current = Math.round(eased * displayTarget);

        if (total >= 500) {
          el.textContent = '+ ' + current.toLocaleString('es-AR');
        } else {
          el.textContent = current.toString();
        }

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          // Final value
          el.textContent = formatCount(total);
          labelEl.textContent = 'rese\xF1as de estudiantes';
        }
      }

      // Start animation when visible
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            observer.disconnect();
            requestAnimationFrame(tick);
          }
        });
      }, { threshold: 0.5 });
      observer.observe(el);
    })();

    // ========== SEARCH ==========
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const nivelLabels = { 1: '1\xBA A\xF1o', 2: '2\xBA A\xF1o', 3: '3\xBA A\xF1o', 4: '4\xBA A\xF1o', 5: '5\xBA A\xF1o' };

    // XSS sanitization
    function esc(str) {
      const d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    }

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query.length < 2) {
          searchResults.classList.add('hidden');
          searchResults.innerHTML = '';
          return;
        }

        const matchMaterias = materiasSearch.filter(m => 
          m.nombre.toLowerCase().includes(query)
        ).slice(0, 5);

        const matchProfes = profesSearch.filter(p =>
          p.nombre.toLowerCase().includes(query)
        ).slice(0, 5);

        if (matchMaterias.length === 0 && matchProfes.length === 0) {
          searchResults.innerHTML = '<div class="p-4 text-center text-neutral-500 text-sm">No se encontraron resultados</div>';
        } else {
          let html = '';

          if (matchMaterias.length > 0) {
            html += '<div class="px-4 pt-3 pb-1"><p class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Materias</p></div>';
            html += matchMaterias.map(m => 
              '<a href="/materia/' + m.id + '" class="flex items-center justify-between px-4 py-3 hover:bg-amber-900/20 transition-colors border-b border-neutral-800">' +
                '<div class="flex items-center gap-3"><span class="flex-shrink-0 w-8 h-8 bg-amber-900/30 text-amber-400 rounded-lg flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></span>' +
                '<div><p class="font-semibold text-neutral-100 text-sm">' + esc(m.nombre) + '</p>' +
                '<p class="text-xs text-neutral-500">' + esc(nivelLabels[m.nivel] || '') + '</p></div></div>' +
                '<svg class="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' +
              '</a>'
            ).join('');
          }

          if (matchProfes.length > 0) {
            html += '<div class="px-4 pt-3 pb-1"><p class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Profesores</p></div>';
            html += matchProfes.map(p => {
              const href = '/profesor/' + p.id;
              const subtitle = p.materias.map(m => m.materiaNombre).join(', ') || 'Sin materias asignadas';
              return (
                '<a href="' + href + '" class="flex items-center justify-between px-4 py-3 hover:bg-neutral-700 transition-colors border-b border-neutral-800 last:border-0">' +
                  '<div class="flex items-center gap-3"><span class="flex-shrink-0 w-8 h-8 bg-neutral-700 text-neutral-400 rounded-lg flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></span>' +
                  '<div><p class="font-semibold text-neutral-100 text-sm">' + esc(p.nombre) + '</p>' +
                  '<p class="text-xs text-neutral-500 truncate max-w-[250px]">' + esc(subtitle) + '</p></div></div>' +
                  '<svg class="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' +
                '</a>'
              );
            }).join('');
          }

          searchResults.innerHTML = html;
        }
        searchResults.classList.remove('hidden');
      }, 200);
    });

    document.addEventListener('click', (e) => {
      if (!document.getElementById('search-container').contains(e.target)) {
        searchResults.classList.add('hidden');
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchResults.classList.add('hidden');
        searchInput.blur();
      }
    });
  })();<\/script> `])), maybeRenderHead(), renderComponent($$result2, "HeaderNav", $$HeaderNav, { "user": user }), aniosCarrera.map((anio) => renderTemplate`<a${addAttribute(`/nivel/${anio.nivel}`, "href")} class="flex items-center gap-1.5 px-4 py-2.5 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold bg-neutral-800 text-neutral-300 hover:bg-amber-500 hover:text-white transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md active:scale-95"> <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> <span class="hidden sm:inline">${anio.label}</span> <span class="sm:hidden text-base">${anio.nivel}&deg;</span> </a>`), topMaterias.map((materia, index) => {
    const stats = materiaStats[materia.id];
    const hasReviews = stats && stats.count > 0;
    return renderTemplate`<a${addAttribute(`/materia/${materia.id}`, "href")}${addAttribute(`group glass-card bg-[#242424] p-5 sm:p-6 rounded-2xl border border-neutral-700/60 border-l-4 border-l-amber-500 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-900/10 transition-all duration-300 flex items-start gap-4 animate-fade-in-up animate-delay-${index + 1}`, "class")}> <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-white font-heading font-extrabold text-lg shadow-lg shadow-amber-900/30"> ${index + 1} </div> <div class="flex-1 min-w-0"> <h3 class="font-heading font-bold text-white group-hover:text-amber-400 transition-colors truncate"> ${materia.nombre} </h3> <div class="flex items-center gap-2 mt-1"> <span class="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded-full"> ${materia.nivel}&ordm; A&ntilde;o
</span> ${hasReviews && renderTemplate`<span class="text-xs text-amber-400 flex items-center gap-1">
&#11088; ${stats.promedio.toFixed(1)} </span>`} </div> <p class="text-xs text-neutral-500 mt-2"> ${hasReviews ? `${stats.count} rese\xF1a${stats.count !== 1 ? "s" : ""}` : "Sin rese\xF1as a\xFAn"} </p> </div> <svg class="w-5 h-5 text-neutral-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path> </svg> </a>`;
  }), defineScriptVars({ materiasSearch, profesSearch, totalResenas })) })}`;
}, "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/index.astro", void 0);

const $$file = "C:/Users/Pato/Desktop/apputn/utn-rep/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
