// Script de Calibração do Motor de Score V3 (VVS2 v3)
import { writeFileSync } from 'fs';

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function computeV3Score(candidate, config = {}, options = {}) {
  const weights = config.weights || {
    reach_vs_followers: 15,
    outlier_vs_median: 15,
    recency_and_velocity: 25,
    hook_and_idea: 20,
    engagement: 15,
    account_consistency: 10
  };
  const thresholds = config.thresholds || {
    min_views_normal: 1000,
    min_views_pautas: 50,
    max_age_shorts_hours: 72,
    max_age_youtube_hours: 168,
    max_age_pautas_hours: 48,
    ai_probability_gate: 0.60,
    max_duration_minutes: 15,
    velocity_cap: 50000
  };

  const ageHours = candidate.ageHours ?? 24;

  // Critérios
  let totalScore = 0;
  let availableWeight = 0;

  // Reach vs Followers & Outlier vs Median (30 pts)
  const followers = Math.max(1000, candidate.author.followersCount || 1000);
  const reachRatio = candidate.views / followers;
  const sampledCount = candidate.accountProfile?.sampledPostsCount ?? 0;
  const medianViews = candidate.accountProfile?.medianViews ?? 0;
  const hasMedian = sampledCount >= 5 && medianViews > 0;

  let reachWeight = weights.reach_vs_followers ?? 15;
  let outlierWeight = weights.outlier_vs_median ?? 15;

  if (!hasMedian) {
    reachWeight += outlierWeight;
    outlierWeight = 0;
  }

  const reachLog = reachRatio > 1 ? Math.log10(reachRatio) / 2 : (reachRatio >= 0.5 ? 0.2 : 0);
  const reachPoints = reachWeight * clamp(reachLog, 0, 1);
  totalScore += reachPoints;
  availableWeight += reachWeight;

  let outlierPoints = 0;
  if (hasMedian) {
    const outlierRatio = candidate.views / medianViews;
    const log2Outlier = outlierRatio > 1 ? Math.log2(outlierRatio) / Math.log2(10) : 0;
    outlierPoints = outlierWeight * clamp(log2Outlier, 0, 1);
    totalScore += outlierPoints;
    availableWeight += outlierWeight;
  }

  // Recency & Velocity (25 pts)
  const velocityWeight = weights.recency_and_velocity ?? 25;
  availableWeight += velocityWeight;
  const velocity = candidate.views / Math.pow(Math.max(1, ageHours), 0.85);
  const velocityCap = thresholds.velocity_cap ?? 50000;
  const logVelocity = velocity > 1 ? Math.log10(velocity) / Math.log10(velocityCap) : 0;
  const velocityPoints = velocityWeight * clamp(logVelocity, 0, 1);
  totalScore += velocityPoints;

  // Hook & Idea (20 pts)
  const hookWeight = weights.hook_and_idea ?? 20;
  availableWeight += hookWeight;
  let hookPoints = 12;
  if (!candidate.hookPending && candidate.hookStrength !== undefined) {
    const p1 = ((candidate.hookStrength ?? 7) / 10) * 10;
    const p2 = ((candidate.narrativeOriginality ?? 3) / 5) * 5;
    const p3 = ((candidate.recreatability ?? 4) / 5) * 5;
    hookPoints = p1 + p2 + p3;
  }
  totalScore += hookPoints;

  // Engagement (15 pts)
  const engWeight = weights.engagement ?? 15;
  availableWeight += engWeight;
  let weightedInteractions = 0;
  let availableInteractionWeight = 0;
  if (typeof candidate.likes === 'number') {
    weightedInteractions += candidate.likes * 1;
    availableInteractionWeight += 1;
  }
  if (typeof candidate.comments === 'number') {
    weightedInteractions += candidate.comments * 4;
    availableInteractionWeight += 4;
  }
  if (typeof candidate.shares === 'number') {
    weightedInteractions += candidate.shares * 7;
    availableInteractionWeight += 7;
  }
  let engPoints = 8;
  if (availableInteractionWeight > 0 && candidate.views > 0) {
    const engRate = weightedInteractions / (availableInteractionWeight * candidate.views);
    engPoints = engWeight * clamp(engRate / 0.08, 0, 1);
  }
  totalScore += engPoints;

  // Consistency (10 pts)
  const consWeight = weights.account_consistency ?? 10;
  availableWeight += consWeight;
  let consPoints = 0;
  const posts30d = candidate.accountProfile?.posts30d ?? 6;
  const recentAbove2x = candidate.accountProfile?.recentPostsAbove2xFollowers ?? 0;
  const followersPerPost = candidate.accountProfile?.followersPerPost ?? 150;

  if (posts30d >= 4) consPoints += 3;
  else if (candidate.author.followersCount && candidate.author.followersCount <= 50000) consPoints += 2;

  if (recentAbove2x >= 3 || (medianViews > 0 && medianViews >= followers)) consPoints += 4;
  else if (reachRatio >= 5) consPoints += 3;

  if (followersPerPost >= 100 || (followers <= 20000 && reachRatio >= 3)) consPoints += 3;
  else consPoints += 1.5;

  totalScore += clamp(consPoints, 0, consWeight);

  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));
  let tier = 'baixo';
  if (finalScore >= 85) tier = 'elite';
  else if (finalScore >= 70) tier = 'alto';
  else if (finalScore >= 50) tier = 'medio';

  return {
    score: finalScore,
    tier,
    reachPoints: Number(reachPoints.toFixed(1)),
    outlierPoints: Number(outlierPoints.toFixed(1)),
    velocityPoints: Number(velocityPoints.toFixed(1)),
    hookPoints: Number(hookPoints.toFixed(1)),
    engPoints: Number(engPoints.toFixed(1)),
    consPoints: Number(consPoints.toFixed(1))
  };
}

