import json, uuid

def tests(*lines): return [{"listen": "test", "script": {"type": "text/javascript", "exec": list(lines)}}]
def pre(*lines): return [{"listen": "prerequest", "script": {"type": "text/javascript", "exec": list(lines)}}]
def status(code, nombre=None): return f"pm.test('{nombre or 'responde ' + str(code)}', () => pm.response.to.have.status({code}));"
def tiene_error(txt): return f"pm.test('mensaje: {txt}', () => pm.expect(pm.response.json().error || '').to.include('{txt}'));"

def req(nombre, metodo, ruta, body=None, ev=None, headers=None, desc=None):
    url_raw = "{{base}}" + ruta
    path, _, query = ruta.partition('?')
    url = {"raw": url_raw, "host": ["{{base}}"], "path": [p for p in path.strip('/').split('/') if p]}
    if query:
        url["query"] = [{"key": k, "value": v} for k, _, v in (q.partition('=') for q in query.split('&'))]
    h = [{"key": "Origin", "value": "{{base}}"}]
    if body is not None: h.append({"key": "Content-Type", "value": "application/json"})
    for k, v in (headers or {}).items(): h.append({"key": k, "value": v})
    r = {"method": metodo, "header": h, "url": url}
    if body is not None: r["body"] = {"mode": "raw", "raw": json.dumps(body, ensure_ascii=False, indent=2)}
    if desc: r["description"] = desc
    it = {"name": nombre, "request": r}
    if ev: it["event"] = ev
    return it

def carpeta(nombre, desc, items): return {"name": nombre, "description": desc, "item": items}

admin_h = {"x-csrf-token": "{{csrf}}"}

