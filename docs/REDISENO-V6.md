# Rediseño estilo foro: qué hay de la V6 en esta rama

Rama: `claude/project-thread-nihy8x` (sigue a `claude/project-thread-e3wgmo`). Última actualización: 7/11/2026, tarde (lo que no necesita base de tu segunda revisión del 7/11).

Este archivo sirve para comparar, lado a lado, la maqueta V6 (`propuestas/v6/foro-v6.html` en el chat del proyecto) con lo que ya funciona en la versión de prueba. Cada fila dice si está **Hecho**, **Parcial** (está, pero distinto de la maqueta; la columna "Diferencia" explica por qué), **Falta** o **Después de marzo 2027**.

- **Etapa 1** (subida el 6/11): el look de la V6 en todas las páginas que ya existían. Sin cambios en la base.
- **Etapa 2** (subida el 6/11): funcionalidades de la V6 que no necesitan tablas nuevas.
- **Revisión del 7/11** (subida el 7/11): pantallas pasadas tal cual la V6, sin neones (opción C), importador de planillas y panel de admin nuevo.
- **Etapa 3** (pendiente): lo que necesita tablas o columnas nuevas. Se prueba primero en la base de prueba.

## Funcionalidades aprobadas (F1 a F21 y F28)

| Código | Qué es | Estado | Dónde verlo | Diferencia con la V6 |
|---|---|---|---|---|
| F1 | Modo noche | Hecho | Interruptor "Modo noche" arriba a la derecha | Si nunca lo tocaste, sigue el modo del teléfono o la compu. |
| F2 | Carpetas de "nuevas desde tu última visita" | Hecho | Inicio, carpeta amarilla y "hay nuevas" | Se guarda en el navegador, no en la cuenta: en otro dispositivo empieza de cero. La primera vez marca como nuevas las de las últimas dos semanas. Arriba dice "Tu última visita". |
| F3 | Buscador con sugerencias agrupadas | Hecho | Banner, en cualquier página; Enter abre `/buscar?q=` | Sugerencias agrupadas en Materias, Cursos y Profesores. La página de resultados suma Finales, filtros y qué hacer si no hay nada. |
| F4 | Reparto de estrellas | Hecho | Curso y materia, "Cómo lo puntuaron" | — |
| F5 | Rangos por cantidad de reseñas | Hecho (migración 8) | Reseñas, ficha, Mi cuenta, Reseña publicada, ¿Cómo funciona? | Sale de contar reseñas (también las anónimas, sin decir cuáles): 1 Ingresante, 2 a 4 Cursante, 5 a 14 Referente, 15 o más Leyenda. `src/lib/logros.ts`. |
| F6 | Etiqueta de plan de estudios (2008 o 2023) | Base lista, sin mostrar | — | Migración 3: columna `plan` con 2023 en todas. No se muestra ni se pregunta, como pidió Pato; queda lista para cuando convivan los dos planes. |
| F7 | Otros cursos de la materia y comparador | Hecho | Botón "Comparar cursos" en la materia y en el curso; `/materia/ID/comparar` | Columnas: General, Reseñas, Promocionó, Regularizó y Quedó libre. **No están** Dificultad, Exigencia ni Claridad porque la base solo guarda el puntaje general (van con etapa 3 si los querés). Se ordena tocando los títulos y se filtra por turno. |
| F8 | Formulario en pasos con borrador | Hecho | Escribir una reseña | 3 pasos (2 si venís desde un curso). El borrador queda en el navegador. **No están** el título ni el plan de estudios (no existen en la base) ni los puntajes por separado. El paso 1 usa listas desplegables en vez de botones. Los cursos que ya reseñaste aparecen deshabilitados. |
| F9 | Barra de navegación inferior en celular | Hecho | Celular | — |
| F10 | Notas de moderación en una reseña | Hecho (migración 4) | Curso, Finales, admin | Junta con F12 en "Respuesta del moderador": una por reseña o final, pública y sin nombre de quién la escribió. Se escribe desde Reportes o Reseñas del admin. |
| F11 | Seguir una materia y aviso por mail | Parcial (migración 6) | Materia, curso y Mi cuenta | Panel "Seguir esta materia" (desde el curso se sigue su materia) y la lista en Mi cuenta con interruptor de mail y "Dejar de seguir", como la V6. Avisos en el sitio: hechos (migración 7). Mail: hecho con la migración 17 (Brevo, un resumen por día sin pasarse de 300). Telegram: migración 18, al momento y con link directo, en vez del mail. |
| F12 | Respuestas a una reseña | Hecho como F10 | — | Solo responde el moderador (decisión de Pato). |
| F13 | Contador "Hay X estudiantes en línea" | Hecho (migración 10) | Inicio, arriba de "Así viene el cuatri" | Punto verde que late, sin nombres. Se ve siempre (pedido del 9/11); con 0, punto gris y "Nadie en línea ahora". Cada pestaña visible avisa una vez por minuto. |
| F14 | Visitas | Hecho (migración 14) | Inicio, "Así viene el cuatri" | "Visitas esta semana" en lugar de las reseñas de la semana, desde 100 visitas: cada navegador cuenta una vez por día, con el mismo latido del contador en línea. |
| F31 | Pedí reseñas en el grupo | Hecho (sin base) | Curso, columna derecha arriba | Con menos de 5 reseñas aparece "Este curso tiene pocas reseñas" (o "no tiene") con el botón verde "Pedir reseñas en el grupo": arma el mensaje de WhatsApp con el link del curso y tu código `?de=`; quien lo abre ve la franja "Te pasaron este curso" con "Sumá tu reseña". Aprobada el 9/11. |
| F15 | Ficha de usuario ocultable | Hecho (migración 8) | Nombre en cada reseña, "por X" en Última reseña (inicio y año) y en la destacada | `Quien.astro`. La arma el servidor con `src/lib/fichas.ts` (el user_id no llega al navegador). Rango, reseñas, finales, "Me sirvió", desde qué año y logros. Se oculta en Mi cuenta. |
| F16 | Easter egg de Anónimo | Hecho | Igual que F15 | Máscara y una teoría; cada vez que se abre sale otra (`TEORIAS_ANONIMO`). Tocarlo cinco veces seguidas da el logro secreto "Detective" (L9, migración 16). |
| F17 | Escudos de rango | Hecho | Al lado del nombre en las reseñas | `Escudo.astro`, los cuatro de la V6. |
| F18 | Logros | Hecho L1 a L6 (migración 8) y L8 a L10, L12 a L15 y L17 a L20 (migración 16) | Ficha, al lado del nombre (no en el celular), Mi cuenta (todos, con cómo se gana el que falta), Reseña publicada, ¿Cómo funciona? | Los da la base con triggers y avisa. Votados el 9/11: L11 y L16 descartados; L18 pasó a "La más útil del curso" (y la reseña lo dice en el curso); L19 es "Ayudante de cátedra" (50) y L20 "Titular de cátedra" (100). L9 Detective es secreto (tocar "Anónimo" cinco veces). L7 espera los cambios de profesores (2027). |
| F19 | Filtros de finales | Hecho | Experiencias de finales | Mesa (Diciembre, Febrero/marzo, Julio, Especial) y materia. El filtro queda en la dirección, así que el link se puede compartir. Al costado: "Materias con más experiencias". Tarjeta como la que mandaste, con "Tomado por:" enlazado al profe cuando coincide y "Nueva" desde tu última visita (también "N nuevas" en la pestaña). Autor: "Publicar con mi nombre" al compartir (por defecto, anónima). Las viejas quedan anónimas. |
| F20 | Recordar años abiertos | Hecho | Inicio y Mi cuenta | Sin sesión viene abierto solo 1.º. Con sesión, vienen abiertos los años que elegís en **Mi cuenta** (con la explicación de para qué sirve). Los años cerrados dicen "Hay reseñas nuevas" cuando las hay. Desde la migración 5 se guarda en tu cuenta (te sigue en el celular y la compu); el navegador guarda una copia. Lo elegido antes solo en el navegador pasa solo a la cuenta al abrir Mi cuenta. |
| F21 | "Me sirvió" en finales | Hecho | Experiencias de finales | Un voto por persona, contador en la tarjeta y orden "Más útiles". Reportar ya no abre un mail: va a la cola de Reportes del admin, junto con las reseñas. |
| F28 | Compartir por WhatsApp | Hecho | Botón verde en curso, materia, profesor y comparador; "Compartir" en cada reseña y cada final; "Pasásela a tu curso" en Reseña publicada | Vista previa propia por página, como la V6: curso, materia, profesor y año tienen su imagen (`/og/curso/ID.png`, etc.) con nombre, etiquetas y nota, y el título lleva la nota. Código corto `?de=` (migración 9): va en todo lo que compartís con sesión; quien abre el link ve la franja verde de la V6 y se anota una apertura por navegador (desde el navegador, para que la vista previa de WhatsApp no cuente; las tuyas no cuentan). El logro "Pasalo al grupo" (L8) espera tu voto. |

