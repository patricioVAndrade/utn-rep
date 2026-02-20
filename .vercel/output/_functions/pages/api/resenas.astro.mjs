import { c as createSupabaseServerClient } from '../../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  const { client: supabase } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Tenés que iniciar sesión para enviar una reseña." }), {
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
  const { dictado_id, calificacion_general, anio_cursado, comentario } = body;
  if (!dictado_id || typeof dictado_id !== "number") {
    return new Response(JSON.stringify({ error: "Dictado inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!calificacion_general || calificacion_general < 1 || calificacion_general > 5) {
    return new Response(JSON.stringify({ error: "Calificación debe ser entre 1 y 5." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  if (!anio_cursado || anio_cursado < currentYear - 10 || anio_cursado > currentYear) {
    return new Response(JSON.stringify({ error: "Año de cursado inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
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
  const { data: existingReview } = await supabase.from("resenas").select("id").eq("dictado_id", dictado_id).eq("user_id", user.id).maybeSingle();
  if (existingReview) {
    return new Response(JSON.stringify({ error: "Ya escribiste una reseña para este curso. Solo se permite una por curso." }), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });
  }
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1e3).toISOString();
  const { count: recentCount } = await supabase.from("resenas").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", oneHourAgo);
  if (recentCount !== null && recentCount >= 5) {
    return new Response(JSON.stringify({ error: "Demasiadas reseñas en poco tiempo. Esperá un rato antes de escribir otra." }), {
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { data: dictado } = await supabase.from("dictados").select("id").eq("id", dictado_id).maybeSingle();
  if (!dictado) {
    return new Response(JSON.stringify({ error: "El curso no existe." }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const nombreUsuario = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuario";
  const { error: insertError } = await supabase.from("resenas").insert({
    dictado_id,
    calificacion_general,
    anio_cursado,
    comentario: comentario.trim(),
    user_id: user.id,
    nombre_usuario: nombreUsuario,
    votos_utilidad: 0
  });
  if (insertError) {
    console.error("Error inserting resena:", insertError);
    return new Response(JSON.stringify({ error: "No se pudo guardar la reseña. Intentá de nuevo." }), {
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
