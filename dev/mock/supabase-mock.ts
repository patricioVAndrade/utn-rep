// Cliente de Supabase de mentira para mirar el rediseño sin base real.
// Implementa lo justo de PostgREST: select con relaciones, eq, in, gt, order, limit, single y count.
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
const tabla = (n: string) => (n === 'stats_dictados' ? stats_dictados() : n === 'resenas_publicas' ? resenas_publicas() : T[n] || []);

// Relaciones: hijo -> (tabla, cómo encontrar filas)
function rel(parentTable: string, row: any, name: string): any {
  const by = (t: string, k: string, v: any) => T[t].filter((x: any) => x[k] === v);
  const first = (t: string, v: any) => T[t].find((x: any) => x.id === v) || null;
  switch (name) {
    case 'cursos': return first('cursos', row.curso_id);
    case 'materias': return first('materias', row.materia_id);
    case 'dictados': return parentTable === 'dictado_profesores' ? first('dictados', row.dictado_id) : first('dictados', row.dictado_id);
    case 'profesores': return first('profesores', row.profesor_id);
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
  rows: any[]; fields: any[] = [{ name: '*' }]; opts: any = {}; filters: ((r: any) => boolean)[] = []; ord: [string, boolean][] = []; lim = 0; mode = '';
  constructor(public table: string) { this.rows = tabla(table); }
  select(s = '*', opts: any = {}) { this.fields = parse(s); this.opts = opts; return this; }
  eq(k: string, v: any) { this.filters.push((r) => String(r[k]) === String(v)); return this; }
  gt(k: string, v: any) { this.filters.push((r) => r[k] > v); return this; }
  gte(k: string, v: any) { this.filters.push((r) => r[k] >= v); return this; }
  lt(k: string, v: any) { this.filters.push((r) => r[k] < v); return this; }
  lte(k: string, v: any) { this.filters.push((r) => r[k] <= v); return this; }
  neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
  is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  range(a: number, b: number) { return this.limit(b - a + 1); }
  in(k: string, vs: any[]) { const s = new Set(vs.map(String)); this.filters.push((r) => s.has(String(r[k]))); return this; }
  order(k: string, o: any = {}) { this.ord.push([k, o.ascending !== false]); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  run() {
    let r = this.rows.filter((x) => this.filters.every((f) => f(x)));
    if (this.ord.length) r = [...r].sort((a, b) => { for (const [k, asc] of this.ord) { if (a[k] < b[k]) return asc ? -1 : 1; if (a[k] > b[k]) return asc ? 1 : -1; } return 0; });
    const count = r.length;
    if (this.lim) r = r.slice(0, this.lim);
    if (this.opts.head) return { data: null, error: null, count };
    const data = r.map((x) => project(this.table, x, this.fields));
    if (this.mode) return { data: data[0] ?? null, error: data[0] || this.mode === 'maybe' ? null : { message: 'not found' }, count };
    return { data, error: null, count };
  }
  then(res: any, rej: any) { return Promise.resolve(this.run()).then(res, rej); }
}

const DEMO = process.env.MOCK_USER === '1';
const auth = { getUser: async () => ({ data: { user: DEMO ? { id: 'u-demo', email: 'sofia@frc.utn.edu.ar', user_metadata: { full_name: 'Sofía Rivas' } } : null }, error: null }) };
const client = { from: (t: string) => new Q(t), auth, rpc: async () => ({ data: null, error: null }) };

export const supabase = client as any;
export const supabaseAdmin = client as any;
export function createSupabaseServerClient(_ctx: any) { return { client: client as any, responseCookies: [] as any[] }; }
export function redirectWithCookies(location: string, _c: any[], status = 302) { return new Response(null, { status, headers: { Location: location } }); }
