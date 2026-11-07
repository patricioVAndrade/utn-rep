# Migraciones de la etapa 3

Al 7/11/2026. Son los cambios en la base que necesita lo que falta del rediseño. Van **una por una**: te explico cada una, la corrés en la **base de prueba**, subo el código que la usa, lo probás en el Preview y recién ahí pasamos a la siguiente. A producción van todas juntas cuando digas que está todo listo.

Cómo se corre cada una:

1. Abrís el proyecto de Supabase **de prueba** > SQL Editor.
2. Pegás el archivo de `supabase/migrations/` que te indique y tocás Run.
3. Al final de cada archivo hay una consulta de verificación: el resultado me lo pasás (es solo un conteo, no tiene datos de nadie).

Todas corren en una transacción (si algo falla, no se aplica nada), se pueden volver a correr sin romper nada y tienen su vuelta atrás en `supabase/rollback/`. Ninguna borra reseñas ni usuarios.

---

## El orden y qué hace cada una

### 1. Autor y anonimato en las experiencias de finales — **lista para correr**

- **Para qué:** el interruptor "Publicar con mi nombre" al compartir un final, y que la tarjeta diga el nombre o "Anónimo". Hoy todas dicen "Anónimo" porque no se guarda nada.
- **Qué cambia en la base:**
  - Dos columnas en `experiencias_finales`: `es_anonima` (sí por defecto) y `nombre_usuario`. Las que ya existen quedan anónimas, porque nadie eligió mostrar su nombre.
  - Una vista pública, `experiencias_finales_publicas`, igual a la que ya usan las reseñas: no muestra quién la escribió y oculta el nombre si es anónima.
  - La tabla deja de leerse con la clave pública; cada persona ve solo las suyas (para "Mis reseñas").
- **Por qué lo último es importante:** hoy cualquiera puede leer el `user_id` de cada experiencia de final. Con el nombre guardado al lado, alguien podría destapar a quien publicó como anónimo. Con la vista, eso se cierra.
- **Archivo:** `supabase/migrations/20261108000000_finales_autor.sql`. Vuelta atrás: `supabase/rollback/20261108000000_finales_autor.sql`.
- **Verificación esperada:** `columnas_nuevas = 2`, `vista = 1`, `anon_puede_leer_tabla = false` y la cantidad de experiencias que tenés en la base de prueba.

### 2. "Me sirvió" y Reportar en finales (F21)

- **Para qué:** votar las experiencias de finales que te sirvieron (con contador y orden "Más útiles") y que Reportar vaya a la cola de Reportes del admin en vez de abrir un mail.
- **Qué cambia:** tabla `votos_finales` (una fila por persona y experiencia, como los votos de reseñas), columna `votos_utilidad` en la experiencia y una función para votar que solo suma o resta de a uno. Tabla `reportes_finales`, igual a la de reseñas.

### 3. Reseñas: fecha de edición, "¿Cómo te fue?" y plan de estudios (3.3, 3.4 y 3.5)

Las tres tocan la tabla `resenas`, así que van juntas.

- **Fecha de edición:** columna `updated_at` que se llena sola al editar. En la reseña aparece "Editada el 12/11".
- **"¿Cómo te fue?" en reseñas viejas (F38):** hoy cada persona solo puede editar el texto de su reseña. Se le permite también completar `condicion_final` (Promocioné, Regularicé, Quedé libre).
- **Plan de estudios:** columna `plan` con 2023 en todas, sin mostrarla, como pediste.

### 4. Moderación (F10, F12 y el resto de 3.6)

- **Respuesta del moderador:** como decidiste, solo el moderador responde, y se junta con las notas de moderación. Tabla `respuestas_moderador` (una por reseña o final). Se ve debajo de la reseña.
- **"Pedirle que la edite":** marca en la reseña con el motivo. La persona lo ve en Mis reseñas (y como aviso cuando esté la 7).
- **Registro de moderación:** tabla con quién hizo qué y cuándo (borró, dejó, respondió, pidió edición). Se ve en el admin.
- **Palabras marcadas:** tabla con la lista, editable desde el admin. Al publicar, si una reseña tiene una, entra sola a Reportes aunque nadie la haya reportado.

### 5. Perfil y preferencias (Mi cuenta)

- **Para qué:** lo que falta de Mi cuenta como la V6.
- **Qué cambia:** tabla `perfiles` (una fila por persona): nombre para mostrar, foto elegida (inicial, Google o dibujo), si muestra la ficha, **tus años de cursada** (hoy quedan en el navegador; con esto te siguen en el celular y la compu) y si no quiere que le pregunte "¿Cómo te fue?".
- **Borrar la cuenta:** una función del servidor que deja tus reseñas como anónimas y borra tu usuario.

### 6. Seguir materias (F11)

- Tabla `seguimientos` (persona y materia). Botón Seguir en la materia y el curso, y la lista en Mi cuenta.

### 7. Notificaciones dentro del sitio (3.8, F33 y F32)

- Tabla `notificaciones` (un aviso por persona, con tipo, link y si lo leyó) y tabla `preferencias_aviso` (por canal: sitio, mail, Telegram, push). Así, sumar mail o Telegram después no cambia nada de lo anterior.
- Avisa: reseñas y finales nuevos en lo que seguís, "Tu reseña le sirvió a 5 personas" (una vez por semana como máximo), logros nuevos, respuestas del moderador y "Pedirle que la edite". El recordatorio de fin de cuatrimestre (F32) usa la misma tabla.

### 8. Rangos, escudos, logros y ficha (F5, F15 a F18)

- Tabla `logros_usuario` (qué logro ganó cada persona y cuándo). El rango no se guarda: sale de contar reseñas.
- Escudo al lado del nombre, ficha al tocar el nombre, easter egg del Anónimo y logros en Mis reseñas y Mi cuenta. Logros L1 a L7; L8 a L19 esperan tu voto.

### 9. Admin: Usuarios y links compartidos (3.14, F28)

- **Usuarios:** marca de bloqueado en `perfiles` y la lista en el admin con reseñas y reportes recibidos.
- **Links compartidos:** tabla `links_compartidos` con un código corto (`?de=k7p2`) y cuántas personas distintas lo abrieron. Sirve para "Links compartidos esta semana" en el admin y el logro "Pasalo al grupo" (L8).

### 10. Contador "Hay X estudiantes en línea" (F13)

- Tabla chica con la última actividad de los últimos 5 minutos, sin guardar quién es. Se muestra solo desde 5 personas.

### 11. Historial de profesores y rol (3.13)

- En `dictado_profesores`: desde y hasta (año y cuatrimestre) y `rol` (Titular, Adjunto, JTP, Ayudante). El importador pasa a ponerle fecha de fin al profe que sale, en vez de borrarlo.

### 12. Horarios de cada curso y superposiciones (F29) — **la última**

- Tabla `horarios` (curso, día, hora de inicio y fin), cargada desde la planilla con el importador. "Lo estoy pensando" en cada curso y la pantalla que avisa si dos cursos se pisan. Como dijiste, va al final.

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