## Otros pedidos tuyos (v4 a v6)

| Pedido | Estado | Nota |
|---|---|---|
| Logo de la UTN en el encabezado | Hecho | Logo F2 (elegido el 9/11): símbolo con la barra amarilla y REP adentro, con la bajada "Reseñas de estudiantes, para estudiantes" y "Ingeniería en Sistemas de Información · UTN-FRC". Favicon (barra oficial en amarillo), ícono de la app, imagen al compartir y mail con el logo nuevo. |
| "¿Cómo funciona?" con signo de pregunta | Hecho | Pestaña y pie. |
| Estadísticas como "Así viene el cuatri", sin profesores | Hecho | Reseñas, esta semana, experiencias de finales y cursos reseñados. "Esta semana" pasa a "visitas esta semana" desde 100 visitas (migración 14; Pato prefirió esto a la V6 el 9/11). |
| Materia = cátedra, adentro hay cursos | Hecho | En todos los textos. |
| Pestaña "Materias" en vez de "Índice" | Hecho | — |
| "Experiencias de finales" en vez de "Finales" | Hecho | — |
| Curso: "Finales de esta materia" destacado | Hecho | Panel al costado y aviso en la materia, con link al filtro de esa materia. |
| Curso: turno destacado, botón Comparar llamativo, sin repetir profesores bajo el título | Hecho | — |
| Turnos con color e ícono (sol, atardecer, luna) | Hecho | — |
| Colores por año | Hecho | 1.º azul, 2.º verde, 3.º turquesa, 4.º bordó, 5.º violeta. |
| Cafecito con ícono que invite | Hecho | En el pie y en la columna del inicio. |
| Celular: lo importante arriba, "Ir a" en una línea, sin "Tu cuenta" en el inicio | Hecho | — |
| "Por X" en Última reseña abre la ficha o el easter egg | Hecho | Inicio, página del año y reseña destacada. La ficha se abre hacia la izquierda. |
| Foto de perfil: inicial por defecto | Hecho | En Mi cuenta se elige inicial, foto de Google o uno de 6 dibujos (migración 5). Se ve en Mi cuenta y en tus reseñas con nombre (migración 8; la foto de Google la guarda el servidor al elegirla). |
| Mejoras del panel de admin | Parcial | Resumen, Reportes, Reseñas, Finales, Materias y cursos, Profesores e Importar cuatrimestre tienen el estilo de la V6 (listas con buscador, filtros y acciones en la fila). `/admin/gestion` redirige a la pantalla nueva. Con la migración 4: pantalla Moderación (palabras marcadas y registro de todo lo que se hace), "Responder" y "Pedirle que la edite" en Reportes y Reseñas (el pedido lo ve la persona en Mis reseñas y se borra solo al editar), y reportes automáticos por palabra marcada. Con la migración 9: pantalla Usuarios (reseñas, finales, reportes recibidos, links abiertos; bloquear y desbloquear con motivo, anotado en el registro) y "Links abiertos" en el Resumen. |
| Cambios de profesores (F22 a F27) | Después de marzo 2027 | Lo que decidiste. |

