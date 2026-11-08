# Pasa las celdas de extraer.py a un CSV de horarios para /admin/importar:
# curso, materia, cuatrimestre (1, 2 o vacío si es anual), dia, desde, hasta.
# - Las siglas salen de las leyendas de cada página (SIG). CDD y COM son las
#   dos Comunicación de Datos (Pato). "IS" aparece una vez en 4K4 y se toma
#   como ICS: confirmar con Pato.
# - Si una materia tiene el mismo horario en los dos cuatrimestres, va como anual.
# - Subgrupos (1K1B, 4K1A...): ver el comentario más abajo.
import sys, json, re, unicodedata, collections, csv
d = json.load(open(sys.argv[1]))
def k(s): return ' '.join(''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower().split())
SIG = {
 'AED': 'Algoritmos y Estructuras de Datos', 'AMI': 'Análisis Matemático I', 'Algebra': 'Álgebra y Geometría Analítica',
 'Fisica I': 'Física I', 'Fisica': 'Física I', 'ACO': 'Arquitectura de Computadoras', 'SPN': 'Sistemas y Procesos de Negocio',
 'LED': 'Lógica y Estructuras Discretas', 'Ing y Soc': 'Ingeniería y Sociedad', 'Ingles': 'Inglés I',
 'AM2': 'Análisis Matemático II', 'FISII': 'Física II', 'SOP': 'Sistemas Operativos', 'SSL': 'Sintaxis y Semántica de los Lenguajes',
 'PPR': 'Paradigmas de Programación', 'EST': 'Probabilidad y Estadística', 'ASI': 'Análisis de Sistemas de Información',
 'DSI': 'Diseño de Sistemas de Información', 'DS': 'Desarrollo de Software', 'BDD': 'Base de Datos', 'CDD': 'Comunicación de Datos',
 'COM': 'Comunicación de Datos', 'Ingles II': 'Inglés II', 'ECO': 'Economía', 'AN': 'Análisis Numérico', 'BDA': 'Backend de Aplicaciones',
 'Seminario': 'Seminario Integrador', 'ADSI': 'Administración de Sistemas de Información', 'RED': 'Redes de Datos',
 'IOP': 'Investigación Operativa', 'SIM': 'Simulación', 'TPA': 'Tecnologías para la Automatización', 'TA': 'Tecnologías para la Automatización',
 'DAO': 'Desarrollo de Aplicaciones con Objetos', 'ICS': 'Ingeniería y Calidad de Software', 'IS': 'Ingeniería y Calidad de Software',
 'LEG': 'Legislación', 'GMP': 'Gestión de la Mejora de Procesos', 'GIP': 'Gestión Industrial de la Producción', 'GREEN': 'Green Software',
 'UIX': 'Experiencia e Interfaces de Usuario', 'SDS': 'Seguridad en el Desarrollo de Software',
 'CMD': 'Comunicación Multimedial en el Desarrollo de Sistemas de Información', 'DevOps': 'Desarrollo y Operaciones DevOps',
 'IAR': 'Inteligencia Artificial', 'IA': 'Inteligencia Artificial', 'GG': 'Gestión Gerencial', 'SG': 'Sistemas de Gestión',
 'SSI': 'Seguridad en los Sistemas de Información', 'CD': 'Ciencia de Datos', 'PROY': 'Proyecto Final',
 'DEC': 'Decisiones en Escenarios Complejos', 'GEE': 'Gerenciamiento Estratégico', 'HB': 'Habilidades Blandas',
 'CDEV': 'Creatividad y Desarrollo de Entornos Virtuales', 'CON': 'Consultoría en Negocios Digitales',
 'SWL': 'Ingeniería de Software de Fuentes Abiertas/Libres', 'TSO': 'Testing de Software', 'DTB': 'Desarrollo con Tecnologías Blockchain',
 'ET': 'Emprendimientos Tecnológicos', 'IAW': 'Integración de Aplicaciones en Entorno Web',
}
SK = {k(a): v for a, v in SIG.items()}
DIAS_TXT = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
def hm(t): h, m = t.split(':'); return int(h) * 60 + int(m)
filas = []; raros = collections.Counter(); usadas = collections.Counter()
for c in d['celdas']:
    for t in c['textos']:
        for parte in re.split(r'\s*/\s*', t):
            parte = parte.strip()
            if not parte: continue
            m = SK.get(k(parte))
            if not m:
                ws = parte.split()
                for i in range(len(ws)):
                    for j in range(len(ws), i, -1):
                        if (j - i) < len(ws) and k(' '.join(ws[i:j])) in SK and ws[i:j] != ws: m = SK[k(' '.join(ws[i:j]))]; break
                    if m: break
                if m: raros[('sub', parte)] += 1
            if m:
                usadas[parte.split()[0] if parte not in SIG else parte] += 1
                filas.append((c['curso'], m, c['cuatri'], c['dia'], hm(c['desde']), hm(c['hasta']), c['src']))
            elif re.fullmatch(r'[A-Z0-9]{2,6}', parte): raros[('sigla?', parte)] += 1
filas = sorted(set(filas))
# por curso y materia
# Subgrupos (1K1B, 4K1A...): lo que ya tiene el curso principal se descarta
# (es igual o un pedazo); una electiva que solo está en el subgrupo pasa al
# curso principal, sin juntar cuatrimestres (A y B son comisiones distintas).
principal = collections.defaultdict(set)
for curso, m, *_ in filas:
    if not re.search(r'[A-Z]$', curso): principal[curso].add(m)
g = collections.defaultdict(lambda: {1: set(), 2: set(), 'src': set(), 'sub': False})
subgrupos = collections.defaultdict(set)
for curso, m, q, dia, de, ha, src in filas:
    sg = re.match(r'(\d+K\d+)[A-Z]$', curso)
    if sg:
        if m in principal[sg.group(1)]: continue
        subgrupos[(sg.group(1), m)].add(curso)
        curso = sg.group(1); g[(curso, m)]['sub'] = True
    g[(curso, m)][q].add((dia, de, ha)); g[(curso, m)]['src'].add(src)
for (c, m), v in subgrupos.items(): print('subgrupo -> principal:', c, m, sorted(v))
out = []
for (curso, m), v in sorted(g.items()):
    if v[1] and v[2] and v[1] == v[2] and not v['sub']: out += [(curso, m, '', dia, de, ha) for dia, de, ha in sorted(v[1])]
    else: out += [(curso, m, q, dia, de, ha) for q in (1, 2) for dia, de, ha in sorted(v[q])]
json.dump({'out': out, 'raros': [[a, b, n] for (a, b), n in raros.items()], 'srcs': {f'{c}|{m}': sorted(v['src']) for (c, m), v in g.items()}}, open(sys.argv[2], 'w'), ensure_ascii=False)
w = csv.writer(open(sys.argv[3], 'w', newline=''))
w.writerow(['curso', 'materia', 'cuatrimestre', 'dia', 'desde', 'hasta'])
for curso, m, q, dia, de, ha in out: w.writerow([curso, m, q, DIAS_TXT[dia], f'{de//60}:{de%60:02d}', f'{ha//60}:{ha%60:02d}'])
print(len(filas), len(out), len(g))
for r in raros.items(): print(r)
