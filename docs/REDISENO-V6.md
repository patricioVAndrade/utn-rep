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
| F5 | Rangos por cantidad de reseñas | Falta (etapa 3) | — | Necesita contar reseñas por persona y mostrarlo en público. |
| F6 | Etiqueta de plan de estudios (2008 o 2023) | Base lista, sin mostrar | — | Migración 3: columna `plan` con 2023 en todas. No se muestra ni se pregunta, como pidió Pato; queda lista para cuando convivan los dos planes. |
| F7 | Otros cursos de la materia y comparador | Hecho | Botón "Comparar cursos" en la materia y en el curso; `/materia/ID/comparar` | Columnas: General, Reseñas, Promocionó, Regularizó y Quedó libre. **No están** Dificultad, Exigencia ni Claridad porque la base solo guarda el puntaje general (van con etapa 3 si los querés). Se ordena tocando los títulos y se filtra por turno. |
| F8 | Formulario en pasos con borrador | Hecho | Escribir una reseña | 3 pasos (2 si venís desde un curso). El borrador queda en el navegador. **No están** el título ni el plan de estudios (no existen en la base) ni los puntajes por separado. El paso 1 usa listas desplegables en vez de botones. Los cursos que ya reseñaste aparecen deshabilitados. |
| F9 | Barra de navegación inferior en celular | Hecho | Celular | — |
| F10 | Notas de moderación en una reseña | Hecho (migración 4) | Curso, Finales, admin | Junta con F12 en "Respuesta del moderador": una por reseña o final, pública y sin nombre de quién la escribió. Se escribe desde Reportes o Reseñas del admin. |
| F11 | Seguir una materia y aviso por mail | Falta (etapa 3) | — | Tabla nueva y envío de mails. |
| F12 | Respuestas a una reseña | Hecho como F10 | — | Solo responde el moderador (decisión de Pato). |
| F13 | Contador "Hay X estudiantes en línea" | Falta (etapa 3) | — | Necesita registrar actividad reciente. |
| F14 | Visitas | Falta (etapa 3) | — | Vercel Analytics las cuenta, pero no se pueden mostrar en la página sin un contador propio. |
| F15 | Ficha de usuario ocultable | Falta (etapa 3) | — | Hoy "por X" en Última reseña es texto, no enlace. |
| F16 | Easter egg de Anónimo | Falta (etapa 3) | — | Va junto con F15. |
| F17 | Escudos de rango | Falta (etapa 3) | — | Va con F5. |
| F18 | Logros | Falta (etapa 3) | — | Tabla nueva. Los logros L1 a L7 están aprobados; L8 a L19 esperan tu voto. |
| F19 | Filtros de finales | Hecho | Experiencias de finales | Mesa (Diciembre, Febrero/marzo, Julio, Especial) y materia. El filtro queda en la dirección, así que el link se puede compartir. Al costado: "Materias con más experiencias". Tarjeta como la que mandaste, con "Tomado por:" enlazado al profe cuando coincide y "Nueva" desde tu última visita (también "N nuevas" en la pestaña). Autor: "Publicar con mi nombre" al compartir (por defecto, anónima). Las viejas quedan anónimas. |
| F20 | Recordar años abiertos | Hecho | Inicio y Mi cuenta | Sin sesión viene abierto solo 1.º. Con sesión, vienen abiertos los años que elegís en **Mi cuenta** (con la explicación de para qué sirve). Los años cerrados dicen "Hay reseñas nuevas" cuando las hay. Por ahora se guarda en el navegador; pasa a la cuenta con la migración de preferencias. |
| F21 | "Me sirvió" en finales | Hecho | Experiencias de finales | Un voto por persona, contador en la tarjeta y orden "Más útiles". Reportar ya no abre un mail: va a la cola de Reportes del admin, junto con las reseñas. |
| F28 | Compartir por WhatsApp | Parcial | Botón verde en curso, materia, profesor y comparador; "Compartir" en cada reseña y cada final; "Pasásela a tu curso" en Reseña publicada | Vista previa propia por página, como la V6: curso, materia, profesor y año tienen su imagen (`/og/curso/ID.png`, etc.) con nombre, etiquetas y nota, y el título lleva la nota. **Falta** el código corto `?de=` y el logro "Pasalo al grupo" (L8), que necesitan base. |

