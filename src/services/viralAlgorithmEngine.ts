/**
 * Motor Matemático do Algoritmo VVS2 (Viral Video Scoring v2)
 *
 * Implementa o pipeline estrito de cálculo de potencial viral:
 * 1. Qualidade de Engajamento por Taxas (Q e Q_z) com Z-score e clamp [-0.8, 4.0]
 * 2. Momentum Real (M) por aceleração de visualizações/hora vs curva de decaimento
 * 3. Anomalia do Criador (Os_mult) com log2 e teto [0.3, 6.0]
 * 4. Janela de Oportunidade (J) e Lead-Lag Geográfico (L)
 * 5. Normalização do Score (0 a 100), Validação de Portões e Classificação
 */

export type ViralClassification = 'HIGH_VIRAL' | 'MEDIUM_POTENTIAL' | 'LOW_POTENTIAL';

export interface RawEngagementMetrics {
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  publishedAt: string | Date | number;
  creatorAverageViews?: number;
  creatorFollowers?: number;
  targetRegion?: string;
  sourceRegion?: string;
}

export interface GateValidation {
  hasCriticalMass: boolean;      // views >= 15.000
  isAnomalyPassed: boolean;      // Os >= 2.5x (ou Os_mult >= 2.3)
  isHighShareRate: boolean;      // share_rate >= 1.5% ou comment_rate >= 2%
  isWindowOpen: boolean;         // Janela restante >= 8h
  passedAllGates: boolean;
}

export interface VVS2CalculationResult {
  score: number;                         // 0 - 100
  classification: ViralClassification;
  label: 'Viral / Atacar Agora' | 'Médio Potencial / Validado' | 'Baixo Potencial / Observar';
  variant: 'high' | 'medium' | 'low';
  triggerAlert: boolean;                 // score >= 80

  // Métricas intermediárias calculadas
  rates: {
    likeRate: number;      // likes / views (%)
    commentRate: number;   // comments / views (%)
    shareRate: number;     // shares / views (%)
    saveRate: number;      // saves / views (%)
  };

  qualityScore: number;    // Q
  qualityZScore: number;   // Q_z clampado [-0.8, 4.0]
  momentumScore: number;   // M (0 - 100)
  viewsPerHour: number;
  anomalyRatio: number;    // Os
  anomalyMultiplier: number; // Os_mult [0.3, 6.0]
  leadLagBonus: number;    // L [1.0, 1.25]
  windowRemainingHours: number; // J (horas)

  gates: GateValidation;
}

/**
 * Função utilitária de clamp numérico
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calcula a qualidade de engajamento baseada em taxas ponderadas e normalização Z-score.
 * Pesos padrão: 8 * share_rate + 6 * save_rate + 5 * comment_rate + 2 * like_rate
 * Fallback: 8 * comment_rate + 2 * like_rate (quando shares/saves não são informados)
 */
export function calculateEngagementQuality(rates: {
  shareRate: number;
  saveRate: number;
  commentRate: number;
  likeRate: number;
  hasSharesData: boolean;
}): { Q: number; Q_z: number } {
  let Q = 0;

  if (rates.hasSharesData) {
    Q =
      8 * rates.shareRate +
      6 * rates.saveRate +
      5 * rates.commentRate +
      2 * rates.likeRate;
  } else {
    // Fallback inteligente para plataformas que não reportam shares/saves diretamente
    Q = 8 * rates.commentRate + 2 * rates.likeRate;
  }

  // Normalização Z-score com média baseline = 0.045 e desvio padrão = 0.032
  const muQ = rates.hasSharesData ? 0.048 : 0.025;
  const sigmaQ = rates.hasSharesData ? 0.035 : 0.02;
  const rawZ = (Q - muQ) / sigmaQ;

  // Clamp estrito do Z-score conforme especificação VVS2 [-0.8, 4.0]
  const Q_z = clamp(rawZ, -0.8, 4.0);

  return { Q, Q_z };
}

/**
 * Calcula o Momentum real (M) baseado na velocidade de views por hora comparada
 * à curva esperada de vida do vídeo.
 */
