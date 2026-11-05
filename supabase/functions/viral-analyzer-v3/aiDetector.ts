/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Supabase Edge Function v3: aiDetector.ts
// Detecção de Vídeos Feitos por IA em 2 Níveis (T1 Heurístico + T2 Multimodal em Lote)

export type ContentKind = 'obra_ia' | 'tutorial_ferramenta' | 'review_noticia' | 'anuncio' | 'outro';

export interface AiEvidenceItem {
  type: 'declared' | 'tool_keyword' | 'role_keyword' | 'hashtag' | 'llm_analysis' | 'penalty_tutorial' | 'penalty_news' | 'penalty_ad';
  detail: string;
  weight: number;
}

export interface AiAnalysisResult {
  aiProbability: number;
  rawProbability: number;
  aiTier: 'confirmada' | 'provavel' | 'baixa';
  contentKind: ContentKind;
  aiEvidence: AiEvidenceItem[];
  toolGuess?: string;
  t2Eligible: boolean;
  hookStrength?: number;             // 0 a 10 (Gancho e ideia por título/legenda/miniatura)
  narrativeOriginality?: number;     // 0 a 5
  recreatability?: number;          // 0 a 5
  aiVideoScriptIdea?: {
    hook: string;
    hookPt?: string;
    hookOriginal?: string;
    hookWhy?: string;
    scenes: string[];
    narration: string;
    narrationPt?: string;
  };
  hookPending?: boolean;
}

// ─── T1: HEURÍSTICA E COMBINAÇÃO NOISY-OR COM REBAIXAMENTO ─────────────────

const AI_TOOLS_MAP: Record<string, string> = {
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
  "diretor de ia", "ia generativa", "generative ai", "feito com ia", "made with ai",
  "ai generated", "ai clone", "inteligência artificial", "inteligencia artificial", "cpp"
];

const AI_HASHTAGS = [
  "#aivideo", "#aigenerated", "#sora", "#kling", "#veo", "#runwayml",
  "#feitocomia", "#ia", "#midjourney", "#lumaai", "#hailuoai", "#klingai"
];

// Termos que rebaixam a probabilidade de ser uma obra artística de IA
// IMPORTANTE: avaliados estritamente no TÍTULO e na PRIMEIRA LINHA da legenda
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

export interface T1DetectionOptions {
  t1Weights?: {
    declared?: number;
    tool?: number;
    role?: number;
    hashtag?: number;
    penalty_tutorial?: number;
    penalty_ad?: number;
  };
  t1Thresholds?: {
    confirmed?: number;
    probable?: number;
    t2_min_prob?: number;
  };
}

