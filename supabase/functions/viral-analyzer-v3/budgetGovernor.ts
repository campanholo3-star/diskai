/// <reference lib="es2022" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Supabase Edge Function v3: budgetGovernor.ts
// Governador de Cota Diária e Cache Inteligente

export interface BudgetConfig {
  apifyMaxUsdDaily: number;       // Padrão: 0.16 USD
  youtubeMaxUnitsDaily: number;   // Padrão: 8000 unidades (reserva de 20%)
  cacheTtlMinutes: number;        // Padrão: 45 min
  instagramShare: number;         // 0.60 (60% do orçamento Apify)
  tiktokShare: number;            // 0.40 (40% do orçamento Apify)
  geminiDailyRequests: number;    // Padrão provisório: 400 requisições
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  apifyMaxUsdDaily: 0.16,
  youtubeMaxUnitsDaily: 8000,
  cacheTtlMinutes: 45,
  instagramShare: 0.60,
  tiktokShare: 0.40,
  geminiDailyRequests: 400
};

export interface BudgetLedgerRecord {
  data: string; // YYYY-MM-DD
  fonte: 'apify_instagram' | 'apify_tiktok' | 'youtube' | 'gemini';
  unidade: 'usd' | 'units' | 'tokens';
  quantidade: number;
  custo_estimado: number;
}

export class BudgetGovernor {
  private config: BudgetConfig;
  private supabase: any;

  constructor(supabaseClient: any, config: Partial<BudgetConfig> = {}) {
    this.supabase = supabaseClient;
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Consulta o gasto acumulado de hoje no banco (viral_usage_ledger)
   */
  async getTodayUsage(): Promise<{
    apifyUsdTotal: number;
    apifyInstagramUsd: number;
    apifyTiktokUsd: number;
    youtubeUnits: number;
    geminiRequests: number;
  }> {
    const today = this.getTodayString();
    try {
      const { data, error } = await this.supabase
        .from('viral_usage_ledger')
        .select('fonte, unidade, quantidade, custo_estimado')
        .eq('data', today);

      if (error || !data) {
        return { apifyUsdTotal: 0, apifyInstagramUsd: 0, apifyTiktokUsd: 0, youtubeUnits: 0, geminiRequests: 0 };
      }

      let apifyInstagramUsd = 0;
      let apifyTiktokUsd = 0;
      let youtubeUnits = 0;
      let geminiRequests = 0;

      for (const row of data) {
        if (row.fonte === 'apify_instagram') apifyInstagramUsd += Number(row.custo_estimado || 0);
        else if (row.fonte === 'apify_tiktok') apifyTiktokUsd += Number(row.custo_estimado || 0);
        else if (row.fonte === 'youtube') youtubeUnits += Number(row.quantidade || 0);
        else if (row.fonte === 'gemini') geminiRequests += Number(row.quantidade || 0);
      }

      return {
        apifyUsdTotal: apifyInstagramUsd + apifyTiktokUsd,
        apifyInstagramUsd,
        apifyTiktokUsd,
        youtubeUnits,
        geminiRequests
      };
    } catch (_) {
      return { apifyUsdTotal: 0, apifyInstagramUsd: 0, apifyTiktokUsd: 0, youtubeUnits: 0, geminiRequests: 0 };
    }
  }

  /**
   * Avalia se uma fonte tem saldo suficiente antes de executar
   */
  async canExecute(source: 'youtube' | 'apify_instagram' | 'apify_tiktok' | 'gemini', estimatedAmount: number): Promise<{
    allowed: boolean;
    reason?: string;
    remaining: number;
  }> {
    const usage = await this.getTodayUsage();

    if (source === 'gemini') {
      const remaining = this.config.geminiDailyRequests - usage.geminiRequests;
      if (remaining < estimatedAmount) {
        return {
          allowed: false,
          remaining: Math.max(0, remaining),
          reason: 'gemini_budget_cap'
        };
      }
      return { allowed: true, remaining };
    }

    if (source === 'youtube') {
      const remaining = this.config.youtubeMaxUnitsDaily - usage.youtubeUnits;
      if (remaining < estimatedAmount) {
        return {
          allowed: false,
          remaining: Math.max(0, remaining),
          reason: `Teto diário do YouTube atingido (${usage.youtubeUnits}/${this.config.youtubeMaxUnitsDaily} un). Preservando cota.`
        };
      }
      return { allowed: true, remaining };
    }

    if (source === 'apify_instagram') {
      const maxInstagramUsd = this.config.apifyMaxUsdDaily * this.config.instagramShare;
      const remaining = maxInstagramUsd - usage.apifyInstagramUsd;
      if (remaining < estimatedAmount) {
        return {
          allowed: false,
          remaining: Math.max(0, remaining),
          reason: `Teto diário Apify Instagram atingido ($${usage.apifyInstagramUsd.toFixed(3)}/$${maxInstagramUsd.toFixed(3)}).`
        };
      }
      return { allowed: true, remaining };
    }

    if (source === 'apify_tiktok') {
      const maxTiktokUsd = this.config.apifyMaxUsdDaily * this.config.tiktokShare;
      const remaining = maxTiktokUsd - usage.apifyTiktokUsd;
      if (remaining < estimatedAmount) {
        return {
          allowed: false,
          remaining: Math.max(0, remaining),
          reason: `Teto diário Apify TikTok atingido ($${usage.apifyTiktokUsd.toFixed(3)}/$${maxTiktokUsd.toFixed(3)}).`
        };
      }
      return { allowed: true, remaining };
    }

    return { allowed: true, remaining: 999 };
  }

  /**
   * Registra o consumo realizado no viral_usage_ledger
   */
  async recordUsage(
    fonte: 'apify_instagram' | 'apify_tiktok' | 'youtube' | 'gemini',
    unidade: 'usd' | 'units' | 'tokens',
    quantidade: number,
    custoEstimado: number
  ): Promise<void> {
    const today = this.getTodayString();
    try {
      await this.supabase.from('viral_usage_ledger').insert({
        data: today,
        fonte,
        unidade,
        quantidade,
        custo_estimado: custoEstimado
      });
    } catch (_) {}
  }

  /**
   * Resumo de status do orçamento para a UI
   */
  async getStatus(): Promise<{
    date: string;
    apify: { usedUsd: number; maxUsd: number; remainingUsd: number; isExhausted: boolean };
    youtube: { usedUnits: number; maxUnits: number; remainingUnits: number; isExhausted: boolean };
  }> {
    const usage = await this.getTodayUsage();
    const remainingApify = Math.max(0, this.config.apifyMaxUsdDaily - usage.apifyUsdTotal);
    const remainingYt = Math.max(0, this.config.youtubeMaxUnitsDaily - usage.youtubeUnits);

    return {
      date: this.getTodayString(),
      apify: {
        usedUsd: Number(usage.apifyUsdTotal.toFixed(3)),
        maxUsd: this.config.apifyMaxUsdDaily,
        remainingUsd: Number(remainingApify.toFixed(3)),
        isExhausted: remainingApify <= 0.005
      },
      youtube: {
        usedUnits: usage.youtubeUnits,
        maxUnits: this.config.youtubeMaxUnitsDaily,
        remainingUnits: remainingYt,
        isExhausted: remainingYt < 100
      }
    };
  }
}

