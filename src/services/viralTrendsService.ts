import { getSupabaseClient } from './supabase';

export type ViralPlatform = 'all' | 'tiktok' | 'instagram' | 'youtube' | 'x';
export type ViralNiche =
  | 'all'
  | 'geral'
  | 'ia_tech'
  | 'negocios'
  | 'entretenimento'
  | 'educacao'
  | 'lifestyle';
export type ViralRegion = 'all' | 'brasil' | 'eua' | 'europa' | 'asia' | 'global';
export type ViralScoreRange = 'all' | 'high' | 'medium' | 'low';

export interface VVS2Metrics {
  engagementRate: number; // ex: 14.8 (porcentagem)
  sharesRatio: number; // ex: 0.42 (compartilhamentos por curtida)
  growthVelocity: string; // ex: "+54k views/hora"
  growthVelocityNum: number; // normalizado de 0 a 100
  channelAnomalyRatio: number; // ex: 8.4 (8.4x acima da média do canal)
  opportunityWindow: string; // ex: "Próximas 16 horas"
  hookStrength: number; // 0-100 força dos 3 primeiros segundos
  retentionPrediction: number; // 0-100 retenção estimada
  viewsPerHour?: number;
  signalsEstimated?: boolean; // True quando shares/saves são null (ex.: YouTube)
}

export interface ViralVideoItem {
  id: string;
  post_id?: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'x';
  title: string;
  description: string;
  hookTranscript: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationFormatted: string;
  publishedAt: string;
  author: {
    name: string;
    handle: string;
    avatarUrl: string;
    followersFormatted: string;
    verified?: boolean;
  };
  region: 'brasil' | 'eua' | 'europa' | 'asia' | 'global';
  niche: 'geral' | 'ia_tech' | 'negocios' | 'entretenimento' | 'educacao' | 'lifestyle';
  stats: {
    viewsFormatted: string;
    viewsCount: number;
    likesFormatted: string;
    sharesFormatted: string;
    commentsFormatted: string;
  };
  metrics: VVS2Metrics;
  score: number; // 0 - 100
  scoreBadge: {
    label: 'Viral / Atacar Agora' | 'Médio Potencial / Validado' | 'Baixo Potencial / Observar';
    variant: 'high' | 'medium' | 'low';
    color: string;
  };
  isTrendAlert: boolean; // score >= 80
  isFresh?: boolean; // Novo vídeo recém-coletado nesta requisição
  savedToDb?: boolean; // Persistido no banco Supabase
  isDemo?: boolean; // Marcador de modo demonstração
  lane?: 'recriar' | 'pautas' | 'formatos'; // Raia de descoberta do produto
  aiSignals?: string[]; // Lista de evidências que qualificam como IA
  isAiGenerated?: boolean | null; // true se comprovado ou declarado IA
  sourceCount?: number; // Qtd de fontes confirmando a mesma pauta
  scoreBreakdown?: Record<string, number>; // Decomposição dos pontos do score
  recreatabilityPending?: boolean; // True até que a LLM processe o roteiro
}

export interface ViralPlatformApiKeys {
  xApiKey?: string;
  tiktokApiKey?: string;
  metaApiKey?: string;
  youtubeApiKey?: string;
  apifyApiToken?: string;
}

const STORAGE_KEYS = {
  AUTHORIZED_USERS: 'diskai_viral_authorized_users',
  FAVORITE_VIDEOS: 'diskai_viral_favorite_videos',
  API_KEYS: 'diskai_viral_api_keys',
  CUSTOM_VIDEOS: 'diskai_viral_custom_videos'
};

// Limpeza única e imediata de credenciais residuais no cliente
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.API_KEYS);
  }
} catch {}

/**
 * Cálculo Algorítmico do Score Viral baseado no Modelo VVS2
 * Ponderações:
 * - Engajamento & Taxa de Compartilhamento (Shares/Likes): 30%
 * - Velocidade de Crescimento / Momentum (Views/Hora): 30%
 * - Anomalia do Canal (Desempenho vs Linha de Base): 25%
 * - Força do Gancho (Hook Retention 0-3s): 15%
 */
