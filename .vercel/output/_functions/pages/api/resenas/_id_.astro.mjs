import { c as createSupabaseServerClient } from '../../../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../../../renderers.mjs';

const DELETE = async ({ params, request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "No autenticado." }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const resenaId = parseInt(params.id || "");
  if (!resenaId || isNaN(resenaId)) {
    return new Response(JSON.stringify({ error: "ID de reseña inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { data: resena } = await supabase.from("resenas").select("id, user_id").eq("id", resenaId).maybeSingle();
  if (!resena) {
    return new Response(JSON.stringify({ error: "Reseña no encontrada." }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (resena.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "No podés eliminar una reseña que no es tuya." }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { error: deleteError } = await supabase.from("resenas").delete().eq("id", resenaId);
  if (deleteError) {
    console.error("Error deleting resena:", deleteError);
    return new Response(JSON.stringify({ error: "No se pudo eliminar la reseña." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
const PUT = async ({ params, request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "No autenticado." }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const resenaId = parseInt(params.id || "");
  if (!resenaId || isNaN(resenaId)) {
    return new Response(JSON.stringify({ error: "ID de reseña inválido." }), {
      status: 400,
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
  const { comentario } = body;
  if (!comentario || typeof comentario !== "string" || comentario.trim().length < 10) {
    return new Response(JSON.stringify({ error: "El comentario debe tener al menos 10 caracteres." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (comentario.trim().length > 2e3) {
    return new Response(JSON.stringify({ error: "El comentario no puede superar los 2000 caracteres." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { data: resena } = await supabase.from("resenas").select("id, user_id").eq("id", resenaId).maybeSingle();
  if (!resena) {
    return new Response(JSON.stringify({ error: "Reseña no encontrada." }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (resena.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "No podés editar una reseña que no es tuya." }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { error: updateError } = await supabase.from("resenas").update({ comentario: comentario.trim() }).eq("id", resenaId);
  if (updateError) {
    console.error("Error updating resena:", updateError);
    return new Response(JSON.stringify({ error: "No se pudo actualizar la reseña." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  PUT
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
