// Script de Demonstração e Auditoria da Lógica V3.1.0 (Sem Chamadas de Rede)
import { test, describe } from 'node:test';
import assert from 'node:assert';

// ─── IMPLEMENTAÇÃO PURA DAS FUNÇÕES V3.1.0 (MÓDULOS aiDetector e scoringEngine) ─

const AI_TOOLS_MAP = {
  sora: "OpenAI Sora",
  kling: "Kuaishou Kling",
  veo: "Google Veo",
  runway: "Runway Gen-2/Gen-3",
  seedance: "Seedance AI",
  hailuo: "MiniMax Hailuo",
  pika: "Pika Labs",
  midjourney: "Midjourney",
  higgsfield: "Higgsfield AI",
  heygen: "HeyGen Avatar",
  elevenlabs: "ElevenLabs Voice",
  stablediffusion: "Stable Diffusion"
};

const AI_ROLE_KEYWORDS = [
  "ai artist", "ai creator", "ai filmmaker", "ai animator", "criador com ia",
  "diretor de ia", "ia generativa", "generative ai", "feito com ia", "made with ia",
  "ai generated", "ai clone", "inteligência artificial", "inteligencia artificial", "cpp"
];

const AI_HASHTAGS = [
  "#aivideo", "#aigenerated", "#sora", "#kling", "#veo", "#runwayml",
  "#feitocomia", "#ia", "#midjourney", "#lumaai", "#hailuoai", "#klingai"
];

const TUTORIAL_KEYWORDS = [
  "tutorial", "como fazer", "como usar", "como criar", "passo a passo", "aula", "curso",
  "dicas de", "dica de", "aprenda a", "prompt pack", "prompts gratis"
];

const NEWS_REVIEW_KEYWORDS = [
  "review", "analise", "análise", "noticia", "notícia", "novidade",
  "lancamento", "lançamento", "atualizacao", "atualização", "o que mudou", "comparativo"
];

