/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Supabase Edge Function v3: topicRadar.ts
// Radar de Pautas v2: Notícias Reais com Oportunidade de Vídeo de IA

export interface TopicSource {
  name: string;
  url: string;
  domain?: string;
  publishedAt?: string;
}

export interface ViralTopicItemResult {
  id: string;
  topic: string;
  translatedHeadline?: string;
  geo: string;
  trendVolume: number;
  trendGrowth: number;
  firstSeen: string;
  verified: boolean;
  verificationDetail: string;
  opportunityType: 'antes_da_onda' | 'onda_subindo' | 'saturada';
  sources: TopicSource[];
  suggestedAngles: string[];
  visualHookIdea: string;
  humorAngle?: string;
  legalRiskScore: number;     // 0 a 10 (ex: pessoas vivas, marcas, difamação)
  replicabilityScore: number; // 0 a 5 (grau de viabilidade 100% gerado por IA)
}

// Lista de bloqueio de veículos satíricos e boatos conhecidos
const SATIRE_AND_RUMOR_BLACKLIST = [
  'theonion.com',
  'sensacionalista.com.br',
  'babylonbee.com',
  'hard-drive.net',
  'clickhole.com',
  'dailysquib.co.uk',
  'duffelblog.com',
  'newsbiscuit.com',
  'der-postillon.com'
];

/**
 * Extrai domínio simplificado de uma URL
 */
function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch (_) {
    return 'fonte-externa.com';
  }
}

/**
 * Validação cruzada com regra estrita de >= 2 fontes independentes
 */
export function verifyTopicAuthenticity(sources: TopicSource[]): { verified: boolean; detail: string } {
  if (!sources || sources.length === 0) {
    return { verified: false, detail: 'Nenhuma fonte externa vinculada' };
  }

  // Verifica se há veículos satíricos na lista
  for (const src of sources) {
    const domain = src.domain || extractDomain(src.url);
    if (SATIRE_AND_RUMOR_BLACKLIST.some(sat => domain.includes(sat))) {
      return { verified: false, detail: 'Fonte satírica ou humorística identificada (conteúdo fictício)' };
    }
  }

  // Contagem de veículos jornalísticos ou fontes distintas e independentes
  const uniqueDomains = new Set<string>();
  for (const src of sources) {
    const domain = src.domain || extractDomain(src.url);
    uniqueDomains.add(domain);
  }

  if (uniqueDomains.size >= 2) {
    return {
      verified: true,
      detail: `Verificada por ${uniqueDomains.size} fontes independentes da imprensa/mídia`
    };
  }

  return {
    verified: false,
    detail: 'Não confirmada (requer confirmação cruzada de pelo menos 2 veículos independentes)'
  };
}

/**
 * Classifica saturação e tipo de oportunidade para criadores de vídeo com IA
 */
export function classifyOpportunity(
  topicTitle: string,
  trendVolume: number,
  existingAiVideoCount: number = 0
): {
  opportunityType: 'antes_da_onda' | 'onda_subindo' | 'saturada';
  legalRiskScore: number;
  replicabilityScore: number;
  visualHookIdea: string;
  humorAngle: string;
  suggestedAngles: string[];
} {
  const lower = topicTitle.toLowerCase();

  // Avaliação de risco legal (ex: pessoas vivas públicas polêmicas, marcas registradas)
  let legalRisk = 2; // Risco padrão baixo
  if (lower.includes('processo') || lower.includes('preso') || lower.includes('crime') || lower.includes('escândalo')) {
    legalRisk = 8;
  } else if (lower.includes('elon') || lower.includes('trump') || lower.includes('lula') || lower.includes('biden') || lower.includes('disney')) {
    legalRisk = 5;
  }

  // Grau de facilidade para recriar 100% com IA (Sora, Kling, Midjourney)
  let replicability = 4;
  if (lower.includes('espaço') || lower.includes('futuro') || lower.includes('robô') || lower.includes('animal') || lower.includes('natureza')) {
    replicability = 5;
  } else if (lower.includes('documento') || lower.includes('tribunal')) {
    replicability = 3;
  }

  // Tipo de oportunidade baseado no volume de buscas vs vídeos de IA já existentes
  let oppType: 'antes_da_onda' | 'onda_subindo' | 'saturada' = 'antes_da_onda';
  if (existingAiVideoCount >= 100) {
    oppType = 'saturada';
  } else if (existingAiVideoCount >= 10 || trendVolume >= 100_000) {
    oppType = 'onda_subindo';
  } else {
    oppType = 'antes_da_onda';
  }

  const visualHookIdea = `Cena cinematográfica hiper-realista gerada por IA com premissa impactante abrindo diretamente no clímax de "${topicTitle.slice(0, 50)}...", com iluminação dramática e enquadramento dinâmico.`;
  const humorAngle = `Perspectiva satírica ou surpreendente mostrando os bastidores inacreditáveis do acontecimento sob o ponto de vista de uma IA observadora.`;

  const suggestedAngles = [
    `Roteiro Explicativo Dramático: "O que a grande mídia não mostrou sobre ${topicTitle.slice(0, 40)}" recriado com estética de cinema.`,
    `Simulação Futurista em IA: Recriação visual dos próximos desdobramentos deste fato nos próximos 5 anos.`,
    `Curiosidade Inacreditável: Formato narrativo ágil com 3 fatos chocantes e visuais ultradetalhados do evento.`
  ];

  return {
    opportunityType: oppType,
    legalRiskScore: legalRisk,
    replicabilityScore: replicability,
    visualHookIdea,
    humorAngle,
    suggestedAngles
  };
}

