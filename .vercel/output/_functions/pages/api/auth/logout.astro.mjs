import { c as createSupabaseServerClient, r as redirectWithCookies } from '../../../chunks/supabase_CUIuQ99v.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  const { client: supabase, responseCookies } = createSupabaseServerClient({ headers: request.headers, cookies });
  await supabase.auth.signOut();
  return redirectWithCookies("/", responseCookies);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
