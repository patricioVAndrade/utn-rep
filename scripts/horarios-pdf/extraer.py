# Lee los PDF oficiales de horarios de Sistemas (institucional.frc.utn.edu.ar,
# uno por año más el del seminario integrador) y saca, de cada grilla, el curso,
# el cuatrimestre, el día, el módulo y el texto de cada celda.
#
#   python3 -I scripts/horarios-pdf/extraer.py anio1.pdf ... > celdas.json
#   python3 -I scripts/horarios-pdf/armar.py celdas.json resumen.json horarios.csv
#   npx tsx scripts/horarios-pdf/nombres.ts horarios.csv final.csv sistemas1.xlsx ... sistemas5.xlsx basicas.xlsx
#
# El CSV que sale se sube en /admin/importar ("Subir .xlsx o .csv"), que muestra
# qué cambia antes de guardar. Necesita pdfplumber (pip install pdfplumber).
# Cada página tiene dos grillas (1.er y 2.º cuatrimestre) con los días arriba y
# los módulos a la izquierda; los nombres de los profesores están escondidos en
# las celdas, así que se toma cada renglón por separado y armar.py se queda
# solo con las siglas que conoce.
import sys, re, json, unicodedata, pdfplumber
DIAS = {'lunes':1,'martes':2,'miercole':3,'jueves':4,'viernes':5,'sabado':6}
DIA_RE = re.compile('|'.join(DIAS))
HORA = re.compile(r'^\d{1,2}:\d{2}$')
TIT = re.compile(r'(\d)\s*K\s*(\d+)([A-Z]?)\s*-\s*(?:\d\s*\w*\s*año\s*-\s*)?(1er|2do)\s*(?:contra)?cuatrimestre', re.I)
def n1(c): return (''.join(x for x in unicodedata.normalize('NFD', c) if unicodedata.category(x)!='Mn').lower() or ' ')[0]
def clusters(items, key, tol):
    out = []
    for it in sorted(items, key=key):
        if out and key(it) - key(out[-1][-1]) <= tol: out[-1].append(it)
        else: out.append([it])
    return out
out = {'celdas': [], 'leyendas': [], 'rarezas': [], 'grids': []}
for path in sys.argv[1:]:
    src0 = path.split('/')[-1]
    pdf = pdfplumber.open(path)
    for pi, p in enumerate(pdf.pages):
        src = f'{src0} p{pi+1}'
        ws = p.extract_words(extra_attrs=['top'])
        lineas = [sorted(l, key=lambda w: w['x0']) for l in clusters(ws, lambda w: w['top'], 1.0)]
        grids = []
        for l in lineas:
            txt = ''; offs = []
            for w in l: offs.append(len(txt)); txt += w['text'] + ' '
            for m in TIT.finditer(txt):
                en = [w for w, o in zip(l, offs) if m.start() <= o < m.end()]
                grids.append({'curso': f'{m.group(1)}K{m.group(2)}{m.group(3).upper()}', 'cuatri': 1 if m.group(4).lower()=='1er' else 2, 'top': l[0]['top'], 'cx': (en[0]['x0']+en[-1]['x1'])/2, 'src': src, 'titulo': txt.strip()})
        # encabezados de días por fila de títulos
        for fila in clusters(grids, lambda g: g['top'], 3):
            t = fila[0]['top']
            cs = [c for c in p.chars if t+5 < c['top'] < t+26]
            dias = []
            for lc in clusters(cs, lambda c: c['top'], 1.5):
                lc.sort(key=lambda c: c['x0'])
                s = ''.join(n1(c['text']) for c in lc)
                for m in DIA_RE.finditer(s): dias.append((DIAS[m.group(0)], lc[m.start()]['x0'], lc[m.start()]['top']))
            dias.sort(key=lambda d: d[1])
            grupos = []
            for d in dias:
                if grupos and d[0] > grupos[-1][-1][0]: grupos[-1].append(d)
                else: grupos.append([d])
            for gr in grupos:
                cx = (gr[0][1] + gr[-1][1]) / 2
                g = min(fila, key=lambda g: abs(g['cx'] - cx))
                if 'cols' in g: out['rarezas'].append([src, g['curso'], 'dos grupos de días']); continue
                g['cols'] = gr
        for g in grids:
            if 'cols' not in g: out['rarezas'].append([src, g['curso'], 'sin días']); continue
            xs = [x for _, x, _ in g['cols']]
            paso = (xs[-1]-xs[0])/(len(xs)-1) if len(xs) > 1 else 60
            x0g, x1g = xs[0]-100, xs[-1]+paso
            htop = max(t for _, _, t in g['cols'])
            abajo = [h['top'] for h in grids if h['top'] > g['top']+5 and x0g < h['cx'] < x1g]
            ymax = min(abajo) if abajo else 1e9
            hs = [w for w in ws if HORA.match(w['text']) and htop+5 < w['top'] < ymax and xs[0]-100 < w['x0'] and w['x1'] < xs[0]+2]
            rows = []
            for l in clusters(hs, lambda w: w['top'], 1.0):
                l.sort(key=lambda w: w['x0'])
                if len(l) >= 2: rows.append({'top': l[0]['top'], 'bot': l[0]['bottom'], 'desde': l[0]['text'], 'hasta': l[1]['text']})
            cen = [(r['top']+r['bot'])/2 for r in rows]
            for i, r in enumerate(rows):
                r['y0'] = (cen[i-1]+cen[i])/2 if i else cen[0]-((cen[1]-cen[0])/2 if len(cen)>1 else 7)
                r['y1'] = (cen[i]+cen[i+1])/2 if i+1 < len(rows) else cen[-1]+((cen[-1]-cen[-2])/2 if len(cen)>1 else 7)
            bounds = [x-6 for x in xs] + [xs[-1]+paso-6]
            g['rows'] = [(r['desde'], r['hasta']) for r in rows]
            for r in rows:
                for ci, (dia, _, _) in enumerate(g['cols']):
                    en = [w for w in ws if bounds[ci] <= (w['x0']+w['x1'])/2 < bounds[ci+1] and r['y0'] <= (w['top']+w['bottom'])/2 < r['y1'] and not HORA.match(w['text'])]
                    textos = [' '.join(w['text'] for w in sorted(l, key=lambda w: w['x0'])) for l in clusters(en, lambda w: w['top'], 0.3)]
                    if textos: out['celdas'].append({'src': src, 'curso': g['curso'], 'cuatri': g['cuatri'], 'dia': dia, 'desde': r['desde'], 'hasta': r['hasta'], 'textos': textos})
            out['grids'].append({'src': src, 'curso': g['curso'], 'cuatri': g['cuatri'], 'titulo': g['titulo'], 'dias': [d for d, _, _ in g['cols']], 'rows': g['rows']})
        # leyendas
        for l in lineas:
            partes = [[l[0]]]
            for a, b in zip(l, l[1:]):
                if b['x0'] - a['x1'] > 8: partes.append([b])
                else: partes[-1].append(b)
            if len(partes) < 2: continue
            v = ' '.join(w['text'] for w in partes[-1]); k = ' '.join(w['text'] for w in partes[-2])
            if HORA.match(l[0]['text']) or len(k) > 12 or len(v) < 6 or not re.search('[a-z]', v) or len(v) <= len(k): continue
            out['leyendas'].append({'src': src, 'k': k, 'v': v})
json.dump(out, sys.stdout, ensure_ascii=False, indent=0)
