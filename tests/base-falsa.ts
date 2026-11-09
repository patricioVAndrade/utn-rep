// Base de mentira para probar los endpoints sin Supabase.
//
// Anota cada consulta (tabla, operación y cada paso: eq, is, select…) y
// contesta con lo que diga `base.respuestas`. Las claves son, de la más
// precisa a la más general:
//   "admin:resenas.delete"  solo para el cliente con la clave de servicio
//   "resenas.delete"        para cualquiera de los dos clientes
//   "rpc.votar_resena"      una función de la base
//   "auth.getUserById" / "auth.deleteUser"  el admin de cuentas
// El valor es { data, error } o una función que recibe la llamada y lo devuelve.
//
// Uso en una prueba:
//   vi.mock('../src/lib/supabase', async () => (await import('./base-falsa')).mockSupabase);
//   vi.mock('../src/lib/supabase-admin', async () => (await import('./base-falsa')).mockSupabaseAdmin);
//   import { base } from './base-falsa';

export type Paso = [string, unknown[]];
export type Llamada = { cliente: 'sesion' | 'admin'; tabla: string; op: string; pasos: Paso[] };
export type Resp = { data?: unknown; error?: unknown; count?: number | null };

const OPS = ['select', 'insert', 'update', 'delete', 'upsert'];

export const base = {
  llamadas: [] as Llamada[],
  respuestas: {} as Record<string, Resp | ((l: Llamada) => Resp)>,
  usuario: { id: 'u-1', user_metadata: {} } as any,
  nombreSesion: [] as unknown[],
  reset() {
    this.llamadas.length = 0;
    this.respuestas = {};
    this.usuario = { id: 'u-1', user_metadata: {} };
    this.nombreSesion.length = 0;
  },
  /** Las consultas de una tabla (y operación, si se pide). */
  de(tabla: string, op?: string) {
    return this.llamadas.filter((l) => l.tabla === tabla && (!op || l.op === op));
  },
};

/** ¿La llamada tiene ese paso con esos argumentos? */
export const tiene = (l: Llamada | undefined, paso: string, ...args: unknown[]) =>
  !!l && l.pasos.some(([m, a]) => m === paso && JSON.stringify(a.slice(0, args.length)) === JSON.stringify(args));

function contestar(l: Llamada): Promise<Resp> {
  const r = base.respuestas[`${l.cliente}:${l.tabla}.${l.op}`] ?? base.respuestas[`${l.tabla}.${l.op}`];
  const valor = typeof r === 'function' ? r(l) : r;
  return Promise.resolve(valor ?? { data: null, error: null });
}

function consulta(cliente: Llamada['cliente'], tabla: string) {
  const l: Llamada = { cliente, tabla, op: '', pasos: [] };
  let anotada = false;
  const proxy: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') {
        return (ok: any, mal: any) => {
          if (!anotada) { base.llamadas.push(l); anotada = true; }
          return contestar(l).then(ok, mal);
        };
      }
      return (...args: unknown[]) => {
        if (!l.op && OPS.includes(prop)) l.op = prop;
        l.pasos.push([prop, args]);
        return proxy;
      };
    },
  });
  return proxy;
}

function rpc(cliente: Llamada['cliente'], nombre: string, args: unknown) {
  const l: Llamada = { cliente, tabla: 'rpc', op: nombre, pasos: [['rpc', [args]]] };
  base.llamadas.push(l);
  const r = base.respuestas[`${cliente}:rpc.${nombre}`] ?? base.respuestas[`rpc.${nombre}`];
  const valor = typeof r === 'function' ? r(l) : r;
  // El límite de pedidos deja pasar salvo que la prueba diga otra cosa
  return Promise.resolve(valor ?? (nombre === 'check_rate_limit' ? { data: true, error: null } : { data: null, error: null }));
}

function auth(nombre: string, ...args: unknown[]) {
  const l: Llamada = { cliente: 'admin', tabla: 'auth', op: nombre, pasos: [[nombre, args]] };
  base.llamadas.push(l);
  const r = base.respuestas[`auth.${nombre}`];
  return Promise.resolve((typeof r === 'function' ? r(l) : r) ?? { data: null, error: null });
}

export const clienteSesion = {
  auth: {
    getUser: async () => ({ data: { user: base.usuario }, error: null }),
    updateUser: async (x: unknown) => { base.nombreSesion.push(x); return { data: null, error: null }; },
    signOut: async () => ({ error: null }),
  },
  from: (t: string) => consulta('sesion', t),
  rpc: (n: string, a: unknown) => rpc('sesion', n, a),
};

export const clienteAdmin = {
  from: (t: string) => consulta('admin', t),
  rpc: (n: string, a: unknown) => rpc('admin', n, a),
  auth: { admin: { getUserById: (id: string) => auth('getUserById', id), deleteUser: (id: string) => auth('deleteUser', id) } },
};

export const mockSupabase = { createSupabaseServerClient: () => ({ client: clienteSesion }) };
export const mockSupabaseAdmin = { supabaseAdmin: clienteAdmin };
/** Los admins de prueba son los que empiezan con "admin". */
export const mockAdmin = { ADMIN_IDS: ['admin-1'], isAdmin: (id?: string | null) => !!id && id.startsWith('admin') };

/** Arma un pedido JSON. `csrf: true` agrega el token y el origen como lo manda el panel. */
export function pedido(ruta: string, body?: unknown, op: { metodo?: string; csrf?: boolean | string; crudo?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (op.csrf) { headers['x-csrf-token'] = typeof op.csrf === 'string' ? op.csrf : 'tok'; headers.origin = 'http://x'; }
  const metodo = op.metodo || (body === undefined && op.crudo === undefined ? 'GET' : 'POST');
  const init: RequestInit = { method: metodo, headers };
  if (metodo !== 'GET') init.body = op.crudo ?? JSON.stringify(body);
  return new Request(`http://x${ruta}`, init);
}

/** Cookies con el token CSRF del admin ("tok"). */
export const cookies = { get: (n: string) => (n === 'admin_csrf' ? { value: 'tok' } : undefined) } as any;

/** Llama al endpoint y devuelve estado y cuerpo. */
export async function llamar(fn: any, req: Request, params: Record<string, string> = {}) {
  const res: Response = await fn({ request: req, cookies, params, clientAddress: '1.2.3.4' } as any);
  return { status: res.status, body: await res.json() };
}
