-- ==============================================================
-- DISKAI VIRAL INTELLIGENCE & VVS2 ALGORITHM DATA PIPELINE
-- Migration: 20261028_viral_intelligence_tables.sql
-- ==============================================================

-- Remove versões anteriores com schema desatualizado para garantir integridade
DROP TABLE IF EXISTS viral_saved_alerts CASCADE;
DROP TABLE IF EXISTS viral_snapshots CASCADE;
DROP TABLE IF EXISTS viral_posts CASCADE;
DROP TABLE IF EXISTS viral_permissions CASCADE;

-- 1. Tabela de Permissões de Acesso à Janela de Virais
CREATE TABLE IF NOT EXISTS viral_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_tag TEXT,
    granted_by TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_permission_user UNIQUE (user_id)
);

-- 2. Tabela de Posts / Vídeos Virais Analisados
CREATE TABLE IF NOT EXISTS viral_posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'x')),
    post_id TEXT NOT NULL,
    external_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    hook_transcript TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    author JSONB NOT NULL DEFAULT '{}'::jsonb,
    region TEXT NOT NULL DEFAULT 'global',
    niche TEXT NOT NULL DEFAULT 'geral',
    score INT NOT NULL DEFAULT 50,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_trend_alert BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_posts_platform_post UNIQUE (platform, post_id)
);

-- 3. Snapshots Históricos para Telemetria e Cálculo de Momentum Real
CREATE TABLE IF NOT EXISTS viral_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT NOT NULL REFERENCES viral_posts(id) ON DELETE CASCADE,
    views_count BIGINT NOT NULL DEFAULT 0,
    likes_count BIGINT NOT NULL DEFAULT 0,
    shares_count BIGINT NOT NULL DEFAULT 0,
    comments_count BIGINT NOT NULL DEFAULT 0,
    views_per_hour NUMERIC,
    captured_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Alertas Virais Salvos por Usuários Autorizados
CREATE TABLE IF NOT EXISTS viral_saved_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL REFERENCES viral_posts(id) ON DELETE CASCADE,
    score INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_saved_alert UNIQUE (user_id, post_id)
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_viral_posts_platform_region ON viral_posts (platform, region);
CREATE INDEX IF NOT EXISTS idx_viral_posts_score ON viral_posts (score DESC);
CREATE INDEX IF NOT EXISTS idx_viral_posts_niche ON viral_posts (niche);
CREATE INDEX IF NOT EXISTS idx_viral_snapshots_post ON viral_snapshots (post_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_saved_alerts_user ON viral_saved_alerts (user_id);

-- Configuração de Row Level Security (RLS)
ALTER TABLE viral_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_saved_alerts ENABLE ROW LEVEL SECURITY;

-- 1. Políticas de viral_permissions:
DROP POLICY IF EXISTS "Permissões de leitura viral_permissions" ON viral_permissions;
CREATE POLICY "Permissões de leitura viral_permissions" ON viral_permissions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Administradores gerenciam viral_permissions" ON viral_permissions;
CREATE POLICY "Administradores gerenciam viral_permissions" ON viral_permissions
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id::text = auth.uid()::text AND profiles.role = 'admin'
        )
    );

-- 2. Políticas de viral_posts:
-- Usuários logados/públicos podem ler (SELECT)
DROP POLICY IF EXISTS "Leitura de posts virais" ON viral_posts;
CREATE POLICY "Leitura de posts virais" ON viral_posts
    FOR SELECT USING (true);

-- Escrita restrita a service_role (Edge Function)
DROP POLICY IF EXISTS "Gravação de posts virais via service_role" ON viral_posts;
CREATE POLICY "Gravação de posts virais via service_role" ON viral_posts
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- 3. Políticas de viral_snapshots:
-- Usuários logados/públicos podem ler (SELECT)
DROP POLICY IF EXISTS "Leitura de snapshots virais" ON viral_snapshots;
CREATE POLICY "Leitura de snapshots virais" ON viral_snapshots
    FOR SELECT USING (true);

-- Escrita restrita a service_role (Edge Function)
DROP POLICY IF EXISTS "Gravação de snapshots virais via service_role" ON viral_snapshots;
CREATE POLICY "Gravação de snapshots virais via service_role" ON viral_snapshots
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- 4. Políticas de viral_saved_alerts:
-- Usuários gerenciam apenas seus próprios alertas
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios alertas" ON viral_saved_alerts;
CREATE POLICY "Usuários gerenciam seus próprios alertas" ON viral_saved_alerts
    FOR ALL USING (
        user_id = auth.uid()::text OR
        auth.jwt() ->> 'role' = 'service_role'
    );
