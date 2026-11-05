/**
 * Conector de APIs para Tendências Virais - DiskAi VVS2 Pipeline
 *
 * Pipeline Oficial:
 * 1. Toda coleta ao vivo passa exclusivamente pela Edge Function `viral-analyzer` (Supabase).
 * 2. As chaves de API externas (YouTube, Apify) residem unicamente nos Supabase Secrets.
 * 3. Erros de rede, cotas e autenticação são propagados explicitamente para exibição na UI.
 * 4. O gerador de dados sintéticos funciona exclusivamente sob flag explícita `demoMode: true`,
 *    marca cada item com `isDemo: true` e nunca persiste no banco de dados.
 */

import {
  computeVVS2Score,
  clamp
} from './viralAlgorithmEngine';
import {
  ViralPlatform,
  ViralNiche,
  ViralRegion,
  ViralVideoItem,
  getFavoriteViralVideoIds,
  toggleFavoriteViralVideo
} from './viralTrendsService';
import { getSupabaseClient } from './supabase';
import { isViralV3Enabled } from '../config/viralFlags';
import { searchAndAnalyzeViralTrendsV3 } from './viralApiConnectorV3';

export interface ViralSearchInput {
  query?: string;
  niche?: ViralNiche;
  platform?: ViralPlatform;
  region?: ViralRegion;
  limit?: number;
  refreshSeed?: number;
  isManualRefresh?: boolean;
  pageToken?: string;
  demoMode?: boolean;
  lane?: 'recriar' | 'pautas' | 'formatos';
}

export interface ViralApiResponse {
  success: boolean;
  total: number;
  videos: ViralVideoItem[];
  highViralAlertCount: number;
  source: 'edge_function' | 'demo' | 'empty';
  cachedAt: string;
  savedToSupabase: boolean;
  newlyFetchedCount: number;
  errors?: string[];
  dbError?: string;
  keysPresent?: {
    youtube: boolean;
    apify: boolean;
  };
  rawError?: string;
}

// ─── Controle de IDs Vistos e Paginação ─────────────────────────────────────

const STORAGE_SEEN_KEY = 'diskai_viral_seen_post_ids';
const STORAGE_PAGINATION_KEY = 'diskai_viral_pagination_state';

const inMemorySeenIds = new Set<string>();

export function getSeenPostIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_SEEN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => inMemorySeenIds.add(id));
      }
    }
  } catch {}
  return inMemorySeenIds;
}

export function addSeenPostIds(ids: string[]): void {
  ids.forEach(id => inMemorySeenIds.add(id));
  try {
    sessionStorage.setItem(STORAGE_SEEN_KEY, JSON.stringify(Array.from(inMemorySeenIds)));
  } catch {}
}

export function clearSeenPostIds(): void {
  inMemorySeenIds.clear();
  try {
    sessionStorage.removeItem(STORAGE_SEEN_KEY);
  } catch {}
}

interface PaginationState {
  ytPageToken?: string;
  iteration: number;
  lastQuery?: string;
}

