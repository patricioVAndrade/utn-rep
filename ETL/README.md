# ETL - Extracción y Carga de Datos Académicos

Sistema ETL (Extract, Transform, Load) para extraer información de materias, cursos y docentes desde Google Sheets y cargarlos a una base de datos Supabase.

## 📁 Estructura del Proyecto

```
ETL/
├── extractor.py          # Interfaz gráfica para extraer datos de Google Sheets
├── loader_supabase.py    # Script para cargar datos a Supabase
├── resultado_materias.txt # Archivo intermedio con datos extraídos
├── requirements.txt      # Dependencias del proyecto
└── README.md             # Este archivo
```

## 🚀 Instalación

1. Cloná el repositorio o descargá los archivos
2. Instalá las dependencias:

```bash
pip install -r requirements.txt
```

3. Configurá tus credenciales de Supabase en `loader_supabase.py`:
```python
SUPABASE_URL = "tu_url_de_supabase"
SUPABASE_KEY = "tu_api_key"
```

## 📖 Uso

### 1. Extracción de datos (`extractor.py`)

Aplicación con interfaz gráfica (Tkinter) que permite:
- Ingresar un link de Google Sheets
- Extraer automáticamente materias, cursos, turnos y docentes
- Guardar los datos en `resultado_materias.txt`

```bash
python extractor.py
```

**Formato esperado del Google Sheets:**
- Cada pestaña representa un curso (ej: 5K1, 3K2)
- Debe contener columnas de "Materia/Asignatura" y "Docente/Profesor"
- Puede incluir filas indicando turnos (TURNO MAÑANA, TURNO TARDE, TURNO NOCHE)

### 2. Carga a Supabase (`loader_supabase.py`)

Script que lee `resultado_materias.txt` y carga los datos a las siguientes tablas en Supabase:
- `materias` - Nombre y nivel de cada materia
- `cursos` - Identificador, año de carrera y turno
- `profesores` - Nombre completo de cada docente
- `dictados` - Relación entre curso y materia
- `dictado_profesores` - Relación entre dictado y profesores

```bash
python loader_supabase.py
```

## 🗄️ Modelo de Datos

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   cursos     │     │   dictados   │     │   materias   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │────▶│ id           │◀────│ id           │
│ identificador│     │ curso_id     │     │ nombre       │
│ anio_carrera │     │ materia_id   │     │ nivel        │
│ turno        │     └──────┬───────┘     └──────────────┘
└──────────────┘            │
                            │
                   ┌────────▼────────┐
                   │dictado_profesores│
                   ├─────────────────┤
                   │ dictado_id      │
                   │ profesor_id     │────▶┌──────────────┐
                   └─────────────────┘     │  profesores  │
                                           ├──────────────┤
                                           │ id           │
                                           │nombre_completo│
                                           └──────────────┘
```

## ⚙️ Requisitos

- Python 3.8+
- Conexión a internet
- Cuenta de Supabase con las tablas configuradas

## 📝 Notas

- El archivo `resultado_materias.txt` usa modo *append*, por lo que si extraés varios Sheets, los datos se agregan al final.
- El loader usa `upsert` para evitar duplicados en materias, cursos y profesores.
