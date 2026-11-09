# Migraciones de la etapa 3

Al 7/11/2026. Son los cambios en la base que necesita lo que falta del rediseño. Van **una por una**: te explico cada una, la corrés en la **base de prueba**, subo el código que la usa, lo probás en el Preview y recién ahí pasamos a la siguiente. A producción van todas juntas cuando digas que está todo listo.

Cómo se corre cada una:

1. Abrís el proyecto de Supabase **de prueba** > SQL Editor.
2. Pegás el archivo de `supabase/migrations/` que te indique y tocás Run.
3. Al final de cada archivo hay una consulta de verificación: el resultado me lo pasás (es solo un conteo, no tiene datos de nadie).

Todas corren en una transacción (si algo falla, no se aplica nada), se pueden volver a correr sin romper nada y tienen su vuelta atrás en `supabase/rollback/`. Ninguna borra reseñas ni usuarios.

---

## El orden y qué hace cada una

### 1. Autor y anonimato en las experiencias de finales — **corrida en prueba el 7/11, código subido**

- **Para qué:** el interruptor "Publicar con mi nombre" al compartir un final, y que la tarjeta diga el nombre o "Anónimo". Hoy todas dicen "Anónimo" porque no se guarda nada.
- **Qué cambia en la base:**
  - Dos columnas en `experiencias_finales`: `es_anonima` (sí por defecto) y `nombre_usuario`. Las que ya existen quedan anónimas, porque nadie eligió mostrar su nombre.
  - Una vista pública, `experiencias_finales_publicas`, igual a la que ya usan las reseñas: no muestra quién la escribió y oculta el nombre si es anónima.
  - La tabla deja de leerse con la clave pública; cada persona ve solo las suyas (para "Mis reseñas").
- **Por qué lo último es importante:** hoy cualquiera puede leer el `user_id` de cada experiencia de final. Con el nombre guardado al lado, alguien podría destapar a quien publicó como anónimo. Con la vista, eso se cierra.
- **Archivo:** `supabase/migrations/20261108000000_finales_autor.sql`. Vuelta atrás: `supabase/rollback/20261108000000_finales_autor.sql`.
- **Verificación esperada:** `columnas_nuevas = 2`, `vista = 1`, `anon_puede_leer_tabla = false` y la cantidad de experiencias que tenés en la base de prueba.

### 2. "Me sirvió" y Reportar en finales (F21) — **corrida en prueba el 7/11, código subido**

- **Para qué:** votar las experiencias de finales que te sirvieron (con contador y orden "Más útiles") y que Reportar vaya a la cola de Reportes del admin en vez de abrir un mail.
- **Qué cambia:** tabla `votos_finales` (una fila por persona y experiencia, como los votos de reseñas), columna `votos_utilidad` en la experiencia y una función para votar que solo suma o resta de a uno. Tabla `reportes_finales`, igual a la de reseñas.

### 3. Reseñas: fecha de edición, "¿Cómo te fue?" y plan de estudios (3.3, 3.4 y 3.5) — **corrida en prueba el 7/11, código subido**

Las tres tocan la tabla `resenas`, así que van juntas.

- **Fecha de edición:** columna `updated_at` que se llena sola al editar. En la reseña aparece "Editada el 12/11".
- **"¿Cómo te fue?" en reseñas viejas (F38):** hoy cada persona solo puede editar el texto de su reseña. Se le permite también completar `condicion_final` (Promocioné, Regularicé, Quedé libre).
- **Plan de estudios:** columna `plan` con 2023 en todas, sin mostrarla, como pediste.
- **Archivo:** `supabase/migrations/20261108020000_resenas_edicion_plan.sql`. Vuelta atrás: `supabase/rollback/20261108020000_resenas_edicion_plan.sql`.
- **Verificación esperada:** `columnas = 2`, `trigger = 1`, `puede_editar_condicion = true` y la cantidad de reseñas (todas con plan 2023).

### 4. Moderación (F10, F12 y el resto de 3.6) — **corrida en prueba el 7/11, código subido**

