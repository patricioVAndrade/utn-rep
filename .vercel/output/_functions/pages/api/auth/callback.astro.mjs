import { c as createSupabaseServerClient, r as redirectWithCookies } from '../../../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ request, cookies, url }) => {
  const code = url.searchParams.get("code");
  const error_param = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");
  if (error_param) {
    console.error("[Auth Callback] Provider error:", error_param, error_description);
    return new Response(null, {
      status: 302,
      headers: { Location: "/?auth_error=" + encodeURIComponent(error_description || error_param) }
    });
  }
  if (!code) {
    console.error("[Auth Callback] No code in URL. Search params:", url.search);
    return new Response(null, { status: 302, headers: { Location: "/?auth_error=missing_code" } });
  }
  console.log("[Auth Callback] Got code, exchanging for session...");
  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[Auth Callback] Exchange error:", error.message);
    return new Response(null, { status: 302, headers: { Location: "/?auth_error=exchange_failed" } });
  }
  console.log("[Auth Callback] Session established! Cookies to set:", responseCookies.length, responseCookies.map((c) => c.name));
  return redirectWithCookies("/", responseCookies);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
