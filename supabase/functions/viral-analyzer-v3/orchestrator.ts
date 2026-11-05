/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Supabase Edge Function v3: orchestrator.ts
// Orquestrador Central do Pipeline V3.2 (Funil T1 -> T2 -> Portões -> Score)

import { type ContentKind, detectT1AiSignals, resolveFinalAiTier, type AiEvidenceItem } from "./aiDetector.ts";
import { computeV3Score } from "./scoringEngine.ts";

export interface CandidateItem {
  id: string;
  postId: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'x' | 'google_trends' | 'reddit' | 'news';
  title: string;
  description: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  views: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves?: number | null;
  durationSec: number | null;
  publishedAt: string;
  ageHours: number;
  isLive?: boolean;
  isWatchlist?: boolean;
  author: {
    id?: string;
    name: string;
    handle: string;
    followersCount: number | null;
  };
  accountProfile?: {
    medianViews?: number;
    posts30d?: number;
    recentPostsAbove2xFollowers?: number;
    followersPerPost?: number;
  };
  isDeclaredSynthetic?: boolean;
  // Campos preenchidos pelo pipeline
  rawProbability?: number;
  aiProbability?: number;
  aiTier?: 'confirmada' | 'provavel' | 'baixa';
  contentKind?: ContentKind;
  aiEvidence?: AiEvidenceItem[];
  t2Eligible?: boolean;
  toolGuess?: string;
  hookStrength?: number;
  narrativeOriginality?: number;
  recreatability?: number;
  aiVideoScriptIdea?: any;
  score?: number;
  scoreBreakdown?: any;
}

export interface OrchestratorOptions {
  config: any;
  lane?: 'recriar' | 'pautas' | 'todos';
  includeAllKinds?: boolean;
  t2ReasonFallback?: string;
  t2Executor?: (eligible: CandidateItem[]) => Promise<any>;
}

