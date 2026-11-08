# Qué se puede probar (base para la colección de Postman)

Pato pidió que, al terminar la etapa 3, armemos una colección de Postman para
probar todo lo nuevo y lo anterior contra el Preview (base de prueba). Esta
lista se completa con cada migración. Desde la migración 10 el desarrollo es
con pruebas primero (TDD): cada endpoint nuevo tiene su prueba en `tests/`.

## Cómo autenticarse en Postman

- **Sin sesión:** nada.
- **Con sesión:** copiar la cookie `sb-…-auth-token` del navegador (Preview, con
  sesión iniciada) a una variable de la colección. Las rutas `/api/*` leen la
  sesión de esa cookie.
- **Admin:** además de la cookie de una cuenta admin, el encabezado
  `x-csrf-token` con el valor de `#admin-csrf[data-t]` de cualquier página del
  panel (y su cookie de CSRF).

## Lo nuevo de la etapa 3

| Migración | Método y ruta | Necesita | Casos a probar | Prueba automática |
|---|---|---|---|---|
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

## Lo que ya estaba antes de la etapa 3

Para completar al armar la colección: búsqueda (`/api/buscar.json`), reseñas
(`POST /api/resenas`, votar, reportar), ingreso (`/api/auth/*`), últimas
experiencias (`/api/finales/ultimas.json`), y el panel de admin (materias,
cursos, profesores, reseñas, reportes, importar y estadísticas).