c = {
 "info": {
  "_postman_id": str(uuid.uuid4()),
  "name": "UTN REP: pruebas antes de producción",
  "description": "Todas las rutas del sitio (lo nuevo y lo de antes). Se corre entera con Run collection, en orden, contra la Preview (entorno 'UTN REP Preview'). La carpeta 6 es la única que se corre en producción, después del merge. Cómo usarla: 5-pruebas/COMO-PROBAR.md.",
  "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
 },
 "event": pre(
  "// Pasa la protección de Vercel en la Preview (si la variable está vacía, no hace nada)",
  "const b = pm.environment.get('bypass');",
  "if (b) { pm.request.headers.upsert({ key: 'x-vercel-protection-bypass', value: b }); pm.request.headers.upsert({ key: 'x-vercel-set-bypass-cookie', value: 'true' }); }"
 ),
 "variable": [
  {"key": "materia_id", "value": "1"}, {"key": "dictado_id", "value": "1"}, {"key": "csrf", "value": ""},
  {"key": "final_id", "value": ""}, {"key": "visitante", "value": "postman-visitante-0001"}
 ],
 "item": [
  carpeta("0. Preparación", "Busca una materia y un curso de verdad en la base para usar en el resto.", [
   req("Buscar una materia (AM1)", "GET", "/api/buscar.json?q=am1", ev=tests(
     status(200),
     "const m = (pm.response.json().materias || [])[0];",
     "pm.test('encuentra una materia', () => pm.expect(m).to.be.an('object'));",
     "if (m) pm.collectionVariables.set('materia_id', m.id);")),
   req("Cursos de esa materia (simulador)", "GET", "/api/inscripcion/opciones?materia={{materia_id}}", ev=tests(
     status(200),
     "const o = (pm.response.json().materia || {}).opciones || [];",
     "pm.test('trae cursos con horario y período', () => { pm.expect(o.length).to.be.above(0); pm.expect(o[0]).to.have.property('periodo'); pm.expect(o[0]).to.have.property('cuatris'); });",
     "if (o[0]) pm.collectionVariables.set('dictado_id', o[0].id);")),
  ]),
  carpeta("1. Público (sin sesión)", "Lo que ve cualquiera.", [
   req("Inicio", "GET", "/", ev=tests(status(200),
     "pm.test('encabezados de seguridad', () => { ['content-security-policy','x-frame-options','x-content-type-options','referrer-policy'].forEach(h => pm.expect(pm.response.headers.has(h), h).to.be.true); });",
     "pm.test('no muestra errores de servidor', () => pm.expect(pm.response.text()).to.not.include('Internal Server Error'));")),
   req("Materia", "GET", "/materia/{{materia_id}}", ev=tests(status(200))),
   req("Comparar cursos de la materia", "GET", "/materia/{{materia_id}}/comparar", ev=tests(status(200))),
   req("Curso", "GET", "/dictado/{{dictado_id}}", ev=tests(status(200))),
   req("Año 1", "GET", "/nivel/1", ev=tests(status(200))),
   req("Experiencias de finales", "GET", "/finales", ev=tests(status(200))),
   req("Recientes", "GET", "/recientes", ev=tests(status(200))),
   req("Mi inscripción (sin sesión)", "GET", "/mi-inscripcion?cuatri=1", ev=tests(status(200))),
   req("Mi inscripción compartida (con imagen)", "GET", "/mi-inscripcion?c={{dictado_id}}&cuatri=1", ev=tests(status(200),
     "pm.test('la vista previa usa la semana', () => pm.expect(pm.response.text()).to.include('/og/inscripcion.png'));")),
   req("Términos", "GET", "/terminos", ev=tests(status(200))),
   req("Sobre", "GET", "/sobre", ev=tests(status(200))),
   req("Qué cambió", "GET", "/que-cambio", ev=tests(status(200))),
   req("Buscar (página)", "GET", "/buscar?q=paradignas", ev=tests(status(200),
     "pm.test('muestra lo parecido', () => pm.expect(pm.response.text()).to.include('Paradigmas'));")),
   req("Página que no existe", "GET", "/esto-no-existe", ev=tests(status(404))),
   req("Buscador del banner", "GET", "/api/buscar.json?q=1k1", ev=tests(status(200),
     "pm.test('devuelve materias', () => pm.expect(pm.response.json()).to.have.property('materias'));")),
   req("Últimas experiencias de finales", "GET", "/api/finales/ultimas.json", ev=tests(status(200))),
   req("Opciones del simulador: materia inválida", "GET", "/api/inscripcion/opciones?materia=abc", ev=tests(status(400))),
   req("En línea", "POST", "/api/en-linea", {"visitante": "{{visitante}}"}, ev=tests(status(200),
     "pm.test('devuelve número y texto', () => { const j = pm.response.json(); pm.expect(j.n).to.be.a('number'); pm.expect(j.texto).to.be.a('string'); });")),
   req("En línea: visitante inválido", "POST", "/api/en-linea", {"visitante": "x"}, ev=tests(status(400))),
   req("Mi link sin sesión", "GET", "/api/links/mio", ev=tests(status(200),
     "pm.test('sin código', () => pm.expect(pm.response.json().codigo).to.equal(null));")),
   req("Abrir link: código inválido", "POST", "/api/links/abrir", {"codigo": "", "visitante": "{{visitante}}", "ruta": "/"}, ev=tests(status(400))),
   req("Imagen al compartir: materia", "GET", "/og/materia/{{materia_id}}.png", ev=tests(status(200),
     "pm.test('es una imagen PNG', () => pm.expect(pm.response.headers.get('content-type')).to.include('image/png'));")),
   req("Imagen al compartir: curso", "GET", "/og/curso/{{dictado_id}}.png", ev=tests(status(200))),
   req("Imagen al compartir: Mi inscripción", "GET", "/og/inscripcion.png?c={{dictado_id}}&cuatri=1", ev=tests(status(200),
     "pm.test('es una imagen PNG', () => pm.expect(pm.response.headers.get('content-type')).to.include('image/png'));")),
  ]),
  carpeta("2. Escrituras sin sesión (todas rechazadas)", "Nadie puede escribir sin iniciar sesión, ni entrar al admin, al cron o a Telegram sin su clave.", [
   req("Escribir reseña", "POST", "/api/resenas", {"dictado_id": 1}, ev=tests(status(401))),
   req("Editar reseña", "PUT", "/api/resenas/1", {"comentario": "Un texto cualquiera de prueba"}, ev=tests(status(401))),
   req("Borrar reseña", "DELETE", "/api/resenas/1", ev=tests(status(401))),
   req("Votar reseña", "POST", "/api/resenas/votar", {"resena_id": 1}, ev=tests("pm.test('rechazado', () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));")),
   req("Reportar reseña", "POST", "/api/reportes", {"resena_id": 1}, ev=tests("pm.test('rechazado', () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));")),
   req("Sumar final a reseña", "POST", "/api/resenas/final", {"resena_id": 1, "final_id": 1}, ev=tests(status(401))),
   req("Contar un final", "POST", "/api/finales/crear", {"materia_id": 1}, ev=tests(status(401))),
   req("Editar o borrar un final", "POST", "/api/finales/acciones", {"accion": "eliminar", "id": 1}, ev=tests(status(401))),
   req("Votar un final", "POST", "/api/finales/votar", {"final_id": 1}, ev=tests("pm.test('rechazado', () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));")),
   req("Reportar un final", "POST", "/api/finales/reportar", {"final_id": 1, "motivo": "prueba"}, ev=tests("pm.test('rechazado', () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));")),
   req("Mi cuenta: perfil", "POST", "/api/perfil", {"nombre_mostrar": "Prueba"}, ev=tests(status(401))),
   req("Borrar cuenta", "POST", "/api/cuenta/borrar", {"resenas": "anonimas", "confirmacion": "BORRAR"}, ev=tests(status(401))),
   req("Seguir materia", "POST", "/api/seguir", {"materia_id": 1}, ev=tests(status(401))),
   req("Avisos", "POST", "/api/avisos", {"accion": "leer"}, ev=tests(status(401))),
   req("Preferencias de avisos", "POST", "/api/avisos/preferencias", {"todos": True, "canal": "mail", "activo": False}, ev=tests(status(401))),
   req("Mi inscripción", "POST", "/api/inscripcion", {"accion": "agregar", "dictado_id": 1}, ev=tests(status(401))),
   req("Logro Detective", "POST", "/api/logros/detective", {}, ev=tests(status(401))),
   req("Conectar Telegram", "POST", "/api/telegram/vincular", {"accion": "conectar"}, ev=tests("pm.test('rechazado', () => pm.expect(pm.response.code).to.be.oneOf([401, 503]));")),
   req("Telegram webhook sin el secreto", "POST", "/api/telegram/webhook", {"update_id": 1}, ev=tests("pm.test('rechazado', () => pm.expect(pm.response.code).to.be.oneOf([401, 503]));")),
   req("Cron de mails sin el secreto", "GET", "/api/cron/mails?prueba=1", ev=tests(status(401))),
   req("Baja de mails con firma mala", "POST", "/api/avisos/baja", {"u": "00000000-0000-0000-0000-000000000000", "t": "mala"}, ev=tests(status(400))),
   req("Admin: estadísticas", "GET", "/api/admin/stats", ev=tests(status(403))),
   req("Admin: cursos", "GET", "/api/admin/dictados?materia_id=1", ev=tests(status(403))),
   req("Admin: moderación", "POST", "/api/admin/moderacion", {"accion": "x"}, ev=tests(status(403))),
   req("Admin: bloquear usuario", "POST", "/api/admin/usuarios", {"accion": "bloquear"}, ev=tests(status(403))),
   req("Página del admin sin sesión", "GET", "/admin", ev=tests("pm.test('no muestra el panel', () => pm.expect(pm.response.text()).to.not.include('admin-csrf'));")),
  ]),
  carpeta("3. Con sesión (cuenta de prueba común)", "Entra con la cuenta de prueba ({{email}}) y prueba lo que puede hacer cualquier estudiante. Crea y borra un final de prueba; no publica reseñas.", [
   req("Ingreso de prueba: contraseña mala", "POST", "/api/auth/prueba", {"email": "{{email}}", "clave": "esta-no-es"}, ev=tests(status(401))),
   req("Ingreso de prueba", "POST", "/api/auth/prueba", {"email": "{{email}}", "clave": "{{clave}}"}, ev=tests(status(200))),
   req("Mi link", "GET", "/api/links/mio", ev=tests(status(200), "pm.test('tiene código', () => pm.expect(pm.response.json().codigo).to.be.a('string'));")),
   req("Mi cuenta (página)", "GET", "/mi-cuenta", ev=tests(status(200))),
   req("Mis reseñas (página)", "GET", "/mis-resenas", ev=tests(status(200))),
   req("Avisos (página)", "GET", "/avisos", ev=tests(status(200))),
   req("Nombre con números", "POST", "/api/perfil", {"nombre_mostrar": "sofi_2004"}, ev=tests(status(400), tiene_error("Usá solo letras"))),
   req("Nombre con símbolos", "POST", "/api/perfil", {"nombre_mostrar": "<b>Hola</b>"}, ev=tests(status(400))),
   req("Dato que no se puede cambiar", "POST", "/api/perfil", {"rol": "admin"}, ev=tests(status(400), tiene_error("no se puede cambiar"))),
   req("Color inválido", "POST", "/api/perfil", {"color": "fucsia"}, ev=tests(status(400), tiene_error("Color inválido"))),
   req("Guardar años de cursada", "POST", "/api/perfil", {"anios_cursada": [1, 2]}, ev=tests(status(200))),
   req("Reseña: datos inválidos", "POST", "/api/resenas", {"dictado_id": "x"}, ev=tests(status(400), tiene_error("Dictado inválido"))),
   req("Reseña: comentario corto", "POST", "/api/resenas", {"dictado_id": 1, "calificacion_general": 4, "anio_cursado": 2026, "comentario": "corto"}, ev=tests(status(400), tiene_error("al menos 10"))),
   req("Reseña: ¿Cómo te fue? inválido", "POST", "/api/resenas", {"dictado_id": 1, "calificacion_general": 4, "anio_cursado": 2026, "comentario": "Un comentario de prueba largo", "condicion_final": "APROBADO"}, ev=tests(status(400), tiene_error("Condición final inválida"))),
   req("Reseña: curso inexistente", "POST", "/api/resenas", {"dictado_id": 999999999, "calificacion_general": 4, "anio_cursado": 2026, "comentario": "Un comentario de prueba largo"}, ev=tests(status(404))),
   req("Seguir la materia", "POST", "/api/seguir", {"materia_id": "{{materia_id}}", "seguir": True}, ev=tests(status(200))),
   req("Dejar de seguir la materia", "POST", "/api/seguir", {"materia_id": "{{materia_id}}", "seguir": False}, ev=tests(status(200))),
   req("Seguir: materia inválida", "POST", "/api/seguir", {"materia_id": "abc"}, ev=tests(status(400), tiene_error("Materia inválida"))),
   req("Mi inscripción: agregar curso", "POST", "/api/inscripcion", {"accion": "agregar", "dictado_id": "{{dictado_id}}"}, ev=tests(status(200))),
   req("Mi inscripción: elegir ese curso", "POST", "/api/inscripcion", {"accion": "elegir", "dictado_id": "{{dictado_id}}", "quitar": []}, ev=tests(status(200))),
   req("Mi inscripción (página con la semana)", "GET", "/mi-inscripcion?cuatri=1", ev=tests(status(200))),
   req("Mi inscripción: quitar curso", "POST", "/api/inscripcion", {"accion": "quitar", "dictado_id": "{{dictado_id}}"}, ev=tests(status(200))),
   req("Mi inscripción: acción inválida", "POST", "/api/inscripcion", {"accion": "otra"}, ev=tests(status(400))),
   req("Avisos: marcar todos leídos", "POST", "/api/avisos", {"accion": "leer"}, ev=tests(status(200))),
   req("Avisos: acción inválida", "POST", "/api/avisos", {"accion": "otra"}, ev=tests(status(400), tiene_error("Acción no válida"))),
   req("Contar un final de prueba", "POST", "/api/finales/crear", {"materia_id": "{{materia_id}}", "anio": 2026, "mesa": "Postman", "comentario": "Final de prueba creado por Postman. Se borra en el paso siguiente.", "con_nombre": False}, ev=tests(status(200),
     "const id = pm.response.json().id; pm.test('devuelve el id', () => pm.expect(id).to.be.a('number'));",
     "pm.collectionVariables.set('final_id', id);")),
   req("Editar el final de prueba", "POST", "/api/finales/acciones", {"accion": "editar", "id": "{{final_id}}", "comentario": "Final de prueba editado por Postman. Se borra en el paso siguiente."}, ev=tests(status(200))),
   req("Final: acción inválida", "POST", "/api/finales/acciones", {"accion": "otra"}, ev=tests(status(400), tiene_error("Acción no válida"))),
   req("Borrar el final de prueba", "POST", "/api/finales/acciones", {"accion": "eliminar", "id": "{{final_id}}"}, ev=tests(status(200))),
   req("Logro Detective", "POST", "/api/logros/detective", {}, ev=tests(status(200), "pm.test('dice si es nuevo', () => pm.expect(pm.response.json().nuevo).to.be.a('boolean'));")),
   req("Admin con cuenta común", "GET", "/api/admin/stats", ev=tests(
     "if (pm.environment.get('email') === pm.environment.get('email_admin')) { pm.test.skip('salteada: la cuenta común es la misma que la de admin', () => {}); }",
     "else { " + status(403) + " }")),
   req("Borrar cuenta sin escribir BORRAR", "POST", "/api/cuenta/borrar", {"resenas": "anonimas", "confirmacion": "no"}, ev=tests(status(400), tiene_error("BORRAR"))),
   req("Cerrar sesión", "POST", "/api/auth/logout", ev=tests("pm.test('cierra', () => pm.expect(pm.response.code).to.be.oneOf([200, 302, 303]));")),
  ]),
  carpeta("4. Admin (cuenta de prueba admin)", "Entra con la cuenta admin de prueba ({{email_admin}}, que tiene que estar en ADMIN_IDS de Preview). Solo lee y prueba los controles: no cambia datos.", [
   req("Ingreso de prueba (admin)", "POST", "/api/auth/prueba", {"email": "{{email_admin}}", "clave": "{{clave_admin}}"}, ev=tests(status(200))),
   req("Panel de admin (toma el código CSRF)", "GET", "/admin", ev=tests(status(200),
     "const m = pm.response.text().match(/id=\"admin-csrf\"[^>]*data-t=\"([^\"]+)\"/) || pm.response.text().match(/data-t=\"([^\"]+)\"[^>]*id=\"admin-csrf\"/);",
     "const t = (m && m[1]) || pm.cookies.get('admin_csrf');",
     "pm.test('la página trae el código', () => pm.expect(t).to.be.a('string'));",
     "pm.collectionVariables.set('csrf', t);")),
   *[req(f"Página {p}", "GET", p, ev=tests(status(200))) for p in ["/admin/materias", "/admin/profesores", "/admin/resenas", "/admin/finales", "/admin/reportes", "/admin/moderacion", "/admin/usuarios", "/admin/importar"]],
   req("Estadísticas", "GET", "/api/admin/stats", ev=tests(status(200))),
   req("Cursos de una materia", "GET", "/api/admin/dictados?materia_id={{materia_id}}", ev=tests(status(200), "pm.test('trae la lista', () => pm.expect(pm.response.json().data).to.be.an('array'));")),
   req("Profesores", "GET", "/api/admin/profesores", ev=tests(status(200))),
   req("Reportes", "GET", "/api/admin/reportes", ev=tests(status(200))),
   req("Sin el código CSRF", "POST", "/api/admin/dictados", {"action": "nada"}, ev=tests(status(403), tiene_error("código de seguridad"))),
   req("Desde otro sitio", "POST", "/api/admin/dictados", {"action": "nada"}, headers={"x-csrf-token": "{{csrf}}"}, ev=pre("pm.request.headers.upsert({ key: 'Origin', value: 'https://otro-sitio.example' });") + tests(status(403), tiene_error("no salió de esta página"))),
   req("Acción inválida (con CSRF)", "POST", "/api/admin/dictados", {"action": "nada"}, headers=admin_h, ev=tests(status(400), tiene_error("Acción no válida"))),
   req("Horario inválido (con CSRF)", "POST", "/api/admin/dictados", {"action": "set_horarios", "dictado_id": "{{dictado_id}}", "bloques": [{"cuatri": 1, "dia": 1, "desde": 600, "hasta": 500}]}, headers=admin_h, ev=tests(status(400), tiene_error("Revisá los horarios"))),
   req("Bot de Telegram: estado", "POST", "/api/admin/telegram", {"accion": "estado"}, headers=admin_h, ev=tests("pm.test('responde', () => pm.expect(pm.response.code).to.be.oneOf([200, 400]));")),
   req("Cron de mails en modo prueba (no manda nada)", "GET", "/api/cron/mails?prueba=1", headers={"Authorization": "Bearer {{cron_secret}}"}, desc="Solo si cargaste CRON_SECRET en Preview y lo pusiste en la variable cron_secret. Si no, da 401 y está bien.", ev=tests("pm.test('responde', () => pm.expect(pm.response.code).to.be.oneOf([200, 401]));")),
   req("Cerrar sesión", "POST", "/api/auth/logout", ev=tests("pm.test('cierra', () => pm.expect(pm.response.code).to.be.oneOf([200, 302, 303]));")),
  ]),
  carpeta("6. Producción, después del merge (solo lee)", "Correr SOLO esta carpeta con el entorno 'UTN REP Producción', el día del merge. No escribe nada.", [
   req("Inicio", "GET", "/", ev=tests(status(200),
     "pm.test('HSTS en producción', () => pm.expect(pm.response.headers.get('strict-transport-security') || '').to.include('max-age'));",
     "pm.test('encabezados de seguridad', () => { ['content-security-policy','x-frame-options','x-content-type-options'].forEach(h => pm.expect(pm.response.headers.has(h), h).to.be.true); });")),
   req("Buscar una materia", "GET", "/api/buscar.json?q=am1", ev=tests(status(200), "const m = (pm.response.json().materias || [])[0]; if (m) pm.collectionVariables.set('materia_id', m.id);")),
   req("Cursos de esa materia", "GET", "/api/inscripcion/opciones?materia={{materia_id}}", ev=tests(status(200), "const o = (pm.response.json().materia || {}).opciones || []; pm.test('hay cursos con horario', () => pm.expect(o.length).to.be.above(0)); if (o[0]) pm.collectionVariables.set('dictado_id', o[0].id);")),
   req("Materia", "GET", "/materia/{{materia_id}}", ev=tests(status(200))),
   req("Curso", "GET", "/dictado/{{dictado_id}}", ev=tests(status(200))),
   req("Experiencias de finales", "GET", "/finales", ev=tests(status(200))),
   req("Mi inscripción", "GET", "/mi-inscripcion", ev=tests(status(200))),
   req("Imagen al compartir", "GET", "/og/materia/{{materia_id}}.png", ev=tests(status(200))),
   req("El ingreso de prueba NO existe", "POST", "/api/auth/prueba", {"email": "a@b.co", "clave": "x"}, ev=tests(status(404, "da 404 (no existe en producción)"))),
   req("Admin sin sesión", "GET", "/api/admin/stats", ev=tests(status(403))),
   req("Cron sin secreto", "GET", "/api/cron/mails?prueba=1", ev=tests(status(401))),
  ]),
 ]
}
import re
out = 'docs/postman/'  # correr desde la raíz del repo
txt = json.dumps(c, ensure_ascii=False, indent=2)
for v in ('materia_id','dictado_id','final_id'): txt = txt.replace('\\"{{'+v+'}}\\"', '{{'+v+'}}')
open(out + 'utn-rep.postman_collection.json', 'w').write(txt)

def entorno(nombre, base, extra):
    vals = [{"key": "base", "value": base, "type": "default", "enabled": True}] + [
        {"key": k, "value": "", "type": "secret" if s else "default", "enabled": True} for k, s in extra]
    return {"id": str(uuid.uuid4()), "name": nombre, "values": vals, "_postman_variable_scope": "environment"}
json.dump(entorno("UTN REP Preview", "https://PEGÁ-ACÁ-LA-DIRECCIÓN-DE-LA-RAMA.vercel.app",
    [("bypass", True), ("email", False), ("clave", True), ("email_admin", False), ("clave_admin", True), ("cron_secret", True)]),
    open(out + 'utn-rep-preview.postman_environment.json', 'w'), ensure_ascii=False, indent=2)
json.dump(entorno("UTN REP Producción", "https://utnrep.app", []),
    open(out + 'utn-rep-produccion.postman_environment.json', 'w'), ensure_ascii=False, indent=2)
n = sum(len(f['item']) for f in c['item'])
print('requests', n)
