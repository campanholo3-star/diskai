-- ==============================================================================
-- Migração Supabase: viral_v3_format_seeds
-- Data: 2026-11-01
-- Versão do Motor: v3.1.0
-- Propósito:
--   1. Tabela viral_format_seeds (Sementes de Formatos Cinematográficos e Desafios de IA)
--   2. Tabela viral_query_stats (Estatísticas de Rendimento e Custo por Consulta)
--   3. Extensões em viral_accounts (creator_ai_score, creator_ai_cached_at, mentions_extracted)
--   4. Extensões em viral_posts (content_kind, format_key)
--   5. Atualização da Configuração Ativa viral_scoring_config para v3.1.0
-- ==============================================================================

-- 1. Tabela viral_format_seeds
CREATE TABLE IF NOT EXISTS public.viral_format_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  terms_by_lang jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_format_seeds_active ON public.viral_format_seeds(active);

ALTER TABLE public.viral_format_seeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viral_format_seeds_read_all" ON public.viral_format_seeds;
CREATE POLICY "viral_format_seeds_read_all" ON public.viral_format_seeds
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "viral_format_seeds_service_write" ON public.viral_format_seeds;
CREATE POLICY "viral_format_seeds_service_write" ON public.viral_format_seeds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Tabela viral_query_stats
CREATE TABLE IF NOT EXISTS public.viral_query_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_key text NOT NULL,
  format_key text REFERENCES public.viral_format_seeds(format_key) ON DELETE SET NULL,
  lane text NOT NULL DEFAULT 'recriar',
  items_passed_gates int NOT NULL DEFAULT 0,
  total_candidates int NOT NULL DEFAULT 0,
  total_cost_usd numeric(10, 4) NOT NULL DEFAULT 0.0000,
  yield_ratio numeric(10, 4) NOT NULL DEFAULT 0.0000,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_viral_query_stats_key UNIQUE(query_key, lane)
);

CREATE INDEX IF NOT EXISTS idx_viral_query_stats_lane ON public.viral_query_stats(lane, active);
CREATE INDEX IF NOT EXISTS idx_viral_query_stats_yield ON public.viral_query_stats(yield_ratio DESC);

ALTER TABLE public.viral_query_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viral_query_stats_read_all" ON public.viral_query_stats;
CREATE POLICY "viral_query_stats_read_all" ON public.viral_query_stats
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "viral_query_stats_service_write" ON public.viral_query_stats;
CREATE POLICY "viral_query_stats_service_write" ON public.viral_query_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Extensões em viral_accounts
ALTER TABLE public.viral_accounts
  ADD COLUMN IF NOT EXISTS creator_ai_score numeric(4, 2),
  ADD COLUMN IF NOT EXISTS creator_ai_cached_at timestamptz,
  ADD COLUMN IF NOT EXISTS mentions_extracted jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_viral_accounts_creator_ai ON public.viral_accounts(creator_ai_score DESC);

-- 4. Extensões em viral_posts
ALTER TABLE public.viral_posts
  ADD COLUMN IF NOT EXISTS content_kind text DEFAULT 'obra_ia',
  ADD COLUMN IF NOT EXISTS format_key text;

CREATE INDEX IF NOT EXISTS idx_viral_posts_content_kind ON public.viral_posts(content_kind);

