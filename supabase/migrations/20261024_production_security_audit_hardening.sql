-- ==============================================================================
-- DISKAI - MIGRATION: 20261024_production_security_audit_hardening.sql
-- AUDITORIA DE SEGURANÇA DEFINITIVA & BLINDAGEM COMPLETA DE RLS
-- ==============================================================================

-- 1. Remoção de políticas públicas frouxas (anon) em profiles
DROP POLICY IF EXISTS "profiles_select_public_policy" ON public.profiles;

-- Garantir que a leitura de perfis exija autenticação e respeito ao status de aprovação
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR (public.is_approved() AND (status = 'approved' OR is_approved = true))
  );

-- 2. Blindagem estrita de Appointments (Calendário & Tarefas)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_all_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;

-- Leitura: Apenas administradores e membros aprovados
CREATE POLICY "appointments_select_policy"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_approved()
  );

-- Criação: Apenas membros aprovados vinculando seu próprio usuário ou admin
CREATE POLICY "appointments_insert_policy"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (public.is_approved() AND (user_id = auth.uid() OR user_id IS NULL))
  );

-- Atualização (marcar como concluída / editar): Usuário criador ou admin
CREATE POLICY "appointments_update_policy"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (public.is_approved() AND (user_id = auth.uid() OR user_id IS NULL))
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_approved() AND (user_id = auth.uid() OR user_id IS NULL))
  );

-- Exclusão: Usuário criador ou admin
CREATE POLICY "appointments_delete_policy"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (public.is_approved() AND (user_id = auth.uid() OR user_id IS NULL))
  );

-- 3. Blindagem estrita de Pinned Messages (Mensagens Fixadas)
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pinned_messages_all_policy" ON public.pinned_messages;
DROP POLICY IF EXISTS "pinned_messages_select_policy" ON public.pinned_messages;
DROP POLICY IF EXISTS "pinned_messages_insert_policy" ON public.pinned_messages;
DROP POLICY IF EXISTS "pinned_messages_update_policy" ON public.pinned_messages;
DROP POLICY IF EXISTS "pinned_messages_delete_policy" ON public.pinned_messages;

-- Leitura: Apenas membros aprovados ou admin
CREATE POLICY "pinned_messages_select_policy"
  ON public.pinned_messages FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_approved()
  );

-- Fixar Mensagens: Apenas membros aprovados ou admin
CREATE POLICY "pinned_messages_insert_policy"
  ON public.pinned_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_approved()
  );

-- Atualizar / Editar status de fixação
CREATE POLICY "pinned_messages_update_policy"
  ON public.pinned_messages FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_approved()
  );

-- Desafixar Mensagens: Criador da fixação ou Administrador
CREATE POLICY "pinned_messages_delete_policy"
  ON public.pinned_messages FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (public.is_approved() AND (pinned_by = auth.uid()::text OR pinned_by IS NULL))
  );

-- 4. Blindagem de Canais (Channels): Restrição contra modificações indevidas
DROP POLICY IF EXISTS "channels_all_policy" ON public.channels;

DROP POLICY IF EXISTS "channels_select_policy" ON public.channels;
CREATE POLICY "channels_select_policy"
  ON public.channels FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_approved()
      AND (
        is_private IS NOT TRUE
        OR auth.uid()::text = ANY(SELECT jsonb_array_elements_text(COALESCE(allowed_members, '[]'::jsonb)))
        OR EXISTS (
          SELECT 1 FROM public.servers s
          WHERE s.id = channels.server_id AND s.owner_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "channels_insert_policy" ON public.channels;
CREATE POLICY "channels_insert_policy"
  ON public.channels FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_approved()
      AND EXISTS (
        SELECT 1 FROM public.servers s
        WHERE s.id = server_id AND s.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "channels_update_policy" ON public.channels;
CREATE POLICY "channels_update_policy"
  ON public.channels FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_approved()
      AND EXISTS (
        SELECT 1 FROM public.servers s
        WHERE s.id = channels.server_id AND s.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "channels_delete_policy" ON public.channels;
CREATE POLICY "channels_delete_policy"
  ON public.channels FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_approved()
      AND EXISTS (
        SELECT 1 FROM public.servers s
        WHERE s.id = channels.server_id AND s.owner_id = auth.uid()
      )
    )
  );

-- 5. Garantir que a tabela public.meeting_summaries e call_summaries estejam blindadas
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- 6. Recalcular e auditar índices para consultas rápidas seguras
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_pinned_by ON public.pinned_messages(pinned_by);
CREATE INDEX IF NOT EXISTS idx_channels_is_private ON public.channels(is_private);
