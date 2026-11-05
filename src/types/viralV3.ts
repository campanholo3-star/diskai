/**
 * Tipos Oficiais do Sistema de Descoberta e Análise Viral (v3 Consolidada)
 */

export interface ScoreCriterion {
  id: string;
  pillar: 'reach' | 'velocity' | 'hook' | 'engagement' | 'account';
  label: string;
  weight: number;
  points: number;
  status: 'met' | 'partial' | 'missed' | 'unavailable';
  raw: number | string | null;
  benchmark?: string;
  note?: string;
}

export interface ScoreBreakdown {
  total: number;
  tier: 'elite' | 'alto' | 'medio' | 'baixo';
  confidence: number;
  configVersion: string;
  gates: { id: string; label: string; passed: boolean; detail: string }[];
  criteria: ScoreCriterion[];
  tags: string[];
  reasonsUp: string[];
  reasonsDown: string[];
}

export interface ScoreConfig {
  id: string;
  version: string;
  active: boolean;
  notes?: string;
  weights: {
    reach_vs_followers: number;      // 15
    outlier_vs_median: number;        // 15
    recency_and_velocity: number;     // 25
    hook_and_idea: number;            // 20
    engagement: number;               // 15
    account_consistency: number;      // 10
  };
  thresholds: {
    min_views_normal: number;         // 5000
    min_views_pautas: number;         // 50
    max_age_shorts_hours: number;     // 72
    max_age_youtube_hours: number;    // 168 (7 dias)
    max_age_pautas_hours: number;     // 48
    ai_probability_gate: number;      // 0.60
    max_duration_minutes: number;     // 15
  };
  budgets: {
    apify_usd_daily: number;          // 0.16
    youtube_daily_units: number;      // 8000
    cache_ttl_minutes: number;        // 45
  };
}

export interface BudgetStatus {
  date: string;
  apify: {
    usedUsd: number;
    maxUsd: number;
    remainingUsd: number;
    isExhausted: boolean;
  };
  youtube: {
    usedUnits: number;
    maxUnits: number;
    remainingUnits: number;
    isExhausted: boolean;
  };
  mode: 'leve' | 'profundo';
  cacheHit?: boolean;
}

export interface ViralApiResponseV3 {
  success: boolean;
  total: number;
  videos: ViralVideoItemV3[];
  topics?: ViralTopicItem[];
  highViralAlertCount: number;
  source: 'edge_function' | 'demo' | 'empty';
  cachedAt: string;
  savedToSupabase: boolean;
  newlyFetchedCount: number;
  budgetStatus?: BudgetStatus;
  errors?: string[];
  rawError?: string;
}

export interface ViralTopicItem {
  id: string;
  topic: string;
  translatedHeadline?: string;
  geo: string;
  trendVolume: number;
  trendGrowth: number;
  firstSeen: string;
  verified: boolean;
  opportunityType: 'antes_da_onda' | 'onda_subindo' | 'saturada';
  sources: Array<{ name: string; url: string; publishedAt?: string }>;
  suggestedAngles?: string[];
  legalRiskScore?: number;
  visualHookIdea?: string;
  humorAngle?: string;
  replicabilityScore?: number;
}

export interface ViralVideoItemV3 {
  id: string;
  postId: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'x' | 'google_trends' | 'reddit' | 'news';
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationFormatted: string;
  durationSec: number | null;
  publishedAt: string;
  publishedAtFormatted: string; // "29/10/2026, 14:32 (há 4 h)"
  author: {
    name: string;
    handle: string;
    avatarUrl: string;
    followersFormatted: string;
    followersCount: number | null;
    verified?: boolean;
    postsCount?: number;
    isEmerging?: boolean;
  };
  region: string;
  niche: string;
  lane: 'recriar' | 'pautas' | 'formatos';
  stats: {
    viewsFormatted: string;
    viewsCount: number;
    likesFormatted: string;
    likesCount: number | null;
    sharesFormatted: string;
    sharesCount: number | null;
    commentsFormatted: string;
    commentsCount: number | null;
  };
  score: number;
  scoreBreakdown: ScoreBreakdown;
  aiProbability: number;
  aiTier: 'confirmada' | 'provavel' | 'baixa';
  aiEvidence: Array<{ type: string; detail: string; weight: number }>;
  toolGuess?: string;
  aiVideoScriptIdea?: {
    hook: string;
    hookPt?: string;
    hookOriginal?: string;
    hookWhy?: string;
    scenes: string[];
    narration: string;
    narrationPt?: string;
  };
  accountTags?: string[];
  isAiGenerated?: boolean;
  isTrendAlert: boolean;
  isFresh?: boolean;
  isDemo?: boolean;
  contentKind?: 'obra_ia' | 'tutorial_ferramenta' | 'review_noticia' | 'anuncio' | 'outro';
  formatKey?: string;
}