export function calculateRealMomentum(
  views: number,
  publishedAt: string | Date | number,
  snapshotDiffPerHour?: number
): { momentumScore: number; viewsPerHour: number; hoursSincePublished: number } {
  const publishedTime =
    typeof publishedAt === 'number'
      ? publishedAt
      : new Date(publishedAt).getTime();

  const now = Date.now();
  const hoursSincePublished = Math.max(0.5, (now - publishedTime) / (1000 * 60 * 60));

  // Velocidade média ou diferença entre snapshots
  const viewsPerHour = snapshotDiffPerHour !== undefined && snapshotDiffPerHour > 0
    ? snapshotDiffPerHour
    : Math.round(views / hoursSincePublished);

  // Curva de decaimento esperado conforme idade do vídeo
  // Vídeos muito novos (< 12h) precisam de velocidade proporcionalmente maior para provar tração
  const ageFactor = Math.min(2.5, Math.pow(hoursSincePublished / 24, 0.4));
  const expectedBaselinePerHour = Math.max(250, 1500 / ageFactor);

  // Razão de velocidade em relação à curva esperada
  const momentumRatio = viewsPerHour / expectedBaselinePerHour;

  // Escala de Momentum de 0 a 100 com crescimento sigmoidal suavizado
  const momentumScore = clamp(
    Math.round(100 / (1 + Math.exp(-0.8 * (momentumRatio - 2.5)))),
    5,
    100
  );

  return { momentumScore, viewsPerHour, hoursSincePublished };
}

/**
 * Calcula a anomalia do criador (Os e Os_mult):
 * Razão entre views atuais e média do criador, com clamp [0.3, 6.0]
 * Os_mult = clamp(1 + log2(Os), 0.3, 6.0)
 */
export function calculateCreatorAnomaly(
  views: number,
  creatorAverageViews?: number,
  creatorFollowers?: number
): { anomalyRatio: number; anomalyMultiplier: number } {
  // Baseline do criador com fallback gradual para seguidores ou valor seguro
  const baseline = Math.max(
    150,
    creatorAverageViews && creatorAverageViews > 0
      ? creatorAverageViews
      : creatorFollowers && creatorFollowers > 0
      ? creatorFollowers * 0.08
      : 1200
  );

  const anomalyRatio = Number((views / baseline).toFixed(2));

  // Fórmula logarítmica com piso 0.3 e teto 6.0
  const rawMult = 1 + Math.log2(Math.max(0.08, anomalyRatio));
  const anomalyMultiplier = Number(clamp(rawMult, 0.3, 6.0).toFixed(2));

  return { anomalyRatio, anomalyMultiplier };
}

/**
 * Estima a Janela de Oportunidade (J) e o Lead-Lag Geográfico (L)
 */
export function calculateWindowAndLeadLag(
  hoursSincePublished: number,
  sourceRegion?: string,
  targetRegion: string = 'brasil'
): { windowRemainingHours: number; leadLagBonus: number } {
  // Meia-vida estimada de uma tendência viral curta: ~72 horas
  const estimatedLifespanHours = 72;
  const windowRemainingHours = Math.max(
    2,
    Math.round(estimatedLifespanHours - hoursSincePublished)
  );

  // Lead-Lag Geográfico: se a tendência está acontecendo em polos globais
  // (EUA, Europa ou Ásia) antes de saturar no Brasil, há um bônus de arbitragem
  let leadLagBonus = 1.0;
  const isGlobalSource = sourceRegion && ['eua', 'europa', 'asia', 'global'].includes(sourceRegion.toLowerCase());
  const isTargetingBrazil = targetRegion.toLowerCase() === 'brasil' || targetRegion.toLowerCase() === 'all';

  if (isGlobalSource && isTargetingBrazil) {
    if (hoursSincePublished <= 36) {
      leadLagBonus = 1.25; // 25% de antecedência estratégica
    } else if (hoursSincePublished <= 60) {
      leadLagBonus = 1.15; // 15% de antecedência
    }
  }

  return { windowRemainingHours, leadLagBonus };
}

/**
 * Pipeline Central do Algoritmo VVS2:
 * Executa todos os cálculos integrados e retorna a pontuação final (0 a 100)
 */
