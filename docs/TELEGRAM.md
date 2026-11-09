# Bot de Telegram: cómo crearlo y conectarlo

El bot manda los avisos de UTN REP por Telegram a quien lo conecte desde Mi cuenta. Quien lo conecta recibe cada aviso al momento, con el link directo, y deja de recibir el mail del día. Así los 300 mails diarios de Brevo quedan para los links de ingreso y para quien no usa Telegram.

Hay que hacerlo dos veces: una para el entorno de prueba (Preview) y otra para el sitio real. Conviene usar **dos bots distintos**, porque un bot solo puede mandar los mensajes a una dirección.

## 1. Crear el bot (5 minutos)

1. En Telegram, buscá **@BotFather** (el que tiene la tilde azul) y mandale `/newbot`.
2. Te pide un nombre: `UTN REP` (para el de prueba, `UTN REP prueba`).
3. Te pide un usuario, que tiene que terminar en `bot`: por ejemplo `utnrep_bot` (y `utnrep_prueba_bot`).
4. BotFather te contesta con el **token**, algo como `123456789:AAH...`. Es una clave: no la pegues en el chat ni en el repositorio.
5. Opcional: `/setuserpic`, elegí el bot y subí `propuestas/telegram/foto-del-bot.png` como foto.

La descripción y los comandos (`/start` y `/stop`) los carga el sitio solo cuando lo conectás (paso 4).

## 2. Cargar las tres claves en Vercel

En Vercel, Settings, Environment Variables. Para el bot de prueba marcá solo **Preview**; para el real, solo **Production**.

| Nombre | Qué va |
|---|---|
| `TELEGRAM_BOT_TOKEN` | El token que te dio BotFather. |
| `TELEGRAM_BOT_USERNAME` | El usuario del bot, sin arroba: `utnrep_bot`. |
| `TELEGRAM_WEBHOOK_SECRET` | Una clave que inventás vos, de 32 caracteres o más. Solo letras, números, guion y guion bajo (Telegram no acepta otros). Sirve para que nadie más pueda hacerse pasar por Telegram. |

Después de cargarlas, **volvé a desplegar** (Deployments, los tres puntos, Redeploy): las variables nuevas no llegan a un deploy que ya estaba hecho.

## 3. Correr la migración 18

En Supabase (primero en la base de prueba), SQL Editor, corré `supabase/migrations/20261109050000_telegram.sql`. Al final tiene que dar:

`2 | true | false | true | true`

El último valor dice si la base puede avisarle al sitio al momento. Para eso usa **pg_net**, una extensión que Supabase ya trae y que la migración prende sola. Si da `false`, prendela a mano (Database, Extensions, buscá pg_net) y volvé a correr la migración, que se puede correr más de una vez. Con `false` los avisos igual salen, pero recién a las 9 con el envío del día.

## 4. Conectar el bot al sitio

1. Entrá al sitio de ese entorno con tu cuenta de admin, andá a **Panel de admin, Resumen** y bajá hasta **Bot de Telegram**.
2. Si dice que falta alguna clave, revisá el paso 2 (y que hayas vuelto a desplegar).
3. Tocá **Conectar el bot a este sitio**. Eso le dice a Telegram a dónde mandar lo que le escriben al bot, carga los comandos y guarda la dirección del sitio en la base.
4. Tiene que quedar "El bot está conectado a este sitio", con la misma dirección en las dos líneas.

Hacelo desde la dirección que va a quedar fija: en producción, `https://utnrep.app`. En Preview, desde la dirección de la rama (la que no cambia con cada commit), no la de un deploy puntual.

### Ojo con la protección de Preview

Vercel suele pedir sesión de Vercel para ver los deploys de Preview (Deployment Protection). Con eso prendido, ni Telegram ni la base pueden llamar al sitio de prueba y el bot no contesta. Dos salidas:

- Apagarla un rato para probar: Settings, Deployment Protection, Vercel Authentication, y elegir "Only Production Deployments" o desactivarla.
- O probar el bot directamente cuando esté en producción.

Si está bloqueado, en el panel aparece "Último error que vio Telegram al llamar al sitio" con un 401.

## 5. Probarlo

1. Entrá a **Mi cuenta**, sección **Telegram**, y tocá **Conectar Telegram**. Se abre Telegram con el bot.
2. Tocá **Iniciar**. El bot contesta "¡Listo!".
3. Volvé a Mi cuenta: dice "Conectado como …" y en los avisos el interruptor de "Mail" pasó a decir "Telegram".
4. Desde otra cuenta, escribí una reseña en una materia que sigas. Te tiene que llegar el mensaje en unos segundos, con el botón "Ver la reseña".
5. Mandale `/stop` al bot: te desconecta y tus avisos vuelven al mail.

## Cómo funciona por dentro

- **Vincular**: Mi cuenta pide un código de un solo uso (dura 30 minutos) y arma el link `t.me/<bot>?start=<código>`. Cuando tocás Iniciar, Telegram le manda ese código al sitio (`/api/telegram/webhook`) y la base une tu cuenta con ese chat. El número de chat nunca llega al navegador.
- **Mandar**: cuando la base crea un aviso para alguien con Telegram, le avisa al sitio (`/api/telegram/despachar`, sin datos ni claves: solo "fijate"). El sitio pide a la base los avisos pendientes, los marca como tomados para que no salgan dos veces y los manda. Si hay varios juntos para la misma persona, van en un solo mensaje.
- **Respaldo**: el envío de las 9 (`/api/cron/mails`) primero manda por Telegram lo que haya quedado sin salir y después arma los mails, solo para quien no tiene Telegram.
- **Si alguien bloquea al bot**: se lo desconecta solo y sus avisos del último día vuelven a salir por mail.
- **Qué llega**: lo mismo que la persona tiene prendido en Mi cuenta. Con Telegram conectado, el interruptor de "Mail" de cada tipo de aviso pasa a ser "Telegram".
- Solo avisos sin leer y de los últimos 3 días: si ya lo viste en el sitio, no se manda.

## Si algo no anda

| Qué pasa | Qué mirar |
|---|---|
| El botón "Conectar Telegram" no aparece en Mi cuenta | Faltan `TELEGRAM_BOT_TOKEN` o `TELEGRAM_BOT_USERNAME`, o no volviste a desplegar. |
| El bot no contesta al tocar Iniciar | Panel de admin: que "Recibe los mensajes en" sea este sitio, y que no haya "Último error". Un 401 es la protección de Preview o un `TELEGRAM_WEBHOOK_SECRET` que cambió después de conectar: volvé a tocar Conectar. |
| "Ese link ya venció o ya se usó" | El código dura 30 minutos y sirve una vez. Generá otro en Mi cuenta. |
| Los avisos llegan recién a la mañana | pg_net apagada, o "La base avisa a" tiene otra dirección: volvé a tocar Conectar. |
| Cambiaste el token (con `/revoke` en BotFather) | Cargá el nuevo en Vercel, volvé a desplegar y tocá Conectar otra vez. |

## Sacar todo

Vuelta atrás de la base: `supabase/rollback/20261109050000_telegram.sql`. Sin las tres claves en Vercel, el sitio no muestra nada de Telegram y los avisos siguen por mail como antes.
