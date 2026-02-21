# UTN REP

Plataforma de reseñas colaborativa para estudiantes de Ingenieria en Sistemas de Informacion de la UTN FRC (Universidad Tecnologica Nacional - Facultad Regional Cordoba). Permite consultar y publicar opiniones sobre materias, catedras y profesores para ayudar a otros alumnos a elegir mejor su cursada.

**Produccion:** [utn-rep.vercel.app](https://utn-rep.vercel.app)

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Framework | [Astro](https://astro.build) v5 con SSR (`output: 'server'`) |
| Hosting | [Vercel](https://vercel.com) (serverless, adapter `@astrojs/vercel`) |
| Base de datos | [Supabase](https://supabase.com) (PostgreSQL) |
| Autenticacion | Supabase Auth — OAuth (Google, GitHub) + Magic Link (OTP por email) |
| Estilos | [Tailwind CSS](https://tailwindcss.com) v4 (plugin Vite) |
| Analytics | Vercel Analytics |
| ETL | Python (extraccion de datos academicos desde Google Sheets) |

## Arquitectura

```
src/
├── components/       # Componentes reutilizables (HeaderNav, etc.)
├── layouts/          # Layout base con footer, modal de login y scripts globales
├── lib/
│   ├── supabase.ts   # Clientes Supabase (browser + server) y helpers de cookies
│   ├── admin.ts      # Logica de verificacion de administradores
│   └── cache.ts      # Utilidades de cache
├── middleware.ts      # Intercepcion de OAuth codes, lectura de sesion, headers de seguridad
├── pages/
│   ├── index.astro           # Home: buscador, navegacion por año, materias destacadas
│   ├── nueva-resena.astro    # Formulario de nueva reseña (general o especifico por dictado)
│   ├── nivel/[nivel].astro   # Listado de materias por año
│   ├── materia/[id].astro    # Detalle de materia con todos sus cursos
│   ├── dictado/[id].astro    # Detalle de dictado (catedra) con reseñas
│   ├── profesor/[id].astro   # Perfil de profesor
│   └── api/
│       ├── resenas.ts        # POST: crear reseña (con rate-limiting y anti-spam)
│       ├── resenas/[id].ts   # POST (con _method): editar/eliminar reseña propia
│       ├── reportes.ts       # Sistema de reportes
│       └── auth/
│           ├── login.ts      # Inicio de flujo OAuth (Google/GitHub)
│           ├── callback.ts   # Callback OAuth: intercambio de code por session
│           ├── magic-link.ts # Envio de magic link por email
│           └── logout.ts     # Cierre de sesion
└── styles/
    └── global.css            # Estilos globales y Tailwind
```

## Modelo de Datos

Las tablas principales en Supabase son:

- **materias** — nombre, nivel (1-5 año)
- **cursos** — identificador del curso, turno
- **dictados** — relacion materia ↔ curso (una "catedra" especifica)
- **profesores** — nombre completo
- **dictado_profesores** — relacion dictado ↔ profesor (N:M)
- **resenas** — calificacion (1-5), comentario, año de cursado, usuario, flag anonimo

Todas las tablas tienen RLS (Row Level Security) habilitado:
- Lectura publica en todas las tablas
- Escritura de reseñas solo para usuarios autenticados (`auth.uid() = user_id`)
- Edicion y borrado solo sobre reseñas propias
- Constraint `unique(user_id, dictado_id)` para evitar duplicados

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
4. El endpoint `POST /api/resenas` valida los datos, verifica autenticacion, aplica rate-limiting (max 8 por hora) y constraint anti-spam (1 por usuario por dictado)
5. Desde la pagina del dictado, el autor puede editar o eliminar su propia reseña

### DELETE en Vercel

Vercel serverless tiene problemas de routing con el metodo HTTP DELETE en algunos casos. Como workaround, el endpoint `resenas/[id].ts` acepta `POST` con un campo `_method: 'DELETE'` o `_method: 'PUT'` en el body para dispatchar la operacion correcta.

## ETL

El directorio `ETL/` contiene scripts en Python para extraer datos academicos (materias, cursos, docentes) desde Google Sheets y cargarlos a Supabase. Ver [ETL/README.md](ETL/README.md) para mas detalles.


## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build de produccion
npm run build

# Preview del build
npm run preview
```

El servidor de desarrollo corre en `http://localhost:4321`. Se requiere tener configuradas las variables de entorno en un archivo `.env`.

## Seguridad

- Row Level Security (RLS) en todas las tablas
- Autenticacion server-side con PKCE (no se exponen tokens en el cliente)
- Rate-limiting por usuario en la creacion de reseñas
- Validacion de input en server y client
- Headers de seguridad: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`
- Proteccion contra open redirect en el flujo de returnTo

## Licencia

Proyecto academico. Codigo disponible para referencia.
