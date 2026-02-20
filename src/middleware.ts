import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase';

/**
 * Middleware that reads the auth session from cookies on every request
 * and makes user info available to all pages via Astro.locals.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { client: supabase } = createSupabaseServerClient({
    headers: context.request.headers,
    cookies: context.cookies,
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    context.locals.user = {
      id: user.id,
      name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Usuario',
      avatar: user.user_metadata?.avatar_url || undefined,
      email: user.email || '',
    };
  } else {
    context.locals.user = null;
  }

  const response = await next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
});
