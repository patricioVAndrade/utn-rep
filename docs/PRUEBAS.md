# Todas las pruebas de UTN REP

Un solo lugar para todo lo que se puede probar: la base, las pruebas
automáticas y los endpoints (que al terminar la etapa 3 pasan a una colección
de Postman). Se completa con cada migración. Desde la migración 10 el
desarrollo es con pruebas primero (TDD).

## 1. Base de datos: `supabase/pruebas/verificar-todo.sql`

Un solo SQL que revisa todas las migraciones de la etapa 3: tablas, triggers y,
sobre todo, permisos (lo que el público y los usuarios **no** tienen que poder
hacer). Solo lee. Se pega entero en el SQL Editor de Supabase y devuelve una
fila por prueba; la columna `ok` tiene que decir `true` en todas. Los que
fallan salen primero. Sirve para la base de prueba y para producción después
de migrar.

Resultados de cada migración en la base de prueba (los que pegó Pato):

| Migración | Fecha | Resultado |
|---|---|---|
| 1. Autor en finales | 7/11 | Ok |
| 2. "Me sirvió" y reportes en finales | 7/11 | Ok |
| 3. Edición de reseñas y plan | 7/11 | `2 · 1 · true · 686` |
| 4. Moderación | 7/11 | `3 · 2 · 1 · 1 · true · false · false` |
| 5. Perfiles | 7/11 | `1 · 2 · false · false · 0` |
| 6. Seguir materias | 7/11 | `1 · 4 · false` |
| 7. Avisos | 7/11 | `2 · 4 · false · false` |
| 8. Logros | 7/11 | `1 · 2 · false · false · 0` (falta volver a correrla por el nombre de L4) |
| 9. Usuarios y links | 8/11 | `2 · 2 · 8 · false · false · false` |
| 10. En línea | 8/11 | `1 · 2 · false · false · true` |
| 11. Historial de profesores y rol | — | Pendiente de correr. Esperado: `1 · 1 · 1 · 0 · false` |

### Pruebas con datos (se deshacen solas)

Algunas migraciones tienen además una prueba que hace cambios de verdad y al
final los deshace. Se corren después de la migración y tienen que terminar
con "TODO OK".

| Archivo | Qué prueba |
|---|---|
| `supabase/pruebas/migracion-11.sql` | Asignar un profe abre su período; el rol pasa al historial; un rol inventado no entra; sacarlo cierra el período (no lo borra); si vuelve se abre otro; todos los profes de hoy tienen período abierto; el público lee pero no cambia. |

## 2. Pruebas automáticas: `npm test`

Corren sin base (la base se simula con `vi.mock`). Hoy: 94 pruebas en 10 archivos.

| Archivo | Qué prueba |
|---|---|
| `tests/profesores-historial.test.ts` | Migración 11: roles, cómo se escribe cada uno, cuatrimestre según la fecha (hora de Córdoba), texto del período y `set_rol` del admin (sin admin, datos que faltan, rol inválido, vacío lo borra, error de la base). |
| `tests/en-linea.test.ts` | Migración 10: regla de 5 personas, texto, `POST /api/en-linea` (visitante inválido, body roto, límite por IP, respuesta). |
| `tests/logros.test.ts` | Migración 8: rango según reseñas y cuánto falta para el próximo. |
| `tests/palabras.test.ts` | Migración 4: palabras marcadas (acentos, mayúsculas, palabras parecidas). |
| `tests/validation.test.ts` | Lo que acepta cada formulario: reseña nueva y edición, voto, reporte, final, perfil y borrar cuenta. |
| `tests/importar.test.ts` | Importador: lectura de .xlsx y CSV, planillas de Sistemas y Básicas, coincidencias con la base, vista previa. |
| `tests/rate-limit.test.ts` | Límite de pedidos (en la base y en memoria si la base falla). |
| `tests/redirect.test.ts` | Volver a la página de antes sin abrir redirecciones a otros sitios. |
| `tests/auth-validation.test.ts` | Mails y nombres al ingresar. |
| `tests/format-request.test.ts` | Fechas relativas, estrellas, colores por año, IP del cliente, "Editada el". |

## 3. Endpoints (base para Postman)

### Cómo autenticarse

- **Sin sesión:** nada.
- **Con sesión:** copiar la cookie `sb-…-auth-token` del navegador (Preview, con
  sesión iniciada) a una variable de la colección. Las rutas `/api/*` leen la
  sesión de esa cookie.
