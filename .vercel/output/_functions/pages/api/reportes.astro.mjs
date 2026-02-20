import { c as createSupabaseServerClient } from '../../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Tenés que iniciar sesión para reportar." }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { resena_id, motivo } = body;
  if (!resena_id || typeof resena_id !== "number") {
    return new Response(JSON.stringify({ error: "ID de reseña inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { data: existing } = await supabase.from("reportes_resenas").select("id").eq("resena_id", resena_id).eq("user_id", user.id).maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ error: "Ya reportaste esta reseña." }), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { error: insertError } = await supabase.from("reportes_resenas").insert({
    resena_id,
    user_id: user.id,
    motivo: motivo?.trim()?.slice(0, 500) || null
  });
  if (insertError) {
    console.error("Error inserting report:", insertError);
    return new Response(JSON.stringify({ error: "No se pudo enviar el reporte. Intentá de nuevo." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
