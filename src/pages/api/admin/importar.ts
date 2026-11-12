import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { requireAdmin } from '../../../lib/admin-guards';
import { json } from '../../../lib/http';
import { leerXlsx } from '../../../lib/xlsx';
import { idDePlanilla, leerCsv, leerPlanilla, limpiar, type LecturaPlanilla } from '../../../lib/planilla';
import { compararConBase, type Base } from '../../../lib/importar';
import { bloquesValidos, horaBase } from '../../../lib/horarios';

const TURNOS = new Set(['MAÑANA', 'TARDE', 'NOCHE']);
// Cursos de Sistemas (4K1) e intensivos (1H10/11)
const CURSO_K = /^\d+(K\d+|H\d+(\/\d+)?)$/;
const MAX_ITEMS = 3000;

async function bajarPlanilla(link: string): Promise<Uint8Array> {
  const id = idDePlanilla(link);
  if (!id) throw new Error(`"${link.slice(0, 60)}" no es un link de Google Sheets.`);
  // Armamos la URL nosotros: solo se pide a docs.google.com
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, { redirect: 'follow', signal: AbortSignal.timeout(25000) });
  const buf = new Uint8Array(await res.arrayBuffer());
  if (!res.ok || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    throw new Error('No pude abrir la planilla. Fijate que esté compartida como "Cualquier persona con el vínculo puede ver".');
  }
  return buf;
}

async function traerBase(): Promise<Base> {
  const [{ data: materias, error: e1 }, { data: cursos, error: e2 }, { data: profesores, error: e3 }, { data: dictados, error: e4 }] = await Promise.all([
    supabaseAdmin.from('materias').select('id, nombre, nivel, es_electiva').range(0, 9999),
    supabaseAdmin.from('cursos').select('id, identificador, turno, anio_carrera').range(0, 9999),
    supabaseAdmin.from('profesores').select('id, nombre_completo').range(0, 19999),
    supabaseAdmin.from('dictados').select('id, materia_id, curso_id, dictado_profesores ( profesor_id )').range(0, 19999),
  ]);
  const error = e1 || e2 || e3 || e4;
  if (error) throw new Error('No pude leer la base.');
  // Sin la migración 12 la tabla no existe: se compara sin horarios
  const { data: horarios } = await supabaseAdmin.from('horarios').select('dictado_id, cuatri, dia, desde, hasta').range(0, 49999);
  return {
    materias: materias || [],
    cursos: cursos || [],
    profesores: profesores || [],
    dictados: (dictados || []).map((d: any) => ({ id: d.id, materia_id: d.materia_id, curso_id: d.curso_id, profesores: (d.dictado_profesores || []).map((dp: any) => dp.profesor_id) })),
    horarios: horarios || [],
  };
}

function juntar(lecturas: LecturaPlanilla[]): LecturaPlanilla {
  return { asignaciones: lecturas.flatMap((l) => l.asignaciones), horarios: lecturas.flatMap((l) => l.horarios), omitidas: lecturas.flatMap((l) => l.omitidas) };
}

/** Vista previa: links de Google Sheets (JSON) o archivos .xlsx / .csv (formulario). */
async function previa(request: Request) {
  const lecturas: LecturaPlanilla[] = [];
  const tipo = request.headers.get('content-type') || '';
  if (tipo.includes('multipart/form-data')) {
    const form = await request.formData();
    const archivos = form.getAll('archivo').filter((a): a is File => a instanceof File).slice(0, 10);
    if (!archivos.length) return json({ error: 'No llegó ningún archivo.' }, 400);
    for (const a of archivos) {
      if (a.size > 20 * 1024 * 1024) return json({ error: `${a.name} es demasiado grande.` }, 400);
      const buf = new Uint8Array(await a.arrayBuffer());
      try {
        lecturas.push(/\.csv$/i.test(a.name) ? leerCsv(new TextDecoder().decode(buf)) : leerPlanilla(leerXlsx(buf)));
      } catch (e: any) {
        return json({ error: `${a.name}: ${e?.message || 'no lo pude leer.'}` }, 400);
      }
    }
  } else {
    const body: any = await request.json().catch(() => null);
    const links: string[] = Array.isArray(body?.links) ? body.links.filter((l: unknown) => typeof l === 'string' && l.trim()).slice(0, 10) : [];
    if (!links.length) return json({ error: 'Pegá al menos un link.' }, 400);
    for (const link of links) {
      try {
        lecturas.push(leerPlanilla(leerXlsx(await bajarPlanilla(link))));
      } catch (e: any) {
        return json({ error: e?.message || 'No pude leer la planilla.' }, 400);
      }
    }
  }
  const lectura = juntar(lecturas);
  if (!lectura.asignaciones.length && !lectura.horarios.length) return json({ error: 'No encontré cursos de Sistemas (con K) en lo que mandaste.', omitidas: lectura.omitidas }, 400);
  const base = await traerBase();
  return json({ previa: compararConBase(lectura.asignaciones, base, lectura.horarios), omitidas: lectura.omitidas, materias: base.materias.map((m) => ({ id: m.id, nombre: m.nombre, nivel: m.nivel })) });
}

