-- =====================================================
-- UTN Reviews - Supabase Security Setup
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- 1. Add user_id column to resenas table (links reviews to auth users)
ALTER TABLE resenas 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add nombre_usuario column (public display name from OAuth account)
ALTER TABLE resenas
  ADD COLUMN IF NOT EXISTS nombre_usuario TEXT;

-- Create an index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_resenas_user_id ON resenas(user_id);

-- Create a unique constraint: 1 review per user per dictado (anti-spam)
ALTER TABLE resenas
  ADD CONSTRAINT unique_user_dictado UNIQUE (user_id, dictado_id);

-- 2. Enable RLS on all tables
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictados ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictado_profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas ENABLE ROW LEVEL SECURITY;

-- 3. READ policies: anyone can read all data (public app)
CREATE POLICY "Public read materias" ON materias
  FOR SELECT USING (true);

CREATE POLICY "Public read cursos" ON cursos
  FOR SELECT USING (true);

CREATE POLICY "Public read profesores" ON profesores
  FOR SELECT USING (true);

CREATE POLICY "Public read dictados" ON dictados
  FOR SELECT USING (true);

CREATE POLICY "Public read dictado_profesores" ON dictado_profesores
  FOR SELECT USING (true);

CREATE POLICY "Public read resenas" ON resenas
  FOR SELECT USING (true);

-- 4. INSERT policy: only authenticated users can create reviews
CREATE POLICY "Authenticated users can insert resenas" ON resenas
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- 5. UPDATE policy: users can only update their own reviews
CREATE POLICY "Users can update own resenas" ON resenas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. DELETE policy: users can only delete their own reviews
CREATE POLICY "Users can delete own resenas" ON resenas
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- OAuth Provider Setup (do this in Supabase Dashboard):
--
-- 1. Go to Authentication > Providers
--
-- 2. GOOGLE:
--    - Enable Google provider
--    - Go to https://console.cloud.google.com
--    - Create OAuth 2.0 credentials (Web Application)
--    - Authorized redirect URI: https://mcyientvrmyzgcyibynp.supabase.co/auth/v1/callback
--    - Copy Client ID and Client Secret into Supabase
--
-- 3. GITHUB:
--    - Enable GitHub provider
--    - Go to https://github.com/settings/developers
--    - Create a new OAuth App
--    - Authorization callback URL: https://mcyientvrmyzgcyibynp.supabase.co/auth/v1/callback
--    - Copy Client ID and Client Secret into Supabase
--
-- 4. Go to Authentication > URL Configuration
--    - Site URL: http://localhost:4321 (or your production URL)
--    - Redirect URLs: http://localhost:4321/api/auth/callback
-- =====================================================
