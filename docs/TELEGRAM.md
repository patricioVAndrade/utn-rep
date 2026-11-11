# Bot de Telegram: cómo prenderlo en producción

El bot manda los avisos de UTN REP por Telegram a quien lo conecte desde Mi cuenta. Quien lo conecta recibe cada aviso al momento, con el link directo, y deja de recibir mails. Así los 300 mails diarios de Brevo quedan para los links de ingreso y para quien no usa Telegram.

**Decisión del 10/11: se prende directo en producción**, el día que se publique el rediseño. En Preview queda apagado: sin las claves cargadas, el sitio no muestra nada de Telegram (ni el botón en Mi cuenta, ni la invitación en Avisos, ni la línea en el mail) y los avisos siguen por el sitio y por mail. Hace falta **un solo bot**.

Son cinco pasos y llevan unos 15 minutos. El orden importa.

## Antes: lo único que se hace en la base de prueba

Correr la migración 18 en la base de prueba (`supabase/migrations/20261109050000_telegram.sql`), como las demás, para ver que el SQL corre bien antes de llevarlo a producción. Tiene que dar `2 | true | false | true | true`. No prende nada: sin las claves y sin tocar "Conectar", la base de prueba no le avisa a nadie.

## 1. Crear el bot (5 minutos)

1. En Telegram, buscá **@BotFather** (el que tiene la tilde azul) y mandale `/newbot`.
2. Te pide un nombre: `UTN REP`.
3. Te pide un usuario, que tiene que terminar en `bot`: por ejemplo `utnrep_bot`. Es lo que la gente ve en `t.me/utnrep_bot`, así que conviene que sea corto.
4. BotFather te contesta con el **token**, algo como `123456789:AAH...`. Es una clave: no la pegues en el chat ni en el repositorio.
5. Opcional: `/setuserpic`, elegí el bot y subí `propuestas/telegram/foto-del-bot.png` como foto.

La descripción y los comandos (`/start` y `/stop`) los carga el sitio solo cuando lo conectás (paso 4). El bot se puede crear cualquier día: hasta que no se conecta, no hace nada.

## 2. Cargar las tres claves en Vercel, solo en Production

En Vercel, Settings, Environment Variables. En cada una marcá **solo Production** (sin Preview ni Development).

| Nombre | Qué va |
|---|---|
| `TELEGRAM_BOT_TOKEN` | El token que te dio BotFather. |
| `TELEGRAM_BOT_USERNAME` | El usuario del bot, sin arroba: `utnrep_bot`. |
| `TELEGRAM_WEBHOOK_SECRET` | Una clave que inventás vos, de 32 caracteres o más. Solo letras, números, guion y guion bajo (Telegram no acepta otros). Sirve para que nadie más pueda hacerse pasar por Telegram. |

Las variables nuevas no llegan a un deploy que ya estaba hecho. Si las cargás **antes** de mergear el rediseño a `main`, el deploy del merge ya las trae. Si las cargás después, volvé a desplegar (Deployments, los tres puntos, Redeploy).

## 3. Correr la migración 18 en la base de producción

Va junto con las demás migraciones de la etapa 3, en orden (necesita la 7, la 9 y la 17). En Supabase, proyecto de producción, SQL Editor: `supabase/migrations/20261109050000_telegram.sql`. Al final tiene que dar:

`2 | true | false | true | true`

El último valor dice si la base puede avisarle al sitio al momento. Para eso usa **pg_net**, una extensión que Supabase ya trae y que la migración prende sola. Si da `false`, prendela a mano (Database, Extensions, buscá pg_net) y volvé a correr la migración, que se puede correr más de una vez. Con `false` los avisos igual salen, pero recién a las 9 con la revisión del día.

## 4. Conectar el bot al sitio

Con el rediseño ya publicado:

1. Entrá a **`https://utnrep.app`** con tu cuenta de admin (esa dirección exacta, no una de `vercel.app`), andá a **Panel de admin, Resumen** y bajá hasta **Bot de Telegram**.
2. Si dice que falta alguna clave, revisá el paso 2 (que estén en Production y que el deploy sea posterior a cargarlas).
3. Tocá **Conectar el bot a este sitio**. Eso le dice a Telegram a dónde mandar lo que le escriben al bot, carga los comandos y la descripción, y guarda la dirección del sitio en la base.
4. Tiene que quedar "El bot está conectado a este sitio", con `https://utnrep.app` en las dos líneas.

