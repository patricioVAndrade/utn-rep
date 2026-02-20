import { c as createSupabaseServerClient, r as redirectWithCookies } from '../../../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ request, cookies, url }) => {
  const provider = url.searchParams.get("provider");
  if (provider !== "google" && provider !== "github") {
    return new Response(null, { status: 302, headers: { Location: "/?auth_error=invalid_provider" } });
  }
  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });
  const redirectTo = `${url.origin}/api/auth/callback`;
  console.log("[Auth Login] Provider:", provider, "| Callback URL:", redirectTo);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent"
      }
    }
  });
  if (error || !data.url) {
    console.error("[Auth Login] OAuth error:", error?.message);
    return new Response(null, { status: 302, headers: { Location: "/?auth_error=oauth_failed" } });
  }
  console.log("[Auth Login] PKCE cookies to set:", responseCookies.length, responseCookies.map((c) => c.name));
  return redirectWithCookies(data.url, responseCookies);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
