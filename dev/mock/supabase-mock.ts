// Cliente de Supabase de mentira para mirar el rediseño sin base real.
// Implementa lo justo de PostgREST: select con relaciones, filtros, order, range, single, count
// y escrituras simples (insert, update, delete) que viven en memoria mientras corre el servidor.
import * as F from './fixture.mjs';

const T: Record<string, any[]> = { ...F } as any;
const one = (x: any) => x;

// Vistas
function stats_dictados() {
  return T.dictados.map((d: any) => {
    const rs = T.resenas.filter((r: any) => r.dictado_id === d.id);
    return { dictado_id: d.id, materia_id: d.materia_id, cantidad: rs.length, promedio: rs.length ? rs.reduce((a: number, r: any) => a + r.calificacion_general, 0) / rs.length : 0 };
  });
}
function resenas_publicas() {
  return T.resenas.map((r: any) => ({ ...r, nombre_usuario: r.es_anonima ? null : r.nombre_usuario, user_id: undefined }));
}
function experiencias_finales_publicas() {
  return (T.experiencias_finales || []).map(({ user_id, ...f }: any) => ({ ...f, es_anonima: f.es_anonima !== false, nombre_usuario: f.es_anonima === false ? f.nombre_usuario : null }));
}
const tabla = (n: string) => (n === 'stats_dictados' ? stats_dictados() : n === 'resenas_publicas' ? resenas_publicas() : n === 'experiencias_finales_publicas' ? experiencias_finales_publicas() : T[n] || []);

// Relaciones: hijo -> (tabla, cómo encontrar filas)
function rel(parentTable: string, row: any, name: string): any {
  const by = (t: string, k: string, v: any) => T[t].filter((x: any) => x[k] === v);
  const first = (t: string, v: any) => T[t].find((x: any) => x.id === v) || null;
  switch (name) {
    case 'cursos': return first('cursos', row.curso_id);
    case 'materias': return first('materias', row.materia_id);
    case 'dictados': return parentTable === 'dictado_profesores' ? first('dictados', row.dictado_id) : first('dictados', row.dictado_id);
    case 'profesores': return first('profesores', row.profesor_id);
    case 'experiencias_finales': return first('experiencias_finales', row.final_id);
    case 'resenas': return first('resenas', row.resena_id);
    case 'dictado_profesores':
      return parentTable === 'profesores' ? by('dictado_profesores', 'profesor_id', row.id) : by('dictado_profesores', 'dictado_id', row.id);
  }
  return null;
}

// "a, b, c ( d, e ( f ) )" -> árbol
function parse(sel: string): any[] {
  const out: any[] = []; let i = 0; const s = sel.replace(/\s+/g, ' ');
  function list(): any[] {
    const items: any[] = [];
    while (i < s.length) {
      while (s[i] === ' ' || s[i] === ',') i++;
      if (s[i] === ')') { i++; return items; }
      let name = '';
      while (i < s.length && /[\w*]/.test(s[i])) name += s[i++];
      while (s[i] === ' ') i++;
      if (s[i] === '(') { i++; items.push({ name, children: list() }); } else if (name) items.push({ name });
    }
    return items;
  }
  out.push(...list());
  return out;
}
function project(table: string, row: any, fields: any[]): any {
  const o: any = {};
  for (const f of fields) {
    if (f.name === '*') Object.assign(o, row);
    else if (f.children) {
      const v = rel(table, row, f.name);
      o[f.name] = Array.isArray(v) ? v.map((x) => project(f.name, x, f.children)) : v ? project(f.name, v, f.children) : null;
    } else o[f.name] = row[f.name];
  }
  return o;
}