export function calculateVVS2Score(raw: {
  engagementRate: number;
  sharesRatio: number;
  growthVelocityNum: number;
  channelAnomalyRatio: number;
  hookStrength: number;
}): {
  score: number;
  variant: 'high' | 'medium' | 'low';
  label: 'Viral / Atacar Agora' | 'Médio Potencial / Validado' | 'Baixo Potencial / Observar';
} {
  const engagementWeight = Math.min(30, raw.engagementRate * 1.5 + raw.sharesRatio * 20);
  const momentumWeight = Math.min(30, (raw.growthVelocityNum / 100) * 30);
  const anomalyWeight = Math.min(25, (raw.channelAnomalyRatio / 10) * 25);
  const hookWeight = Math.min(15, (raw.hookStrength / 100) * 15);

  const rawScore = Math.round(engagementWeight + momentumWeight + anomalyWeight + hookWeight);
  const score = Math.max(0, Math.min(100, rawScore));

  if (score >= 80) {
    return { score, variant: 'high', label: 'Viral / Atacar Agora' };
  }
  if (score >= 60) {
    return { score, variant: 'medium', label: 'Médio Potencial / Validado' };
  }
  return { score, variant: 'low', label: 'Baixo Potencial / Observar' };
}

// Catálogo Realista Inicial de Tendências Virais
export const INITIAL_VIRAL_VIDEOS: ViralVideoItem[] = [
  {
    id: 'viral-tt-01',
    platform: 'tiktok',
    title: 'Como automatizei meu fluxo com IA e economizei 20 horas por semana',
    description: 'Nesse vídeo mostro a estrutura exata de automação sem código que roda integrações 24 horas por dia.',
    hookTranscript: '“Se você ainda faz relatórios e gravações de reunião na mão em 2026, você tá perdendo 90% do seu tempo...”',
    videoUrl: 'https://www.tiktok.com/@techbrasil/video/73918237192',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80',
    durationFormatted: '00:58',
    publishedAt: 'Há 3 horas',
    author: {
      name: 'Gabriel Tech',
      handle: '@gabriel.ai',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
      followersFormatted: '480k',
      verified: true
    },
    region: 'brasil',
    niche: 'ia_tech',
    stats: {
      viewsFormatted: '840.5k',
      viewsCount: 840500,
      likesFormatted: '112.4k',
      sharesFormatted: '46.8k',
      commentsFormatted: '3.9k'
    },
    metrics: {
      engagementRate: 18.9,
      sharesRatio: 0.41,
      growthVelocity: '+68k views/h',
      growthVelocityNum: 95,
      channelAnomalyRatio: 8.8,
      opportunityWindow: 'Próximas 14 horas',
      hookStrength: 96,
      retentionPrediction: 88
    },
    score: 95,
    scoreBadge: {
      label: 'Viral / Atacar Agora',
      variant: 'high',
      color: '#23a55a'
    },
    isTrendAlert: true
  },
  {
    id: 'viral-yt-02',
    platform: 'youtube',
    title: 'The 3-Person Agency Making $1.2M/mo with Autonomous Multi-Agents',
    description: 'Inside the operational blueprint of lean agencies utilizing real-time voice, livekit and automated action items.',
    hookTranscript: '“Do not hire another software developer until you see how three engineers are outperforming 40 people...”',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=640&q=80',
    durationFormatted: '12:44',
    publishedAt: 'Há 5 horas',
    author: {
      name: 'Apex AI Ventures',
      handle: '@apex_ai',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
      followersFormatted: '1.2M',
      verified: true
    },
    region: 'eua',
    niche: 'negocios',
    stats: {
      viewsFormatted: '420.0k',
      viewsCount: 420000,
      likesFormatted: '48.2k',
      sharesFormatted: '18.5k',
      commentsFormatted: '1.8k'
    },
    metrics: {
      engagementRate: 15.8,
      sharesRatio: 0.38,
      growthVelocity: '+42k views/h',
      growthVelocityNum: 88,
      channelAnomalyRatio: 7.4,
      opportunityWindow: 'Próximas 24 horas',
      hookStrength: 92,
      retentionPrediction: 82
    },
    score: 89,
    scoreBadge: {
      label: 'Viral / Atacar Agora',
      variant: 'high',
      color: '#23a55a'
    },
    isTrendAlert: true
  },
  {
    id: 'viral-ig-03',
    platform: 'instagram',
    title: 'A esteira invisível de automação que faturou R$ 340k no piloto automático',
    description: 'Como estruturar uma esteira de captação que qualifica leads através de resumos e atas automáticas de reuniões.',
    hookTranscript: '“Essa é a exata tela do sistema que fez mais de 300 mil reais no último mês sem equipe de vendas...”',
    videoUrl: 'https://www.instagram.com/reel/C892183812',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&q=80',
    durationFormatted: '01:20',
    publishedAt: 'Há 2 horas',
    author: {
      name: 'Mariana Growth',
      handle: '@marigrowth',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120',
      followersFormatted: '310k',
      verified: true
    },
    region: 'brasil',
    niche: 'negocios',
    stats: {
      viewsFormatted: '280.9k',
      viewsCount: 280900,
      likesFormatted: '34.1k',
      sharesFormatted: '16.2k',
      commentsFormatted: '2.1k'
    },
    metrics: {
      engagementRate: 17.9,
      sharesRatio: 0.47,
      growthVelocity: '+51k views/h',
      growthVelocityNum: 89,
      channelAnomalyRatio: 6.9,
      opportunityWindow: 'Próximas 18 horas',
      hookStrength: 90,
      retentionPrediction: 85
    },
    score: 88,
    scoreBadge: {
      label: 'Viral / Atacar Agora',
      variant: 'high',
      color: '#23a55a'
    },
    isTrendAlert: true
  },
  {
    id: 'viral-x-04',
    platform: 'x',
    title: 'Why Real-Time Voice Models are Replacing Traditional Web Dashboards',
    description: 'Breakdown of zero-latency WebRTC pipelines and how prompt-driven interfaces make static forms obsolete.',
    hookTranscript: '“Users no longer want to click 15 buttons. In 2026, speaking to an agent is 10x faster than navigating any UI...”',
    videoUrl: 'https://x.com/tech_insider/status/1892182912',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&q=80',
    durationFormatted: '02:15',
    publishedAt: 'Há 6 horas',
    author: {
      name: 'Arthur Miller',
      handle: '@miller_dev',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
      followersFormatted: '215k',
      verified: true
    },
    region: 'global',
    niche: 'ia_tech',
    stats: {
      viewsFormatted: '590.2k',
      viewsCount: 590200,
      likesFormatted: '39.8k',
      sharesFormatted: '14.2k',
      commentsFormatted: '1.4k'
    },
    metrics: {
      engagementRate: 14.2,
      sharesRatio: 0.35,
      growthVelocity: '+38k views/h',
      growthVelocityNum: 82,
      channelAnomalyRatio: 7.1,
      opportunityWindow: 'Próximas 20 horas',
      hookStrength: 87,
      retentionPrediction: 80
    },
    score: 85,
    scoreBadge: {
      label: 'Viral / Atacar Agora',
      variant: 'high',
      color: '#23a55a'
    },
    isTrendAlert: true
  },
  {
    id: 'viral-tt-05',
    platform: 'tiktok',
    title: 'O método definitivo de estudo com gravação de áudio e resumo gerado por IA',
    description: 'Como estudantes de medicina e concurso gravam as aulas e geram cronogramas de revisão em menos de 1 minuto.',
    hookTranscript: '“Pare de pausar vídeo aula para copiar slide. Essa IA cria o caderno completo com timestamps para você...”',
    videoUrl: 'https://www.tiktok.com/@estudos/video/7391918231',
    thumbnailUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=640&q=80',
    durationFormatted: '00:45',
    publishedAt: 'Há 7 horas',
    author: {
      name: 'Larissa Med',
      handle: '@lari_estudos',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
      followersFormatted: '190k'
    },
    region: 'brasil',
    niche: 'educacao',
    stats: {
      viewsFormatted: '310.4k',
      viewsCount: 310400,
      likesFormatted: '45.2k',
      sharesFormatted: '12.8k',
      commentsFormatted: '890'
    },
    metrics: {
      engagementRate: 18.6,
      sharesRatio: 0.28,
      growthVelocity: '+29k views/h',
      growthVelocityNum: 76,
      channelAnomalyRatio: 6.2,
      opportunityWindow: 'Próximas 24 horas',
      hookStrength: 85,
      retentionPrediction: 78
    },
    score: 81,
    scoreBadge: {
      label: 'Viral / Atacar Agora',
      variant: 'high',
      color: '#23a55a'
    },
    isTrendAlert: true
  },
  {
    id: 'viral-ig-06',
    platform: 'instagram',
    title: 'Minimalist Workspaces: The European Desk Setup with Local LLMs',
    description: 'Full hardware breakdown of a silent desk setup running local quantization models in Berlin.',
    hookTranscript: '“No cables, no RGB, just a 4K OLED monitor and a Mac Studio running offline vision models...”',
    videoUrl: 'https://www.instagram.com/reel/D91827361',
    thumbnailUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=640&q=80',
    durationFormatted: '00:38',
    publishedAt: 'Há 9 horas',
    author: {
      name: 'Lukas Meyer',
      handle: '@lukas_minimal',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120',
      followersFormatted: '420k'
    },
    region: 'europa',
    niche: 'lifestyle',
    stats: {
      viewsFormatted: '195.0k',
      viewsCount: 195000,
      likesFormatted: '22.4k',
      sharesFormatted: '4.8k',
      commentsFormatted: '620'
    },
    metrics: {
      engagementRate: 13.9,
      sharesRatio: 0.21,
      growthVelocity: '+18k views/h',
      growthVelocityNum: 68,
      channelAnomalyRatio: 4.8,
      opportunityWindow: 'Próximas 36 horas',
      hookStrength: 78,
      retentionPrediction: 74
    },
    score: 72,
    scoreBadge: {
      label: 'Médio Potencial / Validado',
      variant: 'medium',
      color: '#f0b232'
    },
    isTrendAlert: false
  },
  {
    id: 'viral-yt-07',
    platform: 'youtube',
    title: 'How Tokyo High Schoolers are using Generative Avatars for English Fluency',
    description: 'Field report inside Japanese classrooms testing continuous real-time phonetic feedback via AI.',
    hookTranscript: '“Students who were shy to speak in public now practice 45 minutes daily with adaptive speech bots...”',
    videoUrl: 'https://www.youtube.com/watch?v=tokyo_edu',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=640&q=80',
    durationFormatted: '18:10',
    publishedAt: 'Há 12 horas',
    author: {
      name: 'Tokyo Future Labs',
      handle: '@tokyofuture',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
      followersFormatted: '650k',
      verified: true
    },
    region: 'asia',
    niche: 'educacao',
    stats: {
      viewsFormatted: '380.0k',
      viewsCount: 380000,
      likesFormatted: '32.1k',
      sharesFormatted: '8.4k',
      commentsFormatted: '1.2k'
    },
    metrics: {
      engagementRate: 10.6,
      sharesRatio: 0.26,
      growthVelocity: '+22k views/h',
      growthVelocityNum: 71,
      channelAnomalyRatio: 5.1,
      opportunityWindow: 'Próximas 30 horas',
      hookStrength: 75,
      retentionPrediction: 72
    },
    score: 74,
    scoreBadge: {
      label: 'Médio Potencial / Validado',
      variant: 'medium',
      color: '#f0b232'
    },
    isTrendAlert: false
  },
  {
    id: 'viral-x-08',
    platform: 'x',
    title: 'The Uncensored Numbers Behind Brazilian B2B SaaS Growth in 2026',
    description: 'Real churn rates, payback periods, and the impact of automated meeting notes on sales velocity.',
    hookTranscript: '“We analyzed 120 startups: those who send meeting minutes within 5 minutes close 43% faster...”',
    videoUrl: 'https://x.com/saas_metrics/status/192837192',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&q=80',
    durationFormatted: '03:10',
    publishedAt: 'Há 14 horas',
    author: {
      name: 'Rodrigo Venture',
      handle: '@rodrigo_b2b',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
      followersFormatted: '140k'
    },
    region: 'brasil',
    niche: 'negocios',
    stats: {
      viewsFormatted: '165.2k',
      viewsCount: 165200,
      likesFormatted: '14.2k',
      sharesFormatted: '3.9k',
      commentsFormatted: '480'
    },
    metrics: {
      engagementRate: 11.0,
      sharesRatio: 0.27,
      growthVelocity: '+15k views/h',
      growthVelocityNum: 65,
      channelAnomalyRatio: 4.6,
      opportunityWindow: 'Próximas 48 horas',
      hookStrength: 72,
      retentionPrediction: 68
    },
    score: 69,
    scoreBadge: {
      label: 'Médio Potencial / Validado',
      variant: 'medium',
      color: '#f0b232'
    },
    isTrendAlert: false
  },
  {
    id: 'viral-tt-09',
    platform: 'tiktok',
    title: 'Why standard hooks no longer work on Gen Z viewers',
    description: 'Analyzing retention drop-offs when intros exceed 1.8 seconds in modern feeds.',
    hookTranscript: '“If your video starts with ‘Oi gente’, 82% of people have already swiped away...”',
    videoUrl: 'https://www.tiktok.com/@creators/video/781928371',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&q=80',
    durationFormatted: '00:29',
    publishedAt: 'Há 18 horas',
    author: {
      name: 'Sofia Creator',
      handle: '@sofiacria',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
      followersFormatted: '95k'
    },
    region: 'brasil',
    niche: 'entretenimento',
    stats: {
      viewsFormatted: '88.5k',
      viewsCount: 88500,
      likesFormatted: '7.8k',
      sharesFormatted: '1.2k',
      commentsFormatted: '310'
    },
    metrics: {
      engagementRate: 10.1,
      sharesRatio: 0.15,
      growthVelocity: '+6k views/h',
      growthVelocityNum: 52,
      channelAnomalyRatio: 3.2,
      opportunityWindow: 'Estável',
      hookStrength: 65,
      retentionPrediction: 60
    },
    score: 58,
    scoreBadge: {
      label: 'Baixo Potencial / Observar',
      variant: 'low',
      color: '#949ba4'
    },
    isTrendAlert: false
  },
  {
    id: 'viral-yt-10',
    platform: 'youtube',
    title: 'Building Real-time Voice Bots with WebRTC and Speech-to-Text',
    description: 'Technical walkthrough of pipeline bottlenecks and memory leak mitigations in Node & Go.',
    hookTranscript: '“Here is why handling audio buffers in pure JavaScript will choke your server at 50 concurrent calls...”',
    videoUrl: 'https://www.youtube.com/watch?v=webrtc_code',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640&q=80',
    durationFormatted: '24:50',
    publishedAt: 'Há 1 dia',
    author: {
      name: 'Dev Architecture',
      handle: '@dev_arch',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120',
      followersFormatted: '380k',
      verified: true
    },
    region: 'global',
    niche: 'ia_tech',
    stats: {
      viewsFormatted: '92.1k',
      viewsCount: 92100,
      likesFormatted: '8.4k',
      sharesFormatted: '980',
      commentsFormatted: '540'
    },
    metrics: {
      engagementRate: 10.2,
      sharesRatio: 0.11,
      growthVelocity: '+5k views/h',
      growthVelocityNum: 48,
      channelAnomalyRatio: 2.8,
      opportunityWindow: 'Evergreen',
      hookStrength: 58,
      retentionPrediction: 55
    },
    score: 54,
    scoreBadge: {
      label: 'Baixo Potencial / Observar',
      variant: 'low',
      color: '#949ba4'
    },
    isTrendAlert: false
  }
];

