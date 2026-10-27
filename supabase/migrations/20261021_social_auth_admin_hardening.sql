-- ==============================================================================
-- MIGRATION: 20261021_social_auth_admin_hardening.sql
-- ESTRUTURA DE BANCO DE DADOS, PROFILES, RLS E APROVAÇÃO DE ADMIN
-- ==============================================================================

-- 1. Criação/Atualização da Tabela public.profiles vinculada a auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    name TEXT,
    avatar_url TEXT,
    avatar TEXT,
    tag TEXT DEFAULT '0001',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'Administrador', 'Membro', 'Convidado')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_approved BOOLEAN NOT NULL DEFAULT false,
    presence_status TEXT DEFAULT 'online',
    custom_status TEXT DEFAULT 'Aguardando aprovação do Administrador',
    banner_color TEXT,
    pronouns TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas adicionais se a tabela já existia
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

-- Sincronizar name e full_name, avatar e avatar_url
UPDATE public.profiles SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
UPDATE public.profiles SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
UPDATE public.profiles SET avatar_url = avatar WHERE avatar_url IS NULL AND avatar IS NOT NULL;
UPDATE public.profiles SET avatar = avatar_url WHERE avatar IS NULL AND avatar_url IS NOT NULL;

-- 2. Funções de Segurança SECURITY DEFINER (Anti-recursão RLS)

-- Verifica se o usuário atual é Administrador e está ativo/aprovado
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role IN ('admin', 'Administrador') OR email IN ('campanholo32@gmail.com', 'campanholo32gmail.com'))
        AND (status = 'approved' OR is_approved = true OR email IN ('campanholo32@gmail.com', 'campanholo32gmail.com'))
    ),
    false
  );
$$;

-- Verifica se o usuário atual é Aprovado na plataforma DiskAI
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (status = 'approved' OR is_approved = true)
    ),
    false
  );
$$;

-- 3. Gatilho contra Escalação de Privilégios (usuários não podem aprovar a si mesmos)
CREATE OR REPLACE FUNCTION public.check_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF (NEW.role IS DISTINCT FROM OLD.role) OR 
       (NEW.status IS DISTINCT FROM OLD.status) OR 
       (NEW.is_approved IS DISTINCT FROM OLD.is_approved) THEN
      RAISE EXCEPTION 'Acesso Negado: Apenas o Administrador da plataforma DiskAI pode aprovar cadastros ou alterar cargos.';
    END IF;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.check_profile_privilege_escalation();

-- 4. Gatilho automático para novos registros em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_platform_admin BOOLEAN;
  clean_email TEXT;
  user_full_name TEXT;
  user_avatar TEXT;
  random_tag TEXT;
BEGIN
  clean_email := LOWER(TRIM(COALESCE(NEW.email, '')));
  is_platform_admin := (clean_email IN ('campanholo32@gmail.com', 'campanholo32gmail.com'));
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(clean_email, '@', 1));
  user_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'avatar', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
  random_tag := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    name,
    avatar_url,
    avatar,
    tag,
    role,
    status,
    is_approved,
    presence_status,
    custom_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    clean_email,
    user_full_name,
    user_full_name,
    user_avatar,
    user_avatar,
    random_tag,
    CASE WHEN is_platform_admin THEN 'admin' ELSE 'user' END,
    CASE WHEN is_platform_admin THEN 'approved' ELSE 'pending' END,
    CASE WHEN is_platform_admin THEN true ELSE false END,
    'online',
    CASE WHEN is_platform_admin THEN '👑 Administrador da Plataforma' ELSE '⏳ Aguardando aprovação do Administrador' END,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    role = CASE WHEN is_platform_admin THEN 'admin' ELSE public.profiles.role END,
    status = CASE WHEN is_platform_admin THEN 'approved' ELSE public.profiles.status END,
    is_approved = CASE WHEN is_platform_admin THEN true ELSE public.profiles.is_approved END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 5. BLINDAGEM DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR (public.is_approved() AND (status = 'approved' OR is_approved = true))
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- Conversations (Apenas usuários Aprovados e Participantes/Admin)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
CREATE POLICY "conversations_select_policy"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_approved() AND (
        EXISTS (
          SELECT 1 FROM public.conversation_participants
          WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
        )
        OR type = 'channel'
      )
    )
  );

-- Conversation Participants (Apenas usuários Aprovados)
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_part_select_policy" ON public.conversation_participants;
CREATE POLICY "conv_part_select_policy"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_approved() AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = public.conversation_participants.conversation_id AND cp.user_id = auth.uid()
        )
      )
    )
  );

-- Messages (Nenhum usuário 'pending' consegue ler ou enviar mensagens)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_approved() AND (
        -- Se for mensagem de canal
        channel_id IS NOT NULL
        -- Se for mensagem direta / conversa privada
        OR conversation_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.conversation_participants
          WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved() OR public.is_admin()
  );

DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    (public.is_approved() AND (sender_id = auth.uid() OR user_id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;
CREATE POLICY "messages_delete_policy"
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    (public.is_approved() AND (sender_id = auth.uid() OR user_id = auth.uid()))
    OR public.is_admin()
  );

-- Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
