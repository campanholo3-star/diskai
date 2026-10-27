-- ==============================================================================
-- MIGRATION: 20261021_call_summaries_table.sql
-- TABELA DE RESUMOS DE CHAMADAS E ATAS GERADAS POR IA (GEMINI FLASH)
-- ==============================================================================

-- 1. Criação da tabela public.call_summaries
CREATE TABLE IF NOT EXISTS public.call_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    channel_id TEXT,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    executive_summary TEXT NOT NULL,
    key_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
    sentiment TEXT DEFAULT 'Produtivo & Focado',
    audio_url TEXT,
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentários descritivos
COMMENT ON TABLE public.call_summaries IS 'Armazena atas e resumos inteligentes de chamadas de áudio processadas pelo Gemini Flash';
COMMENT ON COLUMN public.call_summaries.executive_summary IS 'Resumo executivo sintetizado pela IA';
COMMENT ON COLUMN public.call_summaries.action_items IS 'Lista estruturada de itens de ação com tarefas, responsáveis e prioridades';

-- 2. Habilitação de RLS
ALTER TABLE public.call_summaries ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)
DROP POLICY IF EXISTS "call_summaries_select_policy" ON public.call_summaries;
CREATE POLICY "call_summaries_select_policy"
ON public.call_summaries
FOR SELECT
TO authenticated
USING (
    public.is_admin() 
    OR public.is_approved()
);

DROP POLICY IF EXISTS "call_summaries_insert_policy" ON public.call_summaries;
CREATE POLICY "call_summaries_insert_policy"
ON public.call_summaries
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin() 
    OR public.is_approved()
    OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "call_summaries_update_policy" ON public.call_summaries;
CREATE POLICY "call_summaries_update_policy"
ON public.call_summaries
FOR UPDATE
TO authenticated
USING (
    public.is_admin() 
    OR auth.uid() = created_by
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_call_summaries_call_id ON public.call_summaries(call_id);
CREATE INDEX IF NOT EXISTS idx_call_summaries_channel_id ON public.call_summaries(channel_id);
CREATE INDEX IF NOT EXISTS idx_call_summaries_created_at ON public.call_summaries(created_at DESC);

-- 5. Publicação no Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'call_summaries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_summaries;
    END IF;
END $$;