const AD_KEYWORDS = [
  "#ad", "#sponsored", "patrocinado", "compre meu", "meu curso", "desconto", "cupom", "link na bio", "parceria paga"
];

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function detectT1AiSignals(text, isDeclaredSynthetic, platform = 'youtube', config = {}) {
  const weights = config.t1_weights || {
    declared: 0.98,
    tool: 0.55,
    role: 0.35,
    hashtag: 0.25,
    penalty_tutorial: 0.40
  };
  const thresholds = config.t1_thresholds || {
    confirmed: 0.80,
    probable: 0.60
  };

  const lower = (text || "").toLowerCase();
  const evidence = [];
  const positiveProbs = [];
  let toolGuess;
  let detectedKind = 'outro';

  if (isDeclaredSynthetic) {
    evidence.push({ type: 'declared', detail: 'Rótulo Oficial Declarado', weight: weights.declared });
    positiveProbs.push(weights.declared);
    detectedKind = 'obra_ia';
  }

  let hasTool = false;
  for (const [key, label] of Object.entries(AI_TOOLS_MAP)) {
    if (lower.includes(key)) {
      if (!toolGuess) toolGuess = label;
      evidence.push({ type: 'tool_keyword', detail: label, weight: weights.tool });
      positiveProbs.push(weights.tool);
      hasTool = true;
      break;
    }
  }

  let hasRole = false;
  for (const kw of AI_ROLE_KEYWORDS) {
    if (lower.includes(kw)) {
      evidence.push({ type: 'role_keyword', detail: kw, weight: weights.role });
      positiveProbs.push(weights.role);
      hasRole = true;
      break;
    }
  }

  let hasHashtag = false;
  for (const ht of AI_HASHTAGS) {
    if (lower.includes(ht)) {
      evidence.push({ type: 'hashtag', detail: ht, weight: weights.hashtag });
      positiveProbs.push(weights.hashtag);
      hasHashtag = true;
      break;
    }
  }

  let isTutorial = false;
  for (const tKw of TUTORIAL_KEYWORDS) {
    if (lower.includes(tKw)) {
      isTutorial = true;
      detectedKind = 'tutorial_ferramenta';
      evidence.push({ type: 'penalty_tutorial', detail: tKw, weight: weights.penalty_tutorial });
      break;
    }
  }

  let isNews = false;
  if (!isTutorial) {
    for (const nKw of NEWS_REVIEW_KEYWORDS) {
      if (lower.includes(nKw)) {
        isNews = true;
        detectedKind = 'review_noticia';
        evidence.push({ type: 'penalty_news', detail: nKw, weight: weights.penalty_tutorial });
        break;
      }
    }
  }

  let isAd = false;
  if (!isTutorial && !isNews) {
    for (const aKw of AD_KEYWORDS) {
      if (lower.includes(aKw)) {
        isAd = true;
        detectedKind = 'anuncio';
        evidence.push({ type: 'penalty_ad', detail: aKw, weight: 0.50 });
        break;
      }
    }
  }

  if (detectedKind === 'outro' && (hasTool || hasRole || hasHashtag)) {
    detectedKind = 'obra_ia';
  }

  let complementProduct = 1.0;
  for (const p of positiveProbs) {
    complementProduct *= (1 - p);
  }
  let finalProb = positiveProbs.length > 0 ? (1 - complementProduct) : 0.15;

  if (isTutorial || isNews || isAd) {
    finalProb = finalProb * (1 - weights.penalty_tutorial);
  }

  finalProb = Math.min(0.99, Math.max(0.05, Number(finalProb.toFixed(2))));

  let tier = 'baixa';
  if (isDeclaredSynthetic) {
    tier = 'confirmada';
  } else if (!isTutorial && !isNews && !isAd) {
    const independentEvidenceCount = (hasTool ? 1 : 0) + (hasRole ? 1 : 0) + (hasHashtag ? 1 : 0);
    if (independentEvidenceCount >= 2 && finalProb >= thresholds.probable) {
      tier = 'provavel';
    } else {
      tier = 'baixa';
    }
  } else {
    tier = 'baixa';
  }

  return { probability: finalProb, tier, contentKind: detectedKind, evidence, toolGuess };
}

function resolveFinalAiTier(t1, t2) {
  const hasDeclared = t1.evidence.some(e => e.type === 'declared');
  if (hasDeclared) {
    return { probability: 0.98, tier: 'confirmada', contentKind: 'obra_ia' };
  }

  let finalProb = t1.probability;
  let finalKind = t1.contentKind;

  if (t2) {
    if (t2.content_kind) finalKind = t2.content_kind;
    if (typeof t2.is_ai === 'number') {
      finalProb = Number(Math.max(finalProb, t2.is_ai).toFixed(2));
    }

    const t1Agrees = t1.evidence.some(e => ['tool_keyword', 'role_keyword', 'hashtag'].includes(e.type));
    if (t2.is_ai >= 0.80 && t1Agrees && finalKind === 'obra_ia') {
      return { probability: finalProb, tier: 'confirmada', contentKind: finalKind };
    }

    if (finalProb >= 0.60 && t2.is_ai >= 0.50 && finalKind === 'obra_ia') {
      return { probability: finalProb, tier: 'provavel', contentKind: finalKind };
    }
  }

  return {
    probability: finalProb,
    tier: t1.tier === 'provavel' && finalKind === 'obra_ia' ? 'provavel' : 'baixa',
    contentKind: finalKind
  };
}