## Otros pedidos tuyos (v4 a v6)

| Pedido | Estado | Nota |
|---|---|---|
| Logo de la UTN en el encabezado | Hecho | Símbolo UTN en vector. El logo nuevo de UTN REP (opciones A a F) y el favicon esperan tu elección. |
| "¿Cómo funciona?" con signo de pregunta | Hecho | Pestaña y pie. |
| Estadísticas como "Así viene el cuatri", sin profesores | Hecho | Reseñas, esta semana, experiencias de finales y cursos reseñados. |
| Materia = cátedra, adentro hay cursos | Hecho | En todos los textos. |
| Pestaña "Materias" en vez de "Índice" | Hecho | — |
| "Experiencias de finales" en vez de "Finales" | Hecho | — |
| Curso: "Finales de esta materia" destacado | Hecho | Panel al costado y aviso en la materia, con link al filtro de esa materia. |
| Curso: turno destacado, botón Comparar llamativo, sin repetir profesores bajo el título | Hecho | — |
| Turnos con color e ícono (sol, atardecer, luna) | Hecho | — |
| Colores por año | Hecho | 1.º azul, 2.º verde, 3.º turquesa, 4.º bordó, 5.º violeta. |
| Cafecito con ícono que invite | Hecho | En el pie y en la columna del inicio. |
| Celular: lo importante arriba, "Ir a" en una línea, sin "Tu cuenta" en el inicio | Hecho | — |
| "Por X" en Última reseña abre la ficha o el easter egg | Falta (etapa 3) | Va con F15 y F16. |
| Foto de perfil: inicial por defecto | Hecho | Elegir foto en Mi cuenta va con la etapa 3. |
| Mejoras del panel de admin | Parcial | Resumen, Reportes, Reseñas, Finales, Materias y cursos, Profesores e Importar cuatrimestre tienen el estilo de la V6 (listas con buscador, filtros y acciones en la fila). `/admin/gestion` redirige a la pantalla nueva. Con la migración 4: pantalla Moderación (palabras marcadas y registro de todo lo que se hace), "Responder" y "Pedirle que la edite" en Reportes y Reseñas (el pedido lo ve la persona en Mis reseñas y se borra solo al editar), y reportes automáticos por palabra marcada. Usuarios y links compartidos van con la migración 9. |
| Cambios de profesores (F22 a F27) | Después de marzo 2027 | Lo que decidiste. |

## Pantallas de la V6 (23)

| Pantalla de la V6 | Estado | Dirección |
|---|---|---|
| Materias (inicio) | Hecho | `/` |
| Un año | Hecho | `/nivel/2` |
| Una materia | Hecho | `/materia/ID` |
| Un curso | Hecho | `/dictado/ID` |
| Profesor | Hecho | `/profesor/ID`. "Promedio de sus cursos" (lo elegiste el 7/11; la V6 no tenía puntaje). El rol (Titular, JTP) va con la etapa 3. |
| Búsqueda | Hecho | `/buscar?q=` |
| Comparar cursos | Hecho | `/materia/ID/comparar` |
| Experiencias de finales | Hecho | `/finales` |
| Contar un final | Hecho | `/finales/nuevo` |
| Escribir, paso 1 y paso 2 | Hecho | `/nueva-resena` |
| Reseña publicada | Hecho | `/resena-publicada?curso=ID`. Rango y logros van con la etapa 3. |
| Mis reseñas | Parcial | `/mis-resenas` con Reseñas, Finales contados y Borradores, sin turno. "Te faltan reseñar" sale de los años que elegiste en el inicio (hasta que exista Mi inscripción). Sin rango ni logros. |
| Mi cuenta | Parcial | `/mi-cuenta` (tocando tu nombre arriba): tus años de cursada y datos de la cuenta. Nombre, foto, ficha, rango, logros, materias que seguís, avisos y borrar la cuenta van con la etapa 3. |
| Mi inscripción (F29) | Falta | Espera tu voto |
| Ingresar | Hecho | Ventana de ingreso con mail, Google y GitHub |
| ¿Cómo funciona? | Hecho | `/sobre` |
| Términos | Hecho | `/terminos`, con el texto que aprobaste (mail, anonimato y qué datos se guardan). |
| Error 404 | Hecho | Cualquier dirección que no existe |
| Link compartido por WhatsApp | Parcial | Imagen y título propios por página. Falta la franja "Te pasaron este curso" y el código `?de=` (etapa 3). |
| Admin | Hecho | `/admin`, `/admin/reportes`, `/admin/resenas`, `/admin/finales`, `/admin/materias`, `/admin/profesores`, `/admin/importar`. |