const entero = (x: unknown) => (Number.isInteger(x) && (x as number) > 0 ? (x as number) : null);
const texto = (x: unknown, max = 120) => (typeof x === 'string' && limpiar(x).length > 1 ? limpiar(x).slice(0, max) : null);

/** Guarda solo lo que el admin dejó marcado en la vista previa. */
async function aplicar(body: any) {
  const res = { cursos: 0, turnos: 0, profesores: 0, dictados: 0, asignados: 0, quitados: 0, horarios: 0, errores: [] as string[] };
  const cursosNuevos: any[] = Array.isArray(body.cursosNuevos) ? body.cursosNuevos.slice(0, MAX_ITEMS) : [];
  const turnos: any[] = Array.isArray(body.turnos) ? body.turnos.slice(0, MAX_ITEMS) : [];
  const dictados: any[] = Array.isArray(body.dictados) ? body.dictados.slice(0, MAX_ITEMS) : [];

  // 1. Cursos
  const { data: cursosBase } = await supabaseAdmin.from('cursos').select('id, identificador').range(0, 9999);
  const cursoId = new Map((cursosBase || []).map((c) => [String(c.identificador).toUpperCase(), c.id as number]));
  for (const c of cursosNuevos) {
    const ident = typeof c?.identificador === 'string' ? c.identificador.trim().toUpperCase() : '';
    if (!CURSO_K.test(ident)) { res.errores.push(`Curso inválido: ${ident || '?'}`); continue; }
    if (cursoId.has(ident)) continue;
    const turno = TURNOS.has(c.turno) ? c.turno : null;
    if (!turno) { res.errores.push(`Elegí el turno de ${ident}.`); continue; }
    const { data, error } = await supabaseAdmin.from('cursos').insert({ identificador: ident, turno, anio_carrera: parseInt(ident, 10) }).select('id').single();
    if (error || !data) { res.errores.push(`No pude crear el curso ${ident}.`); continue; }
    cursoId.set(ident, data.id);
    res.cursos++;
  }

  // 2. Turnos que cambiaron
  for (const t of turnos) {
    const id = entero(t?.curso_id);
    if (!id || !TURNOS.has(t?.turno)) continue;
    const { error } = await supabaseAdmin.from('cursos').update({ turno: t.turno }).eq('id', id);
    if (error) res.errores.push(`No pude cambiar el turno del curso ${id}.`);
    else res.turnos++;
  }

  // 3. Profesores (se crean una sola vez aunque aparezcan en varios cursos)
  const { data: profBase } = await supabaseAdmin.from('profesores').select('id, nombre_completo').range(0, 19999);
  const profId = new Map((profBase || []).map((p) => [limpiar(p.nombre_completo).toLowerCase(), p.id as number]));
  const idsProf = new Set((profBase || []).map((p) => p.id as number));
  async function profesor(e: any): Promise<number | null> {
    const id = entero(e?.profesor_id);
    if (id) return idsProf.has(id) ? id : null;
    const nombre = texto(e?.nombre);
    if (!nombre) return null;
    const k = nombre.toLowerCase();
    if (profId.has(k)) return profId.get(k)!;
    const { data, error } = await supabaseAdmin.from('profesores').insert({ nombre_completo: nombre }).select('id').single();
    if (error || !data) { res.errores.push(`No pude crear a ${nombre}.`); return null; }
    profId.set(k, data.id);
    idsProf.add(data.id);
    res.profesores++;
    return data.id;
  }

  // 4. Cursos de cada materia y sus equipos
  for (const d of dictados) {
    const materiaId = entero(d?.materia_id);
    const cid = entero(d?.curso_id) || cursoId.get(String(d?.curso || '').toUpperCase()) || null;
    if (!materiaId || !cid) { res.errores.push(`Falta la materia o el curso de ${d?.curso || '?'}.`); continue; }
    let dictadoId: number | null = null;
    const { data: existente } = await supabaseAdmin.from('dictados').select('id').eq('materia_id', materiaId).eq('curso_id', cid).maybeSingle();
    if (existente) dictadoId = existente.id;
    else {
      const { data, error } = await supabaseAdmin.from('dictados').insert({ materia_id: materiaId, curso_id: cid }).select('id').single();
      if (error || !data) { res.errores.push(`No pude crear ${d?.curso} de la materia ${materiaId}.`); continue; }
      dictadoId = data.id;
      res.dictados++;
    }
    const { data: actuales } = await supabaseAdmin.from('dictado_profesores').select('profesor_id').eq('dictado_id', dictadoId);
    const ya = new Set((actuales || []).map((a) => a.profesor_id as number));
    for (const e of (Array.isArray(d.entran) ? d.entran : []).slice(0, 30)) {
      const pid = await profesor(e);
      if (!pid || ya.has(pid)) continue;
      const { error } = await supabaseAdmin.from('dictado_profesores').insert({ dictado_id: dictadoId, profesor_id: pid });
      if (error) res.errores.push(`No pude sumar al profesor ${pid} en ${d?.curso}.`);
      else { res.asignados++; ya.add(pid); }
    }
    for (const s of (Array.isArray(d.salen) ? d.salen : []).slice(0, 30)) {
      const pid = entero(s);
      if (!pid || !ya.has(pid)) continue;
      const { error } = await supabaseAdmin.from('dictado_profesores').delete().eq('dictado_id', dictadoId).eq('profesor_id', pid);
      if (error) res.errores.push(`No pude sacar al profesor ${pid} de ${d?.curso}.`);
      else res.quitados++;
    }
  }

  // 5. Horarios (migración 12): se reemplazan los de cada curso marcado
  const horarios: any[] = Array.isArray(body.horarios) ? body.horarios.slice(0, MAX_ITEMS) : [];
  const porDictado = new Map<number, { dictado_id: number; cuatri: number | null; dia: number; desde: string; hasta: string }[]>();
  for (const h of horarios) {
    const materiaId = entero(h?.materia_id);
    const bloques = bloquesValidos(h?.bloques);
    const cid = entero(h?.curso_id) || cursoId.get(String(h?.curso || '').toUpperCase()) || null;
    if (!materiaId || !cid || !bloques || !bloques.length) { res.errores.push(`Horario inválido de ${h?.curso || '?'}.`); continue; }
    let dictadoId = entero(h?.dictado_id);
    if (!dictadoId) {
      const { data } = await supabaseAdmin.from('dictados').select('id').eq('materia_id', materiaId).eq('curso_id', cid).maybeSingle();
      dictadoId = data?.id ?? null;
    }
    // Una materia que el curso no tenía (por ejemplo, una electiva de un subgrupo): se agrega si lo pidió
    if (!dictadoId && h?.crear === true) {
      const { data, error } = await supabaseAdmin.from('dictados').insert({ materia_id: materiaId, curso_id: cid }).select('id').single();
      if (error || !data) { res.errores.push(`No pude agregar la materia a ${h?.curso || '?'}.`); continue; }
      dictadoId = data.id;
      res.dictados++;
    }
    if (!dictadoId) { res.errores.push(`${h?.curso || '?'} no tiene esa materia: marcá "Agregarla al curso" para crearla.`); continue; }
    if (porDictado.has(dictadoId)) continue;
    porDictado.set(dictadoId, bloques.map((x) => ({ dictado_id: dictadoId, cuatri: x.cuatri, dia: x.dia, desde: horaBase(x.desde), hasta: horaBase(x.hasta) })));
  }
  // Todo junto, en tandas: uno por uno tardaba más de lo que Vercel espera
  // con los cientos de cursos del CSV de los PDF.
  const ids = [...porDictado.keys()];
  for (let i = 0; i < ids.length; i += 200) {
    const tanda = ids.slice(i, i + 200);
    const { error: e1 } = await supabaseAdmin.from('horarios').delete().in('dictado_id', tanda);
    const { error: e2 } = e1 ? { error: e1 } : await supabaseAdmin.from('horarios').insert(tanda.flatMap((id) => porDictado.get(id)!));
    if (e1 || e2) res.errores.push(`No pude guardar ${tanda.length} horarios. ¿Ya corriste la migración 12?`);
    else res.horarios += tanda.length;
  }
  return json({ ok: true, ...res });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await requireAdmin(request, cookies, { requireCsrf: true });
  if (!user) return json({ error: 'No autorizado.' }, 403);
  try {
    if ((request.headers.get('content-type') || '').includes('multipart/form-data')) return await previa(request);
    const body: any = await request.clone().json().catch(() => null);
    if (body?.accion === 'aplicar') return await aplicar(body);
    return await previa(request);
  } catch (e: any) {
    console.error('Error importando:', e?.message);
    return json({ error: e?.message || 'Algo salió mal.' }, 500);
  }
};