function evaluateGates(candidate, config) {
  const thresholds = config.thresholds || {
    min_views_normal: 5000,
    max_age_shorts_hours: 72,
    max_age_youtube_hours: 168,
    max_duration_minutes: 15,
    ai_probability_gate: 0.60
  };

  const gates = [];

  // 1. Portão de IA
  const aiPassed = candidate.aiProbability >= thresholds.ai_probability_gate;
  gates.push({
    id: 'ai_probability',
    label: 'Certeza Mínima de Conteúdo de IA',
    passed: aiPassed,
    detail: `Probabilidade calculada ${(candidate.aiProbability * 100).toFixed(0)}% (exige >= 60%)`
  });

  // 2. Portão de Views Mínimas
  const viewsPassed = candidate.views >= thresholds.min_views_normal;
  gates.push({
    id: 'min_views',
    label: 'Visualizações Mínimas',
    passed: viewsPassed,
    detail: `${candidate.views.toLocaleString()} views (mínimo normal: ${thresholds.min_views_normal.toLocaleString()})`
  });

  // 3. Portão de Idade
  const maxHours = candidate.platform === 'youtube' && (candidate.durationSec || 0) > 60
    ? thresholds.max_age_youtube_hours
    : thresholds.max_age_shorts_hours;
  const agePassed = candidate.ageHours <= maxHours;
  gates.push({
    id: 'max_age',
    label: 'Janela Temporal / Recência',
    passed: agePassed,
    detail: `Publicado há ${Math.round(candidate.ageHours)}h (janela máxima: ${maxHours}h)`
  });

  // 4. Portão de Live
  const livePassed = !candidate.isLive;
  gates.push({
    id: 'no_live',
    label: 'Transmissão ao Vivo Bloqueada',
    passed: livePassed,
    detail: candidate.isLive ? 'Transmissão ao vivo descartada' : 'Vídeo gravado'
  });

  // 5. Portão de Duração Máxima
  const maxSec = thresholds.max_duration_minutes * 60;
  const durationPassed = candidate.durationSec === null || candidate.durationSec <= maxSec;
  gates.push({
    id: 'max_duration',
    label: 'Duração Máxima',
    passed: durationPassed,
    detail: candidate.durationSec ? `${Math.round(candidate.durationSec / 60)} min (máximo permitido: ${thresholds.max_duration_minutes} min)` : 'Duração não informada'
  });

  // 6. Portão de Tipo de Conteúdo (elimina anúncios e tutoriais da raia de obras)
  const isObra = candidate.contentKind === 'obra_ia';
  gates.push({
    id: 'content_kind',
    label: 'Tipo de Conteúdo Artístico (Obra de IA)',
    passed: isObra,
    detail: `Classificação: ${candidate.contentKind}`
  });

  return {
    passed: gates.every(g => g.passed),
    gates
  };
}

