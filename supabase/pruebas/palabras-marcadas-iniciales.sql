-- Palabras marcadas para empezar (Pato, 14/11/2026). Primero en la base de prueba; también va en producción al publicar.
-- Una reseña o un final que trae alguna entra solo a Reportes (no se borra ni se esconde). También frenan nombres a mostrar ofensivos.
-- Se compara por palabra entera, sin tildes ni mayúsculas. Las que ya estaban no se repiten. Después se agregan o sacan desde Admin > Moderación.
WITH lista(palabra) AS (VALUES
  ('pelotudo'), ('pelotuda'), ('pelotudos'), ('pelotudas'),
  ('forro'), ('forra'), ('forros'),
  ('hijo de puta'), ('hija de puta'), ('hdp'), ('puta'), ('puto'), ('putos'),
  ('conchudo'), ('conchuda'), ('la concha de'), ('concha de tu madre'),
  ('mogolico'), ('mogolica'), ('retrasado'), ('retrasada'), ('retrasados'),
  ('imbecil'), ('imbeciles'), ('idiota'), ('idiotas'), ('estupido'), ('estupida'),
  ('tarado'), ('tarada'), ('sorete'), ('soretes'), ('garca'), ('garcas'),
  ('trolo'), ('trola'), ('mierda'), ('de mierda'), ('cagon'), ('cagona'),
  ('choto'), ('chota'), ('pajero'), ('pajera'), ('malparido'), ('malparida'),
  ('negro de mierda'), ('villero'), ('villera'), ('cornudo'), ('basura')
), nuevas AS (
  INSERT INTO public.palabras_marcadas (palabra)
  SELECT palabra FROM lista
  ON CONFLICT (palabra) DO NOTHING
  RETURNING palabra
)
SELECT (SELECT count(*) FROM nuevas) AS palabras_nuevas,
       (SELECT count(*) FROM public.palabras_marcadas) AS palabras_en_total;