-- 5. Seed das Sementes de Formatos Cinematográficos e Desafios de IA
INSERT INTO public.viral_format_seeds (format_key, name, description, terms_by_lang, active)
VALUES
  (
    'falso_trailer',
    'Falso Trailer / Cartaz de Filme',
    'Conceitos de filmes, teasers cinematográficos e cartazes hiper-realistas criados com IA',
    '{
      "pt": ["trailer falso ia", "falso trailer filme ia", "cartaz filme ia", "trailer cinematografico ia", "teaser filme ia", "cinema ia"],
      "en": ["fake movie trailer ai", "concept movie trailer ai", "fake poster ai", "ai cinematic trailer", "concept teaser ai", "ai movie trailer"],
      "es": ["trailer falso ia", "falso trailer pelicula ia", "poster pelicula ia", "trailer cinematografico ia", "teaser pelicula ia"]
    }'::jsonb,
    true
  ),
  (
    'satira_parodia',
    'Série de Sátira ou Paródia',
    'Humor gerado por IA, paródias culturais, esquetes e séries cômicas com dublagem sintetizada',
    '{
      "pt": ["parodia ia", "satira ia", "comedia gerada por ia", "humor ia", "sitcom ia", "esquete ia"],
      "en": ["ai parody", "ai satire", "ai comedy short", "ai sitcom", "humor generated ai", "ai funny sketch"],
      "es": ["parodia ia", "satira ia", "comedia ia", "humor con ia", "sitcom ia", "sketch ia"]
    }'::jsonb,
    true
  ),
  (
    'animais_falantes_3d',
    'Animais Falantes em 3D',
    'Bichos hiper-realistas ou estilizados com sincronia labial e animação corporal de IA',
    '{
      "pt": ["animais falantes 3d", "bichos falantes ia", "gato falando ia", "cachorro falante ia", "animais 3d realistas ia", "pet ia"],
      "en": ["talking animals 3d ai", "talking pets ai", "talking cat ai", "hyperrealistic animal 3d ai", "talking dog ai", "ai animal voice"],
      "es": ["animales parlantes 3d", "mascotas hablando ia", "gatos hablando ia", "perros hablando ia", "animales 3d ia"]
    }'::jsonb,
    true
  ),
  (
    'tributo_esportivo',
    'Homenagem ou Tributo Esportivo',
    'Vídeos cinematográficos de atletas históricos, jogadas lendárias recriadas e tributos a lendas do esporte',
    '{
      "pt": ["tributo futebol ia", "homenagem atleta ia", "copa do mundo ia", "futebol historico ia", "champions league ia", "lendas esporte ia"],
      "en": ["football tribute ai", "sports homage ai", "world cup history ai", "basketball legend ai", "sports cinematic ai", "soccer legend ai"],
      "es": ["homenaje futbol ia", "tributo deportivo ia", "futbol historico ia", "clasico mundial ia", "leyendas del deporte ia"]
    }'::jsonb,
    true
  ),
  (
    'propaganda_ficticia',
    'Propaganda ou Anúncio Fictício',
    'Comerciais especulativos hiper-produzidos com produtos imaginários ou marcas famosas geradas por IA',
    '{
      "pt": ["comercial ficticio ia", "propaganda ficticia ia", "anuncio comercial ia", "fake commercial ai", "publicidade ia", "spot ficticio ia"],
      "en": ["fake commercial ai", "spec commercial ai", "fake ad ai", "ai brand commercial", "spec ad ai", "spec fashion ad ai"],
      "es": ["comercial ficticio ia", "anuncio falso ia", "publicidad especulativa ia", "spot ficticio ia"]
    }'::jsonb,
    true
  ),
  (
    'e_se',
    '"E se..." (Cenários Alternativos)',
    'Histórias e mundos alternativos explorando premissas contrafactuais com visuais épicos de IA',
    '{
      "pt": ["e se ia", "e se o brasil ia", "e se a historia ia", "cenario alternativo ia", "e se acontecesse ia", "historia alternativa ia"],
      "en": ["what if ai", "what if scenario ai", "alternate history ai", "what if world ai", "what would happen if ai", "alternate reality ai"],
      "es": ["que pasaria si ia", "y si ia", "historia alternativa ia", "que tal si ia", "mundo alternativo ia"]
    }'::jsonb,
    true
  ),
  (
    'concursos_desafios',
    'Concursos e Desafios de IA',
    'Desafios de plataformas, festivais de curtas e competições abertas para criadores com IA',
    '{
      "pt": ["desafio capcut", "ai film awards brasil", "football challenge ia", "desafio de video ia", "concurso criadores ia", "festival curta ia"],
      "en": ["capcut challenge ai", "ai film festival", "ai video contest", "football challenge ai", "ai creators competition", "ai short challenge"],
      "es": ["desafio capcut", "festival cine ia", "concurso video ia", "challenge creadores ia", "desafio de video ia"]
    }'::jsonb,
    true
  )