- **Respuesta del moderador:** como decidiste, solo el moderador responde, y se junta con las notas de moderación. Tabla `respuestas_moderador`: una por reseña o por experiencia de final. Es pública (se ve debajo de la reseña), no guarda quién de la moderación la escribió y solo el servidor la puede escribir.
- **"Pedirle que la edite":** dos columnas en la reseña, el motivo y la fecha. Lo ve solo quien la escribió (en Mis reseñas, y como aviso cuando esté la 7); la vista pública no lo muestra y la persona no lo puede borrar a mano. Cuando cambia el texto, el pedido se borra solo.
- **Registro de moderación:** tabla `registro_moderacion` con quién hizo qué y cuándo (borró, dejó, corrigió, respondió, pidió edición, palabras). Solo la lee el servidor; se ve en el admin.
- **Palabras marcadas:** tabla `palabras_marcadas`, editable desde el admin, solo el servidor la lee. Al publicar, si una reseña tiene una, entra sola a Reportes como "automático". Para eso `reportes_resenas` acepta reportes sin persona, solo si están marcados como automáticos; nadie puede mandar uno automático desde el sitio.
- **Archivo:** `supabase/migrations/20261108030000_moderacion.sql`. Vuelta atrás: `supabase/rollback/20261108030000_moderacion.sql` (borra respuestas, registro, palabras, pedidos y reportes automáticos; las reseñas no se tocan).
- **Verificación esperada:** `tablas = 3`, `columnas_pedido = 2`, `trigger = 1`, `reportes_automaticos = 1`, `publico_lee_respuestas = true`, `publico_lee_registro = false`, `publico_lee_palabras = false`.

### 5. Perfil y preferencias (Mi cuenta) — **corrida en prueba el 7/11, código subido**

- **Para qué:** lo que falta de Mi cuenta como la V6.
- **Tabla `perfiles`** (una fila por persona, se crea la primera vez que guarda algo): nombre para mostrar, foto elegida (inicial, Google o uno de 12 dibujos), si muestra la ficha, **tus años de cursada** (hoy quedan en el navegador; con esto te siguen en el celular y la compu) y si quiere que le pregunten "¿Cómo te fue?" (con la pausa de 30 días de "Ahora no"). Cada persona lee y cambia solo la suya; sin sesión no se lee nada.
- **Nombre para mostrar:** si elegís uno, tus reseñas nuevas salen con ese nombre y se actualiza en las que ya publicaste con nombre (también en finales). Si lo borrás, vuelve el de Google. Las anónimas siguen anónimas.
- **Borrar la cuenta:** función `anonimizar_usuario` que deja tus reseñas y experiencias como anónimas y sin dueño, para que no se borren junto con el usuario (hoy se borrarían). Solo la puede llamar el servidor, que después borra el usuario. Por eso `user_id` pasa a aceptar vacío en `resenas` y `experiencias_finales`.
- **Archivo:** `supabase/migrations/20261108040000_perfiles.sql`. Vuelta atrás: `supabase/rollback/20261108040000_perfiles.sql` (borra los perfiles; los nombres ya copiados a las reseñas quedan).
- **Verificación esperada:** `tabla = 1`, `triggers = 2`, `anon_lee_perfiles = false`, `usuario_puede_anonimizar = false` y cuántas reseñas tienen dueño.

### 6. Seguir materias (F11) — **corrida en prueba el 7/11, código subido**

- Tabla `seguimientos` (persona, materia y si quiere mail de lo nuevo). Botón Seguir en la materia y en el curso (desde el curso se sigue su materia), y la lista en Mi cuenta con el interruptor de mail, como la V6. El mail en sí llega con la 7.
- Cada persona ve y cambia solo lo suyo; nadie puede saber qué sigue otro. No toca ninguna tabla existente.
- **Archivo:** `supabase/migrations/20261108050000_seguimientos.sql`. Vuelta atrás: `supabase/rollback/20261108050000_seguimientos.sql`.
- **Verificación esperada:** `tabla = 1`, `politicas = 4`, `anon_lee = false`.

### 7. Avisos dentro del sitio (3.8, F33 y la base de F32) — **corrida en prueba el 7/11, código subido**

- **Tabla `notificaciones`:** un aviso por persona, con tipo, título, link, si lo leyó y si ya se mandó por mail. Cada uno ve, marca como leídos y borra solo los suyos. Nadie puede crear avisos desde el sitio: los crea la base.
- **Tabla `preferencias_aviso`:** qué avisos quiere cada uno y por qué canal (sitio, mail, Telegram, push). Si no eligió nada, el aviso está prendido. Sumar mail o Telegram después no cambia nada de esto.
- **Los avisos se crean solos**, con triggers:
  - reseña nueva o final nuevo en una materia que seguís (sin decir quién la escribió);
  - "Tu reseña le sirvió a 5 personas" (también 10, 25, 50 y 100), como máximo uno por semana;
  - la moderación respondió tu reseña o tu final;
  - la moderación te pide que edites tu reseña.
