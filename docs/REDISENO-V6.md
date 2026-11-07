# Rediseño estilo foro: qué hay de la V6 en esta rama

Rama: `claude/project-thread-e3wgmo`. Última actualización: 7/11/2026 (tu revisión del 7/11, puntos de "Ahora" del `plan-7-11.md`).

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
| F6 | Etiqueta de plan de estudios (2008 o 2023) | Falta (etapa 3) | — | La base no guarda el plan. Hace falta una columna nueva y la pregunta en el formulario. |
| F7 | Otros cursos de la materia y comparador | Hecho | Botón "Comparar cursos" en la materia y en el curso; `/materia/ID/comparar` | Columnas: General, Reseñas, Promocionó, Regularizó y Quedó libre. **No están** Dificultad, Exigencia ni Claridad porque la base solo guarda el puntaje general (van con etapa 3 si los querés). Se ordena tocando los títulos y se filtra por turno. |
| F8 | Formulario en pasos con borrador | Hecho | Escribir una reseña | 3 pasos (2 si venís desde un curso). El borrador queda en el navegador. **No están** el título ni el plan de estudios (no existen en la base) ni los puntajes por separado. El paso 1 usa listas desplegables en vez de botones. Los cursos que ya reseñaste aparecen deshabilitados. |
| F9 | Barra de navegación inferior en celular | Hecho | Celular | — |
| F10 | Notas de moderación en una reseña | Falta (etapa 3) | — | Tabla nueva. |
| F11 | Seguir una materia y aviso por mail | Falta (etapa 3) | — | Tabla nueva y envío de mails. |
| F12 | Respuestas a una reseña | Falta (etapa 3) | — | Tabla nueva. |
| F13 | Contador "Hay X estudiantes en línea" | Falta (etapa 3) | — | Necesita registrar actividad reciente. |
| F14 | Visitas | Falta (etapa 3) | — | Vercel Analytics las cuenta, pero no se pueden mostrar en la página sin un contador propio. |
| F15 | Ficha de usuario ocultable | Falta (etapa 3) | — | Hoy "por X" en Última reseña es texto, no enlace. |
| F16 | Easter egg de Anónimo | Falta (etapa 3) | — | Va junto con F15. |
| F17 | Escudos de rango | Falta (etapa 3) | — | Va con F5. |
| F18 | Logros | Falta (etapa 3) | — | Tabla nueva. Los logros L1 a L7 están aprobados; L8 a L19 esperan tu voto. |
| F19 | Filtros de finales | Hecho | Experiencias de finales | Mesa (Diciembre, Febrero/marzo, Julio, Especial) y materia. El filtro queda en la dirección, así que el link se puede compartir. Al costado: "Materias con más experiencias". Tarjeta como la que mandaste, con "Tomado por:" enlazado al profe cuando coincide y "Nueva" desde tu última visita (también "N nuevas" en la pestaña). El autor sale siempre como "Anónimo" hasta la etapa 3. |
| F20 | Recordar años abiertos | Hecho | Inicio | Los años vienen cerrados; con "¿Qué año cursás?" elegís cuáles vienen abiertos (más de uno). Se guarda en el navegador. |
| F21 | "Me sirvió" en finales | Falta (etapa 3) | — | Tabla de votos nueva. |
| F28 | Compartir por WhatsApp | Parcial | Botón verde en curso, materia, profesor y comparador; "Compartir" en cada reseña y cada final; "Pasásela a tu curso" en Reseña publicada | En el celular abre el menú de compartir del teléfono; en la compu, WhatsApp Web. Hay imagen de vista previa genérica (`/og-image.png`), que cambia cuando elijas el logo. **Falta** el código corto `?de=` y el logro "Pasalo al grupo" (L8), que necesitan guardar quién compartió. |

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
| Foto de perfil: inicial por defecto | Hecho | En Mi cuenta se iba a poder elegir foto: falta, porque Mi cuenta no existe todavía. |
| Mejoras del panel de admin (resumen, reportes, importar) | Parcial | Resumen, Reportes, Finales e Importar cuatrimestre son nuevos, como la V6. Reseñas, Materias y cursos y Profesores siguen en la pantalla anterior (`/admin/gestion`). Usuarios, palabras marcadas con historial, links abiertos de WhatsApp, registro de moderación y "Pedirle que la edite" van con la etapa 3. |
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
| Mi cuenta | Falta (etapa 3) | — |
| Mi inscripción (F29) | Falta | Espera tu voto |
| Ingresar | Hecho | Ventana de ingreso con mail, Google y GitHub |
| ¿Cómo funciona? | Hecho | `/sobre` |
| Términos | Parcial | `/terminos`: diseño nuevo, pero el texto todavía dice que se entra solo con Google o GitHub |
| Error 404 | Hecho | Cualquier dirección que no existe |
| Link compartido por WhatsApp | Parcial | Título y descripción propios por página e imagen genérica. Falta una imagen por página (por ejemplo, la nota del curso). |
| Admin: resumen, reportes e importar | Hecho | `/admin`, `/admin/reportes`, `/admin/finales`, `/admin/importar`. El resto en `/admin/gestion`. |

## Ideas que esperan tu voto

F29 a F37 y logros L8 a L19 (detalle en la encuesta de la V6). Nada de esto está hecho.

## Ideas nuevas de Pato (después de la V6)

| Código | Qué es | Estado | Nota |
|---|---|---|---|
| F38 | Completar "¿Cómo te fue?" en reseñas viejas | Propuesta para etapa 3 | Al entrar, una franja (no una ventana) con tus reseñas sin estado y tres botones: Promocioné, Regularicé, Quedé libre. Opciones "Ahora no" (vuelve en 30 días) y "No preguntar más". Solo pregunta por cursadas de años anteriores o reseñas con más de 4 meses. También se puede completar desde Mis reseñas. Cambio en la base: permitir editar `condicion_final` de la reseña propia (hoy solo se puede editar el comentario). |

## Importar cuatrimestre (nuevo)

`/admin/importar`. Pegás los links de las planillas de horarios (Sistemas, una pestaña por curso; Básicas, una pestaña por materia) o subís el .xlsx o un CSV. Lee solo cursos con K, compara con la base y muestra qué cambia: cursos nuevos (con su turno), materias que no encontró, equipos que cambian, profesores nuevos. Nada se guarda hasta tocar Guardar, y solo lo que dejás marcado. Las pestañas de subgrupos de electivas (4K1A, 4K1B) se saltean. Las planillas tienen que estar compartidas como "cualquiera con el link". Probado con la de 4.º año y la de Básicas en datos inventados; falta probarlo en la base de prueba.

## Cómo probarlo

- **Link de prueba:** Vercel, pestaña Deployments, el deploy de esta rama. Usa la base de prueba.
- **En tu compu, sin base:** `npm run dev:mock` (datos inventados). Con sesión de prueba y admin: `MOCK_USER=1 ADMIN_IDS=u-demo npm run dev:mock`.
