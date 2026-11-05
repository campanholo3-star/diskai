/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Supabase Edge Function v3: formatSeeds.ts
// Sementes de Formatos Cinematográficos, Desafios, Vocabulário de Bio e Gestão de Consultas

export interface FormatSeedItem {
  formatKey: string;
  name: string;
  description: string;
  termsByLang: Record<string, string[]>;
  active: boolean;
}

// ─── 1. SEMENTES EMBUTIDAS DE FORMATOS (FALLBACK ROBUSTO) ───────────────────

export const DEFAULT_FORMAT_SEEDS: FormatSeedItem[] = [
  {
    formatKey: 'falso_trailer',
    name: 'Falso Trailer / Cartaz de Filme',
    description: 'Conceitos de filmes, teasers cinematográficos e cartazes hiper-realistas criados com IA',
    termsByLang: {
      pt: ['trailer falso ia', 'falso trailer filme ia', 'cartaz filme ia', 'trailer cinematografico ia', 'teaser filme ia', 'cinema ia'],
      en: ['fake movie trailer ai', 'concept movie trailer ai', 'fake poster ai', 'ai cinematic trailer', 'concept teaser ai', 'ai movie trailer'],
      es: ['trailer falso ia', 'falso trailer pelicula ia', 'poster pelicula ia', 'trailer cinematografico ia', 'teaser pelicula ia']
    },
    active: true
  },
  {
    formatKey: 'satira_parodia',
    name: 'Série de Sátira ou Paródia',
    description: 'Humor gerado por IA, paródias culturais, esquetes e séries cômicas com dublagem sintetizada',
    termsByLang: {
      pt: ['parodia ia', 'satira ia', 'comedia gerada por ia', 'humor ia', 'sitcom ia', 'esquete ia'],
      en: ['ai parody', 'ai satire', 'ai comedy short', 'ai sitcom', 'humor generated ai', 'ai funny sketch'],
      es: ['parodia ia', 'satira ia', 'comedia ia', 'humor con ia', 'sitcom ia', 'sketch ia']
    },
    active: true
  },
  {
    formatKey: 'animais_falantes_3d',
    name: 'Animais Falantes em 3D',
    description: 'Bichos hiper-realistas ou estilizados com sincronia labial e animação corporal de IA',
    termsByLang: {
      pt: ['animais falantes 3d', 'bichos falantes ia', 'gato falando ia', 'cachorro falante ia', 'animais 3d realistas ia', 'pet ia'],
      en: ['talking animals 3d ai', 'talking pets ai', 'talking cat ai', 'hyperrealistic animal 3d ai', 'talking dog ai', 'ai animal voice'],
      es: ['animales parlantes 3d', 'mascotas hablando ia', 'gatos hablando ia', 'perros hablando ia', 'animales 3d ia']
    },
    active: true
  },
  {
    formatKey: 'tributo_esportivo',
    name: 'Homenagem ou Tributo Esportivo',
    description: 'Vídeos cinematográficos de atletas históricos, jogadas lendárias recriadas e tributos a lendas do esporte',
    termsByLang: {
      pt: ['tributo futebol ia', 'homenagem atleta ia', 'copa do mundo ia', 'futebol historico ia', 'champions league ia', 'lendas esporte ia'],
      en: ['football tribute ai', 'sports homage ai', 'world cup history ai', 'basketball legend ai', 'sports cinematic ai', 'soccer legend ai'],
      es: ['homenaje futbol ia', 'tributo deportivo ia', 'futbol historico ia', 'clasico mundial ia', 'leyendas del deporte ia']
    },
    active: true
  },
  {
    formatKey: 'propaganda_ficticia',
    name: 'Propaganda ou Anúncio Fictício',
    description: 'Comerciais especulativos hiper-produzidos com produtos imaginários ou marcas famosas geradas por IA',
    termsByLang: {
      pt: ['comercial ficticio ia', 'propaganda ficticia ia', 'anuncio comercial ia', 'fake commercial ai', 'publicidade ia', 'spot ficticio ia'],
      en: ['fake commercial ai', 'spec commercial ai', 'fake ad ai', 'ai brand commercial', 'spec ad ai', 'spec fashion ad ai'],
      es: ['comercial ficticio ia', 'anuncio falso ia', 'publicidad especulativa ia', 'spot ficticio ia']
    },
    active: true
  },
  {
    formatKey: 'e_se',
    name: '"E se..." (Cenários Alternativos)',
    description: 'Histórias e mundos alternativos explorando premissas contrafactuais com visuais épicos de IA',
    termsByLang: {
      pt: ['e se ia', 'e se o brasil ia', 'e se a historia ia', 'cenario alternativo ia', 'e se acontecesse ia', 'historia alternativa ia'],
      en: ['what if ai', 'what if scenario ai', 'alternate history ai', 'what if world ai', 'what would happen if ai', 'alternate reality ai'],
      es: ['que pasaria si ia', 'y si ia', 'historia alternativa ia', 'que tal si ia', 'mundo alternativo ia']
    },
    active: true
  },
  {
    formatKey: 'concursos_desafios',
    name: 'Concursos e Desafios de IA',
    description: 'Desafios de plataformas, festivais de curtas e competições abertas para criadores com IA',
    termsByLang: {
      pt: ['desafio capcut', 'ai film awards brasil', 'football challenge ia', 'desafio de video ia', 'concurso criadores ia', 'festival curta ia'],
      en: ['capcut challenge ai', 'ai film festival', 'ai video contest', 'football challenge ai', 'ai creators competition', 'ai short challenge'],
      es: ['desafio capcut', 'festival cine ia', 'concurso video ia', 'challenge creadores ia', 'desafio de video ia']
    },
    active: true
  }
];