## Pantallas de la V6 (23)

| Pantalla de la V6 | Estado | Dirección |
|---|---|---|
| Materias (inicio) | Hecho | `/` |
| Un año | Hecho | `/nivel/2` |
| Una materia | Hecho | `/materia/ID` |
| Un curso | Hecho | `/dictado/ID` |
| Profesor | Hecho | `/profesor/ID`. "Promedio de sus cursos" (lo elegiste el 7/11; la V6 no tenía puntaje). Sin rol (Titular, JTP): lo descartaste el 8/11; queda el historial en el admin. |
| Búsqueda | Hecho | `/buscar?q=` |
| Comparar cursos | Hecho | `/materia/ID/comparar` |
| Experiencias de finales | Hecho | `/finales` |
| Contar un final | Hecho | `/finales/nuevo` |
| Escribir, paso 1 y paso 2 | Hecho | `/nueva-resena` |
| Reseña publicada | Hecho | `/resena-publicada?curso=ID`. Con el cartel de rango ("Subiste a…") y los logros, y los nuevos de los últimos 15 minutos. |
| Mis reseñas | Hecho | `/mis-resenas` con Reseñas, Finales contados y Borradores, con el turno de cada curso. "Te faltan reseñar" sale de los cursos que elegiste en Mi inscripción (como la V6); si no elegiste ninguno, de tus años de Mi cuenta. Suma "Sumar el final a tu reseña" (F34). Rango y logros van en Mi cuenta. |
| Mi cuenta | Casi completa | `/mi-cuenta` (tocando tu nombre arriba), como la V6: nombre a mostrar (cambia también en lo ya publicado), foto, mostrar u ocultar la ficha, años de cursada, "¿Cómo te fue?" y borrar la cuenta (dejando lo publicado como anónimo o borrándolo). Todo se guarda en la cuenta (migración 5). Materias que seguís: hecho (migración 6). Rango y logros: hecho (migración 8). |
| Mi inscripción (F29) | Hecho (migraciones 12 y 19) | `/mi-inscripcion`: los cursos que estás pensando, por materia, con turno, período (Anual, 1.er o 2.º cuatrimestre; 12/11), nota, cantidad de reseñas y horario. Arriba, una línea por cada par de cursos de materias distintas que se pisan ("X (1K2) y Y (1K1) se pisan el lunes de 8:00 a 10:25."). El 11/11 Pato sacó el "elegido" por materia, "Tu combinación", la nota promedio y los paneles que explicaban cómo se usa. "Lo estoy pensando" en cada curso y panel "Horario" en el curso. Con la migración 19, quien piensa un curso recibe el aviso de sus reseñas nuevas y el recordatorio de fin de cuatrimestre (F32) es uno por materia. |
| Ingresar | Hecho | Ventana de ingreso con mail, Google y GitHub |
| ¿Cómo funciona? | Hecho | `/sobre` |
| Términos | Hecho | `/terminos`, con el texto que aprobaste (mail, anonimato y qué datos se guardan). |
| Error 404 | Hecho | Cualquier dirección que no existe | El "2" de la libreta con el tamaño de la V6 (Pato, 12/11). |
| Link compartido por WhatsApp | Hecho | Imagen y título propios por página, código `?de=` sin nombre y la franja verde "Te pasaron este curso por WhatsApp" (migración 9). |
| Admin | Hecho | `/admin`, `/admin/reportes`, `/admin/resenas`, `/admin/finales`, `/admin/materias` (con el horario de cada curso editable a mano; 12/11), `/admin/profesores`, `/admin/importar`. |

