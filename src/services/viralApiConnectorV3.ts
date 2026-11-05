/**
 * Conector de APIs e Telemetria para Tendências Virais (v3 Consolidada)
 * 
 * Conecta-se exclusivamente à Edge Function `viral-analyzer-v3`.
 * Não inventa dados, propaga erros reais e respeita o governador de cotas.
 */

import { getSupabaseClient } from './supabase';
import { ViralSearchInput } from './viralApiConnector';
import { ViralVideoItemV3, ViralApiResponseV3 } from '../types/viralV3';

export async function searchAndAnalyzeViralTrendsV3(
  input: ViralSearchInput = {}
): Promise<ViralApiResponseV3> {
  const supabase = getSupabaseClient();
  const errors: string[] = [];

  const regionMapping: Record<string, string> = {
    brasil: 'BR',
    br: 'BR',
    eua: 'US',
    us: 'US',
    europa: 'EU',
    eu: 'EU',
  };
  const rawRegion = input.region && input.region !== 'all' ? input.region.toLowerCase() : 'br';
  const country = regionMapping[rawRegion] || 'BR';
  const lang = country === 'BR' ? 'pt' : 'en';

  try {
    const { data, error } = await supabase.functions.invoke('viral-analyzer-v3', {
      body: {
        query: input.query?.trim() || undefined,
        country,
        lang,
        niche: input.niche && input.niche !== 'all' ? input.niche : undefined,
        platform: input.platform && input.platform !== 'all' ? input.platform : 'all',
        lane: input.lane || 'recriar',
        mode: input.isManualRefresh ? 'profundo' : 'leve',
        refreshCount: input.refreshSeed || 0
      }
    });

    if (error) {
      let friendlyMsg = error.message || 'Erro ao conectar à Edge Function viral-analyzer-v3';
      if (error.status === 404 || error.message?.includes('404')) {
        friendlyMsg = 'Edge Function viral-analyzer-v3 não encontrada (404). Verifique se o deploy foi executado no Supabase.';
      } else if (error.status === 401 || error.message?.includes('401')) {
        friendlyMsg = 'Entre com sua conta Supabase para usar o Virais v3';
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

      const rawVideos: ViralVideoItemV3[] = Array.isArray(data.videos) ? data.videos : [];
      const topics = Array.isArray(data.topics) ? data.topics : [];
      const highAlerts = rawVideos.filter(v => v.score >= 80).length;

      return {
        success: rawVideos.length > 0 || topics.length > 0 || errors.length === 0,
        total: rawVideos.length,
        videos: rawVideos,
        topics,
        budgetStatus: data.meta?.budgetStatus,
        highViralAlertCount: highAlerts,
        source: rawVideos.length > 0 ? 'edge_function' : 'empty',
        cachedAt: new Date().toISOString(),
        savedToSupabase: false,
        newlyFetchedCount: rawVideos.length,
        errors: errors.length > 0 ? errors : undefined
      } as any;
    }

    return {
      success: false,
      total: 0,
      videos: [],
      highViralAlertCount: 0,
      source: 'empty',
      cachedAt: new Date().toISOString(),
      savedToSupabase: false,
      newlyFetchedCount: 0,
      errors: ['Resposta vazia da Edge Function viral-analyzer-v3']
    };
  } catch (err: any) {
    errors.push(`Falha de rede ao conectar à Edge Function v3: ${err?.message || 'Serviço inacessível'}`);
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
}

