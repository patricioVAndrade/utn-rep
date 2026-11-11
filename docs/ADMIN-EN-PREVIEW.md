# Quedar como admin en Preview (y cargar los horarios)

El sitio decide quién es admin con la variable `ADMIN_IDS` de Vercel: una lista de ids de cuenta separados por coma. La base de prueba es otro proyecto de Supabase, así que tu cuenta ahí tiene **otro id** que la de producción. Hay que sumar ese id a la variable de Preview.

## Paso 1. Copiar el id de tu cuenta de la base de prueba

1. Entrá a https://supabase.com/dashboard y abrí el proyecto **de prueba**.
2. Menú de la izquierda: **Authentication**. Se abre la lista **Users**.
3. Tocá la fila de tu mail. Se abre un panel a la derecha.
4. Arriba de ese panel dice **User UID** (un texto largo tipo `3f2a9c1e-....`). Tocá el ícono de copiar que tiene al lado.

(Es el mismo valor que salió en la columna `id_de_la_cuenta` cuando le pusiste la contraseña.)

## Paso 2. Cargarlo en Vercel

1. Entrá a https://vercel.com y abrí el proyecto.
2. Arriba, pestaña **Settings**. En el menú de la izquierda, **Environment Variables**.
3. En la lista de variables buscá **ADMIN_IDS** (hay un buscador arriba de la lista). Debajo del nombre dice en qué entornos está.

**Si aparece y dice Preview** (solo, o junto a Production, o "All Environments"):

4. Tocá los tres puntos **⋯** de esa fila y después **Edit**.
5. En **Value**, andá al final del texto que ya está, escribí una coma `,` y pegá tu id. No borres lo que había: es tu id de producción. Queda algo así: `id-de-produccion,id-de-prueba`.
6. Tocá **Save**.

Sumar el id de prueba a producción no cambia nada allá: ese id no existe en la base real.

**Si no aparece, o aparece pero dice solo Production:**

4. Tocá el botón para agregar una variable (dice **Add Environment Variable** o **Add New**).
5. **Key:** `ADMIN_IDS`. **Value:** pegá tu id.
6. En **Environments** dejá marcado **solo Preview** (sacale la tilde a Production y Development).
7. Tocá **Save**.

No toques Redeploy. Vercel avisa que el cambio vale para el próximo deploy: ese lo armo yo al subir algo a la rama.

## Paso 3. Entrar

1. En Vercel, pestaña **Deployments**, la fila de más arriba que diga **Preview** y la rama `claude/project-thread-5a6dr5`, con hora **posterior** al paso 2. Esperá **Ready**, tocala y **Visit**.
2. Entrá con el ingreso de prueba (`docs/INGRESO-DE-PRUEBA.md`, paso 3).
3. Arriba, al lado de tu nombre, tiene que aparecer **Panel de admin** (en la compu; en el celular no se muestra, escribí `/admin` al final de la dirección).

| Qué pasa | Qué mirar |
|---|---|
| No aparece "Panel de admin" | El deploy es anterior al paso 2, o el id no es el de la base de prueba. Revisá la hora de la fila y el id. |
| Entra al panel pero las listas salen vacías o dan error | Falta `SUPABASE_SERVICE_ROLE_KEY` en Preview con la clave **service_role** del proyecto de prueba (Supabase, Project Settings, API Keys). |

## Paso 4. Cargar los horarios

La migración 12 crea la tabla de horarios **vacía**. Los horarios se cargan desde el panel, con el CSV que armé de los PDF oficiales (`datos/horarios-2026-pdf.csv`, copia en la carpeta del proyecto: `propuestas/horarios/horarios-2026-pdf.csv`).

1. Bajá el archivo `horarios-2026-pdf.csv` a tu compu.
2. En Preview: **Panel de admin** y después **Importar** (o andá a `/admin/importar`).
3. Tocá **Subir .xlsx o .csv** y elegí el archivo.
4. Abajo aparece la comparación con la base. Abrí **Horarios (N)**: vienen todos marcados.
5. Si arriba aparece "Materias que no encontré", elegí la materia de la lista para cada una (o dejala en "No importar" y me avisás cuáles son).
6. Tocá **Guardar cambios**, abajo de todo. Arriba sale un cartel verde con cuántos horarios guardó.
7. Para ver que quedaron: abrí el curso 1K1, tocá Análisis Matemático I y tiene que mostrar "Lunes 8:00 a 10:25" y "Martes 8:00 a 9:30".