// Helper para verificar se o usuário é Administrador Master da plataforma
export function isPlatformAdmin(user?: { id?: string; email?: string; role?: string } | null): boolean {
  if (!user) return false;
  return (
    user.id === 'admin-campanholo32' ||
    user.role === 'Administrador' ||
    user.role === 'admin' ||
    user.email === 'campanholo32@gmail.com' ||
    user.email === 'campanholo32gmail.com'
  );
}

// Obter IDs autorizados para visualizar a aba Virais
export function getAuthorizedUserIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTHORIZED_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  // Administrador sempre tem permissão por padrão
  return ['admin-campanholo32', 'campanholo32@gmail.com'];
}

// Salvar IDs autorizados (ação do Admin)
export function saveAuthorizedUserIds(userIds: string[]): void {
  try {
    // Garante que o Admin nunca seja removido da lista
    const unique = Array.from(new Set([...userIds, 'admin-campanholo32', 'campanholo32@gmail.com']));
    localStorage.setItem(STORAGE_KEYS.AUTHORIZED_USERS, JSON.stringify(unique));
  } catch {
    // Ignored
  }
}

// Checagem se um usuário específico possui permissão de acesso à aba Virais
export function isUserAuthorizedForVirals(user?: { id?: string; email?: string; role?: string } | null): boolean {
  if (!user) return false;
  if (isPlatformAdmin(user)) return true;

  const authorized = getAuthorizedUserIds();
  return (
    (!!user.id && authorized.includes(user.id)) ||
    (!!user.email && authorized.includes(user.email))
  );
}

