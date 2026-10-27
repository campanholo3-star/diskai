-- ==============================================================================
-- MIGRATION: 20261021_macaw_assistant_appointments.sql
-- TABELAS PARA A ARARA ASSISTENTE: APPOINTMENTS E PINNED_MESSAGES
-- ==============================================================================

-- 1. Tabela de Agendamentos e Calendário (appointments)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    channel_id TEXT,
    server_id TEXT,
    attendees TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_all_policy" ON public.appointments;
CREATE POLICY "appointments_all_policy"
  ON public.appointments FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 2. Tabela dedicada para Mensagens Fixadas (pinned_messages)
CREATE TABLE IF NOT EXISTS public.pinned_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    content TEXT NOT NULL,
    timestamp TEXT,
    pinned_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para pinned_messages
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pinned_messages_all_policy" ON public.pinned_messages;
CREATE POLICY "pinned_messages_all_policy"
  ON public.pinned_messages FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 3. Atualizar política de leitura de perfis para permitir persistência e sincronização de fotos e membros
DROP POLICY IF EXISTS "profiles_select_public_policy" ON public.profiles;
CREATE POLICY "profiles_select_public_policy"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_channel ON public.appointments(channel_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_channel ON public.pinned_messages(channel_id);