function computeScore(candidate, config) {
  const weights = config.weights || {
    reach_vs_followers: 15,
    outlier_vs_median: 15,
    recency_and_velocity: 25,
    hook_and_idea: 20,
    engagement: 15,
    account_consistency: 10
  };
  const thresholds = config.thresholds || { velocity_cap: 50000 };
  const subpoints = config.consistency_subpoints || { cadence: 3, traction: 4, efficiency: 3 };
  const percentiles = config.consistency_percentiles || { p25: 50, p50: 100, p75: 250 };

  const criteria = [];
  let totalScore = 0;

  // Pilar 1: Alcance (30 pts)
  const followers = Math.max(1000, candidate.author.followersCount || 1000);
  const reachRatio = candidate.views / followers;
  const medianViews = candidate.accountProfile?.medianViews || 0;
  const hasMedian = medianViews > 0;

  let reachWeight = weights.reach_vs_followers;
  let outlierWeight = weights.outlier_vs_median;
  if (!hasMedian) {
    reachWeight += outlierWeight;
    outlierWeight = 0;
  }

  const reachLog = reachRatio > 1 ? Math.log10(reachRatio) / 2 : (reachRatio >= 0.5 ? 0.2 : 0);
  const reachPoints = reachWeight * clamp(reachLog, 0, 1);
  totalScore += reachPoints;
  criteria.push({ id: 'reach', label: 'Alcance vs Seguidores', weight: reachWeight, points: Number(reachPoints.toFixed(1)) });

  let outlierPoints = 0;
  if (hasMedian) {
    const outlierRatio = candidate.views / medianViews;
    const logOutlier = outlierRatio > 1 ? Math.log2(outlierRatio) / Math.log2(10) : 0;
    outlierPoints = outlierWeight * clamp(logOutlier, 0, 1);
    totalScore += outlierPoints;
    criteria.push({ id: 'outlier', label: 'Performance vs Mediana', weight: outlierWeight, points: Number(outlierPoints.toFixed(1)) });
  }

  // Pilar 2: Recência & Velocidade (25 pts)
  const velocity = candidate.views / Math.pow(Math.max(1, candidate.ageHours), 0.85);
  const logVelocity = velocity > 1 ? Math.log10(velocity) / Math.log10(thresholds.velocity_cap) : 0;
  const velocityPoints = weights.recency_and_velocity * clamp(logVelocity, 0, 1);
  totalScore += velocityPoints;
  criteria.push({ id: 'velocity', label: 'Recência e Velocidade', weight: weights.recency_and_velocity, points: Number(velocityPoints.toFixed(1)) });

  // Pilar 3: Gancho e Ideia (20 pts)
  let hookPoints = 12;
  if (candidate.hookStrength !== undefined) {
    const p1 = (candidate.hookStrength / 10) * 10;
    const p2 = ((candidate.narrativeOriginality || 3) / 5) * 5;
    const p3 = ((candidate.recreatability || 4) / 5) * 5;
    hookPoints = p1 + p2 + p3;
  }
  totalScore += hookPoints;
  criteria.push({ id: 'hook', label: 'Gancho e Ideia', weight: weights.hook_and_idea, points: Number(hookPoints.toFixed(1)) });

  // Pilar 4: Engajamento Real (15 pts)
  let weightedInteractions = 0;
  let availableWeight = 0;
  if (candidate.likes !== null && candidate.likes !== undefined) {
    weightedInteractions += candidate.likes * 1;
    availableWeight += 1;
  }
  if (candidate.comments !== null && candidate.comments !== undefined) {
    weightedInteractions += candidate.comments * 4;
    availableWeight += 4;
  }
  if (candidate.shares !== null && candidate.shares !== undefined) {
    weightedInteractions += candidate.shares * 7;
    availableWeight += 7;
  }
  let engPoints = 8;
  if (availableWeight > 0 && candidate.views > 0) {
    const engRate = weightedInteractions / (availableWeight * candidate.views);
    engPoints = weights.engagement * clamp(engRate / 0.08, 0, 1);
  }
  totalScore += engPoints;
  criteria.push({ id: 'engagement', label: 'Engajamento Real', weight: weights.engagement, points: Number(engPoints.toFixed(1)) });

  // Pilar 5: Consistência da Conta (10 pts)
  let consPoints = 0;
  const posts30d = candidate.accountProfile?.posts30d || 0;
  const recentAbove2x = candidate.accountProfile?.recentPostsAbove2xFollowers || 0;
  const followersPerPost = candidate.accountProfile?.followersPerPost || 0;

  if (posts30d >= 4) consPoints += subpoints.cadence;
  else if (posts30d >= 2) consPoints += subpoints.cadence * 0.5;

  if (recentAbove2x >= 3 || (medianViews > 0 && medianViews >= followers)) {
    consPoints += subpoints.traction;
  } else if (reachRatio >= 5) {
    consPoints += subpoints.traction * 0.75;
  }

  if (followersPerPost >= percentiles.p75) consPoints += subpoints.efficiency;
  else if (followersPerPost >= percentiles.p50) consPoints += subpoints.efficiency * 0.7;
  else if (followersPerPost >= percentiles.p25) consPoints += subpoints.efficiency * 0.4;
  else consPoints += subpoints.efficiency * 0.2;

  totalScore += consPoints;
  criteria.push({ id: 'consistency', label: 'Consistência da Conta', weight: weights.account_consistency, points: Number(consPoints.toFixed(1)) });

  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));
  let tier = 'baixo';
  if (finalScore >= 85) tier = 'elite';
  else if (finalScore >= 70) tier = 'alto';
  else if (finalScore >= 50) tier = 'medio';

  return {
    score: finalScore,
    tier,
    criteria
  };
}

