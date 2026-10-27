-- ==============================================================================
-- MIGRATION: 20261021_calls_table.sql
-- TABELA DE CHAMADAS E SINALIZAÇÃO WEBRTC / LIVEKIT (DISKAI)
-- ==============================================================================

-- 1. Criação da tabela public.calls
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'rejected', 'ended')),
    room_name VARCHAR(100),
    with_video BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- Comentários descritivos
COMMENT ON TABLE public.calls IS 'Gerenciamento de chamadas de voz e vídeo 1-on-1 via LiveKit e Supabase Broadcast';
COMMENT ON COLUMN public.calls.id IS 'Identificador único da chamada (usado também como Room Name no LiveKit)';
COMMENT ON COLUMN public.calls.status IS 'Status do ciclo de vida: ringing, accepted, rejected, ended';

-- 2. Habilitação do Row Level Security (RLS)
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)

-- Usuários só podem ler chamadas onde participam ou se for admin
DROP POLICY IF EXISTS "calls_select_policy" ON public.calls;
CREATE POLICY "calls_select_policy"
ON public.calls
FOR SELECT
TO authenticated
USING (
    caller_id = auth.uid() 
    OR receiver_id = auth.uid() 
    OR (SELECT public.is_admin())
);

-- Usuários autenticados podem iniciar uma chamada (inserir) onde são o chamador
DROP POLICY IF EXISTS "calls_insert_policy" ON public.calls;
CREATE POLICY "calls_insert_policy"
ON public.calls
FOR INSERT
TO authenticated
WITH CHECK (
    caller_id = auth.uid()
);

-- Participantes da chamada ou admin podem atualizar o status (atender, recusar, encerrar)
DROP POLICY IF EXISTS "calls_update_policy" ON public.calls;
CREATE POLICY "calls_update_policy"
ON public.calls
FOR UPDATE
TO authenticated
USING (
    caller_id = auth.uid() 
    OR receiver_id = auth.uid() 
    OR (SELECT public.is_admin())
)
WITH CHECK (
    caller_id = auth.uid() 
    OR receiver_id = auth.uid() 
    OR (SELECT public.is_admin())
);

-- 4. Índices para performance instantânea
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON public.calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at DESC);

-- 5. Adicionar à publicação de Realtime do Supabase (para Broadcast e CDC via WebSocket)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
    END IF;
END $$;
