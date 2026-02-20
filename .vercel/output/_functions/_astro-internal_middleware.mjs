import { d as defineMiddleware, s as sequence } from './chunks/index_B4-xTl2E.mjs';
import { c as createSupabaseServerClient } from './chunks/supabase_CUIuQ99v.mjs';
import 'es-module-lexer';
import './chunks/astro-designed-error-pages_BVDjuxVo.mjs';
import 'piccolore';
import './chunks/astro/server_Cd2165UI.mjs';
import 'clsx';

const onRequest$1 = defineMiddleware(async (context, next) => {
  const { client: supabase } = createSupabaseServerClient({
    headers: context.request.headers,
    cookies: context.cookies
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    context.locals.user = {
      id: user.id,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuario",
      avatar: user.user_metadata?.avatar_url || void 0,
      email: user.email || ""
    };
  } else {
    context.locals.user = null;
  }
  const response = await next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
});

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