// ─── 2. VOCABULÁRIO DE BIO PARA DETECTAR CRIADOR DE IA E EXPANDIR POR @MENÇÃO ─

export const AI_CREATOR_EXPANSION_ACCOUNTS = [
  'capcutapp',
  'capcutappbr',
  'sjinn_ai',
  'verseinofficial',
  'higgsfield.ai',
  'nimotv_brasil',
  'human__academy',
  'youart.creators',
  'criai.studio'
];

export const AI_CREATOR_BIO_KEYWORDS = [
  'ai artist', 'ai creator', 'ai filmmaker', 'ai animator', 'criador com ia',
  'diretor de ia', 'ia generativa', 'generative ai', 'feito com ia', 'made with ai',
  'ai generated', 'ai clone', 'prompt designer', 'ai storyteller', 'cinematografia ia',
  'cpp', 'capcut creator', 'kling partner', 'sora creator', 'higgsfield partner'
];

// ─── 3. TERMOS DE REBAIXAMENTO (TUTORIAL, REVIEW, NOTÍCIA, ANÚNCIO, CURSO) ────

export const PENALTY_KEYWORDS = [
  'tutorial', 'como fazer', 'como criar', 'passo a passo', 'aula', 'curso',
  'review', 'analise', 'análise', 'noticia', 'notícia', 'lancamento', 'lançamento',
  'novidade', 'atualização', 'atualizacao', 'dicas de', 'dica de', 'prompt pack',
  'compre meu', 'prompts gratis', 'inscreva-se', 'cupom', 'desconto'
];

// ─── 4. CARREGAMENTO E OBTENÇÃO DE FORMATOS ──────────────────────────────────

export async function getActiveFormatSeeds(supabaseClient: any): Promise<FormatSeedItem[]> {
  try {
    const { data } = await supabaseClient
      .from('viral_format_seeds')
      .select('*')
      .eq('active', true);

    if (data && data.length > 0) {
      return data.map((d: any) => ({
        formatKey: d.format_key,
        name: d.name,
        description: d.description || '',
        termsByLang: d.terms_by_lang || {},
        active: Boolean(d.active)
      }));
    }
  } catch (_) {}

  return DEFAULT_FORMAT_SEEDS;
}

export function pickSearchTermsForFormat(
  seed: FormatSeedItem,
  lang: string = 'pt',
  count: number = 3
): string[] {
  const terms = seed.termsByLang[lang] || seed.termsByLang['pt'] || seed.termsByLang['en'] || [];
  if (terms.length === 0) return [seed.name];
  // Embaralha para alternar termos
  const shuffled = [...terms].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ─── 5. REGISTRO DE RENDIMENTO E GESTÃO DE viral_query_stats ─────────────────

export async function recordQueryStats(
  supabaseClient: any,
  params: {
    queryKey: string;
    formatKey?: string;
    lane: string;
    candidatesFound: number;
    itemsPassedGates: number;
    costUsd: number;
  }
): Promise<void> {
  const yieldRatio = params.costUsd > 0
    ? Number((params.itemsPassedGates / params.costUsd).toFixed(2))
    : Number((params.itemsPassedGates * 10).toFixed(2));

  // Desativação automática se já teve >= 3 tentativas com 0 itens úteis
  const shouldDeactivate = params.candidatesFound > 10 && params.itemsPassedGates === 0;

  try {
    const { data: existing } = await supabaseClient
      .from('viral_query_stats')
      .select('*')
      .eq('query_key', params.queryKey)
      .eq('lane', params.lane)
      .maybeSingle();

    if (existing) {
      const totalPassed = (existing.items_passed_gates || 0) + params.itemsPassedGates;
      const totalCand = (existing.total_candidates || 0) + params.candidatesFound;
      const totalCost = Number(existing.total_cost_usd || 0) + params.costUsd;
      const updatedYield = totalCost > 0 ? Number((totalPassed / totalCost).toFixed(2)) : totalPassed;
      const currentActive = existing.active && !shouldDeactivate;

      const logEntry = {
        timestamp: new Date().toISOString(),
        found: params.candidatesFound,
        passed: params.itemsPassedGates,
        cost: params.costUsd
      };
      const logs = Array.isArray(existing.logs) ? [...existing.logs.slice(-19), logEntry] : [logEntry];

      await supabaseClient
        .from('viral_query_stats')
        .update({
          items_passed_gates: totalPassed,
          total_candidates: totalCand,
          total_cost_usd: totalCost,
          yield_ratio: updatedYield,
          active: currentActive,
          last_run_at: new Date().toISOString(),
          logs,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabaseClient
        .from('viral_query_stats')
        .insert({
          query_key: params.queryKey,
          format_key: params.formatKey || null,
          lane: params.lane,
          items_passed_gates: params.itemsPassedGates,
          total_candidates: params.candidatesFound,
          total_cost_usd: params.costUsd,
          yield_ratio: yieldRatio,
          active: !shouldDeactivate,
          last_run_at: new Date().toISOString(),
          logs: [{
            timestamp: new Date().toISOString(),
            found: params.candidatesFound,
            passed: params.itemsPassedGates,
            cost: params.costUsd
          }]
        });
    }
  } catch (_) {}
}

