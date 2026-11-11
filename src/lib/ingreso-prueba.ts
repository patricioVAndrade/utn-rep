// Ingreso de prueba con contraseña, para Preview y para probar en la compu.
// En Preview solo hay ingreso con mail, y Supabase manda muy pocos por hora:
// con esto Pato entra sin gastar mails.
//  - En los deploys de Preview de Vercel aparece solo (VERCEL_ENV=preview, que
//    pone Vercel). No hay que cargar ninguna variable ni volver a desplegar.
//  - En la compu, con INGRESO_PRUEBA=1.
//  - En producción nunca: ni con VERCEL_ENV=production ni en utnrep.app, aunque
//    alguien cargue la variable por error.
// La contraseña se le pone a mano a una cuenta de la base de prueba
// (docs/INGRESO-DE-PRUEBA.md); en producción nadie tiene contraseña.

// Se leen cuando llega el pedido (process.env) y, si no están, lo que quedó del build.
const delProceso = (nombre: string): string | undefined => (typeof process !== 'undefined' ? process.env?.[nombre] : undefined);

function entornoVercel(): string {
  return String(delProceso('VERCEL_ENV') || import.meta.env.VERCEL_ENV || '');
}

function interruptor(): string {
  return String(delProceso('INGRESO_PRUEBA') || import.meta.env.INGRESO_PRUEBA || '');
}

/** `host` es el dominio del pedido (url.hostname). */
export function ingresoPruebaActivo(host: string, entorno = entornoVercel(), prendido = interruptor()): boolean {
  if (entorno === 'production') return false;
  if (/(^|\.)utnrep\.app$/i.test(host)) return false;
  return entorno === 'preview' || prendido === '1';
}
