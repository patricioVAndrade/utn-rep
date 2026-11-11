# Entrar en Preview con contraseña (ingreso de prueba)

En Preview solo se puede entrar con mail, y la base de prueba manda muy pocos mails por hora. El ingreso de prueba es un formulario de mail y contraseña que **aparece solo en los deploys de Preview**. En el sitio real (utnrep.app) no existe.

No hay que cargar ninguna variable en Vercel ni volver a desplegar. Son tres pasos.

## Paso 1. Ponerle una contraseña a tu cuenta de la base de prueba

1. Entrá a https://supabase.com/dashboard y abrí el proyecto **de prueba** (no el de producción).
2. En el menú de la izquierda, tocá **SQL Editor**.
3. Abrí una pestaña nueva de consulta (el botón **+** arriba, "Create a new snippet").
4. Abrí el archivo `supabase/pruebas/clave-de-prueba.sql` (está también en la carpeta del proyecto, en `propuestas/base-prueba/clave-de-prueba.sql`), copiá **todo** y pegalo ahí.
5. Cambiá dos cosas, las dos entre comillas simples, sin borrar las comillas:
   - En la línea que termina en `<<< 1`, reemplazá `tu-mail@gmail.com` por el mail con el que entrás a Preview.
   - En la línea que termina en `<<< 2`, reemplazá `CAMBIAR` por una contraseña inventada para esto, de 8 caracteres o más. No uses una que uses en otro lado.
6. Tocá el botón verde **Run** (abajo a la derecha del editor). Si Supabase te pide confirmar la consulta, aceptá.
7. Abajo aparece una tabla de una sola fila. Mirá la columna **resultado**:

| Qué dice | Qué hacer |
|---|---|
| `LISTO: ya podés entrar con ese mail y esa contraseña` | Seguí con el paso 2. El mail para entrar es el de la columna `mail_para_entrar`. |
| `FALTA: cambiá CAMBIAR por tu contraseña…` | No cambiaste la línea `<<< 2`. Cambiala y tocá Run de nuevo. |
| `FALTA: la contraseña tiene que tener 8 caracteres o más` | Poné una más larga y tocá Run de nuevo. |
| `NO HAY CUENTA CON ESE MAIL…` | Mirá la columna `cuentas_que_hay`: ahí están los mails de la base de prueba. Copiá el tuyo tal cual en la línea `<<< 1` y tocá Run de nuevo. Si esa columna está vacía, andá a "Si no tenés ninguna cuenta", más abajo. |

Si en vez de la tabla aparece un error en rojo, copiámelo tal cual.

No guardes esa consulta con la contraseña adentro: cerrá la pestaña cuando termines.

## Paso 2. Abrir el deploy nuevo de Preview

1. Entrá a https://vercel.com, abrí el proyecto y tocá la pestaña **Deployments**.
2. Buscá la fila de más arriba que diga **Preview** y el nombre de la rama, `claude/project-thread-nihy8x`. Tiene que ser de hoy.
3. Esperá a que diga **Ready** (si dice Building, tarda uno o dos minutos).
4. Tocá esa fila y después el botón **Visit**.

No toques "Redeploy" en ningún lado: cada vez que se sube algo a la rama, Vercel arma solo un deploy nuevo de Preview.

## Paso 3. Entrar

1. En el sitio de Preview, tocá **Iniciar sesión**.
2. En la ventana, abajo de todo, tocá **Ingreso de prueba (solo en Preview)**. Se abre un formulario.
3. Poné el mail y la contraseña del paso 1 y tocá **Entrar**.
4. La página se recarga y ya estás con tu sesión.

Queda hecho: las próximas veces solo repetís el paso 3. La contraseña sigue sirviendo en todos los deploys de Preview.

## Si algo no sale

| Qué pasa | Qué mirar |
|---|---|
| No aparece "Ingreso de prueba" en la ventana | Estás en un deploy viejo (anterior al 10/11) o en utnrep.app. Volvé al paso 2 y abrí el deploy de más arriba de la rama. |
| "El mail o la contraseña no coinciden…" | Usá el mail de la columna `mail_para_entrar` del paso 1. Si no te acordás la contraseña, repetí el paso 1 con otra. |
| "Demasiados intentos" | Son 10 intentos cada 10 minutos. Esperá un rato. |
| Entrás pero no ves el panel de admin | La variable `ADMIN_IDS` de Preview no tiene el id de esta cuenta. El id está en la columna `id_de_la_cuenta` del paso 1. Avisame y vemos cómo cargarlo. |

## Si no tenés ninguna cuenta en la base de prueba

1. En Supabase, proyecto de prueba, menú de la izquierda: **Authentication**, y adentro **Users**.
2. Arriba a la derecha, **Add user** y después **Create new user**.
3. Escribí tu mail y una contraseña, dejá marcado **Auto Confirm User** y tocá **Create user**.
4. Con eso ya podés ir al paso 2: no hace falta el SQL.

## Por qué no se puede usar en el sitio real

El formulario y la dirección `/api/auth/prueba` se apagan si Vercel dice que el entorno es Production o si el dominio es utnrep.app, y no hay forma de prenderlos desde afuera. Además, en la base de producción ninguna cuenta tiene contraseña. Código: `src/lib/ingreso-prueba.ts`.

## Para sacarlo

Sacarle la contraseña a la cuenta, en el SQL Editor de la base de prueba:

`UPDATE auth.users SET encrypted_password = '' WHERE email = 'tu-mail';`
