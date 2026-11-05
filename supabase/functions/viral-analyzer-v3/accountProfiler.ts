/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Supabase Edge Function v3: accountProfiler.ts
// Baselines de Criadores, Cache de 24h e Atribuição de Tags Informativas

export interface AccountProfile {
  platform: string;
  accountId: string;
  handle: string;
  followers: number | null;
  postsCount: number | null;
  followersPerPost: number | null;
  platformCreatedAt: string | null;
  ageMonths: number | null;
  medianViews: number;
  medianEngagement: number;
  posts30d: number;
  isWatchlist: boolean;
  tags: string[];
}

export class AccountProfiler {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Resgata perfil em cache de 24h ou inicializa
   */
  async getProfile(platform: string, accountId: string, handle: string): Promise<AccountProfile | null> {
    try {
      const { data } = await this.supabase
        .from('viral_accounts')
        .select('*')
        .eq('platform', platform)
        .eq('account_id', accountId)
        .maybeSingle();

      if (data) {
        const followers = data.followers !== null ? Number(data.followers) : null;
        const postsCount = data.posts_count !== null ? Number(data.posts_count) : null;
        const followersPerPost = (followers !== null && postsCount && postsCount > 0)
          ? Math.round(followers / postsCount)
          : null;

        let ageMonths: number | null = null;
        if (data.platform_created_at) {
          const created = new Date(data.platform_created_at).getTime();
          ageMonths = Math.max(0, Math.round((Date.now() - created) / (30 * 86_400_000)));
        }

        const tags: string[] = [];
        if ((ageMonths !== null && ageMonths <= 12) || (followers !== null && followers <= 50_000)) {
          tags.push('conta-emergente');
        }

        return {
          platform,
          accountId,
          handle: data.handle || handle,
          followers,
          postsCount,
          followersPerPost,
          platformCreatedAt: data.platform_created_at,
          ageMonths,
          medianViews: Number(data.median_views || 0),
          medianEngagement: Number(data.median_engagement || 0),
          posts30d: Number(data.posts_30d || 0),
          isWatchlist: Boolean(data.is_watchlist),
          tags
        };
      }
    } catch (_) {}

    return null;
  }

  /**
   * Computa tags informativas de um candidato no contexto de sua conta
   */
  computeTags(params: {
    views: number;
    followersCount: number | null;
    medianViews: number;
    aiTier: 'confirmada' | 'provavel' | 'baixa';
    ageMonths?: number | null;
  }): string[] {
    const tags: string[] = [];

    // Tag de IA
    if (params.aiTier === 'confirmada') tags.push('ia-confirmada');
    else if (params.aiTier === 'provavel') tags.push('ia-provavel');

    // Conta Emergente (<= 12 meses ou <= 50k seguidores)
    const isSmallFollowers = params.followersCount !== null && params.followersCount <= 50_000;
    const isYoungAccount = params.ageMonths !== null && params.ageMonths !== undefined && params.ageMonths <= 12;
    if (isSmallFollowers || isYoungAccount) {
      tags.push('conta-emergente');
    }

    // Hit Isolado (views muito altas em perfil sem histórico de tração consistente)
    if (params.medianViews > 0 && params.views >= 5 * params.medianViews && params.medianViews < 2000) {
      tags.push('hit-isolado');
    }

    return tags;
  }

  /**
   * Poda as N piores contas automáticas (source='auto')
   * Contas manuais (source='manual') NUNCA são removidas.
   */
  async pruneWorstAutoAccounts(limitToPrune: number = 5): Promise<number> {
    try {
      const { data: candidates } = await this.supabase
        .from('viral_accounts')
        .select('id, handle, median_views, posts_30d, sampled_at')
        .eq('source', 'auto')
        .order('median_views', { ascending: true })
        .order('sampled_at', { ascending: true })
        .limit(limitToPrune);

      if (candidates && candidates.length > 0) {
        const idsToDelete = candidates.map((c: any) => c.id);
        const { error } = await this.supabase
          .from('viral_accounts')
          .delete()
          .in('id', idsToDelete)
          .eq('source', 'auto'); // Salvaguarda inviolável: nunca deleta contas manuais

        if (!error) return idsToDelete.length;
      }
    } catch (_) {}
    return 0;
  }

  /**
   * Efeito Bola de Neve com Teto Rígido (Máximo 30 contas automáticas)
   */
  async snowballAccountIfHighViral(params: {
    platform: string;
    accountId: string;
    handle: string;
    followers: number | null;
    views: number;
    score: number;
    maxAutoAccounts?: number;
  }): Promise<boolean> {
    if (params.score < 80 || !params.accountId) return false;
    const maxAccounts = params.maxAutoAccounts || 30;

    try {
      // 1. Verifica total atual de contas automáticas
      const { count } = await this.supabase
        .from('viral_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'auto');

      const currentCount = count || 0;
      if (currentCount >= maxAccounts) {
        // Teto atingido: executa poda das 5 piores para liberar espaço
        await this.pruneWorstAutoAccounts(5);
      }

      await this.supabase.from('viral_accounts').upsert({
        platform: params.platform,
        account_id: params.accountId,
        handle: params.handle,
        followers: params.followers,
        is_watchlist: true,
        source: 'auto',
        sampled_at: new Date().toISOString()
      }, { onConflict: 'platform,account_id' });

      return true;
    } catch (_) {
      return false;
    }
  }
}