- Los logros (8) y el recordatorio de fin de cuatrimestre (F32) usan la misma tabla. El envío de mails necesita un servicio de mail con su clave (la cargás vos en Vercel); lo vemos aparte.
- No cambia ninguna reseña ni tabla existente: solo les suma triggers.
- **Archivo:** `supabase/migrations/20261108060000_notificaciones.sql`. Vuelta atrás: `supabase/rollback/20261108060000_notificaciones.sql` (borra los avisos y las preferencias).
- **Verificación esperada:** `tablas = 2`, `triggers = 4`, `anon_lee = false`, `puede_crear_avisos = false`.

### 8. Rangos, escudos, logros y ficha (F5, F15 a F18) — **corrida en prueba el 7/11, código subido**

- **Tabla `logros_usuario`:** qué logro ganó cada persona y cuándo. Un logro ganado no se pierde. Cada uno ve los suyos; la ficha que ven los demás la arma el servidor y solo si la persona la deja ver (Mi cuenta).
- **Se dan solos:** L1 Primera reseña, L2 Abriste camino (primera reseña de una materia), L3 Útil para 10 estudiantes (tus reseñas suman 10 "Me sirvió"), L4 Rendí y compartí mi experiencia (primera experiencia de final), L5 Madrugada de parcial (reseña entre las 2 y las 5), L6 Los cinco años. Cada logro nuevo deja un aviso.
- **L7 (Bedelía al día)** era por avisar cambios de profesores, que quedó para 2027: espera a eso. **L8 a L19** esperan tu voto; la tabla ya los acepta.
- A quienes ya tienen reseñas les da los logros que ya ganaron, sin aviso.
- **Rango:** no se guarda, sale de contar reseñas: 1 Ingresante, 2 a 4 Cursante, 5 a 14 Referente, 15 o más Leyenda.
- **Foto de Google en las reseñas:** columna `foto_url` en `perfiles`, que guarda el servidor cuando elegís mostrarla. Nadie la puede escribir desde el sitio.
- **L4 cambió de nombre** después de correrla: volver a correr la migración (se puede, no duplica nada) para que el aviso use "Rendí y compartí mi experiencia".
- **Archivo:** `supabase/migrations/20261108070000_logros.sql`. Vuelta atrás: `supabase/rollback/20261108070000_logros.sql`.
- **Verificación esperada:** `tabla = 1`, `triggers = 2`, `anon_lee = false`, `puede_escribir_foto = false` y cuántos logros se dieron (en la base de prueba, 0 si las reseñas no tienen dueño).

### 9. Admin: Usuarios y links compartidos (3.14, F28) — **corrida en prueba el 8/11, código subido**

- **Archivo:** `supabase/migrations/20261108080000_usuarios_links.sql`. Vuelta atrás: `supabase/rollback/20261108080000_usuarios_links.sql`.
- **Bloquear:** `perfiles.bloqueado_at` y `bloqueo_motivo`, solo los escribe el admin. Triggers `trg_bloqueo` (al crear en reseñas, finales, votos y reportes), `trg_bloqueo_editar` (editar reseña) y `trg_bloqueo_perfil` (nombre y foto) frenan con el código `UB001`; las APIs lo traducen a "Tu cuenta está bloqueada".
- **Links:** `links_compartidos` (un código por persona) y `aperturas_link` (una por visitante). Solo con la clave de servicio.

- **Usuarios:** marca de bloqueado en `perfiles` y la lista en el admin con reseñas y reportes recibidos.
- **Links compartidos:** tabla `links_compartidos` con un código corto (`?de=k7p2`) y cuántas personas distintas lo abrieron. Sirve para "Links compartidos esta semana" en el admin y el logro "Pasalo al grupo" (L8).

### 10. Contador "Hay X estudiantes en línea" (F13) — **corrida en prueba el 8/11, código subido**