## Bienvenida al cambio (aprobada el 7/11)

- **Cartel** "UTN REP se renovó": una sola vez, a quien ya usaba el sitio (con sesión, o con rastros del sitio anterior en el navegador). Para verlo en la prueba: agregá `?bienvenida=1` a cualquier dirección.
- **Recorrido de 30 segundos**: cuatro paradas, distintas en compu y celular. Desde el cartel, ¿Cómo funciona? o Qué cambió.
- **Etiquetas "Nuevo"** en Compartir, Comparar y "Nuevo lugar" en Experiencias de finales, con un solo globo a la vez. Se apagan al tocarlas, con "Entendido" o después de 3 visitas, y todas el 30/4/2027. Se guardan en el navegador.
- **Qué cambió** (`/que-cambio`): lo que no cambió, dónde quedó cada cosa y lo nuevo que ya funciona. Rangos, logros, seguir materias y "Me sirvió" en finales se suman cuando estén.

## Ideas votadas

- F30, F36 y F37: descartadas.
- F33, F34: etapa 3. F29 (con horarios): lo último.
- F35, **Reseña destacada** (sin "del mes", como pediste): hecha. Es la más votada de todo el sitio, desde 3 votos; si otra la pasa, toma su lugar. Columna del inicio.
- F12, respuestas: solo responde el moderador. Se junta con las notas de moderación (F10) en "Respuesta del moderador" (etapa 3).
- Logros L8 a L19: esperan tu voto.

## Ideas nuevas de Pato (después de la V6)

| Código | Qué es | Estado | Nota |
|---|---|---|---|
| 3.3 | "Editada el 12/11" | Hecho (migración 3) | Reseña y Mis reseñas | La fecha la pone la base (trigger) solo si cambia el texto, las estrellas o "¿Cómo te fue?"; los votos no cuentan como edición. |
| F38 | Completar "¿Cómo te fue?" en reseñas viejas | Hecho (migración 3) | Inicio, Mis reseñas y Editar | Franja en el inicio, de a una reseña, con Promocioné, Regularicé y Quedé libre; "Ahora no" (30 días) y "No preguntar más" quedan en el navegador (`comoTeFue`) hasta que esté Mi cuenta con base. Solo pregunta por cursadas de años anteriores o reseñas de más de 4 meses. En Mis reseñas, cada reseña sin el dato lo pide; al editar una reseña hay un selector "¿Cómo te fue?". Las estrellas no se pueden cambiar. |

## Importar cuatrimestre (nuevo)

`/admin/importar`. Pegás los links de las planillas de horarios (Sistemas, una pestaña por curso; Básicas, una pestaña por materia) o subís el .xlsx o un CSV. Lee solo cursos con K, compara con la base y muestra qué cambia: cursos nuevos (con su turno), materias que no encontró, equipos que cambian, profesores nuevos. Nada se guarda hasta tocar Guardar, y solo lo que dejás marcado. Las pestañas de subgrupos de electivas (4K1A, 4K1B) se saltean. Las planillas tienen que estar compartidas como "cualquiera con el link". Probado con la de 4.º año y la de Básicas en datos inventados; falta probarlo en la base de prueba.

## Cómo probarlo

- **Link de prueba:** Vercel, pestaña Deployments, el deploy de esta rama. Usa la base de prueba.
- **En tu compu, sin base:** `npm run dev:mock` (datos inventados). Con sesión de prueba y admin: `MOCK_USER=1 ADMIN_IDS=u-demo npm run dev:mock`.
