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
- Pendiente de Pato: elegir el logo (opciones A a F) y votar los logros L8 a L19. Cartel de bienvenida, "Qué cambió", Términos e imagen por página: aprobados y hechos.
- Cambios de profesores (F22 a F27): después de marzo de 2027.

## Cómo está armado el diseño

- Estilos en `src/styles/foro.css`, todo dentro de `@layer components`, con variables de color en `:root` y `html[data-theme="dark"]`. Las utilidades de Tailwind (`hidden`, etc.) le ganan a estas clases.
- Ojo con nombres de clase que ya son utilidades de Tailwind: por ejemplo `collapse` pone `visibility: collapse` y escondió tablas. Antes de inventar una clase, fijate que no exista como utilidad.
- Un `style="display:..."` en línea le gana a `.hidden`: para alternar algo que tiene display en línea, cambiá `style.display`.
- El diseño se adapta con container queries sobre `.forum` (820 px y 600 px). Por debajo de 600 px aparece la barra inferior y las tablas pasan a tarjetas (`.grid-tbl.stack`).
- Componentes: `Layout.astro` (banner, pestañas, migas, pie, buscador y ventana de ingreso), `UserBar`, `ReviewCard`, `CursoChips`, `Stars`, `Icon`, `ShareButton`, `LoginModal`, `UtnMark`.
- Panel de admin: `/admin` (resumen), `/admin/reportes`, `/admin/moderacion` (palabras marcadas y registro), `/admin/resenas`, `/admin/finales`, `/admin/materias`, `/admin/profesores` e `/admin/importar`, todos con `AdminNav`. `/admin/gestion` solo redirige. Las acciones de admin piden CSRF: `tokenCsrf(Astro.cookies)` en la página (en `#admin-csrf`) y `adminFetch` de `src/scripts/admin-api.ts`; en la API, `requireAdmin(request, cookies, { requireCsrf: true })`. Toda acción de moderación se anota con `registrar()` de `src/lib/moderacion.ts`; responder y pedir edición usan `ModerarAcciones.astro` + `src/scripts/admin-moderar.ts`.
- Importador (`src/lib/xlsx.ts`, `planilla.ts`, `importar.ts`): lee las planillas de horarios del Drive (Sistemas, una pestaña por curso; Básicas, una pestaña por materia), solo cursos K, y compara con la base. Los nombres en la base salen de esas mismas planillas (ETL de Pato), así que se compara por texto normalizado.
- Lo que se guarda solo en el navegador (`localStorage`): tema, última visita (`src/scripts/visitas.ts`), tus años (`misAnios`, se eligen en Mi cuenta), cartel y etiquetas "Nuevo" (`src/scripts/bienvenida.ts`), la franja "¿Cómo te fue?" apagada (`comoTeFue`, `src/scripts/como-te-fue.ts`) y borradores.
- Imagen al compartir: `src/lib/og.ts` (satori + resvg, fuente DejaVu recortada en `og-fuentes.ts`) y `src/pages/og/[tipo]/[id].png.ts`. Cada página pasa `ogImage` y, si quiere, `ogTitle` al Layout.

## Probar sin base

`npm run dev:mock` levanta el sitio con datos inventados (`dev/mock/`), sin Supabase. Con sesión y admin: `MOCK_USER=1 ADMIN_IDS=u-demo npm run dev:mock`. El mock implementa lo justo de PostgREST; si una página usa un filtro nuevo, agregalo en `dev/mock/supabase-mock.ts`.

Antes de subir: `npm run check`, `npm test` y `npm run build`. Revisá cada página a 390 px de ancho (sin scroll horizontal) y en modo noche.
