# Auditoría de seguridad (16/11/2026)

Revisión completa antes de pasar a producción: el código de la rama del rediseño, las 24 migraciones, las claves y las dependencias.

## En resumen

No encontré nada grave. Encontré un problema medio (los nombres se podían saltear la regla de "solo letras") y algunos bajos. El medio y tres de los bajos ya están arreglados en la rama (commit 14c91fc). Lo que queda es de riesgo bajo y está explicado abajo.

## Lo que está bien

- **Admin:** cada acción pide ser admin (`ADMIN_IDS`, del lado del servidor) y un código CSRF (cookie `SameSite=strict` más encabezado), y además revisa que el pedido venga del mismo sitio (`sec-fetch-site` u `origin`). El cambio del 12/11 por el 403 en la Preview sigue siendo seguro: solo acepta el mismo sitio.
- **Sesión:** las cookies de Supabase son `httpOnly` y `SameSite=lax`. El ingreso con PKCE exige el mismo navegador. `auth_returnTo` solo acepta direcciones del mismo sitio.
- **Base:** todas las tablas tienen RLS. Las 46 funciones `SECURITY DEFINER` fijan `search_path`. Las vistas públicas no muestran `user_id`. La cuenta bloqueada la frena la base (`UB001`), no solo el sitio.
- **Fichas y anonimato:** la ficha de quien escribe la arma el servidor; el `user_id` nunca llega al navegador.
- **Claves:** ninguna está en el código ni en el repositorio. Las del cron, Telegram y la baja de mails se comparan en tiempo constante (`timingSafeEqual`) o con firma HMAC.
- **Ingreso de prueba:** solo en los deploys de Preview; en producción y en utnrep.app no existe aunque alguien llame a la dirección.
- **Lo que se muestra:** todo lo que escribe un estudiante pasa escapado. Encabezados de seguridad puestos (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS).
- **Límites:** escribir reseñas y finales, votar, reportar finales, pedir el link de ingreso y abrir links compartidos tienen límite de pedidos.

## Lo que arreglé

| Qué | Riesgo | Arreglo |
|---|---|---|
| El nombre se controlaba solo en `/api/perfil`. Con tu propia sesión se podía escribir directo en `perfiles` o cambiar el nombre de la cuenta de Google o GitHub, y aparecer con números, símbolos o una palabra marcada. | Medio | Migración 21: la base controla el nombre nuevo (`NM001`), usa el de Google o GitHub solo si cumple, y pone ella el nombre del autor de un final. |
| Una cuenta bloqueada podía editar sus experiencias de finales. | Bajo | `/api/finales/acciones` revisa el bloqueo antes de editar. |
| El JSON del buscador de Google (schema) no escapaba `<`. Hoy lo arma el sitio, pero un nombre de materia raro lo podía romper. | Bajo | Se escapa. |
| En Escribir reseña, tu nombre viaja en un `<script>` y Astro 5 no lo escapa del todo. Solo te afectaba a vos y ya no se puede con la migración 21. | Bajo | Se le sacan `<` y `>`. |
| Dependencias viejas con avisos de seguridad. | Bajo | Astro 7, adaptador de Vercel 11, Vitest 4, `satori` 0.63 y `npm audit fix`. `npm audit` da 0. |

## Lo que queda (riesgo bajo)

- ~~Astro 5 y el adaptador de Vercel tenían avisos que solo se arreglaban pasando a Astro 7.~~ Hecho el 16/11 (elegiste actualizar antes de las pruebas): Astro 7.4, adaptador de Vercel 11, Vitest 4 y Zod 4. `npm audit` da 0 avisos. La imagen al compartir lleva `boxSizing: border-box` explícito, porque con Astro 7 el servidor de desarrollo la dibujaba corrida.
- **`/api/telegram/despachar` tiene un límite global.** Alguien podría gastarlo y demorar los avisos de Telegram hasta el repaso diario del cron. No filtra nada.
- **La imagen al compartir (`/og/...`) y `/api/inscripcion/opciones` no tienen límite.** Vercel cachea las imágenes; lo peor es gastar tiempo de funciones.
- **La CSP permite `unsafe-inline`.** Lo necesitan los scripts en línea de Astro. Sacarlo es un cambio grande y el escapado ya cubre el riesgo.
- **Algunos mensajes de error del admin nombran `ADMIN_IDS`.** Solo lo ve quien no es admin y no revela ningún dato.

## Qué hacer en producción

1. Correr la migración 21 junto con las demás (paso 5.5 de `para-verificar.md`).
2. Revisar que en Vercel, para producción, `ADMIN_IDS` tenga solo tu id y que `INGRESO_PRUEBA` no exista.
3. En Supabase, Authentication > URL Configuration: que las direcciones permitidas sean solo las de utnrep.app (y las de Preview si las seguís usando).
