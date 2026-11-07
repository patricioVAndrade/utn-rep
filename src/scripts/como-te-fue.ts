// "¿Cómo te fue?" (F38): quien escribió la reseña completa cómo le fue en la cursada.
// Lo usan la franja del inicio y Mis reseñas.
export async function responderComoTeFue(resenaId: string, condicion: string): Promise<{ updated_at?: string | null }> {
  const res = await fetch(`/api/resenas/${resenaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _method: 'PUT', condicion_final: condicion }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo guardar. Probá de nuevo.');
  return data;
}

// Preferencia de la franja del inicio (en el navegador hasta que exista Mi cuenta con base)
const CLAVE = 'comoTeFue';
const DIAS_30 = 30 * 24 * 60 * 60 * 1000;
export function franjaApagada(): boolean {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return !!p && (p.nunca === true || (typeof p.hasta === 'number' && p.hasta > Date.now()));
  } catch {
    return false;
  }
}
export function apagarFranja(siempre: boolean) {
  try { localStorage.setItem(CLAVE, JSON.stringify(siempre ? { nunca: true } : { hasta: Date.now() + DIAS_30 })); } catch {}
}
