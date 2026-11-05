/// <reference lib="es2022" />

// Supabase Edge Function v3: apifyAdapter.ts
// Adaptador Puro para Atores Apify (Construção de Input e Mapeamento de Output)
// Desacoplado de suposições rígidas, aguardando fixtures reais do usuário (verified_at: null)

export interface ApifyInputOptions {
  actorSlug: string;
  targetUrls?: string[];
  usernames?: string[];
  resultsLimit?: number;
}

/**
 * Constrói o payload de entrada de forma flexível
 */
export function buildApifyInput(options: ApifyInputOptions): Record<string, any> {
  const payload: Record<string, any> = {};

  if (options.targetUrls && options.targetUrls.length > 0) {
    payload.directUrls = options.targetUrls;
    payload.startUrls = options.targetUrls.map(url => ({ url }));
  }

  if (options.usernames && options.usernames.length > 0) {
    payload.usernames = options.usernames;
  }

  if (typeof options.resultsLimit === 'number') {
    payload.resultsLimit = options.resultsLimit;
  }

  return payload;
}

/**
 * Mapeia o item retornado pelo dataset do Apify para a estrutura canônica
 */
export function mapApifyItemToCandidate(item: Record<string, any>): {
  postId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  caption: string;
  views: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  durationSec: number | null;
  publishedAt: string;
  authorHandle: string;
  authorName: string;
  followersCount: number | null;
} | null {
  if (!item) return null;

  const postId = item.shortCode || item.id || item.code || '';
  if (!postId) return null;

  const caption = item.caption || item.text || item.title || '';
  const videoUrl = item.url || (postId ? `https://www.instagram.com/reel/${postId}/` : '');
  const thumbnailUrl = item.displayUrl || item.thumbnailUrl || item.videoThumbnail || '';
  const views = Number(item.videoViewCount || item.viewsCount || item.playCount || item.views || 0);
  const likes = item.likesCount ?? item.likeCount ?? item.likes ?? null;
  const comments = item.commentsCount ?? item.commentCount ?? item.comments ?? null;
  const shares = item.sharesCount ?? item.shareCount ?? item.shares ?? null;
  const durationSec = item.videoDuration ? Math.round(Number(item.videoDuration)) : null;
  const publishedAt = item.timestamp || item.takenAt || item.publishedAt || new Date().toISOString();
  const authorHandle = item.ownerUsername || item.username || item.authorHandle || 'instagram';
  const authorName = item.ownerFullName || item.fullName || authorHandle;
  const followersCount = item.ownerFollowersCount ?? item.followersCount ?? null;

  return {
    postId,
    videoUrl,
    thumbnailUrl,
    title: caption ? caption.slice(0, 90) : 'Reel de IA',
    caption,
    views,
    likes: likes !== null ? Number(likes) : null,
    comments: comments !== null ? Number(comments) : null,
    shares: shares !== null ? Number(shares) : null,
    durationSec,
    publishedAt,
    authorHandle: authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`,
    authorName,
    followersCount: followersCount !== null ? Number(followersCount) : null
  };
}