En producción no hay protección de Vercel de por medio, así que Telegram y la base llegan al sitio sin tocar nada más.

## 5. Probarlo (con tu cuenta, antes de avisarle a nadie)

1. Entrá a **Mi cuenta**, sección **Telegram**, y tocá **Conectar Telegram**. Se abre Telegram con el bot.
2. Tocá **Iniciar**. El bot contesta "¡Listo!".
3. Volvé a Mi cuenta: dice "Conectado como …" y en los avisos el interruptor de "Mail" pasó a decir "Telegram".
4. Para ver un aviso real: seguí una materia y, desde otra cuenta, publicá una reseña en un curso de esa materia (después la borrás). Te tiene que llegar el mensaje en unos segundos, con el botón "Ver la reseña".
5. En el panel de admin, "Personas conectadas" tiene que decir 1 y no tiene que haber "Último error".
6. Mandale `/stop` al bot: te desconecta y tus avisos vuelven al mail. Volvé a conectarlo si lo querés usar.

Si algo de esto falla, mirá la tabla de más abajo. Mientras tanto nadie se queda sin avisos: siguen en el sitio y por mail.

## Si un día querés probarlo en Preview

No hace falta, pero se puede: creá un segundo bot (`UTN REP prueba`), cargá las mismas tres variables marcando solo **Preview**, volvé a desplegar y tocá "Conectar" desde la dirección de la rama (la que no cambia con cada commit). El problema es que Vercel suele pedir sesión de Vercel para ver los deploys de Preview (Deployment Protection), y con eso prendido ni Telegram ni la base pueden llamar al sitio de prueba: en el panel aparece "Último error que vio Telegram al llamar al sitio" con un 401. Habría que apagarla un rato en Settings, Deployment Protection. Un bot solo puede estar conectado a una dirección, por eso no sirve usar el mismo para prueba y producción.

## Cómo funciona por dentro

- **Vincular**: Mi cuenta pide un código de un solo uso (dura 30 minutos) y arma el link `t.me/<bot>?start=<código>`. Cuando tocás Iniciar, Telegram le manda ese código al sitio (`/api/telegram/webhook`) y la base une tu cuenta con ese chat. El número de chat nunca llega al navegador.
- **Mandar**: cuando la base crea un aviso para alguien con Telegram, le avisa al sitio (`/api/telegram/despachar`, sin datos ni claves: solo "fijate"). El sitio pide a la base los avisos pendientes, los marca como tomados para que no salgan dos veces y los manda. Si hay varios juntos para la misma persona, van en un solo mensaje.
- **Respaldo**: la revisión de las 9 (`/api/cron/mails`) primero manda por Telegram lo que haya quedado sin salir y después arma los mails, solo para quien no tiene Telegram.
- **Si alguien bloquea al bot**: se lo desconecta solo y sus avisos del último día vuelven a salir por mail.
- **Qué llega**: lo mismo que la persona tiene prendido en Mi cuenta. Con Telegram conectado, el interruptor de "Mail" de cada tipo de aviso pasa a ser "Telegram".
- Solo avisos sin leer y de los últimos 3 días: si ya lo viste en el sitio, no se manda.

## Si algo no anda

| Qué pasa | Qué mirar |
|---|---|
| El botón "Conectar Telegram" no aparece en Mi cuenta | Faltan `TELEGRAM_BOT_TOKEN` o `TELEGRAM_BOT_USERNAME` en Production, o el deploy es anterior a cargarlas. |
| El bot no contesta al tocar Iniciar | Panel de admin: que "Recibe los mensajes en" sea `https://utnrep.app/api/telegram/webhook`, y que no haya "Último error". Un 401 es un `TELEGRAM_WEBHOOK_SECRET` que cambió después de conectar (o, en Preview, la protección de Vercel): volvé a tocar Conectar. |
| "Ese link ya venció o ya se usó" | El código dura 30 minutos y sirve una vez. Generá otro en Mi cuenta. |
| Los avisos llegan recién a la mañana | pg_net apagada, o "La base avisa a" tiene otra dirección: volvé a tocar Conectar. |
| Cambiaste el token (con `/revoke` en BotFather) | Cargá el nuevo en Vercel, volvé a desplegar y tocá Conectar otra vez. |

## Sacar todo

Vuelta atrás de la base: `supabase/rollback/20261109050000_telegram.sql`. Sin las tres claves en Vercel, el sitio no muestra nada de Telegram y los avisos siguen por mail como antes.