export function detectT1AiSignals(
  text: string,
  isDeclaredSynthetic: boolean,
  platform: string,
  options: T1DetectionOptions = {},
  titleText?: string
): {
  probability: number;
  rawProbability: number;
  tier: 'confirmada' | 'provavel' | 'baixa';
  contentKind: ContentKind;
  evidence: AiEvidenceItem[];
  toolGuess?: string;
  t2Eligible: boolean;
} {
  const weights = options.t1Weights || {
    declared: 0.98,
    tool: 0.55,
    role: 0.35,
    hashtag: 0.25,
    penalty_tutorial: 0.40,
    penalty_ad: 0.50
  };
  const thresholds = options.t1Thresholds || {
    confirmed: 0.80,
    probable: 0.60,
    t2_min_prob: 0.20
  };

  const fullLower = (text || "").toLowerCase();

  // Regra Inviolável de Funil: termos de penalidade só contam no TÍTULO e na PRIMEIRA LINHA da descrição
  // Chamadas comerciais e CTAs no fim da legenda ("comenta CURSO", "link na bio") NÃO rebaixam
  const lines = (text || "").split('\n');
  const criticalText = (titleText ? `${titleText} ${lines[0] || ""}` : `${lines[0] || ""} ${lines[1] || ""}`).toLowerCase();

  const evidence: AiEvidenceItem[] = [];
  const positiveProbs: number[] = [];
  let toolGuess: string | undefined;
  let detectedKind: ContentKind = 'outro';

  // 1. Rótulo Oficial Declarado
  if (isDeclaredSynthetic) {
    evidence.push({
      type: 'declared',
      detail: `Rótulo Oficial Declarado (${platform.toUpperCase()}: Mídia Sintética / Gerada por IA)`,
      weight: weights.declared ?? 0.98
    });
    positiveProbs.push(weights.declared ?? 0.98);
    detectedKind = 'obra_ia';
  }

  // 2. Ferramentas de Ponta Identificadas (busca no texto completo)
  let hasTool = false;
  for (const [key, label] of Object.entries(AI_TOOLS_MAP)) {
    if (fullLower.includes(key)) {
      if (!toolGuess) toolGuess = label;
      evidence.push({
        type: 'tool_keyword',
        detail: `Ferramenta de Geração Detectada: ${label}`,
        weight: weights.tool ?? 0.55
      });
      positiveProbs.push(weights.tool ?? 0.55);
      hasTool = true;
      break;
    }
  }

  // 3. Vocabulário de Bio / Criador (busca no texto completo)
  let hasRole = false;
  for (const kw of AI_ROLE_KEYWORDS) {
    if (fullLower.includes(kw)) {
      evidence.push({
        type: 'role_keyword',
        detail: `Termo de Criação com IA: "${kw}"`,
        weight: weights.role ?? 0.35
      });
      positiveProbs.push(weights.role ?? 0.35);
      hasRole = true;
      break;
    }
  }

  // 4. Hashtags (busca no texto completo)
  let hasHashtag = false;
  for (const ht of AI_HASHTAGS) {
    if (fullLower.includes(ht)) {
      evidence.push({
        type: 'hashtag',
        detail: `Hashtag de IA: ${ht}`,
        weight: weights.hashtag ?? 0.25
      });
      positiveProbs.push(weights.hashtag ?? 0.25);
      hasHashtag = true;
      break;
    }
  }

  // 5. Verificação de Rebaixamento (ESTRITAMENTE no Título e 1ª Linha)
  let isTutorial = false;
  for (const tKw of TUTORIAL_KEYWORDS) {
    if (criticalText.includes(tKw)) {
      isTutorial = true;
      detectedKind = 'tutorial_ferramenta';
      evidence.push({
        type: 'penalty_tutorial',
        detail: `Rebaixamento de Obra de IA: Termo de tutorial no título/abertura ("${tKw}")`,
        weight: weights.penalty_tutorial ?? 0.40
      });
      break;
    }
  }

  let isNews = false;
  if (!isTutorial) {
    for (const nKw of NEWS_REVIEW_KEYWORDS) {
      if (criticalText.includes(nKw)) {
        isNews = true;
        detectedKind = 'review_noticia';
        evidence.push({
          type: 'penalty_news',
          detail: `Rebaixamento de Obra de IA: Termo de notícia/análise no título/abertura ("${nKw}")`,
          weight: weights.penalty_tutorial ?? 0.40
        });
        break;
      }
    }
  }

  let isAd = false;
  if (!isTutorial && !isNews) {
    for (const aKw of AD_KEYWORDS) {
      if (criticalText.includes(aKw)) {
        isAd = true;
        detectedKind = 'anuncio';
        evidence.push({
          type: 'penalty_ad',
          detail: `Rebaixamento de Obra de IA: Termo comercial/anúncio no título/abertura ("${aKw}")`,
          weight: weights.penalty_ad ?? 0.50
        });
        break;
      }
    }
  }

  if (detectedKind === 'outro' && (hasTool || hasRole || hasHashtag)) {
    detectedKind = 'obra_ia';
  }

  // Combinação Noisy-OR Positiva: P_pos = 1 - Product(1 - P_i)
  let complementProduct = 1.0;
  for (const p of positiveProbs) {
    complementProduct *= (1 - p);
  }
  const rawProbability = positiveProbs.length > 0 ? (1 - complementProduct) : 0.15;
  let finalProb = rawProbability;

  // Aplicação da Penalidade se for Tutorial, Notícia ou Anúncio
  if (isTutorial || isNews) {
    finalProb = finalProb * (1 - (weights.penalty_tutorial ?? 0.40));
  } else if (isAd) {
    finalProb = finalProb * (1 - (weights.penalty_ad ?? 0.50));
  }

  finalProb = Math.min(0.99, Math.max(0.05, Number(finalProb.toFixed(2))));

  // Elegibilidade ao T2: probabilidade sem penalidades >= t2_min_prob (padrão 0.20) OU rótulo declarado OU ferramenta presente
  const t2MinProb = thresholds.t2_min_prob ?? 0.20;
  const t2Eligible = (rawProbability >= t2MinProb) || isDeclaredSynthetic || hasTool;

  // Regras de Promoção Estritas T1:
  // - T1 sozinho NUNCA passa de 'provavel' (exceto rótulo declarado).
  // - 'provavel' exige pelo menos 2 tipos de evidência independentes E ser obra_ia E prob >= probable (0.60).
  // - 'confirmada' exige rótulo oficial declarado no T1.
  let tier: 'confirmada' | 'provavel' | 'baixa' = 'baixa';

  if (isDeclaredSynthetic) {
    tier = 'confirmada';
  } else if (!isTutorial && !isNews && !isAd) {
    const independentEvidenceCount = (hasTool ? 1 : 0) + (hasRole ? 1 : 0) + (hasHashtag ? 1 : 0);
    if (independentEvidenceCount >= 2 && finalProb >= (thresholds.probable ?? 0.60)) {
      tier = 'provavel';
    } else {
      tier = 'baixa';
    }
  } else {
    tier = 'baixa';
  }

  return {
    probability: finalProb,
    rawProbability: Number(rawProbability.toFixed(2)),
    tier,
    contentKind: detectedKind,
    evidence,
    toolGuess,
    t2Eligible
  };
}

