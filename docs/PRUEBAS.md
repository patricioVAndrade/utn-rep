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
| 11. Historial de profesores | 8/11 | `0 · 1 · 1 · 0 · false` (ok) |
| 12. Horarios y Mi inscripción | — | Pendiente de correr. Esperado: `2 · 5 · true · false · false` |

### Pruebas con datos (se deshacen solas)

Algunas migraciones tienen además una prueba que hace cambios de verdad y al
final los deshace. Se corren después de la migración y tienen que terminar
con "TODO OK".

| Archivo | Qué prueba |
|---|---|
| `supabase/pruebas/migracion-13.sql` | Sumar el final propio de la misma materia a la reseña (no la marca como editada); otra materia o el final de otra persona → `FN001`; el mismo final en dos reseñas → no; no toca la reseña de otra persona; la vista pública dice "Julio 2026" y no muestra `final_id`; se puede sacar; si se borra el final la reseña queda sin final. |
| `supabase/pruebas/migracion-12.sql` | Un horario se guarda; uno que termina antes de empezar, un domingo o repetido, no. Como una persona con sesión: agrega un curso y la materia la completa la base (no la puede elegir); no agrega en la lista de otro; un solo elegido por materia; lee horarios pero no los cambia; otra persona no ve su lista; sin sesión no se ve ninguna. |
| `supabase/pruebas/migracion-11.sql` | Asignar un profe abre su período; no queda la columna `rol`; sacarlo cierra el período (no lo borra); si vuelve se abre otro; todos los profes de hoy tienen período abierto; el público lee pero no cambia. |

## 2. Pruebas automáticas: `npm test`

Corren sin base (la base se simula con `vi.mock`). Hoy: 193 pruebas en 18 archivos. Las de endpoints usan `tests/base-falsa.ts`, una base de mentira que anota cada consulta y contesta lo que pida la prueba.