## Bienvenida al cambio (aprobada el 7/11)

- **Cartel** "UTN REP se renovó": una sola vez, a quien ya usaba el sitio (con sesión, o con rastros del sitio anterior en el navegador). Para verlo en la prueba: agregá `?bienvenida=1` a cualquier dirección.
- **Recorrido de 30 segundos**: cuatro paradas, distintas en compu y celular. Desde el cartel, ¿Cómo funciona? o Qué cambió.
- **Etiquetas "Nuevo"** en Compartir, Comparar y "Nuevo lugar" en Experiencias de finales, con un solo globo a la vez. Se apagan al tocarlas, con "Entendido" o después de 3 visitas, y todas el 30/4/2027. Se guardan en el navegador.
- **Qué cambió** (`/que-cambio`): lo que no cambió, dónde quedó cada cosa y lo nuevo que ya funciona. Rangos, logros, seguir materias y "Me sirvió" en finales se suman cuando estén.

## Ideas votadas

- F30, F36 y F37: descartadas.
- F33 ("Tu reseña le sirvió a N personas"): hecho con los avisos (migración 7). F34 ("Rindió en julio 2026" en la reseña): hecho con la migración 13; se ofrece al contar el final y desde Mis reseñas. F29 (con horarios): hecho con la migración 12.
- F35, **Reseña destacada** (sin "del mes", como pediste): hecha. Es la más votada de todo el sitio, desde 3 votos; si otra la pasa, toma su lugar. Columna del inicio (se queda, decidido el 9/11). Lo que más sirve es la de cada lugar: **"La más útil del curso"** (etiqueta en la reseña, migración 16) y **"La más útil de la materia"** (panel al costado de cada materia, con el curso y el link; desde 3 votos, sin base nueva).
- F12, respuestas: solo responde el moderador. Se junta con las notas de moderación (F10) en "Respuesta del moderador" (etapa 3).
- Logros L8 a L19: votados el 9/11 y hechos con la migración 16 (sin L11 ni L16; L19 se partió en L19 y L20).