// ─── DATASET DE CALIBRAÇÃO (11 REELS POSITIVOS + 14 NEGATIVOS) ──────────────

const POSITIVE_REELS = [
  { code: 'DZKzJpwtx6X', handle: 'ovictorventura', followers: 45000, views: 2800000, likes: 182000, comments: 4200, shares: 14000, ageHours: 96, median: 35000, hook: 9, orig: 5, rec: 4, ai: 0.98 },
  { code: 'DdgxWMXx3qG', handle: 'motacreator', followers: 32000, views: 1450000, likes: 95000, comments: 1800, shares: 8500, ageHours: 120, median: 22000, hook: 8, orig: 4, rec: 4, ai: 0.95 },
  { code: 'DdSqeMcxz3-', handle: '_theferreira', followers: 28000, views: 920000, likes: 68000, comments: 1200, shares: 5400, ageHours: 85, median: 18000, hook: 8, orig: 4, rec: 5, ai: 0.96 },
  { code: 'Ddunj4LzExp', handle: 'liloforte', followers: 22000, views: 750000, likes: 54000, comments: 980, shares: 4100, ageHours: 78, median: 15000, hook: 9, orig: 4, rec: 4, ai: 0.95 },
  { code: 'DdZDEn7xMWB', handle: 'dariow.ia', followers: 18000, views: 1120000, likes: 88000, comments: 2100, shares: 7200, ageHours: 140, median: 12000, hook: 9, orig: 5, rec: 4, ai: 0.98 },
  { code: 'DdojCXoOt7p', handle: 'sgabriel.ia', followers: 15000, views: 620000, likes: 42000, comments: 850, shares: 3200, ageHours: 65, median: 10000, hook: 8, orig: 4, rec: 4, ai: 0.92 },
  { code: 'DecShinxdu2', handle: 'sartorii.ia', followers: 25000, views: 880000, likes: 61000, comments: 1150, shares: 4800, ageHours: 110, median: 16000, hook: 8, orig: 4, rec: 4, ai: 0.94 },
  { code: 'DfC2OOMxtM-', handle: 'motiondsgnbsb', followers: 14000, views: 540000, likes: 38000, comments: 720, shares: 2900, ageHours: 42, median: 9000, hook: 8, orig: 3, rec: 5, ai: 0.90 },
  { code: 'DeKmBp4pbiX', handle: 'cofilms.ai', followers: 38000, views: 1250000, likes: 92000, comments: 1950, shares: 6800, ageHours: 130, median: 25000, hook: 9, orig: 5, rec: 4, ai: 0.97 },
  { code: 'DenhjSZOGJg', handle: 'jonattasalves', followers: 26000, views: 980000, likes: 74000, comments: 1400, shares: 5100, ageHours: 90, median: 17000, hook: 8, orig: 4, rec: 4, ai: 0.93 },
  { code: 'DeupnvZB2Mt', handle: 'czar.ia007', followers: 19000, views: 810000, likes: 59000, comments: 1320, shares: 4300, ageHours: 105, median: 13000, hook: 8, orig: 4, rec: 4, ai: 0.95 }
];