function getPaginationState(): PaginationState {
  try {
    const raw = sessionStorage.getItem(STORAGE_PAGINATION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { iteration: 0 };
}

function savePaginationState(state: PaginationState): void {
  try {
    sessionStorage.setItem(STORAGE_PAGINATION_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Helpers de Formatação ──────────────────────────────────────────────────

export function formatMetricNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace('.0', '')}k`;
  return num.toLocaleString('pt-BR');
}

export function parseMetricNumber(str?: string): number {
  if (!str) return 0;
  const clean = str.replace(/[^0-9.,kKMm]/g, '').trim();
  const isMillion = clean.toLowerCase().includes('m');
  const isThousand = clean.toLowerCase().includes('k');
  const num = parseFloat(clean.replace(/[kKMm]/g, '').replace(',', '.'));
  if (isNaN(num)) return 0;
  if (isMillion) return Math.round(num * 1_000_000);
  if (isThousand) return Math.round(num * 1_000);
  return Math.round(num);
}

// ─── Gerador Sintético Estrito para Modo Demonstração ────────────────────────
// NUNCA grava no banco e SEMPRE marca cada card com isDemo: true

function generateDemoVideos(
  input: ViralSearchInput,
  pagination: PaginationState,
  seenIds: Set<string>
): ViralVideoItem[] {
  const niche = input.niche && input.niche !== 'all' ? input.niche : 'geral';
  const region = input.region && input.region !== 'all' ? input.region : 'brasil';
  const query = (input.query || '').trim();

  const nicheMap: Record<string, string[]> = {
    ia_tech: ['Modelos de IA Autônomos', 'Geração de Vídeo Multimodal', 'Engenharia de Prompt VVS2', 'Automação Full-Stack'],
    negocios: ['Micro-SaaS sem Anúncios', 'Funis Conversacionais no WhatsApp', 'Atas Automáticas de Reuniões', 'B2B Growth em 2026'],
    entretenimento: ['Setup Retro Gamer', 'Desafio Viral de Programação', 'Análise de Gameplay IA', 'Clipes Mais Assistidos'],
    educacao: ['Resumos de Áudio Automáticos', 'Aprovação em Entrevistas Gringas', 'Cronograma de Estudo com IA', 'Método Feynman'],
    lifestyle: ['Rotina de Alta Produtividade', 'Smart Ring e Biohacking', 'Desk Setup Silencioso em Berlim', 'Minimalismo Digital'],
    geral: ['Tendências Emergentes da Semana', 'Novidades que Viraram Destaque', 'Estratégias de Crescimento']
  };

  const topics = nicheMap[niche] || nicheMap.geral;
  const iteration = pagination.iteration;
  const count = input.limit || 8;
  const videos: ViralVideoItem[] = [];

  const platforms: ('tiktok' | 'instagram' | 'youtube' | 'x')[] =
    input.platform && input.platform !== 'all'
      ? [input.platform as ('tiktok' | 'instagram' | 'youtube' | 'x')]
      : ['tiktok', 'instagram', 'youtube', 'x'];

  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
  ];

  const thumbs = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600'
  ];

  for (let i = 0; i < count; i++) {
    const uniqueId = `demo-${niche}-${iteration}-${i}-${Date.now().toString(36)}`;
    if (seenIds.has(uniqueId)) continue;

    const topic = topics[(i + iteration) % topics.length];
    const plat = platforms[i % platforms.length];
    const prefix = query ? `${query}` : topic;

    const title = `[DEMO] ${prefix}: Estudo de caso de viralização simulado`;
    const hook = `"Este é um card de demonstração offline simulando o Score VVS2..."`;

    const rawViews = Math.round(180_000 + (Math.sin(iteration * 5 + i * 3) + 1) * 650_000);
    const rawLikes = Math.round(rawViews * 0.085);
    const rawComments = Math.round(rawViews * 0.007);
    const hoursAgo = Math.max(2, Math.round(6 + (i * 4) % 36));
    const publishedAt = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

    const calc = computeVVS2Score({
      views: rawViews,
      likes: rawLikes,
      comments: rawComments,
      shares: null,
      saves: null,
      publishedAt,
      creatorFollowers: null,
      sourceRegion: region,
      targetRegion: 'brasil'
    });

    videos.push({
      id: uniqueId,
      post_id: uniqueId,
      platform: plat,
      title,
      description: `${title}. Gerado para avaliação de interface enquanto as chaves de API não estiverem ativas.`,
      hookTranscript: hook,
      videoUrl: plat === 'youtube'
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(prefix)}`
        : plat === 'tiktok'
        ? `https://www.tiktok.com/search?q=${encodeURIComponent(prefix)}`
        : plat === 'instagram'
        ? `https://www.instagram.com/explore/tags/${encodeURIComponent(prefix.replace(/\s+/g, ''))}/`
        : `https://x.com/search?q=${encodeURIComponent(prefix)}`,
      thumbnailUrl: thumbs[i % thumbs.length],
      durationFormatted: '—',
      publishedAt,
      author: {
        name: `Criador Demo ${topic.split(' ')[0]}`,
        handle: `@demo_${topic.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        avatarUrl: avatars[i % avatars.length],
        followersFormatted: '—',
        verified: false
      },
      region,
      niche,
      stats: {
        viewsFormatted: formatMetricNumber(rawViews),
        viewsCount: rawViews,
        likesFormatted: formatMetricNumber(rawLikes),
        sharesFormatted: '—',
        commentsFormatted: formatMetricNumber(rawComments)
      },
      metrics: {
        engagementRate: calc.rates.commentRate + calc.rates.likeRate,
        sharesRatio: 0,
        growthVelocity: `+${formatMetricNumber(calc.viewsPerHour)} views/h`,
        growthVelocityNum: calc.momentumScore,
        viewsPerHour: calc.viewsPerHour,
        channelAnomalyRatio: calc.anomalyRatio,
        opportunityWindow: `Próximas ${calc.windowRemainingHours} horas`,
        hookStrength: clamp(Math.round(calc.score * 0.94 + 5), 55, 98),
        retentionPrediction: clamp(Math.round(calc.score * 0.88 + 8), 50, 95),
        signalsEstimated: true
      },
      score: calc.score,
      scoreBadge: {
        label: calc.label,
        variant: calc.variant,
        color: calc.variant === 'high' ? '#23a55a' : calc.variant === 'medium' ? '#f59e0b' : '#64748b'
      },
      isTrendAlert: calc.triggerAlert,
      isFresh: true,
      savedToDb: false,
      isDemo: true // CRÍTICO: Identificador inequívoco de dado de demonstração
    });
  }

  return videos;
}

// ─── FUNÇÃO CENTRAL: Requisição ao Vivo via Edge Function ───────────────────

export async function searchAndAnalyzeViralTrends(
  input: ViralSearchInput = {}
): Promise<ViralApiResponse> {
  const seenIds = getSeenPostIds();
  const pagination = getPaginationState();

  // Se for nova pesquisa de texto, reseta paginação se a query mudou
  if (input.query && input.query !== pagination.lastQuery) {
    pagination.iteration = 0;
    pagination.ytPageToken = undefined;
    pagination.lastQuery = input.query;
  } else {
    pagination.iteration += 1;
  }

  // 1. Caso o usuário solicite explicitamente Modo Demonstração
  if (input.demoMode) {
    const demoVideos = generateDemoVideos(input, pagination, seenIds);
    addSeenPostIds(demoVideos.map(v => v.id));
    savePaginationState(pagination);

    return {
      success: true,
      total: demoVideos.length,
      videos: demoVideos,
      highViralAlertCount: demoVideos.filter(v => v.score >= 80).length,
      source: 'demo',
      cachedAt: new Date().toISOString(),
      savedToSupabase: false,
      newlyFetchedCount: demoVideos.length
    };
  }

  // Desvio cirúrgico da v3 aprovado no Mapa de Alterações (Item 2)
  if (isViralV3Enabled()) {
    return searchAndAnalyzeViralTrendsV3(input) as any;
  }

  // 2. Chamada à Supabase Edge Function `viral-analyzer`
  const supabase = getSupabaseClient();
  const errors: string[] = [];
  let dbError: string | undefined;
  let keysPresent: { youtube: boolean; apify: boolean } | undefined;
  let rawVideos: any[] = [];
  let savedToDb = false;

  try {
    const { data, error } = await supabase.functions.invoke('viral-analyzer', {
      body: {
        query: input.query?.trim() || undefined,
        niche: input.niche && input.niche !== 'all' ? input.niche : undefined,
        platform: input.platform && input.platform !== 'all' ? input.platform : 'all',
        region: input.region && input.region !== 'all' ? input.region : undefined,
        lane: input.lane || 'recriar',
        pageToken: input.pageToken || pagination.ytPageToken,
        refreshCount: pagination.iteration,
        seenIds: Array.from(seenIds)
      }
    });

    if (error) {
      let friendlyMsg = error.message || 'Erro ao conectar à Edge Function viral-analyzer';
      if (error.status === 404 || error.message?.includes('404')) {
        friendlyMsg = 'Edge Function viral-analyzer não encontrada (404). Verifique se o deploy foi executado no Supabase.';
      } else if (error.status === 401 || error.message?.includes('401')) {
        friendlyMsg = 'Sessão não autorizada (401). Faça login para buscar tendências virais ao vivo.';
      }
      errors.push(friendlyMsg);

      return {
        success: false,
        total: 0,
        videos: [],
        highViralAlertCount: 0,
        source: 'empty',
        cachedAt: new Date().toISOString(),
        savedToSupabase: false,
        newlyFetchedCount: 0,
        errors,
        rawError: error.message
      };
    }

    if (data) {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        errors.push(...data.errors);
      }
      if (data.dbError) {
        dbError = data.dbError;
      }
      if (data.keysPresent) {
        keysPresent = data.keysPresent;
      }
      if (Array.isArray(data.videos)) {
        rawVideos = data.videos;
      }
      if (data.nextPageToken) {
        pagination.ytPageToken = data.nextPageToken;
      }
      savedToDb = !!data.savedToDb;
    }
  } catch (err: any) {
    errors.push(`Falha de rede ao conectar à Edge Function: ${err?.message || 'Serviço inacessível'}`);
    return {
      success: false,
      total: 0,
      videos: [],
      highViralAlertCount: 0,
      source: 'empty',
      cachedAt: new Date().toISOString(),
      savedToSupabase: false,
      newlyFetchedCount: 0,
      errors,
      rawError: err?.message
    };
  }

  // Mapeia e valida itens recebidos da Edge Function
  const finalVideos: ViralVideoItem[] = rawVideos.map(v => ({
    ...v,
    isDemo: false, // Confirmado dado real da Edge Function
    savedToDb
  }));

  // Atualiza IDs vistos
  addSeenPostIds(finalVideos.map(v => v.id));
  savePaginationState(pagination);

  const highViralAlertCount = finalVideos.filter(v => v.score >= 80).length;

  return {
    success: finalVideos.length > 0 || errors.length === 0,
    total: finalVideos.length,
    videos: finalVideos,
    highViralAlertCount,
    source: finalVideos.length > 0 ? 'edge_function' : 'empty',
    cachedAt: new Date().toISOString(),
    savedToSupabase: savedToDb,
    newlyFetchedCount: finalVideos.length,
    errors: errors.length > 0 ? errors : undefined,
    dbError,
    keysPresent
  };
}
