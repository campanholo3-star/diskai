-- ==============================================================
-- DISKAI VIRAL INTELLIGENCE V3 CONSOLIDADA - FASE 1: FUNDAÇÃO
-- Migration: 20261030_viral_v3_foundation.sql
-- Idempotente, somente ADD (tabelas, colunas, índices, RLS). Sem DROP ou perda de dados.
-- ==============================================================

-- 1. Tabela de Configuração Versionada do Motor de Score (viral_scoring_config)
CREATE TABLE IF NOT EXISTS viral_scoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
    budgets JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_scoring_config_active ON viral_scoring_config (active);

-- Seed da Configuração Padrão v3.0.0 (se ainda não existir)
INSERT INTO viral_scoring_config (version, active, weights, thresholds, budgets, notes)
VALUES (
    'v3.0.0',
    false,
    '{
        "reach_vs_followers": 15,
        "outlier_vs_median": 15,
        "recency_and_velocity": 25,
        "hook_and_idea": 20,
        "engagement": 15,
        "account_consistency": 10
    }'::jsonb,
    '{
        "min_views_normal": 5000,
        "min_views_pautas": 50,
        "max_age_shorts_hours": 72,
        "max_age_youtube_hours": 168,
        "max_age_pautas_hours": 48,
        "ai_probability_gate": 0.60,
        "max_duration_minutes": 15
    }'::jsonb,
    '{
        "apify_usd_daily": 0.16,
        "youtube_daily_units": 8000,
        "cache_ttl_minutes": 45
    }'::jsonb,
    'Configuração Padrão v3 com 5 pilares, pesos normalizados somando 100 e tetos de cota diária.'
)
ON CONFLICT (version) DO NOTHING;

-- 2. Tabela de Posts Virais (Criação preventiva se não existir + ADD COLUMN idempotente)
CREATE TABLE IF NOT EXISTS viral_posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'x', 'google_trends', 'reddit', 'news')),
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
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- (Restrições de plataforma legadas em viral_posts mantidas intactas sem alteração)

ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS lane TEXT DEFAULT 'recriar';
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS ai_probability NUMERIC;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS ai_evidence JSONB DEFAULT '[]'::jsonb;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS ai_tier TEXT DEFAULT 'provavel';
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS score INT DEFAULT 50;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'::jsonb;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS score_config_version TEXT DEFAULT 'v3.0.0';
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE viral_posts ADD COLUMN IF NOT EXISTS script_idea JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_viral_posts_platform_post ON viral_posts (platform, post_id);
CREATE INDEX IF NOT EXISTS idx_viral_posts_score_desc ON viral_posts (score DESC);
CREATE INDEX IF NOT EXISTS idx_viral_posts_lane_score ON viral_posts (lane, score DESC);
CREATE INDEX IF NOT EXISTS idx_viral_posts_ai_prob ON viral_posts (ai_probability DESC);

-- 3. Tabela de Perfis e Linhas de Base de Criadores (viral_accounts)
CREATE TABLE IF NOT EXISTS viral_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'x', 'google_trends', 'reddit', 'news')),
    account_id TEXT NOT NULL,
    handle TEXT NOT NULL,
    followers BIGINT DEFAULT 0,
    posts_count INT DEFAULT 0,
    platform_created_at TIMESTAMPTZ,
    median_views NUMERIC DEFAULT 0,
    median_engagement NUMERIC DEFAULT 0,
    posts_30d INT DEFAULT 0,
    videos_sampled INT DEFAULT 0,
    is_watchlist BOOLEAN DEFAULT false,
    source TEXT CHECK (source IN ('manual', 'auto')) DEFAULT 'manual',
    sampled_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_accounts UNIQUE (platform, account_id)
);



CREATE INDEX IF NOT EXISTS idx_viral_accounts_handle ON viral_accounts (handle);
CREATE INDEX IF NOT EXISTS idx_viral_accounts_watchlist ON viral_accounts (is_watchlist);

-- 4. Tabela de Estatísticas de Coorte para Percentis Reais (viral_cohort_stats)
CREATE TABLE IF NOT EXISTS viral_cohort_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'BR',
    niche TEXT NOT NULL DEFAULT 'geral',
    age_bucket TEXT NOT NULL DEFAULT '0-72h',
    metric TEXT NOT NULL,
    p10 NUMERIC DEFAULT 0,
    p25 NUMERIC DEFAULT 0,
    p50 NUMERIC DEFAULT 0,
    p75 NUMERIC DEFAULT 0,
    p90 NUMERIC DEFAULT 0,
    p99 NUMERIC DEFAULT 0,
    n INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_cohort_stats UNIQUE (platform, country, niche, age_bucket, metric)
);