- Tabla `presencia`: un número al azar por navegador y la última vez que dio señales (sin quién es, sin IP, sin página). Lo de más de 10 minutos se borra solo.
- `latido(visitante)` y `en_linea()`, solo para el servidor. `/api/en-linea` limita a 300 pedidos por minuto por IP (en la facultad mucha gente comparte IP).
- Se muestra solo desde 5 personas, arriba de "Así viene el cuatri".
- **Archivo:** `supabase/migrations/20261108090000_en_linea.sql`. Vuelta atrás: `supabase/rollback/20261108090000_en_linea.sql`.
- **Verificación esperada:** `tabla = 1`, `funciones = 2`, `anon_lee = false`, `anon_puede_latir = false`, `prueba = true`.

### 11. Historial de profesores (3.13) — **corrida en prueba el 8/11, código subido**

- Sin rol (Titular, JTP...): lo sacaste el 8/11, alcanza con el historial. Si quedó la columna `rol` de la versión anterior, la migración la borra.
- Tabla `profesores_historial` con desde y hasta (año y cuatrimestre). La llevan triggers: al asignar un profe se abre un período, al sacarlo se cierra. Así el importador y el admin no cambian (siguen agregando y sacando) y `dictado_profesores` sigue siendo "los de hoy", sin tocar las pantallas que la leen.
- Los profes de hoy arrancan con su período abierto desde 2026.
- **Archivo:** `supabase/migrations/20261108100000_profesores_historial.sql`. Vuelta atrás: `supabase/rollback/20261108100000_profesores_historial.sql`. Prueba con datos: `supabase/pruebas/migracion-11.sql`.
- **Verificación esperada:** `columna_rol = 0`, `tabla = 1`, `trigger = 1`, `sin_periodo = 0`, `publico_cambia = false`.

### 12. Horarios de cada curso y Mi inscripción (F29) — **lista para correr en prueba, código subido**

- Tabla `horarios`: los bloques de clase de cada curso de una materia (día, desde, hasta y, si la planilla lo dice, el cuatrimestre). Los carga el importador desde la grilla de las planillas: en las de Sistemas entiende las siglas (ADSI, IOP, SIM, ICS, TPA…), las celdas combinadas, los dos cuatrimestres y "Electiva 1 GMP / GIP"; en la de Básicas lee el "08:00 a 09:30" de cada día. Probado con las planillas reales de 4.º año y de Básicas: solo quedó sin reconocer "DAO" en 4K3 (en esa pestaña la materia se llama "Desarrollo de Aplicaciones", sin "con Objetos"), y lo avisa. Los lee cualquiera; solo los cambia el admin.
- Tabla `inscripcion_cursos`: "Lo estoy pensando". Cada persona guarda los cursos que está pensando y marca uno elegido por materia. Nadie más la ve, salvo que la comparta con el link. La materia la completa la base y hay un tope de 80. Sin sesión la lista queda en el navegador y al iniciar sesión pasa a la cuenta.
- El aviso de que dos elegidos se pisan lo calcula el sitio con los horarios (`src/lib/horarios.ts`).
- **Archivo:** `supabase/migrations/20261108110000_horarios_inscripcion.sql`. Vuelta atrás: `supabase/rollback/20261108110000_horarios_inscripcion.sql`. Prueba con datos: `supabase/pruebas/migracion-12.sql`.
- **Verificación esperada:** `tablas = 2`, `politicas = 5`, `publico_lee_horarios = true`, `publico_cambia_horarios = false`, `anon_lee_inscripcion = false`.

### 13. Sumar el final a tu reseña (F34) — **corrida en prueba el 9/11, código subido**

- Columna nueva `final_id` en `resenas`: el final que contaste, si lo sumaste. Si borrás el final, la reseña queda como estaba (sin final).
- La base controla que el final sea tuyo y de la misma materia de la reseña (si no, error `FN001`), y que un final esté en una sola reseña.
- Sumarlo no marca la reseña como "Editada".
- La vista pública de reseñas suma la mesa y el año del final (para el "Rindió en julio 2026" del curso), sin mostrar qué final es.
- En el sitio: al contar un final de una materia que reseñaste te lleva a Mis reseñas para sumarlo; ahí también podés sumarlo o sacarlo cuando quieras.
- **Archivo:** `supabase/migrations/20261109000000_resenas_final.sql`. Vuelta atrás: `supabase/rollback/20261109000000_resenas_final.sql`. Prueba con datos: `supabase/pruebas/migracion-13.sql`.
- **Verificación esperada:** `columna = 1`, `trigger = 1`, `puede_sumar = true`, `vista = 2`, `publico_ve_final_id = 0`.

