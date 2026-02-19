import os
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Cargar variables de entorno desde .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Faltan las variables SUPABASE_URL o SUPABASE_KEY en el archivo .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def extraer_nivel(curso_str):
    # Extrae el número del año (Ej: '5K1' -> 5)
    for char in curso_str:
        if char.isdigit():
            return int(char)
    return 1

def cargar_datos():
    print("🚀 Iniciando carga a Supabase...")
    
    materias_set = set()
    cursos_set = set()
    profesores_set = set()
    relaciones = []

    # 1. LEER EL ARCHIVO Y PARSEAR (Usando el truco del split)
    with open("resultado_materias.txt", "r", encoding="utf-8") as file:
        lineas = file.readlines()[2:] # Saltamos las 2 líneas de encabezado

    for linea in lineas:
        linea = linea.strip()
        if not linea or linea.startswith('-'): continue

        # Cortamos SOLO en los primeros 3 pipes
        partes = linea.split(" | ", 3)
        if len(partes) < 4: continue

        curso = partes[0].strip()
        turno = partes[1].strip()
        materia = partes[2].strip()
        docentes_raw = partes[3].strip()

        # Extraer nivel/año
        nivel = extraer_nivel(curso)

        # Guardar únicos
        materias_set.add((materia, nivel))
        cursos_set.add((curso, nivel, turno))
        
        docentes_lista = [d.strip() for d in docentes_raw.split(" | ") if d.strip()]
        for doc in docentes_lista:
            profesores_set.add(doc)

        # Guardamos la relación cruda para procesarla después
        relaciones.append({
            "curso": curso,
            "materia": materia,
            "profesores": docentes_lista
        })

    print(f"📊 Encontrados: {len(materias_set)} materias, {len(cursos_set)} cursos, {len(profesores_set)} profesores únicos.")

    # 2. SUBIR A SUPABASE (Con diccionarios para guardar los IDs devueltos)
    mapa_materias = {}
    mapa_cursos = {}
    mapa_profesores = {}

    print("Subiendo Materias...")
    for mat, niv in materias_set:
        res = supabase.table("materias").upsert({"nombre": mat, "nivel": niv}, on_conflict="nombre").execute()
        mapa_materias[mat] = res.data[0]['id']

    print("Subiendo Cursos...")
    for cur, niv, tur in cursos_set:
        res = supabase.table("cursos").upsert({"identificador": cur, "anio_carrera": niv, "turno": tur}, on_conflict="identificador").execute()
        mapa_cursos[cur] = res.data[0]['id']

    print("Subiendo Profesores...")
    for prof in profesores_set:
        res = supabase.table("profesores").upsert({"nombre_completo": prof}, on_conflict="nombre_completo").execute()
        mapa_profesores[prof] = res.data[0]['id']

    # 3. CREAR LOS DICTADOS (La tabla que une Curso + Materia)
    print("Creando Dictados y asignando Profesores...")
    for rel in relaciones:
        c_id = mapa_cursos[rel["curso"]]
        m_id = mapa_materias[rel["materia"]]

        # Insertar dictado
        res_dictado = supabase.table("dictados").insert({"curso_id": c_id, "materia_id": m_id}).execute()
        dictado_id = res_dictado.data[0]['id']

        # Vincular profesores a ese dictado
        profesores_vinculo = []
        for prof in rel["profesores"]:
            p_id = mapa_profesores[prof]
            profesores_vinculo.append({"dictado_id": dictado_id, "profesor_id": p_id})
        
        if profesores_vinculo:
            # Insertamos todos los profes de ese curso de una sola vez
            supabase.table("dictado_profesores").insert(profesores_vinculo).execute()

    print("✅ ¡Carga completada con éxito! Tu base de datos está lista.")

if __name__ == "__main__":
    cargar_datos()