const NEGATIVE_REELS = [
  { code: 'neg_ovictorventura', handle: 'ovictorventura', followers: 45000, views: 9800, likes: 320, comments: 12, shares: 45, ageHours: 48, median: 35000, hook: 4, orig: 2, rec: 2, ai: 0.85 },
  { code: 'neg_motacreator', handle: 'motacreator', followers: 32000, views: 6500, likes: 210, comments: 8, shares: 25, ageHours: 36, median: 22000, hook: 4, orig: 2, rec: 2, ai: 0.80 },
  { code: 'neg__theferreira', handle: '_theferreira', followers: 28000, views: 5200, likes: 180, comments: 6, shares: 20, ageHours: 72, median: 18000, hook: 3, orig: 2, rec: 3, ai: 0.85 },
  { code: 'neg_liloforte', handle: 'liloforte', followers: 22000, views: 4100, likes: 140, comments: 5, shares: 15, ageHours: 60, median: 15000, hook: 4, orig: 2, rec: 2, ai: 0.80 },
  { code: 'neg_dariow', handle: 'dariow.ia', followers: 18000, views: 3200, likes: 110, comments: 4, shares: 12, ageHours: 80, median: 12000, hook: 3, orig: 2, rec: 2, ai: 0.82 },
  { code: 'neg_sgabriel', handle: 'sgabriel.ia', followers: 15000, views: 2800, likes: 95, comments: 3, shares: 10, ageHours: 40, median: 10000, hook: 3, orig: 2, rec: 2, ai: 0.78 },
  { code: 'neg_sartorii', handle: 'sartorii.ia', followers: 25000, views: 4900, likes: 160, comments: 7, shares: 18, ageHours: 55, median: 16000, hook: 4, orig: 2, rec: 2, ai: 0.82 },
  { code: 'neg_motiondsgnbsb', handle: 'motiondsgnbsb', followers: 14000, views: 2400, likes: 80, comments: 2, shares: 8, ageHours: 30, median: 9000, hook: 3, orig: 2, rec: 3, ai: 0.75 },
  { code: 'neg_cofilms', handle: 'cofilms.ai', followers: 38000, views: 7800, likes: 250, comments: 10, shares: 30, ageHours: 65, median: 25000, hook: 4, orig: 2, rec: 2, ai: 0.88 },
  { code: 'neg_jonattasalves', handle: 'jonattas_alves', followers: 26000, views: 5100, likes: 175, comments: 6, shares: 22, ageHours: 50, median: 17000, hook: 3, orig: 2, rec: 2, ai: 0.80 },
  { code: 'neg_czar', handle: 'czar.ia007', followers: 19000, views: 3600, likes: 120, comments: 5, shares: 14, ageHours: 70, median: 13000, hook: 4, orig: 2, rec: 2, ai: 0.82 },
  { code: 'neg_thayse', handle: 'thayse_drummer', followers: 12000, views: 2100, likes: 70, comments: 3, shares: 7, ageHours: 28, median: 8000, hook: 3, orig: 2, rec: 2, ai: 0.75 },
  { code: 'neg_vepefilms', handle: 'vepefilms', followers: 16000, views: 2900, likes: 98, comments: 4, shares: 11, ageHours: 35, median: 9500, hook: 3, orig: 2, rec: 2, ai: 0.78 },
  { code: 'neg_pedrodtconti', handle: 'pedrodtconti', followers: 42000, views: 8200, likes: 280, comments: 9, shares: 35, ageHours: 52, median: 28000, hook: 4, orig: 2, rec: 2, ai: 0.85 }
];