### 14. "Visitas esta semana" (F14) — **corrida en prueba el 9/11, código subido**

- Tabla `visitas_dia`: el día y el número al azar de cada navegador (el mismo del contador en línea). Cada navegador cuenta una vez por día. No guarda quién es, ni la IP, ni qué página mira, y lo de más de 8 días se borra solo.
- La anota el mismo latido del contador en línea (migración 10), así que no suma pedidos nuevos.
- `visitas_semana()`: las visitas de los últimos 7 días, con hora de Córdoba. La usa solo el servidor.
- En el inicio, "Así viene el cuatri" queda como estaba (reseñas, esta semana, experiencias de finales y cursos reseñados), pero "esta semana" pasa a ser "visitas esta semana" cuando hay 100 o más (lo pediste el 9/11). Con menos, o sin la migración, sigue mostrando las reseñas de la semana.
- **Archivo:** `supabase/migrations/20261109010000_visitas.sql` (necesita la 10). Vuelta atrás: `supabase/rollback/20261109010000_visitas.sql`. Al correrla hace una prueba rápida (anota un visitante y lo borra) y frena con error si algo no anda.
- **Verificación esperada:** `tabla = 1`, `funcion = 1`, `anon_lee = false`, `anon_cuenta = false`, `latido_anota = true`.

### 15. Recordatorio de fin de cuatrimestre, en el sitio (F32) — **lista para correr en prueba, código subido**

- Función `recordar_fin_cuatri()`: crea un aviso "¿Cómo te fue en Paradigmas de Programación, 2K3?" por cada curso que elegiste en Mi inscripción y todavía no reseñaste. El aviso lleva a escribir la reseña de ese curso.
- Fechas que pediste el 9/11: desde el 1 de agosto (terminaron las mesas de julio, antes de anotarse al 2.º cuatrimestre) avisa por los cursos de 1.er cuatrimestre; desde el 8 de diciembre, por los de 2.º, los anuales y los que no se sabe; y desde el 1 de marzo, antes de que arranque el año, repite el de diciembre a quien todavía no reseñó. El cuatrimestre sale de los horarios y, si no hay, del período del curso.
- Solo cuentan los cursos elegidos en los 11 meses antes del recordatorio (una inscripción vieja no vuelve a avisar al año siguiente). Cada curso avisa una sola vez.
- No hace falta un proceso programado: el sitio la llama la primera vez en el día que entrás con sesión. Solo crea avisos para quien entra.
- Se apaga en Mi cuenta ("Al terminar el cuatrimestre, cómo te fue en tus cursos"). El mail viene después, con el servicio de mail.
- **Archivo:** `supabase/migrations/20261109020000_recordatorio_fin_cuatri.sql` (necesita la 7 y la 12). Vuelta atrás: `supabase/rollback/20261109020000_recordatorio_fin_cuatri.sql`.
- **Verificación esperada:** `funcion = 1`, `anon_puede = false`, `usuario_puede = true`, `sin_sesion = 0`.

---

## Lo que ya está hecho sin base (7/11, tarde)

Todo en la rama `claude/project-thread-nihy8x` (la de antes, más esto):

- Inicio sin "¿Qué año cursás?": sin sesión viene abierto solo 1.º; con sesión, los años que elegís en **Mi cuenta** (con la explicación). Años cerrados con "Hay reseñas nuevas".
- Mi cuenta, primera parte (tus años y datos de la cuenta). Se entra tocando tu nombre.
- "Compartir mi experiencia" en finales.
- Términos con el texto que aprobaste.
- Cartel de bienvenida, recorrido de 30 segundos, etiquetas "Nuevo" y página "Qué cambió". Para ver el cartel en la prueba: `?bienvenida=1` al final de cualquier dirección.
- Imagen al compartir por página, como la V6 (curso, materia, profesor y año).
- Admin: Reseñas, Materias y cursos y Profesores con el estilo nuevo.
- Reseña destacada (la más votada de todas) en el inicio.
- Importador: "Materia no encontrada" salía porque lo probé con datos inventados que no tenían esas electivas. Con tu base las encuentra; sumé una prueba con Gestión de la Mejora de Procesos.