-- 5. Histórico e Resultados de Pesquisa (viral_search_history & viral_search_results)
CREATE TABLE IF NOT EXISTS viral_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    capacity INT DEFAULT 80,
    page_size INT DEFAULT 16,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_search_history_user ON viral_search_history (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS viral_search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID NOT NULL REFERENCES viral_search_history(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES viral_posts(id) ON DELETE CASCADE,
    rank INT NOT NULL,
    score_at_capture INT NOT NULL,
    captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_search_results_search ON viral_search_results (search_id, rank ASC);

-- 6. Favoritos do Usuário com Snapshot Imutável (viral_favorites)
CREATE TABLE IF NOT EXISTS viral_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    post_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_favorites UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_viral_favorites_user ON viral_favorites (user_id, created_at DESC);

-- 7. Cache de Tradução Automática (viral_translations)
CREATE TABLE IF NOT EXISTS viral_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT NOT NULL REFERENCES viral_posts(id) ON DELETE CASCADE,
    lang TEXT NOT NULL DEFAULT 'pt-BR',
    title_t TEXT NOT NULL,
    description_t TEXT,
    source_lang TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_translations UNIQUE (post_id, lang)
);

-- 8. Feedback do Usuário e Resultados Futuros (viral_feedback & viral_outcomes)
CREATE TABLE IF NOT EXISTS viral_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('favorito', 'descartado', 'usei', 'ia_correto', 'ia_errado', 'irrelevante')),
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_feedback_post ON viral_feedback (post_id, type);

CREATE TABLE IF NOT EXISTS viral_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT NOT NULL,
    views_24h BIGINT,
    views_72h BIGINT,
    growth_24h NUMERIC,
    growth_72h NUMERIC,
    label_viralizou BOOLEAN,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    measured_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_outcomes_post ON viral_outcomes (post_id);

-- 9. Tópicos de Pautas, Pacotes de Query e Livro-Razão de Cota (viral_topics, viral_query_packs, viral_usage_ledger)
CREATE TABLE IF NOT EXISTS viral_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    geo TEXT NOT NULL DEFAULT 'BR',
    trend_volume NUMERIC DEFAULT 0,
    trend_growth NUMERIC DEFAULT 0,
    first_seen TIMESTAMPTZ DEFAULT now(),
    verified BOOLEAN DEFAULT false,
    opportunity_type TEXT DEFAULT 'antes_da_onda',
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_topics_geo ON viral_topics (geo, created_at DESC);

CREATE TABLE IF NOT EXISTS viral_query_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country TEXT NOT NULL,
    lang TEXT NOT NULL,
    niche TEXT NOT NULL,
    terms JSONB DEFAULT '[]'::jsonb,
    hashtags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_viral_query_packs UNIQUE (country, lang, niche)
);

CREATE TABLE IF NOT EXISTS viral_usage_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    fonte TEXT NOT NULL,
    unidade TEXT NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    custo_estimado NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_usage_ledger_data_fonte ON viral_usage_ledger (data, fonte);

-- ==============================================================
-- HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- ==============================================================

ALTER TABLE viral_scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_cohort_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_query_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_usage_ledger ENABLE ROW LEVEL SECURITY;

-- (Políticas de viral_posts preservadas intactas de 20261028_viral_intelligence_tables.sql sem alterações)

-- 1. viral_scoring_config: Leitura para usuários autenticados, escrita restrita a service_role
DROP POLICY IF EXISTS "Leitura de viral_scoring_config" ON viral_scoring_config;
CREATE POLICY "Leitura de viral_scoring_config" ON viral_scoring_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita em viral_scoring_config" ON viral_scoring_config;
CREATE POLICY "Escrita em viral_scoring_config" ON viral_scoring_config FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

-- 2. viral_accounts: Leitura autenticada, escrita service_role
DROP POLICY IF EXISTS "Leitura de viral_accounts" ON viral_accounts;
CREATE POLICY "Leitura de viral_accounts" ON viral_accounts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita em viral_accounts" ON viral_accounts;
CREATE POLICY "Escrita em viral_accounts" ON viral_accounts FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

-- 3. viral_cohort_stats: Leitura autenticada, escrita service_role
DROP POLICY IF EXISTS "Leitura de viral_cohort_stats" ON viral_cohort_stats;
CREATE POLICY "Leitura de viral_cohort_stats" ON viral_cohort_stats FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita em viral_cohort_stats" ON viral_cohort_stats;
CREATE POLICY "Escrita em viral_cohort_stats" ON viral_cohort_stats FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

-- 4. viral_search_history & results: Restritas estritamente ao DONO
DROP POLICY IF EXISTS "Dono gerencia seu histórico de busca" ON viral_search_history;
CREATE POLICY "Dono gerencia seu histórico de busca" ON viral_search_history 
    FOR ALL TO authenticated 
    USING (user_id = auth.uid()::text) 
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Dono lê resultados de suas buscas" ON viral_search_results;
CREATE POLICY "Dono lê resultados de suas buscas" ON viral_search_results 
    FOR SELECT TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM viral_search_history h WHERE h.id = viral_search_results.search_id AND h.user_id = auth.uid()::text)
    );