// ─── CONFIGURAÇÃO OFICIAL V3.1.0 ──────────────────────────────────────────

const CONFIG_V3_1 = {
  version: "v3.1.0",
  weights: {
    reach_vs_followers: 15,
    outlier_vs_median: 15,
    recency_and_velocity: 25,
    hook_and_idea: 20,
    engagement: 15,
    account_consistency: 10
  },
  thresholds: {
    min_views_normal: 5000,
    min_views_pautas: 50,
    max_age_shorts_hours: 72,
    max_age_youtube_hours: 168,
    max_duration_minutes: 15,
    ai_probability_gate: 0.60,
    velocity_cap: 50000
  },
  t1_weights: {
    declared: 0.98,
    tool: 0.55,
    role: 0.35,
    hashtag: 0.25,
    penalty_tutorial: 0.40
  },
  t1_thresholds: {
    confirmed: 0.80,
    probable: 0.60
  },
  consistency_subpoints: {
    cadence: 3,
    traction: 4,
    efficiency: 3
  },
  consistency_percentiles: {
    p25: 50,
    p50: 100,
    p75: 250
  }
};

describe('Demonstração dos 5 Exemplos Reais sem Rede (v3.1.0)', () => {

  test('Exemplo 1: Anúncio Patrocinado', () => {
    const rawText = "Novo software incrível para criadores #ad #sponsored confira o link na bio";
    const t1 = detectT1AiSignals(rawText, false, 'youtube', CONFIG_V3_1);

    const candidate = {
      id: 'ex-1',
      title: rawText,
      platform: 'youtube',
      views: 235000,
      likes: 9300,
      comments: 120,
      shares: null,
      ageHours: 28,
      durationSec: 239 * 60, // 239 minutos (excede o portão de 15 min)
      isLive: false,
      author: { followersCount: 1200000, handle: 'big_sponsor' },
      accountProfile: { medianViews: 200000, posts30d: 8, recentPostsAbove2xFollowers: 0, followersPerPost: 300 },
      aiProbability: t1.probability,
      aiTier: t1.tier,
      contentKind: t1.contentKind
    };

    const gateRes = evaluateGates(candidate, CONFIG_V3_1);
    const scoreRes = computeScore(candidate, CONFIG_V3_1);

    console.log('\n=== EXEMPLO 1: ANÚNCIO PATROCINADO ===');
    console.log(`Classificação T1: kind=${t1.contentKind} | tier=${t1.tier} | prob=${t1.probability}`);
    console.log(`Portões: Passou=${gateRes.passed}`);
    gateRes.gates.filter(g => !g.passed).forEach(g => console.log(`  ❌ Falhou em: ${g.label} (${g.detail})`));
    console.log(`Score Bruto: ${scoreRes.score} (${scoreRes.tier})`);

    assert.strictEqual(t1.contentKind, 'anuncio');
    assert.strictEqual(gateRes.passed, false, 'Deve falhar nos portões de duração e anúncio');
  });

  test('Exemplo 2: Tutorial de Midjourney', () => {
    const rawText = "Como usar o Midjourney para criar vídeos cinematográficos realistas passo a passo";
    const t1 = detectT1AiSignals(rawText, false, 'youtube', CONFIG_V3_1);

    const candidate = {
      id: 'ex-2',
      title: rawText,
      platform: 'youtube',
      views: 400000,
      likes: 24000,
      comments: 850,
      shares: null,
      ageHours: 48,
      durationSec: 12 * 60, // 12 minutos
      isLive: false,
      author: { followersCount: 300000, handle: 'canal_tutorial' },
      accountProfile: { medianViews: 80000, posts30d: 6, recentPostsAbove2xFollowers: 2, followersPerPost: 150 },
      aiProbability: t1.probability,
      aiTier: t1.tier,
      contentKind: t1.contentKind
    };

    const gateRes = evaluateGates(candidate, CONFIG_V3_1);
    const scoreRes = computeScore(candidate, CONFIG_V3_1);

    console.log('\n=== EXEMPLO 2: TUTORIAL DE MIDJOURNEY ===');
    console.log(`Classificação T1: kind=${t1.contentKind} | tier=${t1.tier} | prob=${t1.probability}`);
    console.log(`Portões: Passou=${gateRes.passed}`);
    gateRes.gates.filter(g => !g.passed).forEach(g => console.log(`  ❌ Falhou em: ${g.label} (${g.detail})`));
    console.log(`Score Bruto: ${scoreRes.score} (${scoreRes.tier})`);

    assert.strictEqual(t1.contentKind, 'tutorial_ferramenta');
    assert.strictEqual(gateRes.passed, false, 'Deve ser barrado pelo portão de obra_ia e probabilidade de IA');
  });

  test('Exemplo 3: Obra de IA Forte (Com T2 e Sem T2)', () => {
    const rawText = "Bio: AI Filmmaker | Curta épico no Kling #veo3 comente CURSO para bastidores";
    const t1 = detectT1AiSignals(rawText, false, 'instagram', CONFIG_V3_1);

    // 3.A: Com T2 Simulado (0.85)
    const t2A = { is_ai: 0.85, content_kind: 'obra_ia', hook_strength: 9, narrative_originality: 5, recreatability: 4 };
    const resolvedA = resolveFinalAiTier(t1, t2A);

    const candidateA = {
      id: 'ex-3a',
      title: rawText,
      platform: 'instagram',
      views: 5000000,
      likes: 200000, // 4%
      comments: 7500, // 0.15%
      shares: 45000,
      ageHours: 20,
      durationSec: 45,
      isLive: false,
      author: { followersCount: 10000, handle: 'ai_filmmaker' },
      accountProfile: { medianViews: 40000, posts30d: 8, recentPostsAbove2xFollowers: 4, followersPerPost: 212 },
      aiProbability: resolvedA.probability,
      aiTier: resolvedA.tier,
      contentKind: resolvedA.contentKind,
      hookStrength: 9,
      narrativeOriginality: 5,
      recreatability: 4
    };

    const gateA = evaluateGates(candidateA, CONFIG_V3_1);
    const scoreA = computeScore(candidateA, CONFIG_V3_1);

    console.log('\n=== EXEMPLO 3.A: OBRA DE IA FORTE (COM T2 = 0.85) ===');
    console.log(`Reconciliação: kind=${resolvedA.contentKind} | tier=${resolvedA.tier} | prob=${resolvedA.probability}`);
    console.log(`Portões: Passou=${gateA.passed}`);
    console.log(`Score Total: ${scoreA.score} (${scoreA.tier})`);
    scoreA.criteria.forEach(c => console.log(`  - ${c.label}: ${c.points}/${c.weight} pts`));

    assert.strictEqual(resolvedA.tier, 'confirmada');
    assert.strictEqual(gateA.passed, true);
    assert.ok(scoreA.score >= 80, `Deve atingir score alto (obteve ${scoreA.score})`);

    // 3.B: Sem T2 (apenas T1) — a palavra "CURSO" aciona rebaixamento ingênuo de T1 para tutorial
    const resolvedB = resolveFinalAiTier(t1, undefined);
    const candidateB = { ...candidateA, aiProbability: resolvedB.probability, aiTier: resolvedB.tier, contentKind: resolvedB.contentKind, hookStrength: undefined };
    const gateB = evaluateGates(candidateB, CONFIG_V3_1);
    const scoreB = computeScore(candidateB, CONFIG_V3_1);

    console.log('\n=== EXEMPLO 3.B: OBRA DE IA FORTE (SEM T2) ===');
    console.log(`Reconciliação T1: kind=${resolvedB.contentKind} | tier=${resolvedB.tier} | prob=${resolvedB.probability}`);
    console.log(`Portões: Passou=${gateB.passed}`);
    console.log(`Score Total: ${scoreB.score} (${scoreB.tier})`);

    assert.strictEqual(resolvedB.tier, 'baixa', 'Sem T2, termo "CURSO" no CTA induz rebaixamento no T1');
    assert.strictEqual(gateB.passed, false, 'Sem T2, cai no portão de obra_ia devido ao CTA');
  });

  test('Exemplo 4: Obra de IA Antiga', () => {
    const rawText = "Curta metragem de animação gerado no Sora #aivideo";
    const t1 = detectT1AiSignals(rawText, false, 'youtube', CONFIG_V3_1);

    const candidate = {
      id: 'ex-4',
      title: rawText,
      platform: 'youtube',
      views: 100000,
      likes: 6000,
      comments: 200,
      shares: null,
      ageHours: 8760, // 1 ano (8760 horas)
      durationSec: 60,
      isLive: false,
      author: { followersCount: 500000, handle: 'big_channel' },
      accountProfile: { medianViews: 80000, posts30d: 4, recentPostsAbove2xFollowers: 1, followersPerPost: 120 },
      aiProbability: t1.probability,
      aiTier: t1.tier,
      contentKind: t1.contentKind
    };

    const gateRes = evaluateGates(candidate, CONFIG_V3_1);
    const scoreRes = computeScore(candidate, CONFIG_V3_1);

    console.log('\n=== EXEMPLO 4: OBRA DE IA ANTIGA (1 ANO) ===');
    console.log(`Classificação T1: kind=${t1.contentKind} | tier=${t1.tier} | prob=${t1.probability}`);
    console.log(`Portões: Passou=${gateRes.passed}`);
    gateRes.gates.filter(g => !g.passed).forEach(g => console.log(`  ❌ Falhou em: ${g.label} (${g.detail})`));
    console.log(`Score Bruto: ${scoreRes.score} (${scoreRes.tier})`);

    assert.strictEqual(gateRes.passed, false, 'Deve falhar estritamente no portão de idade');
  });

  test('Exemplo 5: Conta Média com Consistência', () => {
    const rawText = "Cena cinematográfica surrealista produzida no Midjourney e Runway #aivideo";
    const t1 = detectT1AiSignals(rawText, false, 'instagram', CONFIG_V3_1);
    const t2 = { is_ai: 0.75, content_kind: 'obra_ia', hook_strength: 8, narrative_originality: 4, recreatability: 4 };
    const resolved = resolveFinalAiTier(t1, t2);

    const candidate = {
      id: 'ex-5',
      title: rawText,
      platform: 'instagram',
      views: 900000,
      likes: 45000,
      comments: 1100,
      shares: 6800,
      ageHours: 30,
      durationSec: 35,
      isLive: false,
      author: { followersCount: 80000, handle: 'consistent_creator' },
      accountProfile: { medianViews: 120000, posts30d: 6, recentPostsAbove2xFollowers: 3, followersPerPost: 163 },
      aiProbability: resolved.probability,
      aiTier: resolved.tier,
      contentKind: resolved.contentKind,
      hookStrength: 8,
      narrativeOriginality: 4,
      recreatability: 4
    };

    const gateRes = evaluateGates(candidate, CONFIG_V3_1);
    const scoreRes = computeScore(candidate, CONFIG_V3_1);

    console.log('\n=== EXEMPLO 5: CONTA MÉDIA COM CONSISTÊNCIA ===');
    console.log(`Reconciliação: kind=${resolved.contentKind} | tier=${resolved.tier} | prob=${resolved.probability}`);
    console.log(`Portões: Passou=${gateRes.passed}`);
    console.log(`Score Total: ${scoreRes.score} (${scoreRes.tier})`);
    scoreRes.criteria.forEach(c => console.log(`  - ${c.label}: ${c.points}/${c.weight} pts`));

    assert.strictEqual(resolved.tier, 'provavel');
    assert.strictEqual(gateRes.passed, true);
    assert.ok(scoreRes.score >= 70, `Deve pontuar alto por tração e consistência (obteve ${scoreRes.score})`);
  });
});
