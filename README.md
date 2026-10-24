# UTN REP

Plataforma de reseñas colaborativa para estudiantes de Ingenieria en Sistemas de Informacion de la UTN FRC (Universidad Tecnologica Nacional - Facultad Regional Cordoba). Permite consultar y publicar opiniones sobre materias, catedras y profesores para ayudar a otros alumnos a elegir mejor su cursada.

**Producción:** [utnrep.app](https://utnrep.app)

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Framework | [Astro](https://astro.build) v5 con SSR (`output: 'server'`) |
| Validación / tests | Zod, Vitest, `astro check` |
| Hosting | [Vercel](https://vercel.com) (serverless, adapter `@astrojs/vercel`) |
| Base de datos | [Supabase](https://supabase.com) (PostgreSQL) |
| Autenticacion | Supabase Auth — OAuth (Google, GitHub) + Magic Link (OTP por email) |
| Estilos | [Tailwind CSS](https://tailwindcss.com) v4 (plugin Vite) |
| Analytics | Vercel Analytics |
| ETL | Python (extraccion de datos academicos desde Google Sheets) |

## Funcionalidades

- Reseñas por dictado (cátedra): calificación 1-5, comentario, año de cursado, condición final (promoción / regular / libre) y opción de publicar como anónimo
- Votos de "útil" en reseñas (un voto por usuario) y orden por más útiles
- Experiencias en finales por materia (`/finales`)
- Información de cursada: electivas con puntos, cuatrimestre, anual, contracuatrimestre e intensivo
- Perfiles de profesor con promedio por cátedra
- Buscador de materias y profesores en el home
- "Mis reseñas" (`/mis-resenas`) para ver todo lo que publicó cada usuario
- Reportes de reseñas y panel de administración (`/admin`) para moderar y cargar datos

## Arquitectura

```
src/
├── components/       # HeaderNav, ReviewCard
├── layouts/          # Layout base con footer, modal de login y scripts globales
├── lib/
│   ├── supabase.ts         # Clientes Supabase (browser + server) y helpers de cookies
│   ├── supabase-admin.ts   # Cliente con service role (solo server, saltea RLS)
│   ├── admin.ts / admin-guards.ts  # Verificación de admins y CSRF del panel
│   ├── validation.ts       # Esquemas Zod de todos los endpoints
│   ├── auth-validation.ts  # Validación de email y nombre del magic link
│   ├── rate-limit.ts       # Rate limit compartido (Postgres) con fallback en memoria
│   ├── redirect.ts         # safeReturnTo(): evita open redirects
│   ├── request.ts / http.ts / format.ts / user.ts  # Helpers compartidos
├── scripts/          # JS de cliente de páginas grandes (dictado.ts)
├── middleware.ts     # Intercepción de OAuth codes, lectura de sesión, headers de seguridad
├── pages/
│   ├── index.astro, nivel/, materia/, dictado/, profesor/, finales/
│   ├── nueva-resena.astro, mis-resenas.astro, admin/
│   └── api/
│       ├── resenas.ts, resenas/[id].ts, resenas/votar.ts, reportes.ts
│       ├── finales/crear.ts, finales/acciones.ts
│       ├── admin/*       # Endpoints del panel (requieren admin + CSRF)
│       └── auth/         # login, callback, magic-link, logout (POST)
└── styles/global.css
supabase/migrations/  # Esquema, RLS y funciones de la base (correr en orden)
tests/                # Tests de Vitest
```

## Modelo de Datos

Tablas principales en Supabase:

- **materias** — nombre, nivel (1-5 año), electiva y puntos
- **cursos** — identificador del curso, turno
- **dictados** — relación materia ↔ curso (una "cátedra"), con período, contracuatrimestre e intensivo
- **profesores** y **dictado_profesores** (N:M)
- **resenas** — calificación, comentario, año, condición final, flag anónimo, contador `votos_utilidad`
- **votos_resenas** — un voto por (usuario, reseña)
- **reportes_resenas**, **experiencias_finales**, **rate_limits**

Vistas públicas:

- **resenas_publicas** — lo que ve cualquiera: sin `user_id` y con `nombre_usuario = NULL` en las anónimas
- **stats_dictados** — cantidad y promedio de reseñas por dictado

Seguridad en la base (ver `supabase/migrations/`):

- La tabla `resenas` no es legible con la anon key; cada usuario logueado solo lee sus propias filas
- Los usuarios solo pueden escribir las columnas que les corresponden (`comentario`, calificación, etc.); `nombre_usuario`, `es_alumno_utn` y `votos_utilidad` los completa la base
- `CHECK` constraints de rango y largo, y `unique(user_id, dictado_id)`
- Los votos pasan por la función `votar_resena()` y el rate limit por `check_rate_limit()`

## Autenticacion

El sistema implementa autenticacion server-side con `@supabase/ssr` y flujo PKCE:

1. **OAuth (Google / GitHub):** El endpoint `/api/auth/login` genera la URL de autorizacion, almacena el PKCE code verifier en cookies y redirige al provider. Al volver, `/api/auth/callback` intercambia el code por una session.

2. **Magic Link:** El endpoint `/api/auth/magic-link` envia un email con un link OTP. No se requiere contraseña en ningun momento.

3. **Middleware:** Intercepta `?code=` en cualquier ruta (por si Supabase redirige al home en vez del callback), intercambia el code y redirige a la pagina de origen usando una cookie `auth_returnTo`.

4. **Cookies:** Se usa `redirectWithCookies()` para garantizar que las cookies de sesion se incluyan en respuestas 302, ya que Astro no las escribe de forma confiable en redirects.

El login es obligatorio para publicar reseñas, pero el usuario puede elegir publicar de forma anonima (solo se usa la identidad para moderacion interna).

## Flujo de Reseñas

1. El usuario navega a `/nueva-resena` (formulario general) o llega desde un dictado especifico (`?dictado=<id>`)
2. Selecciona materia/curso (o ya viene preseleccionado), calificacion, año de cursado y escribe su opinion
3. Opcionalmente marca "Publicar como anonimo" para ocultar su nombre
4. El endpoint `POST /api/resenas` valida los datos con Zod, verifica autenticación, aplica rate-limiting (max 8 por hora) y el constraint anti-spam (1 por usuario por dictado)
5. Desde la pagina del dictado, el autor puede editar o eliminar su propia reseña

### DELETE en Vercel

Vercel serverless tiene problemas de routing con el metodo HTTP DELETE en algunos casos. Como workaround, el endpoint `resenas/[id].ts` acepta `POST` con un campo `_method: 'DELETE'` o `_method: 'PUT'` en el body para dispatchar la operacion correcta.

## ETL

El directorio `ETL/` contiene scripts en Python para extraer datos academicos (materias, cursos, docentes) desde Google Sheets y cargarlos a Supabase. Ver [ETL/README.md](ETL/README.md) para mas detalles.


## Desarrollo Local

```bash
npm install
npm run dev        # http://localhost:4321
npm run check      # astro check (tipos)
npm test           # Vitest
npm run build      # build de producción
```

Variables de entorno (`.env`):

| Variable | Uso |
|----------|-----|
| `PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role, solo server (admin, rate limit, finales) |
| `ADMIN_IDS` | UUIDs de admins separados por coma |

### Base de datos

Los scripts de `supabase/migrations/` se corren en orden en el SQL Editor de Supabase (o con `supabase db push`). Para regenerar los tipos de la base: `SUPABASE_PROJECT_ID=... npm run gen:types`.

### CI

`.github/workflows/ci.yml` corre `astro check`, los tests y el build en cada push y PR.

## Seguridad

- Row Level Security (RLS) en todas las tablas y permisos por columna en `resenas`
- Anonimato real: las reseñas anónimas no exponen nombre ni `user_id` por ningún lado
- Autenticación server-side con PKCE (no se exponen tokens en el cliente)
- Rate limiting compartido entre instancias serverless (Postgres)
- Validación de input con Zod en el server y constraints en la base
- CSP y headers de seguridad: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS
- Protección contra open redirect en el flujo de `returnTo`
- Logout solo por POST

## Licencia

Proyecto academico. Codigo disponible para referencia.