| Archivo | Qué prueba |
|---|---|
| `tests/cuenta-api.test.ts` | Migraciones 5 a 9: `POST /api/perfil` (nombre limpio y en la sesión, años, pausa de 30 días, foto de Google solo https y guardada por el servidor, cuenta bloqueada), `POST /api/cuenta/borrar` (BORRAR, dejar anónimo o borrar todo, no borra la cuenta si falla anonimizar), `POST /api/seguir`, `POST /api/avisos` y `/preferencias` (solo los propios; los pedidos de la moderación no se apagan), `GET /api/links/mio` y `POST /api/links/abrir` (código propio no suma, una por visitante, límite por IP). |
| `tests/resenas-api.test.ts` | Reseñas y finales: escribir (curso inexistente, 8 por hora, una por curso), editar (solo texto o "¿Cómo te fue?", ajena → 403), borrar (RLS, el admin con la clave de servicio y anotado), votar y reportar reseñas y finales, y la cuenta bloqueada → 403 en cada escritura. |
| `tests/admin-api.test.ts` | Migraciones 4 y 9 con el control de admin y CSRF de verdad: responder (y volver a responder) reseñas y finales, borrar la respuesta, pedir edición, palabras marcadas, bloquear y desbloquear (no a un admin; queda en el registro). |
| `tests/resena-final.test.ts` | Migración 13: `POST /api/resenas/final` (sin sesión, reseña o final inválidos, sumar, sacar, reseña ajena o inexistente → 404, otra materia → 400, final ya usado → 409, error de la base) y el texto "Rindió en julio 2026". |
| `tests/finales-crear.test.ts` | `POST /api/finales/crear`: sin sesión, datos inválidos, crear devuelve el id, ofrece sumarlo si tenés una reseña de la materia sin final (`sumar`), y sigue andando si la base todavía no tiene la migración 13. |
| `tests/horarios.test.ts` | Migración 12: horas ("8:00" y la fracción del día de Google), siglas (ADSI, IOP, ICS, TPA…), juntar módulos, texto del horario, superposiciones (también por cuatrimestre), grilla de Sistemas con celdas combinadas y dos cuatrimestres, "Electiva 1", horarios de Básicas y qué horarios cambian al importar. CSV de horarios (de los PDF oficiales): una fila por módulo, anual o por cuatrimestre, filas que no entiende, le gana a las planillas, materia que no está en la base (se pide en "Materias que no encontré") y curso que no está en la base. |
| `tests/importar-api.test.ts` | `POST /api/admin/importar`: sin ser admin → 403; un CSV con solo horarios se puede revisar; sin cursos K → 400; guardar el horario de una materia que el curso no tiene: sin `crear` no guarda, con `crear: true` agrega la materia al curso y guarda. |
| `tests/inscripcion.test.ts` | Migración 12: `POST /api/inscripcion` (sin sesión, acción inválida, agregar, repetido, curso inexistente, tope de 80, quitar, quitar materia, elegir, no elegir, traer la lista del navegador, error de la base), el link `?c=`, el texto de la combinación de turnos y la nota promedio. |
| `tests/profesores-historial.test.ts` | Migración 11: cuatrimestre según la fecha (hora de Córdoba) y texto del período. |
| `tests/en-linea.test.ts` | Migración 10: texto siempre (0, 1 o varias), `POST /api/en-linea` (visitante inválido, body roto, límite por IP, respuesta). |
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
| 17 | `GET /api/cron/mails` (`?prueba=1` no manda) y `POST /api/avisos/baja` `{ u, t }` | `Authorization: Bearer CRON_SECRET` / link firmado | Sin el secreto → 401. Con `?prueba=1` → presupuesto (`usados`, `reserva`, `disponible`) y asuntos, sin mandar. Una persona con varios avisos recibe un solo mail; al otro día no recibe de nuevo lo mismo; lo leído en el sitio no se manda; con `disponible` en 0 no sale nada y queda para mañana; cuenta bloqueada no recibe. Link de ingreso con el tope alcanzado → 503 "Entrá con Google o GitHub". Baja con firma mala → 400; buena → apaga todos los mails (Mi cuenta muestra "Mail" apagado). | Pendiente (se prueba todo junto al final) |
| 16 | `POST /api/logros/detective` y los logros nuevos | Sesión | Sin sesión → 401. Cinco toques en "Anónimo" → `{ nuevo: true }` la primera vez, después `false`. Cada logro nuevo aparece en Mi cuenta y deja un aviso. La reseña más votada del curso (3 o más) dice "La más útil del curso". | Pendiente (se prueba todo junto al final) |
| 15 | Cualquier página con sesión (la primera del día) | Sesión | Con un curso de 1.er cuatrimestre elegido en Mi inscripción antes del 1/8 y sin reseña, del 1/8 al 7/12 aparece "¿Cómo te fue en …?" en Avisos; no se repite; con "Al terminar el cuatrimestre" apagado en Mi cuenta no aparece. Desde el 8/12, lo mismo con los de 2.º y anuales; desde el 1/3 se repite a quien no reseñó. Cookie `rec_cuatri` con la fecha del día. | Pendiente (se prueba todo junto al final) |
| — | Curso con menos de 5 reseñas (F31) | Nada | Aparece "Pedir reseñas en el grupo"; con 5 o más, no. El link lleva `?de=` si hay sesión. | Pendiente (se prueba todo junto al final) |
| 14 | Inicio | Nada | "Visitas esta semana" sube 1 con un navegador nuevo y no con el mismo el mismo día. Con menos de 100 se ve "esta semana" (reseñas). | Pendiente (se prueba todo junto al final) |
| 13 | `POST /api/resenas/final` `{ resena_id, final_id }` (`final_id: null` lo saca) | Sesión (dueño) | Sin sesión → 401. Datos inválidos → 400. Final de otra materia o de otra persona → 400. El mismo final en otra reseña → 409. Reseña ajena → 404. Sumar → la reseña dice "Rindió en …" en el curso. | `tests/resena-final.test.ts`, `supabase/pruebas/migracion-13.sql` |
| 13 | `POST /api/finales/crear` | Sesión | Devuelve `{ id, sumar }`: `sumar` es el id de tu reseña de esa materia sin final (o `null`). | `tests/finales-crear.test.ts` |
| 12 | `POST /api/inscripcion` `{ accion: agregar \| quitar \| elegir \| no_elegir, dictado_id }`, `{ accion: quitar_materia, materia_id }`, `{ accion: traer, dictados, elegidos }` | Sesión | Sin sesión → 401. Acción o curso inválido → 400. Agregar dos veces → 200. Curso inexistente → 404. Más de 80 → 400. Elegir otro curso de la misma materia desmarca el anterior. Traer suma la lista sin repetir y solo elige cursos de la lista. | `tests/inscripcion.test.ts` |
| 12 | `POST /api/admin/importar` (vista previa con links o archivo) y `{ accion: aplicar, horarios: [{ curso_id, materia_id, dictado_id, crear?, bloques }] }` | Admin + CSRF | La vista previa trae `previa.horarios` (solo los nuevos o distintos), `horariosIguales` y `horariosSinCurso`; acepta un CSV con solo horarios (curso, materia, cuatrimestre, dia, desde, hasta). Guardar reemplaza el horario de cada curso marcado; si el curso no tiene la materia, con `crear: true` se la agrega (cuenta en `dictados`); bloques inválidos → error en `errores`. Volver a leer → 0 horarios distintos. | `tests/horarios.test.ts` (lectura y comparación), `tests/importar-api.test.ts` |
| 11 | `POST /api/admin/dictados` `{ action: remove_profesor, dictado_id, profesor_id }` y después `assign_profesor` | Admin + CSRF | Sacar al profe del curso deja "Antes: …" en Materias y cursos (el período se cierra). Volver a asignarlo abre otro. Se comprueba en la base con `migracion-11.sql`. | `supabase/pruebas/migracion-11.sql` |
| 10 | `POST /api/en-linea` `{ visitante }` | Nada | Visitante inválido → 400. Válido → 200 `{ n, texto, corto }`. Siempre manda el número, también con 0 ("Nadie en línea ahora"). Muchos pedidos de una IP (más de 300 por minuto) → 429. | `tests/en-linea.test.ts` |
| 9 | `GET /api/links/mio` | Sesión | Con sesión → `{ codigo }` (siempre el mismo). Sin sesión → `{ codigo: null }`. | `tests/cuenta-api.test.ts` |
| 9 | `POST /api/links/abrir` `{ codigo, visitante, ruta }` | Nada | Código o visitante inválidos → 400. Código ajeno → `{ ok: true }` y suma 1 en Admin. El mismo visitante otra vez no suma. El código propio → `{ ok: false }`. | `tests/cuenta-api.test.ts` |
| 9 | `POST /api/admin/usuarios` `{ accion: bloquear, user_id, motivo }` | Admin + CSRF | Sin CSRF → 403. Bloquear un admin → 400. Bloquear → 200 y la cuenta ya no puede escribir (siguiente fila). Desbloquear → 200. | `tests/admin-api.test.ts` |
| 9 | Cualquier escritura con una cuenta bloqueada | Sesión bloqueada | `POST /api/resenas`, `PUT /api/resenas/{id}` (o `POST` con `_method: PUT`), votar, reportar, finales y `POST /api/perfil` (nombre) → 403 "Tu cuenta está bloqueada". | `tests/resenas-api.test.ts`, `tests/cuenta-api.test.ts` |
| 8 | `POST /api/perfil` `{ foto: "google" }` | Sesión | Guarda la foto de Google para las reseñas; con `inicial` o `dibujo` la borra. | `tests/cuenta-api.test.ts` |
| 7 | `GET/POST /api/avisos`, `POST /api/avisos/preferencias` | Sesión | Marcar leídos, borrar, apagar un tipo de aviso. | `tests/cuenta-api.test.ts` |
| 6 | `POST /api/seguir` | Sesión | Seguir, dejar de seguir, mail sí o no. | `tests/cuenta-api.test.ts` |
| 5 | `POST /api/perfil`, `POST /api/cuenta/borrar` | Sesión | Nombre, foto, años; borrar dejando anónimo o borrando todo. | `tests/cuenta-api.test.ts` |
| 4 | `POST /api/admin/moderacion` | Admin + CSRF | Responder, pedir edición, palabras marcadas. | `tests/admin-api.test.ts` |
| 3 | `PUT /api/resenas/{id}` (o `POST` con `_method: PUT`) | Sesión (dueño) | Cambiar texto o "¿Cómo te fue?"; sin cambios → 400. | `tests/resenas-api.test.ts` |
| 1 y 2 | `POST /api/finales/crear`, `/votar`, `/reportar` | Sesión | Con nombre o anónima; votar dos veces; reportar dos veces → 409. | `tests/finales-crear.test.ts`, `tests/resenas-api.test.ts` |

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
- Importar las planillas de Sistemas y Básicas: ver los horarios en la vista previa, guardarlos y ver el panel "Horario" en cada curso.
- Subir `datos/horarios-2026-pdf.csv` (los PDF oficiales): elegir las materias que no encontró, guardar y volver a leer (tiene que dar 0 horarios distintos).
- "Lo estoy pensando" en un curso, sin sesión (queda en el navegador) y con sesión; al iniciar sesión, lo del navegador pasa a la cuenta.
- Mi inscripción: elegir uno por materia, "Tu combinación", aviso de horarios que se pisan, Sacar, Quitar materia, "Mandársela a un amigo" y abrir ese link en otro navegador ("La inscripción que te pasaron" y "Sumar a mi lista").
- Sacar un profe de un curso en Admin > Materias y cursos y ver "Antes: nombre (período)" debajo.
- Mail del día: que llegue a Gmail y a Hotmail (no a spam), se vea bien en el celular y en modo oscuro, y el link "dejá de recibir mails" lleve a /baja.
- Mi cuenta: interruptor "Mail" de cada aviso.
- Cada página a 390 px y en modo noche.
