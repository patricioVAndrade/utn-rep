// Ingreso de prueba con contraseña, para Preview y para probar en la compu.
// En Preview solo hay ingreso con mail, y Supabase manda muy pocos por hora:
// con esto Pato entra sin gastar mails. Hacen falta las dos cosas:
//  - INGRESO_PRUEBA=1 cargada en ese entorno (en Vercel, solo en Preview), y
//  - que el entorno NO sea producción (VERCEL_ENV lo pone Vercel solo).
// Así, aunque la variable se cargue por error en Production, queda apagado.
// La contraseña se le pone a mano a una cuenta de la base de prueba
// (docs/INGRESO-CON-MAIL.md); en producción nadie tiene contraseña.

// Se leen cuando llega el pedido (process.env) y, si no están, lo que quedó del build.
const delProceso = (nombre: string): string | undefined => (typeof process !== 'undefined' ? process.env?.[nombre] : undefined);

function entornoVercel(): string {
  return String(delProceso('VERCEL_ENV') || import.meta.env.VERCEL_ENV || '');
}

function interruptor(): string {
  return String(delProceso('INGRESO_PRUEBA') || import.meta.env.INGRESO_PRUEBA || '');
}

export function ingresoPruebaActivo(entorno = entornoVercel(), prendido = interruptor()): boolean {
  return prendido === '1' && entorno !== 'production';
}