ON CONFLICT (format_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  terms_by_lang = EXCLUDED.terms_by_lang,
  active = EXCLUDED.active,
  updated_at = now();

-- 6. Garantia de Unicidade Estrita da Configuração Ativa
-- Apenas uma linha pode ter active = true ao mesmo tempo (índice parcial único)
CREATE UNIQUE INDEX IF NOT EXISTS uq_viral_scoring_config_single_active 
ON public.viral_scoring_config (active) 
WHERE active = true;

-- 7. Aperto de Segurança RLS: tabelas de usuário e ledger restritas a autenticados
DROP POLICY IF EXISTS "Leitura de viral_favorites" ON public.viral_favorites;
CREATE POLICY "Leitura de viral_favorites" ON public.viral_favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Leitura de viral_feedback" ON public.viral_feedback;
CREATE POLICY "Leitura de viral_feedback" ON public.viral_feedback
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Leitura de viral_usage_ledger" ON public.viral_usage_ledger;
CREATE POLICY "Leitura de viral_usage_ledger" ON public.viral_usage_ledger
  FOR SELECT TO authenticated USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 8. Extensões de Colunas em viral_scoring_config para a v3.4.0
ALTER TABLE public.viral_scoring_config
  ADD COLUMN IF NOT EXISTS t1_weights jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS t1_thresholds jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consistency_subpoints jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consistency_percentiles jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS snowball_limits jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS apify_pricing jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS engagement_refs jsonb DEFAULT '{}'::jsonb;

-- 9. Nova Versão Ativa da Configuração viral_scoring_config (v3.4.0) Atômica
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.viral_scoring_config WHERE version = 'v3.4.0') THEN
    UPDATE public.viral_scoring_config SET active = false WHERE active = true;

    INSERT INTO public.viral_scoring_config (
      version,
      active,
      weights,
      thresholds,
      t1_weights,
      t1_thresholds,
      consistency_subpoints,
      consistency_percentiles,
      snowball_limits,
      apify_pricing,
      engagement_refs
    ) VALUES (
      'v3.4.0',
      true,
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
        "max_duration_minutes": 15,
        "velocity_floor": 100,
        "velocity_cap": 1000000,
        "velocity_floor_provisional": true,
        "velocity_cap_provisional": true
      }'::jsonb,
      '{
        "declared": 0.98,
        "tool": 0.55,
        "role": 0.35,
        "hashtag": 0.25,
        "penalty_tutorial": 0.40,
        "penalty_ad": 0.50
      }'::jsonb,
      '{
        "confirmed": 0.80,
        "probable": 0.60,
        "t2_min_prob": 0.20
      }'::jsonb,
      '{
        "cadence": 3,
        "traction": 4,
        "efficiency": 3
      }'::jsonb,
      '{
        "p25": 50,
        "p50": 100,
        "p75": 250
      }'::jsonb,
      '{
        "max_auto_accounts": 30,
        "prune_batch": 5,
        "t2_batch_size": 25
      }'::jsonb,
      '{
        "instagram-reel-scraper": { "unit_usd": 0.003, "source": "https://apify.com/apify/instagram-reel-scraper/pricing", "verified_at": null },
        "tiktok-scraper": { "unit_usd": 0.005, "source": "https://apify.com/clockworks/tiktok-scraper/pricing", "verified_at": null }
      }'::jsonb,
      '{
        "youtube": { "ref_low": 0.015, "ref_high": 0.06, "provisional": true },
        "instagram": { "ref_low": 0.02, "ref_high": 0.08, "provisional": true },
        "tiktok": { "ref_low": 0.03, "ref_high": 0.10, "provisional": true },
        "default": { "ref_low": 0.02, "ref_high": 0.08, "provisional": true }
      }'::jsonb
    );
  END IF;
END $$;

