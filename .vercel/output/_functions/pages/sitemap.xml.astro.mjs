import { s as supabase } from '../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../renderers.mjs';

const GET = async ({ url }) => {
  const origin = url.origin;
  const [{ data: materias }, { data: dictados }, { data: profesores }] = await Promise.all([
    supabase.from("materias").select("id").order("id"),
    supabase.from("dictados").select("id").order("id"),
    supabase.from("profesores").select("id").order("id")
  ]);
  const urls = [];
  urls.push({ loc: "/", priority: "1.0" });
  urls.push({ loc: "/nueva-resena", priority: "0.6" });
  urls.push({ loc: "/sobre", priority: "0.4" });
  urls.push({ loc: "/terminos", priority: "0.3" });
  for (let i = 1; i <= 5; i++) {
    urls.push({ loc: `/nivel/${i}`, priority: "0.8" });
  }
  (materias || []).forEach((m) => {
    urls.push({ loc: `/materia/${m.id}`, priority: "0.7" });
  });
  (dictados || []).forEach((d) => {
    urls.push({ loc: `/dictado/${d.id}`, priority: "0.6" });
  });
  (profesores || []).forEach((p) => {
    urls.push({ loc: `/profesor/${p.id}`, priority: "0.5" });
  });
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${origin}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