// Obter lista de vídeos favoritos salvos
export function getFavoriteViralVideoIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_VIDEOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

// Alternar salvar/remover favorito
export function toggleFavoriteViralVideo(videoId: string): string[] {
  const current = getFavoriteViralVideoIds();
  const next = current.includes(videoId)
    ? current.filter(id => id !== videoId)
    : [...current, videoId];

  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_VIDEOS, JSON.stringify(next));
  } catch {}
  return next;
}

// Chaves de API das plataformas externas (descontinuado no cliente por segurança - usar Supabase Secrets)
export function getPlatformApiKeys(): ViralPlatformApiKeys {
  return {};
}

export function savePlatformApiKeys(_keys: ViralPlatformApiKeys): void {
  // Proibido salvar chaves no cliente. Configurar via: npx supabase secrets set
}

/**
 * Consulta de vídeos com suporte a filtros combinados de Plataforma, Nicho, Localidade,
 * Faixa de Score e Pesquisa de texto aberto.
 */
export async function fetchViralVideos(filters: {
  searchTerm?: string;
  platform?: ViralPlatform;
  niche?: ViralNiche;
  region?: ViralRegion;
  scoreRange?: ViralScoreRange;
}): Promise<ViralVideoItem[]> {
  // Carrega vídeos padrão + eventuais adicionados customizados
  let list = [...INITIAL_VIRAL_VIDEOS];
  try {
    const customRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_VIDEOS);
    if (customRaw) {
      const custom: ViralVideoItem[] = JSON.parse(customRaw);
      if (Array.isArray(custom)) {
        list = [...custom, ...list];
      }
    }
  } catch {}

  // Filtro de Plataforma
  if (filters.platform && filters.platform !== 'all') {
    list = list.filter(v => v.platform === filters.platform);
  }

  // Filtro de Nicho
  if (filters.niche && filters.niche !== 'all') {
    list = list.filter(v => v.niche === filters.niche);
  }

  // Filtro de Região
  if (filters.region && filters.region !== 'all') {
    list = list.filter(v => v.region === filters.region);
  }

  // Filtro de Faixa de Score
  if (filters.scoreRange && filters.scoreRange !== 'all') {
    if (filters.scoreRange === 'high') {
      list = list.filter(v => v.score >= 80);
    } else if (filters.scoreRange === 'medium') {
      list = list.filter(v => v.score >= 60 && v.score < 80);
    } else if (filters.scoreRange === 'low') {
      list = list.filter(v => v.score < 60);
    }
  }

  // Filtro de Pesquisa Livre
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const q = filters.searchTerm.toLowerCase().trim();
    list = list.filter(
      v =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.hookTranscript.toLowerCase().includes(q) ||
        v.author.name.toLowerCase().includes(q) ||
        v.author.handle.toLowerCase().includes(q)
    );
  }

  // Ordena por maior Score VVS2 por padrão
  return list.sort((a, b) => b.score - a.score);
}

