/** JSON response helper shared by every API route. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Parses the request body as JSON; returns undefined when it isn't valid JSON. */
export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** La base frena a las cuentas bloqueadas con este código (migración 9). */
export const esBloqueo = (error: { code?: string } | null | undefined) => error?.code === 'UB001';

export const cuentaBloqueada = () =>
  json({ error: 'Tu cuenta está bloqueada: podés leer, pero no escribir, votar ni reportar. Si creés que es un error, escribinos.' }, 403);
