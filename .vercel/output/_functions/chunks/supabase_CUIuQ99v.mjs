import { createBrowserClient, createServerClient, parseCookieHeader } from '@supabase/ssr';

const supabaseUrl = "https://mcyientvrmyzgcyibynp.supabase.co";
const supabaseAnonKey = "sb_publishable_p7Greo8keo-49a-je_UuTQ_1NPCXNds";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
const cookieOpts = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "lax"
};
function createSupabaseServerClient(context) {
  const cookieHeader = context.headers.get("Cookie") ?? "";
  const responseCookies = [];
  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = { ...options, ...cookieOpts };
          responseCookies.push({ name, value, options: opts });
          context.cookies.set(name, value, opts);
        });
      }
    }
  });
  return { client, responseCookies };
}
function redirectWithCookies(location, cookies, status = 302) {
  const headers = new Headers({ Location: location });
  for (const { name, value, options } of cookies) {
    let str = `${name}=${value}; Path=${options.path || "/"}`;
    if (options.httpOnly) str += "; HttpOnly";
    if (options.secure) str += "; Secure";
    if (options.sameSite) {
      const s = String(options.sameSite);
      str += `; SameSite=${s.charAt(0).toUpperCase()}${s.slice(1)}`;
    }
    if (options.maxAge != null) str += `; Max-Age=${options.maxAge}`;
    headers.append("Set-Cookie", str);
  }
  return new Response(null, { status, headers });
}

export { createSupabaseServerClient as c, redirectWithCookies as r, supabase as s };
