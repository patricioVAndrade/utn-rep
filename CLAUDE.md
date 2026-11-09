# Contexto para asistentes de IA

Leé esto antes de tocar el código. Resume de qué se trata el proyecto, qué se decidió y qué falta.

## El proyecto

UTN REP (https://utnrep.app) es un sitio de reseñas de materias, cursos y profesores de Ingeniería en Sistemas de la UTN Facultad Regional Córdoba. Lo mantiene Patricio Valentín Andrade (Pato). El público son estudiantes: los textos van en español rioplatense con voseo ("Escribí", "Contá", "Iniciá sesión").

Stack: Astro 5 con SSR en Vercel, Supabase (Postgres, Auth y RLS), Tailwind v4 y TypeScript. Ver `README.md` para la arquitectura.

## Terminología (no mezclar)

- **Materia** (o cátedra): por ejemplo "Análisis Matemático I". Tabla `materias`.
- **Curso**: el grupo, por ejemplo 1K3. Tabla `cursos`.
- **Dictado**: una materia en un curso, con su equipo docente. Tabla `dictados`. En la interfaz se le dice "curso", nunca "dictado".
- Las reseñas son de un dictado entero, no de un profesor.

## Reglas de trabajo con Pato

- Nada se publica sin que Pato lo vea antes. Se trabaja en ramas; Pato decide cuándo se mergea a `main`.
- Hay una **base de prueba** aparte (otro proyecto de Supabase) que usan los deploys de Preview de Vercel. Producción no se toca para probar.
- Las claves nunca se piden ni se pegan en el chat. Pato las carga él en Vercel y Supabase.
- Cambios en la base: primero en la base de prueba, con una migración en `supabase/migrations/` y su vuelta atrás en `supabase/rollback/`.

## Rediseño estilo foro (en curso)

Objetivo: publicarlo a mediados de diciembre de 2026, cuando terminan las cursadas.

- Las maquetas están en la carpeta del proyecto (`propuestas/`). La última es la V6; las decisiones de Pato están en `propuestas/decisiones-diseno.md`.
- **Qué de la V6 está hecho y qué falta: `docs/REDISENO-V6.md`.** Mantenelo al día en cada cambio del rediseño.
- Etapa 1 (hecha): el look nuevo en todas las páginas. Etapa 2 (hecha): funcionalidades sin cambios en la base. Revisión del 7/11 (hecha): pantallas fieles a la V6, etiquetas sin neón (opción C), importador y admin nuevo. Etapa 3 (pendiente): rangos, logros, ficha de usuario, respuestas, notas de moderación, seguir materias, notificaciones, contador en línea, "Me sirvió" y autor en finales, Mi cuenta y el resto del admin. El listado completo de lo que falta está en `propuestas/rama/falta-implementar.md` (carpeta del proyecto).
- Pendiente de Pato: elegir el logo (rediseño de D y F, 9/11). Logros votados y hechos (migración 16). Cartel de bienvenida, "Qué cambió", Términos e imagen por página: aprobados y hechos.
- Cambios de profesores (F22 a F27): después de marzo de 2027.

## Cómo está armado el diseño

- Estilos en `src/styles/foro.css`, todo dentro de `@layer components`, con variables de color en `:root` y `html[data-theme="dark"]`. Las utilidades de Tailwind (`hidden`, etc.) le ganan a estas clases.
- Ojo con nombres de clase que ya son utilidades de Tailwind: por ejemplo `collapse` pone `visibility: collapse` y escondió tablas. Antes de inventar una clase, fijate que no exista como utilidad.
- Un `style="display:..."` en línea le gana a `.hidden`: para alternar algo que tiene display en línea, cambiá `style.display`.
- El diseño se adapta con container queries sobre `.forum` (820 px y 600 px). Por debajo de 600 px aparece la barra inferior y las tablas pasan a tarjetas (`.grid-tbl.stack`).
- Rangos, logros y ficha (migración 8): los logros los da la base (`revisar_logros`); el rango sale de contar reseñas (`src/lib/logros.ts`). La ficha de quien escribió la arma el servidor con la clave de servicio (`src/lib/fichas.ts`, el user_id nunca llega al navegador) y se muestra con `Quien.astro` (también el cartel de "Anónimo"). `foto_url` solo la escribe `/api/perfil`.
- Bloqueo y links (migración 9): una cuenta bloqueada la frena la base (error `UB001`, `esBloqueo()` y `cuentaBloqueada()` de `src/lib/http.ts`). Los links compartidos llevan `?de=código` (`src/lib/links.ts`, `src/scripts/links.ts`); la apertura la anota el navegador y el Layout muestra la franja verde (prop `compartido`). Las rutas `/api/*` no tienen `locals.user`: leé la sesión con `createSupabaseServerClient`.
- Profesores (migración 11): `dictado_profesores` son los de hoy (sin rol: Pato no quiere mostrar Titular, JTP, etc.); el historial (`profesores_historial`, desde y hasta) lo llevan triggers al agregar o sacar, así que no hace falta tocarlo desde el código. Textos en `src/lib/profesores.ts`.
- Horarios y Mi inscripción (migración 12): `horarios` la llena el importador (`leerGrillaSistemas` y Básicas en `src/lib/planilla.ts`; horas, siglas y superposiciones en `src/lib/horarios.ts`, en minutos desde las 0:00); también acepta un CSV de horarios, que gana sobre las planillas. Los de 2026 salen de los PDF oficiales de la facultad: `scripts/horarios-pdf/` (`extraer.py` y `armar.py` con pdfplumber; `cruzar.ts` avisa qué no coincide con lo cargado; los nombres van como en el PDF y el importador busca la materia) arma `datos/horarios-2026-pdf.csv`. `inscripcion_cursos` es "Lo estoy pensando" (`/api/inscripcion`, `PensandoBoton.astro`); sin sesión vive en `localStorage` (`miInscripcion`, `src/scripts/inscripcion.ts`) y viaja en el link `/mi-inscripcion?c=…&e=…&mia=1`; sin `mia=1` es una lista que te pasaron.
- Final en la reseña (migración 13, F34): `resenas.final_id`; la base controla que sea tuyo y de la misma materia (`FN001`). Se suma o saca con `/api/resenas/final` (Mis reseñas); `/api/finales/crear` devuelve `sumar` si tenés una reseña de esa materia sin final. La vista trae `final_mesa` y `final_anio` y `ReviewCard` muestra `rindioTexto()`.
- Visitas (migración 14, F14): `latido()` también anota `visitas_dia` (un navegador por día); `visitasSemana()` de `src/lib/en-linea.ts` las cuenta para "Así viene el cuatri".
- Recordatorio de fin de cuatrimestre (migración 15, F32): `recordar_fin_cuatri()` crea los avisos con `auth.uid()`; el middleware la llama una vez por día por navegador (`src/lib/recordatorio.ts`, cookie `rec_cuatri`).
- Pedí reseñas en el grupo (F31, sin base): en el curso, con menos de `POCAS_RESENAS` (5), panel con `ShareButton` (`sinNuevo`) que comparte el curso; la franja de `?de=` invita a escribir.
- Logros nuevos (migración 16): `revisar_logros()` da L1 a L20 (sin L7, L11, L16) con `dar_logro()` y `titulo_logro()`; L9 Detective lo da `ganar_detective()` desde `/api/logros/detective` (cinco toques en "Anónimo", `Quien.astro`). En el curso, la reseña más votada (3 o más) lleva "La más útil del curso" (`masUtil` de `ReviewCard`).
- Avisos: los crea la base con triggers (migración 7); el sitio solo los lista (`/avisos`), los marca como leídos y guarda preferencias (`src/lib/avisos.ts`). `UserBar` cuenta los sin leer.
- Componentes: `Layout.astro` (banner, pestañas, migas, pie, buscador y ventana de ingreso), `UserBar`, `ReviewCard`, `CursoChips`, `Stars`, `Icon`, `ShareButton`, `LoginModal`, `UtnMark`.
- Panel de admin: `/admin` (resumen), `/admin/reportes`, `/admin/moderacion` (palabras marcadas y registro), `/admin/resenas`, `/admin/finales`, `/admin/materias`, `/admin/profesores` e `/admin/importar`, todos con `AdminNav`. `/admin/gestion` solo redirige. Las acciones de admin piden CSRF: `tokenCsrf(Astro.cookies)` en la página (en `#admin-csrf`) y `adminFetch` de `src/scripts/admin-api.ts`; en la API, `requireAdmin(request, cookies, { requireCsrf: true })`. Toda acción de moderación se anota con `registrar()` de `src/lib/moderacion.ts`; responder y pedir edición usan `ModerarAcciones.astro` + `src/scripts/admin-moderar.ts`.
- Importador (`src/lib/xlsx.ts`, `planilla.ts`, `importar.ts`): lee las planillas de horarios del Drive (Sistemas, una pestaña por curso; Básicas, una pestaña por materia), solo cursos K, y compara con la base. Los nombres en la base salen de esas mismas planillas (ETL de Pato) pero limpios (por ejemplo "Elec Backend" es "Backend de Aplicaciones": que sea electiva lo dice la etiqueta), así que se compara por texto normalizado y parecido. Importar horarios no cambia nombres ni equipos.
- Lo que se guarda solo en el navegador (`localStorage`): tema, última visita (`src/scripts/visitas.ts`), tus años (`misAnios`: copia de `perfiles.anios_cursada`, que manda), cartel y etiquetas "Nuevo" (`src/scripts/bienvenida.ts`), la franja "¿Cómo te fue?" apagada (`comoTeFue`, respaldo de lo que guarda `perfiles`) y borradores.
- Imagen al compartir: `src/lib/og.ts` (satori + resvg, fuente DejaVu recortada en `og-fuentes.ts`) y `src/pages/og/[tipo]/[id].png.ts`. Cada página pasa `ogImage` y, si quiere, `ogTitle` al Layout.

## Probar sin base

`npm run dev:mock` levanta el sitio con datos inventados (`dev/mock/`), sin Supabase. Con sesión y admin: `MOCK_USER=1 ADMIN_IDS=u-demo npm run dev:mock`. El mock implementa lo justo de PostgREST; si una página usa un filtro nuevo, agregalo en `dev/mock/supabase-mock.ts`.

Pruebas: desde el 9/11 Pato no quiere pruebas nuevas hasta terminar todo; se prueba todo junto antes de producción. Las que hay usan `tests/base-falsa.ts` (base de mentira) o `vi.mock`. Lo que falta probar se anota igual en `docs/PRUEBAS.md`. Todas las pruebas (SQL `supabase/pruebas/verificar-todo.sql`, automáticas y endpoints) están juntas en `docs/PRUEBAS.md`; sumá ahí cada prueba nueva, que sirve de base para la colección de Postman que Pato quiere al terminar la etapa 3.

Antes de subir: `npm run check`, `npm test` y `npm run build`. Revisá cada página a 390 px de ancho (sin scroll horizontal) y en modo noche.