export function computeVVS2Score(raw: RawEngagementMetrics): VVS2CalculationResult {
  const safeViews = Math.max(1, raw.views);
  const safeLikes = Math.max(0, raw.likes);
  const safeComments = Math.max(0, raw.comments);
  const safeShares = raw.shares !== undefined ? Math.max(0, raw.shares) : undefined;
  const safeSaves = raw.saves !== undefined ? Math.max(0, raw.saves) : undefined;

  // 1. Taxas de Engajamento
  const likeRate = safeLikes / safeViews;
  const commentRate = safeComments / safeViews;
  const shareRate = safeShares !== undefined ? safeShares / safeViews : 0;
  const saveRate = safeSaves !== undefined ? safeSaves / safeViews : 0;
  const hasSharesData = safeShares !== undefined && safeShares > 0;

  // 2. Qualidade (Q e Q_z)
  const { Q, Q_z } = calculateEngagementQuality({
    likeRate,
    commentRate,
    shareRate,
    saveRate,
    hasSharesData
  });

  // 3. Momentum Real (M)
  const { momentumScore, viewsPerHour, hoursSincePublished } = calculateRealMomentum(
    safeViews,
    raw.publishedAt
  );

  // 4. Anomalia do Criador (Os_mult)
  const { anomalyRatio, anomalyMultiplier } = calculateCreatorAnomaly(
    safeViews,
    raw.creatorAverageViews,
    raw.creatorFollowers
  );

  // 5. Janela de Oportunidade e Lead-Lag (J e L)
  const { windowRemainingHours, leadLagBonus } = calculateWindowAndLeadLag(
    hoursSincePublished,
    raw.sourceRegion,
    raw.targetRegion || 'brasil'
  );

  // 6. Composição do Score VVS2 Normalizado (0 a 100):
  // - Componente de Qualidade Q_z normalizado (-0.8 a 4.0 mapeado para ~ 10 a 38 pts)
  const qualityComponent = clamp(((Q_z + 0.8) / 4.8) * 36, 5, 36);

  // - Componente de Momentum (0 a 32 pts)
  const momentumComponent = (momentumScore / 100) * 32;

  // - Componente de Anomalia (0 a 24 pts)
  // Anomalia multiplicadora 1.0 = valor neutro; > 2.5x = anomalia viral forte
  const anomalyComponent = clamp((anomalyMultiplier / 4.0) * 24, 2, 24);

  // - Componente de Janela & Antecedência (0 a 8 pts)
  const windowComponent = clamp((windowRemainingHours / 72) * 8, 1, 8);

  // Score Base Ponderado
  const baseScore = qualityComponent + momentumComponent + anomalyComponent + windowComponent;

  // Aplicação do Lead-Lag Multiplicador e Clamp final
  const finalScore = clamp(Math.round(baseScore * leadLagBonus), 10, 99);

  // 7. Validação dos Portões Algorítmicos
  const hasCriticalMass = safeViews >= 15000;
  const isAnomalyPassed = anomalyRatio >= 2.5 || anomalyMultiplier >= 2.3;
  const isHighShareRate = shareRate >= 0.015 || commentRate >= 0.022;
  const isWindowOpen = windowRemainingHours >= 8;
  const passedAllGates = hasCriticalMass && isAnomalyPassed && isHighShareRate && isWindowOpen;

  // 8. Classificação e Ativação de Alertas
  let classification: ViralClassification = 'LOW_POTENTIAL';
  let label: 'Viral / Atacar Agora' | 'Médio Potencial / Validado' | 'Baixo Potencial / Observar' = 'Baixo Potencial / Observar';
  let variant: 'high' | 'medium' | 'low' = 'low';
  let triggerAlert = false;

  if (finalScore >= 80) {
    classification = 'HIGH_VIRAL';
    label = 'Viral / Atacar Agora';
    variant = 'high';
    triggerAlert = true;
  } else if (finalScore >= 60) {
    classification = 'MEDIUM_POTENTIAL';
    label = 'Médio Potencial / Validado';
    variant = 'medium';
  }

  return {
    score: finalScore,
    classification,
    label,
    variant,
    triggerAlert,
    rates: {
      likeRate: Number((likeRate * 100).toFixed(2)),
      commentRate: Number((commentRate * 100).toFixed(2)),
      shareRate: Number((shareRate * 100).toFixed(2)),
      saveRate: Number((saveRate * 100).toFixed(2))
    },
    qualityScore: Number(Q.toFixed(4)),
    qualityZScore: Number(Q_z.toFixed(2)),
    momentumScore,
    viewsPerHour,
    anomalyRatio,
    anomalyMultiplier,
    leadLagBonus,
    windowRemainingHours,
    gates: {
      hasCriticalMass,
      isAnomalyPassed,
      isHighShareRate,
      isWindowOpen,
      passedAllGates
    }
  };
}