class Q {
  rows: any[]; fields: any[] = [{ name: '*' }]; opts: any = {}; filters: ((r: any) => boolean)[] = []; ord: [string, boolean][] = []; lim = 0; off = 0; mode = ''; op = ''; payload: any = null;
  constructor(public table: string) { this.rows = tabla(table); }
  select(s = '*', opts: any = {}) { this.fields = parse(s); this.opts = opts; return this; }
  eq(k: string, v: any) { this.filters.push((r) => String(r[k]) === String(v)); return this; }
  gt(k: string, v: any) { this.filters.push((r) => r[k] > v); return this; }
  gte(k: string, v: any) { this.filters.push((r) => r[k] >= v); return this; }
  lt(k: string, v: any) { this.filters.push((r) => r[k] < v); return this; }
  lte(k: string, v: any) { this.filters.push((r) => r[k] <= v); return this; }
  neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
  ilike(k: string, pat: string) { const re = new RegExp('^' + String(pat).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i'); this.filters.push((r) => re.test(String(r[k] ?? ''))); return this; }
  or(expr: string) {
    const partes = expr.split(',').map((p) => { const [k, op, ...v] = p.split('.'); return { k, op, v: v.join('.') }; });
    const tests = partes.map(({ k, op, v }) => {
      if (op === 'ilike') { const re = new RegExp('^' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i'); return (r: any) => re.test(String(r[k] ?? '')); }
      return (r: any) => String(r[k]) === v;
    });
    this.filters.push((r) => tests.some((t) => t(r)));
    return this;
  }
  not(k: string, op: string, v: any) { if (op === 'is') this.filters.push((r) => (r[k] ?? null) !== v); else this.filters.push((r) => String(r[k]) !== String(v)); return this; }
  is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  range(a: number, b: number) { this.off = a; return this.limit(b - a + 1); }
  upsert(v: any, o: any = {}) {
    const ks = String(o.onConflict || 'id').split(',');
    const t = (T[this.table] = T[this.table] || []);
    const nuevos: any[] = [];
    const filas = Array.isArray(v) ? v : [v];
    filas.forEach((f: any) => {
      const ya = t.find((x: any) => ks.every((k) => x[k] === f[k]));
      if (ya) Object.assign(ya, f); else nuevos.push(f);
    });
    if (!nuevos.length) { this.op = 'noop'; this.payload = filas[0]; return this; }
    return this.insert(nuevos);
  }
  insert(v: any) { this.op = 'insert'; this.payload = v; this.fields = [{ name: '*' }]; return this; }
  update(v: any) { this.op = 'update'; this.payload = v; return this; }
  delete() { this.op = 'delete'; return this; }
  in(k: string, vs: any[]) { const s = new Set(vs.map(String)); this.filters.push((r) => s.has(String(r[k]))); return this; }
  order(k: string, o: any = {}) { this.ord.push([k, o.ascending !== false]); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  write() {
    const t = (T[this.table] = T[this.table] || []);
    if (this.op === 'noop') return [this.payload];
    if (this.op === 'insert') {
      const nuevos = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((v: any) => ({ id: t.reduce((m: number, x: any) => (typeof x.id === 'number' && x.id > m ? x.id : m), 0) + 1, created_at: new Date().toISOString(), ...v }));
      nuevos.forEach((n: any) => t.push(n));
      return nuevos;
    }
    const afectados = t.filter((x: any) => this.filters.every((f) => f(x)));
    // Como el trigger de la migración 3: la fecha de edición cambia solo si cambia el contenido
    const edita = this.table === 'resenas' && ['comentario', 'calificacion_general', 'condicion_final'].some((k) => k in (this.payload || {}));
    if (this.op === 'update') afectados.forEach((x: any) => Object.assign(x, this.payload, edita ? { updated_at: new Date().toISOString() } : {}));
    if (this.op === 'delete') T[this.table] = t.filter((x: any) => !afectados.includes(x));
    return afectados;
  }
  run() {
    if (this.op) {
      const data = this.write().map((x: any) => project(this.table, x, this.fields));
      if (this.mode) return { data: data[0] ?? null, error: null };
      return { data, error: null };
    }
    let r = this.rows.filter((x) => this.filters.every((f) => f(x)));
    if (this.ord.length) r = [...r].sort((a, b) => { for (const [k, asc] of this.ord) { if (a[k] < b[k]) return asc ? -1 : 1; if (a[k] > b[k]) return asc ? 1 : -1; } return 0; });
    const count = r.length;
    if (this.lim || this.off) r = r.slice(this.off, this.lim ? this.off + this.lim : undefined);
    if (this.opts.head) return { data: null, error: null, count };
    const data = r.map((x) => project(this.table, x, this.fields));
    if (this.mode) return { data: data[0] ?? null, error: data[0] || this.mode === 'maybe' ? null : { message: 'not found' }, count };
    return { data, error: null, count };
  }
  then(res: any, rej: any) { return Promise.resolve(this.run()).then(res, rej); }
}

const DEMO = process.env.MOCK_USER === '1';
const meta: any = { full_name: 'Sofía Rivas' };
const auth = {
  getUser: async () => ({ data: { user: DEMO ? { id: 'u-demo', email: 'sofia@frc.utn.edu.ar', created_at: '2025-03-10T12:00:00Z', app_metadata: { provider: 'google' }, user_metadata: meta } : null }, error: null }),
  updateUser: async ({ data }: any) => { Object.assign(meta, data); return { data: {}, error: null }; },
  signOut: async () => ({ error: null }),
  admin: { deleteUser: async () => ({ data: {}, error: null }) },
};
async function rpc(nombre: string, args: any) {
  if (nombre === 'votar_final') {
    const f = (T.experiencias_finales || []).find((x: any) => x.id === Number(args.p_final_id));
    if (!f) return { data: null, error: { code: '23503', message: 'no existe' } };
    const votos = (T.votos_finales = T.votos_finales || []);
    const i = votos.findIndex((v: any) => v.user_id === 'u-demo' && v.final_id === f.id);
    if (args.p_votar && i < 0) { votos.push({ user_id: 'u-demo', final_id: f.id }); f.votos_utilidad = (f.votos_utilidad || 0) + 1; }
    if (!args.p_votar && i >= 0) { votos.splice(i, 1); f.votos_utilidad = Math.max(0, (f.votos_utilidad || 0) - 1); }
    return { data: f.votos_utilidad || 0, error: null };
  }
  if (nombre === 'check_rate_limit') return { data: true, error: null };
  if (nombre === 'anonimizar_usuario') {
    let n = 0;
    for (const t of ['resenas', 'experiencias_finales']) (T[t] || []).forEach((r: any) => { if (r.user_id === args.p_user) { r.user_id = null; r.es_anonima = true; r.nombre_usuario = null; n++; } });
    T.perfiles = (T.perfiles || []).filter((p: any) => p.user_id !== args.p_user);
    return { data: n, error: null };
  }
  return { data: null, error: null };
}
const client = { from: (t: string) => new Q(t), auth, rpc };

export const supabase = client as any;
export const supabaseAdmin = client as any;
export function createSupabaseServerClient(_ctx: any) { return { client: client as any, responseCookies: [] as any[] }; }
export function redirectWithCookies(location: string, _c: any[], status = 302) { return new Response(null, { status, headers: { Location: location } }); }
