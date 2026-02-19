import tkinter as tk
from tkinter import scrolledtext, messagebox
import pandas as pd
import traceback
import threading
import re

def extraer_datos():
    url = url_input.get().strip()
    if not url:
        messagebox.showwarning("Atención", "Por favor, ingresá el link del Google Sheets.")
        return

    btn_extraer.config(state=tk.DISABLED)
    log_area.insert(tk.END, "🔄 Descargando y analizando estructura...\n")
    log_area.see(tk.END)

    def procesar():
        try:
            base_url = url.split('/edit')[0]
            export_url = f"{base_url}/export?format=xlsx"
            
            archivo_excel = pd.read_excel(export_url, sheet_name=None, header=None)
            
            texto_salida = "CURSO | TURNO | MATERIA | DOCENTES\n"
            texto_salida += "-" * 80 + "\n"
            total_materias = 0

            for nombre_pestana, df_sheet in archivo_excel.items():
                log_area.insert(tk.END, f"Procesando curso: {nombre_pestana}...\n")
                log_area.see(tk.END)

                # 1. Buscar encabezados
                header_idx = -1
                for idx, row in df_sheet.iterrows():
                    row_str = " ".join(str(x).lower() for x in row.values if pd.notna(x))
                    if ('docente' in row_str or 'profesor' in row_str) and ('materia' in row_str or 'asignatura' in row_str):
                        header_idx = idx
                        break
                
                if header_idx == -1:
                    continue

                df_sheet.columns = df_sheet.iloc[header_idx].astype(str).str.strip()
                df_sheet = df_sheet.iloc[header_idx+1:].reset_index(drop=True)

                col_mat = next((c for c in df_sheet.columns if 'materia' in c.lower() or 'asignatura' in c.lower()), None)
                col_doc = next((c for c in df_sheet.columns if 'docente' in c.lower() or 'profesor' in c.lower()), None)

                turno_actual = "INDEFINIDO"

                # 2. Recorrer filas
                for index, row in df_sheet.iterrows():
                    row_str = " ".join(str(x).upper() for x in row.values if pd.notna(x))
                    if "TURNO MAÑANA" in row_str or "TURNO MANANA" in row_str:
                        turno_actual = "MAÑANA"
                    elif "TURNO TARDE" in row_str:
                        turno_actual = "TARDE"
                    elif "TURNO NOCHE" in row_str:
                        turno_actual = "NOCHE"

                    # LIMPIEZA DE MATERIA (saca saltos de línea y espacios dobles)
                    materia_raw = str(row.get(col_mat, '')).replace('\n', ' ').replace('\r', '').strip()
                    materia = re.sub(r'\s+', ' ', materia_raw)
                    
                    docentes_raw = str(row.get(col_doc, '')).strip()

                    es_hora = re.match(r'^\d{2}:\d{2}(:\d{2})?$', materia)
                    es_vacio = materia.lower() in ['', 'nan', 'none']
                    es_encabezado_repetido = materia == str(col_mat)

                    if es_hora or es_vacio or es_encabezado_repetido:
                        continue

                    # LIMPIEZA DE DOCENTES (separa con | y emprolija)
                    if docentes_raw.lower() in ['nan', 'none', '']:
                        docentes_limpios = "Sin asignar"
                    else:
                        docentes_limpios = docentes_raw.replace('\n', ' | ').replace('\r', '').strip()
                        docentes_limpios = re.sub(r'\s*\|\s*', ' | ', docentes_limpios)

                    texto_salida += f"{nombre_pestana} | {turno_actual} | {materia} | {docentes_limpios}\n"
                    total_materias += 1

            nombre_archivo = "resultado_materias.txt"
            # Modo "a" (append) para que no borre lo anterior si extraés varios links seguidos
            with open(nombre_archivo, "a", encoding="utf-8") as file:
                file.write(texto_salida)

            log_area.insert(tk.END, f"\n✅ ¡Éxito! Se extrajeron materias limpias.\n")
            log_area.see(tk.END)

        except Exception as ex:
            log_area.insert(tk.END, f"\n❌ Error:\n{traceback.format_exc()}\n")
            log_area.see(tk.END)
        finally:
            btn_extraer.config(state=tk.NORMAL)

    threading.Thread(target=procesar, daemon=True).start()

# --- INTERFAZ GRÁFICA TKINTER ---
root = tk.Tk()
root.title("Extractor ETL - UTN MVP")
root.geometry("650x450")
root.config(padx=20, pady=20)

tk.Label(root, text="Link del Google Sheets:", font=("Arial", 12, "bold")).pack(anchor="w")

url_input = tk.Entry(root, width=80, font=("Arial", 10))
url_input.pack(pady=5, fill="x")

btn_extraer = tk.Button(root, text="Extraer Datos", font=("Arial", 11, "bold"), bg="#4CAF50", fg="white", command=extraer_datos)
btn_extraer.pack(pady=10)

tk.Label(root, text="Registro de actividad:", font=("Arial", 10)).pack(anchor="w")

log_area = scrolledtext.ScrolledText(root, width=80, height=15, font=("Consolas", 9), bg="#f4f4f4")
log_area.pack(fill="both", expand=True)

root.mainloop()