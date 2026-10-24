-- Tabla de reportes de reseñas (antes documentada en src/pages/api/reportes.ts).
CREATE TABLE IF NOT EXISTS reportes_resenas (
  id SERIAL PRIMARY KEY,
  resena_id INTEGER NOT NULL REFERENCES resenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reportes_resenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden reportar" ON reportes_resenas;
CREATE POLICY "Usuarios pueden reportar" ON reportes_resenas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Solo el creador ve sus reportes" ON reportes_resenas;
CREATE POLICY "Solo el creador ve sus reportes" ON reportes_resenas
  FOR SELECT USING (auth.uid() = user_id);
