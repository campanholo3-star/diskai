-- ==============================================================
-- DISKAI VIRAL INTELLIGENCE - FASE 1: WATCHLIST & LANES
-- Migration: 20261029_viral_watchlist_and_lanes.sql
-- ==============================================================

-- 1. Tabela de Criadores e Canais Monitorados (Watchlist)
CREATE TABLE IF NOT EXISTS viral_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'x')),
    target_id TEXT NOT NULL, -- channel_id, username ou handle
    label TEXT, -- Ex: "Criador Sora Top", "Canal de Clones IA"
    user_id TEXT, -- ID do usuário do Supabase Auth
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_watchlist_platform_target UNIQUE (platform, target_id)
);

CREATE INDEX IF NOT EXISTS idx_viral_watchlist_platform ON viral_watchlist (platform);
CREATE INDEX IF NOT EXISTS idx_viral_watchlist_user ON viral_watchlist (user_id);

ALTER TABLE viral_watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de watchlist" ON viral_watchlist;
CREATE POLICY "Leitura de watchlist" ON viral_watchlist FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gerenciamento de watchlist" ON viral_watchlist;
CREATE POLICY "Gerenciamento de watchlist" ON viral_watchlist FOR ALL USING (
    user_id = auth.uid()::text OR
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id::text = auth.uid()::text AND profiles.role = 'admin')
);

-- 2. Colunas de Raia e IA em viral_posts
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS lane TEXT DEFAULT 'recriar';
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS ai_signals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS source_count INT DEFAULT 1;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_viral_posts_lane ON viral_posts (lane);

