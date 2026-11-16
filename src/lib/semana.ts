// La escala de la semana del simulador (Mi inscripción y su imagen al
// compartir): de qué hora a qué hora va y dónde cae cada minuto. Dos horas o
// más sin ninguna clase (mañana y noche, por ejemplo) se achican a una franja
// de `hueco` px que dice "Sin clases de X a Y".
export type Escala = {
  desde: number;
  hasta: number;
  /** Los huecos achicados, en minutos desde las 0:00. */
  cortos: [number, number][];
  /** Alto total en px. */
  alto: number;
  y: (t: number) => number;
  enHueco: (t: number) => boolean;
};

export function escalaSemana(bloques: { desde: number; hasta: number }[], ppm: number, hueco = 26): Escala {
  const desde = bloques.length ? Math.floor(Math.min(...bloques.map((b) => b.desde)) / 60) * 60 : 480;
  const hasta = bloques.length ? Math.ceil(Math.max(...bloques.map((b) => b.hasta)) / 60) * 60 : 780;
  const libre = (h: number) => !bloques.some((b) => b.desde < h + 60 && b.hasta > h);
  const huecos: [number, number][] = [];
  for (let h = desde; h < hasta; h += 60) {
    if (!libre(h)) continue;
    const u = huecos[huecos.length - 1];
    if (u && u[1] === h) u[1] = h + 60; else huecos.push([h, h + 60]);
  }
  const cortos = huecos.filter(([a, z]) => z - a >= 120);
  const y = (t: number) => {
    let v = (t - desde) * ppm;
    for (const [a, z] of cortos) { if (t >= z) v -= (z - a) * ppm - hueco; else if (t > a) v -= (t - a) * ppm - ((t - a) / (z - a)) * hueco; }
    return v;
  };
  const enHueco = (t: number) => cortos.some(([a, z]) => t > a && t < z);
  return { desde, hasta, cortos, alto: y(hasta), y, enHueco };
}

/** Minutos que se dibujan a escala (sin los huecos achicados). */
export function minutosVisibles(e: Escala): number {
  return e.hasta - e.desde - e.cortos.reduce((a, [x, z]) => a + z - x, 0);
}

/** Carril de cada bloque de un día: si dos se pisan, van uno al lado del otro. */
export function carriles<T extends { desde: number; hasta: number }>(del: T[]): Map<T, { k: number; n: number }> {
  const orden = [...del].sort((a, b) => a.desde - b.desde);
  const carril = new Map<T, number>();
  const fin: number[] = [];
  orden.forEach((b) => { let k = fin.findIndex((z) => z <= b.desde); if (k < 0) { k = fin.length; fin.push(0); } fin[k] = b.hasta; carril.set(b, k); });
  const pisa = (x: T, y: T) => Math.max(x.desde, y.desde) < Math.min(x.hasta, y.hasta);
  const out = new Map<T, { k: number; n: number }>();
  orden.forEach((b) => {
    const grupo = orden.filter((o) => o === b || pisa(o, b));
    out.set(b, { k: carril.get(b)!, n: Math.max(...grupo.map((o) => carril.get(o)!)) + 1 });
  });
  return out;
}