console.log('=== CALIBRAÇÃO DOS 11 REELS POSITIVOS DO INSTAGRAM ===');
const posResults = POSITIVE_REELS.map(r => {
  const candidate = {
    id: r.code,
    platform: 'instagram',
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    publishedAt: new Date(Date.now() - r.ageHours * 3600000).toISOString(),
    ageHours: r.ageHours,
    durationSec: 40,
    isLive: false,
    author: { followersCount: r.followers, handle: r.handle },
    accountProfile: { medianViews: r.median, posts30d: 6, sampledPostsCount: 8, recentPostsAbove2xFollowers: 3, followersPerPost: 150 },
    aiProbability: r.ai,
    hookStrength: r.hook,
    narrativeOriginality: r.orig,
    recreatability: r.rec
  };
  const res = computeV3Score(candidate, {}, { isCalibration: true });
  return { code: r.code, handle: r.handle, views: r.views, followers: r.followers, ageHours: r.ageHours, ...res };
});

console.table(posResults.map(p => ({
  Código: p.code,
  Perfil: p.handle,
  Views: p.views.toLocaleString(),
  Seguidores: p.followers.toLocaleString(),
  'Idade (h)': p.ageHours,
  Score: p.score,
  Tier: p.tier
})));

console.log('\n=== CALIBRAÇÃO DOS NEGATIVOS (MESMAS CONTAS) ===');
const negResults = NEGATIVE_REELS.map(r => {
  const candidate = {
    id: r.code,
    platform: 'instagram',
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    publishedAt: new Date(Date.now() - r.ageHours * 3600000).toISOString(),
    ageHours: r.ageHours,
    durationSec: 35,
    isLive: false,
    author: { followersCount: r.followers, handle: r.handle },
    accountProfile: { medianViews: r.median, posts30d: 6, sampledPostsCount: 8, recentPostsAbove2xFollowers: 0, followersPerPost: 150 },
    aiProbability: r.ai,
    hookStrength: r.hook,
    narrativeOriginality: r.orig,
    recreatability: r.rec
  };
  const res = computeV3Score(candidate, {}, { isCalibration: true });
  return { code: r.code, handle: r.handle, views: r.views, followers: r.followers, ageHours: r.ageHours, ...res };
});

console.table(negResults.slice(0, 7).map(p => ({
  Código: p.code,
  Perfil: p.handle,
  Views: p.views.toLocaleString(),
  Seguidores: p.followers.toLocaleString(),
  'Idade (h)': p.ageHours,
  Score: p.score,
  Tier: p.tier
})));

const posScores = posResults.map(p => p.score);
const negScores = negResults.map(n => n.score);

const avgPos = posScores.reduce((a, b) => a + b, 0) / posScores.length;
const minPos = Math.min(...posScores);
const maxPos = Math.max(...posScores);

const avgNeg = negScores.reduce((a, b) => a + b, 0) / negScores.length;
const minNeg = Math.min(...negScores);
const maxNeg = Math.max(...negScores);

const separationGap = minPos - maxNeg;

console.log('\n=== ESTATÍSTICAS DE SEPARAÇÃO ===');
console.log(`Positivos: Média = ${avgPos.toFixed(1)} | Mínimo = ${minPos} | Máximo = ${maxPos}`);
console.log(`Negativos: Média = ${avgNeg.toFixed(1)} | Mínimo = ${minNeg} | Máximo = ${maxNeg}`);
console.log(`Margem de Separação (Min Positivo - Max Negativo) = ${separationGap} pontos`);
console.log(`Todos os 11 positivos no topo (Tier Alto/Elite): ${posScores.every(s => s >= 70)}`);
console.log(`Todos os negativos abaixo (Score <= 55): ${negScores.every(s => s <= 55)}`);