export async function runViralOrchestratorV3(
  rawCandidates: CandidateItem[],
  options: OrchestratorOptions
): Promise<{
  passedVideos: CandidateItem[];
  rejectedVideos: Array<{ item: CandidateItem; reason: string }>;
  meta: {
    totalRaw: number;
    t2EligibleCount: number;
    t2ExecutedCount: number;
    t2Applied: boolean;
    t2Reason?: string;
    modelUsed?: string | null;
    passedCount: number;
    rejectedCount: number;
  };
}> {
  const config = options.config;
  const lane = options.lane || 'recriar';
  const includeAllKinds = Boolean(options.includeAllKinds);

  const meta: {
    totalRaw: number;
    t2EligibleCount: number;
    t2ExecutedCount: number;
    t2Applied: boolean;
    t2Reason?: string;
    modelUsed?: string | null;
    passedCount: number;
    rejectedCount: number;
  } = {
    totalRaw: rawCandidates.length,
    t2EligibleCount: 0,
    t2ExecutedCount: 0,
    t2Applied: false,
    t2Reason: options.t2ReasonFallback || undefined,
    modelUsed: null,
    passedCount: 0,
    rejectedCount: 0
  };

  // ─── 1. ETAPA T1: DETECÇÃO HEURÍSTICA EM TODOS OS CANDIDATOS ───────────────
  for (const c of rawCandidates) {
    const textToScan = `${c.title || ""} ${c.description || ""}`;
    const t1Res = detectT1AiSignals(
      textToScan,
      Boolean(c.isDeclaredSynthetic),
      c.platform,
      {
        t1Weights: config.t1_weights,
        t1Thresholds: config.t1_thresholds
      },
      c.title
    );

    c.aiProbability = t1Res.probability;
    c.rawProbability = t1Res.rawProbability;
    c.aiTier = t1Res.tier;
    c.contentKind = t1Res.contentKind;
    c.aiEvidence = t1Res.evidence;
    c.toolGuess = t1Res.toolGuess;
    c.t2Eligible = t1Res.t2Eligible;
  }

  // ─── 2. SELEÇÃO E ORDENAÇÃO DE ELEGÍVEIS PARA O LOTE T2 ────────────────────
  const batchSize = config.snowball_limits?.t2_batch_size ?? 25;
  const eligibleCandidates = rawCandidates.filter(c => c.t2Eligible || c.isWatchlist);
  meta.t2EligibleCount = eligibleCandidates.length;

  // Ordena por prioridade de alcance (views / seguidores)
  eligibleCandidates.sort((a, b) => {
    const reachA = a.views / Math.max(1000, a.author.followersCount || 1000);
    const reachB = b.views / Math.max(1000, b.author.followersCount || 1000);
    return reachB - reachA;
  });

  const t2Batch = eligibleCandidates.slice(0, batchSize);

  // ─── 3. ETAPA T2: ANÁLISE SEMÂNTICA MULTIMODAL (SE DISPONÍVEL) ──────────────
  if (options.t2Executor && t2Batch.length > 0) {
    try {
      const execResult = await options.t2Executor(t2Batch);
      const t2Results: Map<string, any> = (execResult instanceof Map)
        ? execResult
        : (execResult?.results || new Map());

      if (execResult && !(execResult instanceof Map)) {
        meta.t2Applied = Boolean(execResult.t2Applied);
        meta.t2Reason = execResult.t2Reason;
        meta.modelUsed = execResult.modelUsed || null;
      } else {
        meta.t2Applied = t2Results.size > 0;
      }

      if (t2Results && t2Results.size > 0) {
        meta.t2ExecutedCount = t2Results.size;

        for (const c of rawCandidates) {
          const t2 = t2Results.get(c.id);
          if (t2) {
            const reconciled = resolveFinalAiTier(
              {
                probability: c.aiProbability ?? 0.15,
                tier: c.aiTier ?? 'baixa',
                contentKind: c.contentKind ?? 'obra_ia',
                evidence: c.aiEvidence ?? []
              },
              t2
            );

            c.aiProbability = reconciled.probability;
            c.aiTier = reconciled.tier;
            c.contentKind = reconciled.contentKind;

            if (t2.tool_guess) c.toolGuess = t2.tool_guess;
            c.hookStrength = t2.hook_strength;
            c.narrativeOriginality = t2.narrative_originality;
            c.recreatability = t2.recreatability;
            if (t2.script_idea) {
              c.aiVideoScriptIdea = {
                hook: t2.script_idea.hook_pt || t2.script_idea.hook || '',
                hookPt: t2.script_idea.hook_pt || t2.script_idea.hook || '',
                hookOriginal: t2.script_idea.hook_original,
                hookWhy: t2.script_idea.hook_why,
                scenes: t2.script_idea.scenes || [],
                narration: t2.script_idea.narration_pt || t2.script_idea.narration || '',
                narrationPt: t2.script_idea.narration_pt || t2.script_idea.narration || ''
              };
            }
          }
        }
      }
    } catch (err: any) {
      meta.t2Applied = false;
      meta.t2Reason = `gemini_execution_failed: ${err?.message || 'unknown'}`;
    }
  }

  // ─── 4. PORTÕES DE VALIDAÇÃO (AVALIADOS ESTRITAMENTE DEPOIS DO T2) ──────────
  const minViews = config.thresholds?.min_views_normal ?? 5000;
  const aiGate = config.thresholds?.ai_probability_gate ?? 0.60;
  const maxShortsHours = config.thresholds?.max_age_shorts_hours ?? 72;
  const maxYoutubeHours = config.thresholds?.max_age_youtube_hours ?? 168;
  const maxDurationSec = (config.thresholds?.max_duration_minutes ?? 15) * 60;

  const passedVideos: CandidateItem[] = [];
  const rejectedVideos: Array<{ item: CandidateItem; reason: string }> = [];

  for (const c of rawCandidates) {
    if (lane === 'pautas') {
      if (c.platform === 'google_trends' || c.platform === 'news') {
        passedVideos.push(c);
      } else {
        rejectedVideos.push({ item: c, reason: 'Não pertence à raia de pautas' });
      }
      continue;
    }

    // Portão 1: Transmissões ao vivo descartadas
    if (c.isLive) {
      rejectedVideos.push({ item: c, reason: 'Live stream bloqueada' });
      continue;
    }

    // Portão 2: Duração máxima (15 minutos)
    if (c.durationSec && c.durationSec > maxDurationSec) {
      rejectedVideos.push({ item: c, reason: `Duração excede ${maxDurationSec / 60} min` });
      continue;
    }

    // Portão 3: Janela temporal / recência
    const maxAllowedAge = c.platform === 'youtube' && (c.durationSec || 0) > 60
      ? maxYoutubeHours
      : maxShortsHours;
    if (c.ageHours > maxAllowedAge) {
      rejectedVideos.push({ item: c, reason: `Idade (${Math.round(c.ageHours)}h) excede janela máxima (${maxAllowedAge}h)` });
      continue;
    }

    // Portão 4: Piso de visualizações
    if (c.views < minViews) {
      rejectedVideos.push({ item: c, reason: `Views (${c.views}) abaixo do mínimo (${minViews})` });
      continue;
    }

    // Portão 5: Certeza mínima de IA (após reconciliação com T2)
    if ((c.aiProbability ?? 0) < aiGate) {
      rejectedVideos.push({ item: c, reason: `Certeza de IA (${((c.aiProbability ?? 0) * 100).toFixed(0)}%) abaixo do portão (${aiGate * 100}%)` });
      continue;
    }

    // Portão 6: Tipo de Conteúdo (na raia recriar, tutoriais e notícias são descartados a menos que includeAllKinds seja true)
    if (!includeAllKinds && c.contentKind !== 'obra_ia') {
      rejectedVideos.push({ item: c, reason: `Tipo de conteúdo '${c.contentKind}' não é obra_ia` });
      continue;
    }

    // Aprovado em todos os portões!
    passedVideos.push(c);
  }

  // ─── 5. PONTUAÇÃO DOS CANDIDATOS APROVADOS (SCORE V3) ───────────────────────
  for (const item of passedVideos) {
    const { score, breakdown, tier } = computeV3Score(item as any, config);
    item.score = score;
    item.scoreBreakdown = breakdown;
  }

  // Ordenação decrescente por score
  passedVideos.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  meta.passedCount = passedVideos.length;
  meta.rejectedCount = rejectedVideos.length;

  return {
    passedVideos,
    rejectedVideos,
    meta
  };
}