DROP POLICY IF EXISTS "Service role gerencia viral_search_results" ON viral_search_results;
CREATE POLICY "Service role gerencia viral_search_results" ON viral_search_results 
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. viral_favorites: Leitura e escrita restritas ao dono ou service_role
DROP POLICY IF EXISTS "Leitura de viral_favorites" ON viral_favorites;
CREATE POLICY "Leitura de viral_favorites" ON viral_favorites FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Escrita em viral_favorites" ON viral_favorites;
CREATE POLICY "Escrita em viral_favorites" ON viral_favorites FOR ALL USING (
    user_id = auth.uid()::text OR
    auth.jwt() ->> 'role' = 'service_role'
);

-- 6. viral_translations: Leitura autenticada, escrita service_role
DROP POLICY IF EXISTS "Leitura de viral_translations" ON viral_translations;
CREATE POLICY "Leitura de viral_translations" ON viral_translations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita em viral_translations" ON viral_translations;
CREATE POLICY "Escrita em viral_translations" ON viral_translations FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

-- 7. viral_feedback: Leitura e escrita restritas ao dono ou service_role
DROP POLICY IF EXISTS "Leitura de viral_feedback" ON viral_feedback;
CREATE POLICY "Leitura de viral_feedback" ON viral_feedback FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Escrita em viral_feedback" ON viral_feedback;
CREATE POLICY "Escrita em viral_feedback" ON viral_feedback FOR ALL USING (
    user_id = auth.uid()::text OR
    auth.jwt() ->> 'role' = 'service_role'
);

-- 8. viral_outcomes: Leitura autenticada, escrita service_role
DROP POLICY IF EXISTS "Leitura de viral_outcomes" ON viral_outcomes;
CREATE POLICY "Leitura de viral_outcomes" ON viral_outcomes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita em viral_outcomes" ON viral_outcomes;
CREATE POLICY "Escrita em viral_outcomes" ON viral_outcomes FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

-- 9. viral_topics, query_packs, usage_ledger
DROP POLICY IF EXISTS "Leitura de viral_topics" ON viral_topics;
CREATE POLICY "Leitura de viral_topics" ON viral_topics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita em viral_topics" ON viral_topics;
CREATE POLICY "Escrita em viral_topics" ON viral_topics FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

DROP POLICY IF EXISTS "Leitura de viral_query_packs" ON viral_query_packs;
CREATE POLICY "Leitura de viral_query_packs" ON viral_query_packs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita em viral_query_packs" ON viral_query_packs;
CREATE POLICY "Escrita em viral_query_packs" ON viral_query_packs FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

DROP POLICY IF EXISTS "Leitura de viral_usage_ledger" ON viral_usage_ledger;
CREATE POLICY "Leitura de viral_usage_ledger" ON viral_usage_ledger FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Escrita em viral_usage_ledger" ON viral_usage_ledger;
CREATE POLICY "Escrita em viral_usage_ledger" ON viral_usage_ledger FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
);

-- ==============================================================
-- 10. SEED DAS 14 CONTAS SEMENTE MONITORADAS (INSTAGRAM IA)
-- ==============================================================
INSERT INTO viral_accounts (platform, account_id, handle, followers, posts_count, is_watchlist, source)
VALUES
    ('instagram', 'ovictorventura', 'ovictorventura', 20400, 47, true, 'manual'),
    ('instagram', 'motacreator', 'motacreator', 32500, 220, true, 'manual'),
    ('instagram', '_theferreira', '_theferreira', 146000, 1190, true, 'manual'),
    ('instagram', 'liloforte', 'liloforte', 164000, 627, true, 'manual'),
    ('instagram', 'dariow.ia', 'dariow.ia', 6474, 21, true, 'manual'),
    ('instagram', 'sgabriel.ia', 'sgabriel.ia', 8472, 48, true, 'manual'),
    ('instagram', 'sartorii.ia', 'sartorii.ia', 79100, 49, true, 'manual'),
    ('instagram', 'motiondsgnbsb', 'motiondsgnbsb', 47300, 36, true, 'manual'),
    ('instagram', 'cofilms.ai', 'cofilms.ai', 56100, 19, true, 'manual'),
    ('instagram', 'jonattasalves', 'jonattasalves', 29200, 63, true, 'manual'),
    ('instagram', 'czar.ia007', 'czar.ia007', 34000, 42, true, 'manual'),
    ('instagram', 'thayse_drummer', 'thayse_drummer', 15800, 121, true, 'manual'),
    ('instagram', 'vepefilms', 'vepefilms', 40000, 51, true, 'manual'),
    ('instagram', 'pedrodtconti', 'pedrodtconti', 56800, 105, true, 'manual')
ON CONFLICT (platform, account_id) DO UPDATE SET
    followers = EXCLUDED.followers,
    posts_count = EXCLUDED.posts_count,
    is_watchlist = true;