// ─── RECONCILIAÇÃO T1 + T2 (PROMOÇÃO DE CERTEZA DE IA) ──────────────────────

export function resolveFinalAiTier(
  t1: { probability: number; tier: 'confirmada' | 'provavel' | 'baixa'; contentKind: ContentKind; evidence: AiEvidenceItem[] },
  t2?: { is_ai: number; content_kind?: ContentKind; tool_guess?: string; evidence?: string[] }
): { probability: number; tier: 'confirmada' | 'provavel' | 'baixa'; contentKind: ContentKind } {
  // 1. Rótulo Oficial sempre confirma
  const hasDeclared = t1.evidence.some(e => e.type === 'declared');
  if (hasDeclared) {
    return { probability: 0.98, tier: 'confirmada', contentKind: 'obra_ia' };
  }

  let finalProb = t1.probability;
  let finalKind = t1.contentKind;

  if (t2) {
    if (t2.content_kind) {
      finalKind = t2.content_kind;
    }
    if (typeof t2.is_ai === 'number') {
      finalProb = Number(Math.max(finalProb, t2.is_ai).toFixed(2));
    }

    // Regras de Promoção com T2:
    // - 'confirmada': T2 >= 0.80 COM T1 concordando (ao menos 1 sinal de IA) E finalKind === 'obra_ia'
    const t1Agrees = t1.evidence.some(e => ['tool_keyword', 'role_keyword', 'hashtag'].includes(e.type));
    if (t2.is_ai >= 0.80 && t1Agrees && finalKind === 'obra_ia') {
      return { probability: finalProb, tier: 'confirmada', contentKind: finalKind };
    }

    // - 'provavel': T2 >= 0.60 com concordância E finalKind === 'obra_ia'
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

// ─── T2: MULTIMODAL EM LOTE COM MINIATURA (GEMINI VIA MODELO CONFIGURADO) ──

export function isAllowedThumbnailHost(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const h = u.hostname.toLowerCase();
    return (
      h === "i.ytimg.com" ||
      h === "i9.ytimg.com" ||
      h === "img.youtube.com" ||
      h.endsWith(".ytimg.com") ||
      h.endsWith(".cdninstagram.com") ||
      h.endsWith(".tiktokcdn.com") ||
      h.endsWith(".tiktokcdn-us.com") ||
      h.endsWith(".redd.it") ||
      h === "images.unsplash.com"
    );
  } catch (_) {
    return false;
  }
}

export interface T2AnalysisOutput {
  results: Map<string, {
    is_ai: number;
    content_kind: ContentKind;
    tool_guess?: string;
    evidence: string[];
    hook_strength: number;
    narrative_originality: number;
    recreatability: number;
    script_idea?: {
      hook: string;
      hook_pt?: string;
      hook_original?: string;
      hook_why?: string;
      scenes: string[];
      narration: string;
      narration_pt?: string;
    };
    thumbnail_used: boolean;
    t2_inputs_used: string[];
  }>;
  t2Applied: boolean;
  t2Reason?: string;
  modelUsed?: string | null;
}

export async function analyzeT2BatchWithGemini(
  items: Array<{ id: string; title: string; description: string; author: string; thumbnailUrl?: string }>,
  geminiApiKey: string,
  modelName: string
): Promise<T2AnalysisOutput> {
  const results = new Map();

  if (!geminiApiKey) {
    return { results, t2Applied: false, t2Reason: 'gemini_api_key_missing', modelUsed: null };
  }

  if (!modelName || typeof modelName !== 'string' || !modelName.trim()) {
    return { results, t2Applied: false, t2Reason: 'gemini_model_not_configured', modelUsed: null };
  }

  if (items.length === 0) {
    return { results, t2Applied: false, t2Reason: 'no_items_to_analyze', modelUsed: modelName };
  }

  const promptItems = items.slice(0, 25);
  const contentsParts: any[] = [];

  const systemInstruction = `Você é um curador e analista especialista em vídeos virais curtos FEITOS POR IA (Sora, Kling, Veo, Runway, Midjourney).
ATENÇÃO: Você analisa metadados textuais e a imagem da miniatura estática enviada. Você NÃO assiste ao fluxo de vídeo.
Ao avaliar a miniatura, procure sinais VISUAIS explícitos de geração por IA:
- Estética sintética hiper-polida, texturas características de difusão;
- Anomalias anatômicas (mãos, dentes, olhos, proporções irreais);
- Texto tipográfico incoerente ou artefatos de render;
- Iluminação e cenários cinematográficos hiper-reais impossíveis de filmar sem orçamento hollywoodiano.
NÃO afirme nada sobre o conteúdo do vídeo além da miniatura e dos textos enviados.

Analise cada item e retorne EXCLUSIVAMENTE um JSON array com os objetos analisados.
Cada objeto deve conter:
- ref_id: string
- is_ai: float (0.0 a 1.0 - probabilidade de ser uma OBRA audiovisual artística gerada por IA)
- content_kind: string ('obra_ia' | 'tutorial_ferramenta' | 'review_noticia' | 'anuncio' | 'outro')
- tool_guess: string (ex: "Kling", "Sora", "Midjourney + Runway" ou null)
- evidence: array de strings com justificativas visuais da miniatura ou textuais da legenda
- hook_strength: int (0 a 10 - força do gancho e potencial da ideia avaliado pelo título e miniatura)
- narrative_originality: int (0 a 5)
- recreatability: int (0 a 5 - facilidade de recriar com ferramentas de IA atuais)
- script_idea: objeto contendo:
  {
    hook: string (gancho adaptado em Português do Brasil com foco em retenção e curiosidade extrema para os primeiros 3s),
    hook_pt: string (o mesmo gancho traduzido e adaptado para o Português com copywriting viral),
    hook_original: string (transcrição ou texto exato de abertura no idioma de origem do vídeo, em inglês ou outro idioma),
    hook_why: string (explicação concisa de qual gatilho psicológico de curiosidade ou quebra de padrão funcionou nos primeiros 3s),
    scenes: array de 3 strings descrevendo os prompts visuais recomendados em inglês para gerar as cenas em ferramentas de IA (Midjourney/Kling),
    narration: string (texto de locução completo em Português do Brasil para vídeo de 30s pronto para colar em gerador de voz),
    narration_pt: string (o mesmo texto de locução em PT-BR)
  }`;

  // Montagem do payload multimodal: texto + miniaturas baixadas com timeout de 3.5s
  const textSummary = promptItems.map((it, idx) => ({
    ref_id: it.id,
    index: idx + 1,
    title: it.title,
    description: it.description?.slice(0, 200),
    author: it.author,
    has_thumbnail: Boolean(it.thumbnailUrl)
  }));

  contentsParts.push({ text: `${systemInstruction}\n\nLOTE DE VÍDEOS PARA ANÁLISE:\n${JSON.stringify(textSummary, null, 2)}` });

  const thumbnailsMap: Record<string, boolean> = {};

  // Tenta baixar a miniatura de até 5 itens simultâneos permitidos (respeitando limite de 2 MB e hosts seguros)
  const candidatesForThumb = promptItems.slice(0, 5).filter(it => it.thumbnailUrl && isAllowedThumbnailHost(it.thumbnailUrl));

  await Promise.all(
    candidatesForThumb.map(async (it) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const imgRes = await fetch(it.thumbnailUrl!, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          // Limite estrito de 2 MB para payload multimodal
          if (buffer.byteLength > 1000 && buffer.byteLength <= 2 * 1024 * 1024) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const b64 = btoa(binary);

            contentsParts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: b64
              }
            });
            contentsParts.push({ text: `[Miniatura visual do vídeo ref_id: "${it.id}"]` });
            thumbnailsMap[it.id] = true;
          } else {
            thumbnailsMap[it.id] = false;
          }
        } else {
          thumbnailsMap[it.id] = false;
        }
      } catch (_) {
        thumbnailsMap[it.id] = false;
      }
    })
  );

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: contentsParts
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      let t2Reason = `gemini_http_error_${res.status}`;
      if (res.status === 404) t2Reason = 'gemini_model_not_found';
      if (res.status === 429) t2Reason = 'gemini_quota_exceeded';
      return { results, t2Applied: false, t2Reason, modelUsed: modelName };
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.ref_id) {
            const kind = ['obra_ia', 'tutorial_ferramenta', 'review_noticia', 'anuncio', 'outro'].includes(item.content_kind)
              ? item.content_kind as ContentKind
              : 'obra_ia';

            const thumbUsed = Boolean(thumbnailsMap[item.ref_id]);
            const inputsUsed = thumbUsed ? ['title', 'caption', 'thumbnail'] : ['title', 'caption'];

            results.set(item.ref_id, {
              is_ai: typeof item.is_ai === 'number' ? item.is_ai : 0.7,
              content_kind: kind,
              tool_guess: item.tool_guess || undefined,
              evidence: Array.isArray(item.evidence) ? item.evidence : [],
              hook_strength: typeof item.hook_strength === 'number' ? item.hook_strength : 7,
              narrative_originality: typeof item.narrative_originality === 'number' ? item.narrative_originality : 3,
              recreatability: typeof item.recreatability === 'number' ? item.recreatability : 4,
              script_idea: item.script_idea ? {
                hook: item.script_idea.hook_pt || item.script_idea.hook || '',
                hook_pt: item.script_idea.hook_pt || item.script_idea.hook || '',
                hook_original: item.script_idea.hook_original || undefined,
                hook_why: item.script_idea.hook_why || undefined,
                scenes: Array.isArray(item.script_idea.scenes) ? item.script_idea.scenes : [],
                narration: item.script_idea.narration_pt || item.script_idea.narration || '',
                narration_pt: item.script_idea.narration_pt || item.script_idea.narration || ''
              } : undefined,
              thumbnail_used: thumbUsed,
              t2_inputs_used: inputsUsed
            });
          }
        }
      }
    }

    return { results, t2Applied: results.size > 0, modelUsed: modelName };
  } catch (err: any) {
    return { results, t2Applied: false, t2Reason: `gemini_exception_${err?.message || 'unknown'}`, modelUsed: modelName };
  }
}
