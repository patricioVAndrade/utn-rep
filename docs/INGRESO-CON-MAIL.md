# Ingreso con mail: cómo funciona y qué revisar si falla en Preview

## Cómo funciona

1. En "Ingresar", la persona pone su nombre y su mail. El sitio le pide a Supabase que mande el link y guarda en ese navegador una cookie con una clave de un solo uso.
2. El link del mail pasa por Supabase y vuelve al sitio, a `/api/auth/callback`, con un código.
3. El sitio cambia ese código por la sesión. Para eso necesita la cookie del paso 1.

De ahí salen dos reglas: el link tiene que abrirse **en el mismo navegador** que lo pidió, y tiene que volver **a la misma dirección** del sitio desde la que se pidió (la cookie es de esa dirección).

Desde el 10/11 el link del mail vuelve a `/api/auth/callback`, la misma dirección que usan Google y GitHub. Antes volvía a la página donde estabas, y esa dirección tenía que estar permitida aparte en Supabase.

## Qué dice el sitio cuando falla

Si no se puede entrar, vuelve al inicio con un cartel rojo arriba (antes no decía nada y solo quedaba `?auth_error=…` en la dirección):

| En la dirección | Cartel | Qué significa |
|---|---|---|
| `auth_error=otro_navegador` | "ese link se abrió en un navegador distinto al que lo pidió" | No vino la cookie: otro navegador, otra app, o **otra dirección del sitio** (lo más común en Preview, ver abajo). |
| `auth_error=link_vencido` | "ese link ya venció o ya se usó" | Pasó más de una hora, se pidió otro link después (solo sirve el último) o algo abrió el link antes que vos (algunos mails lo revisan solos). |
| `auth_error=exchange_failed` | "No pudimos iniciar tu sesión" | Otro motivo. El detalle queda en los logs de Vercel, buscando `Exchange error` o `Code exchange failed`. |

## Qué revisar en Preview (base de prueba)

Preview tiene varias direcciones para el mismo sitio: una por cada deploy (`utn-rep-abc123-….vercel.app`) y una fija de la rama (`utn-rep-git-<rama>-….vercel.app`). Además, la rama cambió de nombre el 7/11, así que la dirección fija también cambió.

En Supabase, **proyecto de prueba**, Authentication, URL Configuration:

1. **Redirect URLs**: tiene que haber una que cubra todas las direcciones de Preview. La forma que recomienda Supabase para Vercel es `https://*-<tu-usuario-o-equipo-de-vercel>.vercel.app/**` (lo que aparece al final de las direcciones de Preview, antes de `.vercel.app`). Si solo está la dirección de la rama vieja, agregá esta.
2. **Site URL**: es a donde Supabase manda el link cuando la dirección pedida no está permitida. Si quedó la de la rama vieja o la de producción, el link termina en otro sitio, sin la cookie, y da `otro_navegador`. Poné la dirección fija de la rama actual.
3. Pedí el link y abrilo **desde la misma dirección y el mismo navegador**. Si mirás el link del mail, al final dice `redirect_to=`: tiene que ser la dirección de Preview donde lo pediste, terminada en `/api/auth/callback`.

Otras cosas que pueden pasar solo en prueba:

- **No llega el mail**: si el proyecto de prueba no tiene el SMTP de Brevo cargado (Authentication, Emails, SMTP Settings), Supabase usa su correo propio, que solo le escribe a los miembros del proyecto y manda muy pocos por hora.
- **"Demasiados intentos"**: el sitio deja pedir 3 links por hora por mail y por conexión.
- Entrar con Google o GitHub en Preview necesita las mismas Redirect URLs.

## En producción

No hay que cambiar nada: `https://utnrep.app/api/auth/callback` ya se usa para Google y GitHub. Conviene confirmar que en el proyecto de producción el Site URL sea `https://utnrep.app` y que en Redirect URLs esté `https://utnrep.app/**`.