- **Admin:** además de la cookie de una cuenta admin, el encabezado
  `x-csrf-token` con el valor de `#admin-csrf[data-t]` de cualquier página del
  panel (y su cookie de CSRF).

### Lo nuevo de la etapa 3

| Migración | Método y ruta | Necesita | Casos a probar | Prueba automática |
|---|---|---|---|---|
| 11 | `POST /api/admin/dictados` `{ action: set_rol, dictado_id, profesor_id, rol }` | Admin + CSRF | Rol inválido → 400. "Jefe de trabajos prácticos" → guarda `JTP`. Vacío → lo borra. Después, el rol se ve en el curso y en el profe. Sacar al profe del curso deja "Antes: …" en Materias y cursos. | `tests/profesores-historial.test.ts` |
| 10 | `POST /api/en-linea` `{ visitante }` | Nada | Visitante inválido → 400. Válido → 200 `{ n, texto, corto }`. Con menos de 5 personas, `n`, `texto` y `corto` vienen en `null`. Muchos pedidos de una IP (más de 300 por minuto) → 429. | `tests/en-linea.test.ts` |
| 9 | `GET /api/links/mio` | Sesión | Con sesión → `{ codigo }` (siempre el mismo). Sin sesión → `{ codigo: null }`. | Falta |
| 9 | `POST /api/links/abrir` `{ codigo, visitante, ruta }` | Nada | Código o visitante inválidos → 400. Código ajeno → `{ ok: true }` y suma 1 en Admin. El mismo visitante otra vez no suma. El código propio → `{ ok: false }`. | Falta |
| 9 | `POST /api/admin/usuarios` `{ accion: bloquear, user_id, motivo }` | Admin + CSRF | Sin CSRF → 403. Bloquear un admin → 400. Bloquear → 200 y la cuenta ya no puede escribir (siguiente fila). Desbloquear → 200. | Falta |
| 9 | Cualquier escritura con una cuenta bloqueada | Sesión bloqueada | `POST /api/resenas`, `PATCH /api/resenas/{id}`, votar, reportar, finales y `POST /api/perfil` (nombre) → 403 "Tu cuenta está bloqueada". | Falta |
| 8 | `POST /api/perfil` `{ foto: "google" }` | Sesión | Guarda la foto de Google para las reseñas; con `inicial` o `dibujo` la borra. | Falta |
| 7 | `GET/POST /api/avisos`, `POST /api/avisos/preferencias` | Sesión | Marcar leídos, borrar, apagar un tipo de aviso. | Falta |
| 6 | `POST /api/seguir` | Sesión | Seguir, dejar de seguir, mail sí o no. | Falta |
| 5 | `POST /api/perfil`, `POST /api/cuenta/borrar` | Sesión | Nombre, foto, años; borrar dejando anónimo o borrando todo. | Falta |
| 4 | `POST /api/admin/moderacion` | Admin + CSRF | Responder, pedir edición, palabras marcadas. | Falta |
| 3 | `PATCH /api/resenas/{id}` | Sesión (dueño) | Cambiar texto o "¿Cómo te fue?"; sin cambios → 400. | Parcial (`validation.test.ts`) |
| 1 y 2 | `POST /api/finales/crear`, `/votar`, `/reportar` | Sesión | Con nombre o anónima; votar dos veces; reportar dos veces → 409. | Falta |

### Lo que ya estaba antes de la etapa 3

Para completar al armar la colección: búsqueda (`/api/buscar.json`), reseñas
(`POST /api/resenas`, votar, reportar), ingreso (`/api/auth/*`), últimas
experiencias (`/api/finales/ultimas.json`), y el panel de admin (materias,
cursos, profesores, reseñas, reportes, importar y estadísticas).

## 4. A mano en el Preview

Lo que no se puede probar con Postman porque es de pantalla:

- Ficha al tocar un nombre (con ficha visible, oculta y "Anónimo") en un curso, en el inicio y en la página del año.
- Escudo, logros y foto en tus reseñas con nombre; rango y logros en Mi cuenta; cartel en Reseña publicada.
- Franja verde al abrir un link con `?de=` en otro navegador; que la dirección quede sin `?de=`.
- "Hay X estudiantes en línea" con 5 pestañas o más (en navegadores distintos o en incógnito).
- Cuenta bloqueada: aviso en Escribir una reseña y en Compartir mi experiencia.
- Rol al lado del nombre del profe en el curso y en la página del profe; elegir el rol en Admin > Materias y cursos.
- Cada página a 390 px y en modo noche.
