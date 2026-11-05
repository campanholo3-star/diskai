/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Supabase Edge Function v3: scoringEngine.ts
// Motor Puro de Cálculo VVS2 v3 calibrado e configurável

export interface ScoreCriterionResult {
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

export interface ScoreBreakdownResult {
  total: number;
  tier: 'elite' | 'alto' | 'medio' | 'baixo';
  confidence: number;
  configVersion: string;
  gates: { id: string; label: string; passed: boolean; detail: string }[];
  criteria: ScoreCriterionResult[];
  tags: string[];
  reasonsUp: string[];
  reasonsDown: string[];
}

export interface CandidateForScoring {
  id: string;
  platform: string;
  views: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves?: number | null;
  publishedAt: string;
  durationSec: number | null;
  isLive?: boolean;
  author: {
    followersCount: number | null;
    handle: string;
  };
  accountProfile?: {
    medianViews?: number;
    posts30d?: number;
    followersPerPost?: number | null;
    postsCount?: number | null;
    sampledPostsCount?: number;
    recentPostsAbove2xFollowers?: number;
  };
  aiProbability: number;
  hookStrength?: number;             // 0 a 10
  narrativeOriginality?: number;     // 0 a 5
  recreatability?: number;          // 0 a 5
  hookPending?: boolean;
  snapshotViewsDiff?: number;
}

export interface ScoringConfigInput {
  id?: string;
  version?: string;
  weights?: {
    reach_vs_followers?: number;      // 15
    outlier_vs_median?: number;       // 15
    recency_and_velocity?: number;    // 25
    hook_and_idea?: number;           // 20
    engagement?: number;              // 15
    account_consistency?: number;     // 10
  };
  thresholds?: {
    min_views_normal?: number;        // 1000
    min_views_pautas?: number;        // 50
    max_age_shorts_hours?: number;    // 72
    max_age_youtube_hours?: number;   // 168
    max_age_pautas_hours?: number;    // 48
    ai_probability_gate?: number;     // 0.60
    max_duration_minutes?: number;    // 15
    velocity_cap?: number;            // 50000
  };
}

export interface ScoreComputationResult {
  score: number;
  breakdown: ScoreBreakdownResult;
  tier: 'elite' | 'alto' | 'medio' | 'baixo';
  confidenceRating: 'alta' | 'media' | 'estimada';
  passedGates: boolean;
  gateReasons: string[];
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Motor Puro de Pontuação VVS2 v3
 */
export function computeV3Score(
  candidate: CandidateForScoring,
  config?: ScoringConfigInput,
  options?: { ignoreAgeGate?: boolean; isCalibration?: boolean }
): ScoreComputationResult {
  const cfg = config || {};
  const weights = cfg.weights || {
    reach_vs_followers: 15,
    outlier_vs_median: 15,
    recency_and_velocity: 25,
    hook_and_idea: 20,
    engagement: 15,
    account_consistency: 10
  };
  const thresholds = cfg.thresholds || {
    min_views_normal: 1000,
    min_views_pautas: 50,
    max_age_shorts_hours: 72,
    max_age_youtube_hours: 168,
    max_age_pautas_hours: 48,
    ai_probability_gate: 0.60,
    max_duration_minutes: 15,
    velocity_cap: 50000
  };

  const gates: { id: string; label: string; passed: boolean; detail: string }[] = [];
  const criteria: ScoreCriterionResult[] = [];
  const reasonsUp: string[] = [];
  const reasonsDown: string[] = [];
  const tags: string[] = [];

  const now = Date.now();
  const pubTime = new Date(candidate.publishedAt).getTime();
  const ageHours = Math.max(0.1, (now - pubTime) / 3_600_000);

  // ─── 1. PORTÕES DE BLOQUEIO (GATES) ─────────────────────────────────────────

  // Gate 1: Probabilidade de IA
  const aiGateMin = thresholds.ai_probability_gate ?? 0.60;
  const aiPassed = candidate.aiProbability >= aiGateMin;
  gates.push({
    id: 'ai_probability',
    label: 'Filtro de Conteúdo Feito com IA',
    passed: aiPassed,
    detail: `Probabilidade detectada: ${(candidate.aiProbability * 100).toFixed(0)}% (mínimo exigido: ${(aiGateMin * 100).toFixed(0)}%)`
  });

  // Gate 2: Mínimo de Visualizações
  const minViews = candidate.platform === 'google_trends' || candidate.platform === 'news'
    ? (thresholds.min_views_pautas ?? 50)
    : (thresholds.min_views_normal ?? 1000);
  const viewsPassed = candidate.views >= minViews;
  gates.push({
    id: 'min_views',
    label: 'Visualizações Mínimas',
    passed: viewsPassed,
    detail: `${candidate.views.toLocaleString()} views (mínimo exigido: ${minViews.toLocaleString()})`
  });

  // Gate 3: Idade Máxima (aplicada apenas se não for calibração / ignoreAgeGate)
  let maxAge = 72;
  if (candidate.platform === 'youtube') maxAge = thresholds.max_age_youtube_hours ?? 168;
  else if (candidate.platform === 'google_trends' || candidate.platform === 'news') maxAge = thresholds.max_age_pautas_hours ?? 48;
  else maxAge = thresholds.max_age_shorts_hours ?? 72;

  const agePassed = options?.ignoreAgeGate || options?.isCalibration ? true : (ageHours <= maxAge);
  gates.push({
    id: 'max_age',
    label: 'Recência do Conteúdo',
    passed: agePassed,
    detail: `Publicado há ${ageHours.toFixed(1)}h (limite: ${maxAge}h)`
  });

  // Gate 4: Sem transmissões ao vivo (Lives)
  const livePassed = !candidate.isLive;
  gates.push({
    id: 'no_live',
    label: 'Formato Gravado (Sem Lives)',
    passed: livePassed,
    detail: candidate.isLive ? 'Transmissão ao vivo descartada' : 'Vídeo/Reel gravado'
  });

  // Gate 5: Duração Máxima (<= 15 minutos)
  const maxSec = (thresholds.max_duration_minutes ?? 15) * 60;
  const durationPassed = candidate.durationSec === null || candidate.durationSec <= maxSec;
  gates.push({
    id: 'max_duration',
    label: 'Duração Máxima',
    passed: durationPassed,
    detail: candidate.durationSec !== null ? `${Math.round(candidate.durationSec / 60)} min (máx: 15 min)` : 'Duração não informada'
  });

  const passedGates = gates.every(g => g.passed);
  const gateReasons = gates.filter(g => !g.passed).map(g => `${g.label}: ${g.detail}`);

  // ─── 2. CÁLCULO DOS 5 PILARES (SCORE V3) ────────────────────────────────────

  let availableWeight = 0;
  let totalScore = 0;

  // PILAR 1: ALCANCE RELATIVO (30 PONTOS BASE)
  // Subcritério 1.1: reach_vs_followers (15 pts base)
  // Subcritério 1.2: outlier_vs_median (15 pts base)
  const followers = Math.max(1000, candidate.author.followersCount || 1000);
  const reachRatio = candidate.views / followers;
  const sampledCount = candidate.accountProfile?.sampledPostsCount ?? 0;
  const medianViews = candidate.accountProfile?.medianViews ?? 0;
  const hasMedian = sampledCount >= 5 && medianViews > 0;

  let reachWeight = weights.reach_vs_followers ?? 15;
  let outlierWeight = weights.outlier_vs_median ?? 15;

  if (!hasMedian) {
    // Redistribui o peso da mediana para reach_vs_followers
    reachWeight += outlierWeight;
    outlierWeight = 0;
  }

  // Reach vs Followers: 15 (ou 30) * clamp(log10(views/max(1000, followers))/log10(100), 0, 1)
  const reachLog = reachRatio > 1 ? Math.log10(reachRatio) / 2 : (reachRatio >= 0.5 ? 0.2 : 0);
  const reachPoints = reachWeight * clamp(reachLog, 0, 1);
  totalScore += reachPoints;
  availableWeight += reachWeight;

  criteria.push({
    id: 'reach_vs_followers',
    pillar: 'reach',
    label: 'Alcance vs. Tamanho do Perfil',
    weight: reachWeight,
    points: Number(reachPoints.toFixed(1)),
    status: reachPoints >= reachWeight * 0.7 ? 'met' : reachPoints >= reachWeight * 0.3 ? 'partial' : 'missed',
    raw: Number(reachRatio.toFixed(2)),
    benchmark: 'views ÷ seguidores >= 100x para nota máxima',
    note: `${reachRatio.toFixed(1)}x o tamanho da conta`
  });

  if (reachRatio >= 10) {
    reasonsUp.push(`Vídeo atingiu ${reachRatio.toFixed(1)}x a base de seguidores (super alcance)`);
  } else if (reachRatio < 0.5) {
    reasonsDown.push(`Alcance inferior a 50% dos seguidores da própria conta`);
  }

  // Outlier vs Median
  if (hasMedian) {
    const outlierRatio = candidate.views / medianViews;
    // 15 * clamp(log2(views/mediana)/log2(10), 0, 1)
    const log2Outlier = outlierRatio > 1 ? Math.log2(outlierRatio) / Math.log2(10) : 0;
    const outlierPoints = outlierWeight * clamp(log2Outlier, 0, 1);
    totalScore += outlierPoints;
    availableWeight += outlierWeight;

    criteria.push({
      id: 'outlier_vs_median',
      pillar: 'reach',
      label: 'Performance vs. Mediana da Conta',
      weight: outlierWeight,
      points: Number(outlierPoints.toFixed(1)),
      status: outlierPoints >= outlierWeight * 0.7 ? 'met' : outlierPoints >= outlierWeight * 0.3 ? 'partial' : 'missed',
      raw: Number(outlierRatio.toFixed(2)),
      benchmark: '>= 10x a mediana histórica',
      note: `${outlierRatio.toFixed(1)}x a mediana dos posts anteriores`
    });

    if (outlierRatio >= 5) {
      reasonsUp.push(`Desempenho ${outlierRatio.toFixed(1)}x acima da média habitual do criador`);
    }
  } else {
    criteria.push({
      id: 'outlier_vs_median',
      pillar: 'reach',
      label: 'Performance vs. Mediana da Conta',
      weight: 0,
      points: 0,
      status: 'unavailable',
      raw: null,
      benchmark: 'Requer histórico de >= 5 posts',
      note: 'Peso de 15 pts transferido para Alcance vs. Seguidores'
    });
  }

  // PILAR 2: RECÊNCIA E VELOCIDADE (25 PONTOS)
  const velocityWeight = weights.recency_and_velocity ?? 25;
  availableWeight += velocityWeight;

  let velocity: number;
  if (candidate.snapshotViewsDiff && candidate.snapshotViewsDiff > 0) {
    velocity = candidate.snapshotViewsDiff;
  } else {
    // Especificação V3 oficial: decaimento sublinear com expoente 0.85 nas horas
    velocity = candidate.views / Math.pow(Math.max(1, ageHours), 0.85);
  }

  // Teto e piso de velocidade lidos da configuração (valores provisórios marcados provisional: true)
  const velocityFloor = thresholds.velocity_floor ?? 100;
  const velocityCap = thresholds.velocity_cap ?? 1000000;

  let velocityPoints = 0;
  if (velocity > 0) {
    const logV = Math.log10(Math.max(1, velocity));
    const logFloor = Math.log10(Math.max(1, velocityFloor));
    const logCap = Math.log10(Math.max(logFloor + 0.1, velocityCap));
    const ratio = (logV - logFloor) / (logCap - logFloor);
    velocityPoints = velocityWeight * clamp(ratio, 0, 1);
  }
  totalScore += velocityPoints;

  criteria.push({
    id: 'recency_and_velocity',
    pillar: 'velocity',
    label: 'Recência e Velocidade de Tração',
    weight: velocityWeight,
    points: Number(velocityPoints.toFixed(1)),
    status: velocityPoints >= velocityWeight * 0.7 ? 'met' : velocityPoints >= velocityWeight * 0.3 ? 'partial' : 'missed',
    raw: Math.round(velocity),
    benchmark: `Faixa provisória: ${velocityFloor.toLocaleString()} a ${velocityCap.toLocaleString()} views/h`,
    note: `Tração calculada: +${Math.round(velocity).toLocaleString()} views/h (provisório)`
  });

  if (ageHours <= 24 && candidate.views >= 50000) {
    reasonsUp.push(`Tração explosiva nas primeiras 24 horas`);
  }

  // PILAR 3: GANCHO E IDEIA (20 PONTOS)
  const hookWeight = weights.hook_and_idea ?? 20;
  availableWeight += hookWeight;

  let hookPoints = 10; // Neutro padrão se ainda não enriquecido por T2
  let hookStatus: 'met' | 'partial' | 'missed' | 'unavailable' = 'partial';
  let hookNote = 'Avaliação preliminar (T2 pendente)';

  if (!candidate.hookPending && candidate.hookStrength !== undefined) {
    // T2 executado: hookStrength (0-10, peso 10), narrativeOriginality (0-5, peso 5), recreatability (0-5, peso 5)
    const hStr = candidate.hookStrength ?? 7;
    const nOrig = candidate.narrativeOriginality ?? 3;
    const rCrea = candidate.recreatability ?? 4;

    const p1 = (hStr / 10) * 10;
    const p2 = (nOrig / 5) * 5;
    const p3 = (rCrea / 5) * 5;
    hookPoints = p1 + p2 + p3;
    hookStatus = hookPoints >= 15 ? 'met' : hookPoints >= 10 ? 'partial' : 'missed';
    hookNote = `Gancho: ${hStr}/10 | Originalidade: ${nOrig}/5 | Recriabilidade: ${rCrea}/5`;

    if (hStr >= 8) reasonsUp.push(`Gancho e premissa fortes identificados no título e legenda`);
    if (rCrea >= 4) reasonsUp.push(`Alta viabilidade prática de recriação com ferramentas de IA atuais`);
  } else {
    // Estimativa preliminar segura por T1
    hookPoints = 12;
    hookNote = 'Gancho preliminar estimado por heurística T1 (título e premissa)';
  }

  totalScore += hookPoints;
  criteria.push({
    id: 'hook_and_idea',
    pillar: 'hook',
    label: 'Força do Gancho e Potencial da Ideia',
    weight: hookWeight,
    points: Number(hookPoints.toFixed(1)),
    status: hookStatus,
    raw: candidate.hookStrength ?? null,
    benchmark: 'Gancho >= 8/10 e recriabilidade >= 4/5',
    note: hookNote
  });

  // PILAR 4: ENGAJAMENTO REAL (15 PONTOS)
  const engWeight = weights.engagement ?? 15;
  availableWeight += engWeight;

  // Média ponderada das taxas de interação disponíveis (sem divisor fixo):
  // Σ (peso × taxa) / Σ (pesos disponíveis)
  let sumWeightedRates = 0;
  let availableInteractionWeight = 0;

  if (typeof candidate.likes === 'number' && candidate.views > 0) {
    const likesRate = candidate.likes / candidate.views;
    sumWeightedRates += likesRate * 1;
    availableInteractionWeight += 1;
  }
  if (typeof candidate.comments === 'number' && candidate.views > 0) {
    const commentsRate = candidate.comments / candidate.views;
    sumWeightedRates += commentsRate * 4;
    availableInteractionWeight += 4;
  }
  if (typeof candidate.shares === 'number' && candidate.views > 0) {
    const sharesRate = candidate.shares / candidate.views;
    sumWeightedRates += sharesRate * 7;
    availableInteractionWeight += 7;
  }
  if (typeof candidate.saves === 'number' && candidate.views > 0) {
    const savesRate = candidate.saves / candidate.views;
    sumWeightedRates += savesRate * 5;
    availableInteractionWeight += 5;
  }

  // Referências por plataforma lidas da config (valores provisórios marcados provisional: true)
  const platformRefs = (cfg as any).engagement_refs?.[candidate.platform] ||
    (cfg as any).engagement_refs?.default ||
    { ref_low: 0.005, ref_high: 0.025, provisional: true };

  const refLow = platformRefs.ref_low ?? 0.005;
  const refHigh = platformRefs.ref_high ?? 0.025;

  let engPoints = 8;
  let engRate = 0;
  if (availableInteractionWeight > 0 && candidate.views > 0) {
    engRate = sumWeightedRates / availableInteractionWeight;

    if (engRate <= 0) {
      engPoints = 0;
    } else if (engRate <= refLow) {
      // Escala proporcional ao piso (até 35% da pontuação máxima)
      engPoints = engWeight * (engRate / refLow) * 0.35;
    } else if (engRate >= refHigh) {
      // Teto máximo de engajamento elite
      engPoints = engWeight;
    } else {
      // Escala logarítmica entre ref_low e ref_high
      const logRatio = (Math.log10(engRate) - Math.log10(refLow)) / (Math.log10(refHigh) - Math.log10(refLow));
      engPoints = engWeight * (0.35 + 0.65 * clamp(logRatio, 0, 1));
    }
  }

  totalScore += engPoints;
  criteria.push({
    id: 'engagement',
    pillar: 'engagement',
    label: 'Engajamento Real e Compartilhamentos',
    weight: engWeight,
    points: Number(engPoints.toFixed(1)),
    status: engPoints >= engWeight * 0.7 ? 'met' : engPoints >= engWeight * 0.3 ? 'partial' : 'missed',
    raw: Number((engRate * 100).toFixed(2)),
    benchmark: `Ref. provisória ${candidate.platform}: ${(refLow * 100).toFixed(1)}% a ${(refHigh * 100).toFixed(1)}%`,
    note: `${(engRate * 100).toFixed(2)}% taxa de interação ponderada ${candidate.shares === null ? '(sem penalidade por shares)' : ''}`
  });

  if (candidate.comments && candidate.views && (candidate.comments / candidate.views) >= 0.005) {
    reasonsUp.push(`Alta taxa de comentários e debate do público`);
  }

  // PILAR 5: CONSISTÊNCIA DA CONTA (10 PONTOS)
  const consWeight = weights.account_consistency ?? 10;
  availableWeight += consWeight;

  let consPoints = 0;
  const posts30d = candidate.accountProfile?.posts30d ?? 0;
  const recentAbove2x = candidate.accountProfile?.recentPostsAbove2xFollowers ?? 0;
  const followersPerPost = candidate.accountProfile?.followersPerPost ?? 0;

  const subpoints = (cfg as any).consistency_subpoints || { cadence: 3, traction: 4, efficiency: 3 };
  const percentiles = (cfg as any).consistency_percentiles || { p25: 50, p50: 100, p75: 250 };

  // 1. Cadência de postagem (subpoints.cadence pts, padrão 3)
  if (posts30d >= 4) {
    consPoints += subpoints.cadence ?? 3;
  } else if (posts30d >= 2) {
    consPoints += (subpoints.cadence ?? 3) * 0.5;
  }

  // 2. Tração consistente: histórico de posts furando a bolha (subpoints.traction pts, padrão 4)
  if (recentAbove2x >= 3 || (medianViews > 0 && medianViews >= followers)) {
    consPoints += subpoints.traction ?? 4;
  } else if (reachRatio >= 5) {
    consPoints += (subpoints.traction ?? 4) * 0.75; // Breakout relevante compensa histórico inicial
  }

  // 3. Eficiência de seguidores por post (subpoints.efficiency pts, padrão 3) calculada por percentis neutros
  if (followersPerPost >= (percentiles.p75 ?? 250)) {
    consPoints += subpoints.efficiency ?? 3;
  } else if (followersPerPost >= (percentiles.p50 ?? 100)) {
    consPoints += (subpoints.efficiency ?? 3) * 0.7;
  } else if (followersPerPost >= (percentiles.p25 ?? 50)) {
    consPoints += (subpoints.efficiency ?? 3) * 0.4;
  } else {
    consPoints += (subpoints.efficiency ?? 3) * 0.2;
  }

  consPoints = clamp(consPoints, 0, consWeight);
  totalScore += consPoints;

  criteria.push({
    id: 'account_consistency',
    pillar: 'account',
    label: 'Consistência e Histórico da Conta',
    weight: consWeight,
    points: Number(consPoints.toFixed(1)),
    status: consPoints >= 7 ? 'met' : consPoints >= 4 ? 'partial' : 'missed',
    raw: posts30d,
    benchmark: 'Cadência regular + histórico de furar a bolha',
    note: `${posts30d} posts em 30d | Freqüência consistente`
  });

  // ─── 3. RESUMO DO SCORE, TIER E CONFIANÇA ───────────────────────────────────

  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  let tier: 'elite' | 'alto' | 'medio' | 'baixo' = 'baixo';
  if (finalScore >= 85) tier = 'elite';
  else if (finalScore >= 70) tier = 'alto';
  else if (finalScore >= 50) tier = 'medio';

  const confidenceScore = availableWeight > 0 ? Number((availableWeight / 100).toFixed(2)) : 0.8;
  const confidenceRating: 'alta' | 'media' | 'estimada' =
    confidenceScore >= 0.90 ? 'alta' : confidenceScore >= 0.70 ? 'media' : 'estimada';

  // Tags informativas
  if (finalScore >= 80) tags.push('alta-viralidade');
  if (candidate.author.followersCount && candidate.author.followersCount <= 50000 && reachRatio >= 3) {
    tags.push('conta-emergente');
  }
  if (reachRatio >= 10 && medianViews < 3000) {
    tags.push('hit-isolado');
  }

  return {
    score: finalScore,
    tier,
    confidenceRating,
    passedGates,
    gateReasons,
    breakdown: {
      total: finalScore,
      tier,
      confidence: confidenceScore,
      configVersion: cfg.version || 'v3.0.0-calibrated',
      gates,
      criteria,
      tags,
      reasonsUp,
      reasonsDown
    }
  };
}

