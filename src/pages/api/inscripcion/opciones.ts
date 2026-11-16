import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { materiasSim } from '../../../lib/simulador';

/** GET /api/inscripcion/opciones?materia=ID: los cursos de esa materia para el simulador (datos públicos). */
export const GET: APIRoute = async ({ url }) => {
  const materia = Number(url.searchParams.get('materia'));
  if (!Number.isInteger(materia) || materia <= 0) return json({ error: 'Materia inválida.' }, 400);
  try {
    const [m] = await materiasSim([materia]);
    if (!m) return json({ error: 'Esa materia no existe.' }, 404);
    return json({ materia: m });
  } catch (e) {
    console.error('Error en opciones del simulador:', e);
    return json({ error: 'No se pudieron traer los cursos.' }, 500);
  }
};