## Ideas nuevas de Pato (después de la V6)

| Código | Qué es | Estado | Nota |
|---|---|---|---|
| 3.3 | "Editada el 12/11" | Hecho (migración 3) | Reseña y Mis reseñas | La fecha la pone la base (trigger) solo si cambia el texto, las estrellas o "¿Cómo te fue?"; los votos no cuentan como edición. |
| 3.8 / F33 | Avisos dentro del sitio | Hecho (migración 7) | "Avisos" en la barra de arriba (con cantidad sin leer), página `/avisos` y qué avisos querés en Mi cuenta | Los crea la base: reseña o final nuevo en lo que seguís, "Tu reseña le sirvió a N personas" (máximo uno por semana), respuesta y pedido de la moderación. Tabla de preferencias por canal (sitio, mail, Telegram, push). Recordatorio de fin de cuatrimestre (F32) dentro del sitio: hecho con la migración 15. Por mail: migración 17 (un resumen por día). Por Telegram: migración 18 (bot que se conecta desde Mi cuenta; quien lo conecta no recibe el mail; tutorial en `docs/TELEGRAM.md`). |
| F38 | Completar "¿Cómo te fue?" en reseñas viejas | Hecho (migración 3) | Inicio, Mis reseñas y Editar | Franja en el inicio, de a una reseña, con Promocioné, Regularicé y Quedé libre; "Ahora no" (30 días) y "No preguntar más" se guardan en tu cuenta (migración 5) y se cambian en Mi cuenta. Solo pregunta por cursadas de años anteriores o reseñas de más de 4 meses. En Mis reseñas, cada reseña sin el dato lo pide; al editar una reseña hay un selector "¿Cómo te fue?". Las estrellas no se pueden cambiar. |

## Pestañas (11/11, pedido de Pato)

Arriba: Materias, Experiencias de finales, **Mi espacio**, **Avisos** (con el número sin leer), ¿Cómo funciona? y Escribir una reseña. Mi espacio junta Mis reseñas, Mi inscripción y Mi cuenta, con una segunda fila que dice en cuál estás. En el celular, la barra de abajo suma Avisos (con el número) y Mi espacio. Distinto de la V6, que tenía "Mis reseñas" como pestaña y Avisos en la franja gris.

## Importar cuatrimestre (nuevo)

`/admin/importar`. Pegás los links de las planillas de horarios (Sistemas, una pestaña por curso; Básicas, una pestaña por materia) o subís el .xlsx o un CSV. Lee solo cursos con K, compara con la base y muestra qué cambia: cursos nuevos (con su turno), materias que no encontró, equipos que cambian, profesores nuevos. Nada se guarda hasta tocar Guardar, y solo lo que dejás marcado. Las pestañas de subgrupos de electivas (4K1A, 4K1B) se saltean. Las planillas tienen que estar compartidas como "cualquiera con el link". También lee un CSV de horarios (curso, materia, cuatrimestre, dia, desde, hasta) que gana sobre las planillas: `datos/horarios-2026-pdf.csv` tiene los de todos los años sacados de los PDF oficiales (`scripts/horarios-pdf/`). Probado con la de 4.º año y la de Básicas en datos inventados; falta probarlo en la base de prueba.

## Cómo probarlo

- **Link de prueba:** Vercel, pestaña Deployments, el deploy de esta rama. Usa la base de prueba.
- **En tu compu, sin base:** `npm run dev:mock` (datos inventados). Con sesión de prueba y admin: `MOCK_USER=1 ADMIN_IDS=u-demo npm run dev:mock`.