/**
 * Enriquecimento em lote com Gemini para pautas de destaque
 */
export async function enrichTopicsBatchWithGemini(
  topics: Array<{ title: string; sources: string[]; trendVolume: number }>,
  geminiApiKey: string,
  modelName: string = "gemini-1.5-flash"
): Promise<Map<string, {
  translatedHeadline: string;
  visualHookIdea: string;
  humorAngle: string;
  legalRiskScore: number;
  replicabilityScore: number;
  opportunityType: 'antes_da_onda' | 'onda_subindo' | 'saturada';
  suggestedAngles: string[];
}>> {
  const results = new Map();
  if (!geminiApiKey || topics.length === 0) return results;

  const promptItems = topics.slice(0, 15).map((t, idx) => ({
    id: `topic_${idx}`,
    title: t.title,
    sources: t.sources,
    trendVolume: t.trendVolume
  }));

  const systemPrompt = `Você é um diretor de criação de conteúdo viral especialista em vídeos curtos FEITOS COM INTELIGÊNCIA ARTIFICIAL (Sora, Kling, Runway, Midjourney).
Analise o lote de notícias e pautas em alta e retorne um JSON array com os objetos analisados.
Cada objeto deve conter:
- id: string
- translatedHeadline: string (manchete atraente em português do Brasil sem sensacionalismo barato)
- visualHookIdea: string (descrição visual impactante da cena de abertura e premissa para o criador gerar no prompt de IA)
- humorAngle: string (ângulo inusitado, irônico ou bem-humorado para prender atenção)
- legalRiskScore: int (0 a 10 - risco de processos por imagem de pessoas reais ou marcas)
- replicabilityScore: int (1 a 5 - facilidade de recriar com ferramentas atuais de IA sem gravação com câmera)
- opportunityType: string ('antes_da_onda' se há muito interesse no Google mas quase nenhum vídeo de IA publicado, 'onda_subindo' se começou a viralizar, 'saturada' se já há centenas de vídeos iguais)
- suggestedAngles: array de 3 strings com abordagens diferentes para recriar`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nLOTE DE PAUTAS:\n${JSON.stringify(promptItems, null, 2)}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];
            const originalTitle = topics[i]?.title;
            if (originalTitle) {
              results.set(originalTitle, {
                translatedHeadline: item.translatedHeadline || originalTitle,
                visualHookIdea: item.visualHookIdea,
                humorAngle: item.humorAngle,
                legalRiskScore: typeof item.legalRiskScore === 'number' ? item.legalRiskScore : 2,
                replicabilityScore: typeof item.replicabilityScore === 'number' ? item.replicabilityScore : 4,
                opportunityType: ['antes_da_onda', 'onda_subindo', 'saturada'].includes(item.opportunityType)
                  ? item.opportunityType
                  : 'antes_da_onda',
                suggestedAngles: Array.isArray(item.suggestedAngles) ? item.suggestedAngles : []
              });
            }
          }
        }
      }
    }
  } catch (_) {}

  return results;
}

