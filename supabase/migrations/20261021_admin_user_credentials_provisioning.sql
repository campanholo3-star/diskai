-- ==============================================================================
-- MIGRATION: 20261021_admin_user_credentials_provisioning.sql
-- PROVISIONAMENTO DE USUÁRIOS PELO ADMINISTRADOR E ISOLAMENTO DE DADOS
-- ==============================================================================

-- 1. Garantir coluna initial_password na tabela public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initial_password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

-- 2. Atualizar gatilho de sincronização
CREATE OR REPLACE FUNCTION public.sync_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS NOT NULL AND NEW.name IS NULL THEN
    NEW.name := NEW.full_name;
  ELSIF NEW.name IS NOT NULL AND NEW.full_name IS NULL THEN
    NEW.full_name := NEW.name;
  END IF;

  IF NEW.avatar_url IS NOT NULL AND NEW.avatar IS NULL THEN
    NEW.avatar := NEW.avatar_url;
  ELSIF NEW.avatar IS NOT NULL AND NEW.avatar_url IS NULL THEN
    NEW.avatar_url := NEW.avatar;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_sync_profile_columns ON public.profiles;
CREATE TRIGGER tr_sync_profile_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_profile_columns();

-- 3. Permitir que administradores insiram diretamente novos usuários provisionados
DROP POLICY IF EXISTS "profiles_admin_insert_policy" ON public.profiles;
CREATE POLICY "profiles_admin_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
    OR (auth.uid() IS NULL AND role = 'user')
  );

-- 4. Índice para busca rápida de login por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
