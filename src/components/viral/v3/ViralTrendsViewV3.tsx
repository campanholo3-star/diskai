import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Search,
  Globe,
  Sparkles,
  Bookmark,
  RotateCw,
  TrendingUp,
  AlertCircle,
  Clock,
  History,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useDiskai } from '../../../context/DiskaiContext';
import { isUserAuthorizedForVirals, isPlatformAdmin, getFavoriteViralVideoIds, toggleFavoriteViralVideo } from '../../../services/viralTrendsService';
import { searchAndAnalyzeViralTrendsV3 } from '../../../services/viralApiConnectorV3';
import { ViralVideoItemV3, ViralTopicItem, BudgetStatus } from '../../../types/viralV3';
import { ViralVideoCardV3 } from './ViralVideoCardV3';
import { ViralTopicCardV3 } from './ViralTopicCardV3';

interface ViralTrendsViewV3Props {
  onBackToServers?: () => void;
  onClose?: () => void;
}

export const ViralTrendsViewV3: React.FC<ViralTrendsViewV3Props> = ({ onBackToServers, onClose }) => {
  const { currentUser, theme } = useDiskai();
  const isLight = theme === 'light';

  // Permissões
  const isAdmin = isPlatformAdmin(currentUser);
  const isAuthorized = isUserAuthorizedForVirals(currentUser);

  // Tabs: 'recriar' (Vídeos de IA), 'pautas' (Notícias/Trends), 'todos' (Geral), 'favoritos'
  const [activeTab, setActiveTab] = useState<'recriar' | 'pautas' | 'todos' | 'favoritos'>('recriar');
  const [selectedRegion, setSelectedRegion] = useState<'all' | 'brasil' | 'eua' | 'europa'>('brasil');
  const [searchTerm, setSearchTerm] = useState('');

  // Dados e Estado
  const [videos, setVideos] = useState<ViralVideoItemV3[]>([]);
  const [topics, setTopics] = useState<ViralTopicItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteViralVideoIds());
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);
  const [highAlertCount, setHighAlertCount] = useState(0);

  // Paginação
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Histórico de Buscas Salvas (últimos 7 dias)
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; region: string; timestamp: string; count: number }>>(() => {
    try {
      const saved = localStorage.getItem('diskai_viral_v3_history');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Carregamento de dados da Edge Function v3
  const loadTrends = async (manual: boolean = false) => {
    if (manual) setIsRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const res = await searchAndAnalyzeViralTrendsV3({
        region: selectedRegion === 'all' ? undefined : selectedRegion,
        query: searchTerm || undefined,
        lane: activeTab === 'pautas' ? 'pautas' : 'recriar',
        isManualRefresh: manual
      });

      if (res.success) {
        setVideos(res.videos || []);
        if (res.topics) setTopics(res.topics);
        if (res.budgetStatus) setBudgetStatus(res.budgetStatus);
        setHighAlertCount(res.highViralAlertCount || 0);

        if ((res as any).meta?.configSource === 'fallback') {
          setConfigWarning("Aviso de Configuração: O motor está operando com fallback padrão em memória (banco viral_scoring_config indisponível ou sem versão ativa).");
        } else {
          setConfigWarning(null);
        }

        // Salva busca no histórico local
        if (manual || searchTerm) {
          const entry = {
            query: searchTerm || 'Feed Geral',
            region: selectedRegion,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            count: res.videos?.length || 0
          };
          setSearchHistory(prev => {
            const next = [entry, ...prev.slice(0, 9)];
            try { localStorage.setItem('diskai_viral_v3_history', JSON.stringify(next)); } catch (_) {}
            return next;
          });
        }
      } else {
        // Se a v3 falhar, exibe o erro na tela sem cair em mocks silenciosos
        const errText = res.errors?.join(' | ') || res.rawError || 'Falha ao processar tendências na Edge Function v3';
        setErrorMsg(errText);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado na chamada ao motor viral v3');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrends();
    setPage(1);
  }, [selectedRegion, activeTab]);

  const handleToggleFavorite = (id: string) => {
    const updated = toggleFavoriteViralVideo(id);
    setFavoriteIds([...updated]);
  };

  // Filtragem local por termo de busca e tab
  const filteredVideos = useMemo(() => {
    let list = videos;
    if (activeTab === 'favoritos') {
      list = list.filter(v => favoriteIds.includes(v.id));
    } else if (activeTab === 'recriar') {
      list = list.filter(v => v.lane === 'recriar' || v.isAiGenerated);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(v =>
        v.title.toLowerCase().includes(term) ||
        v.description?.toLowerCase().includes(term) ||
        v.author.name.toLowerCase().includes(term) ||
        v.author.handle.toLowerCase().includes(term)
      );
    }

    return list;
  }, [videos, activeTab, favoriteIds, searchTerm]);

  // Paginação dos vídeos
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / ITEMS_PER_PAGE));
  const paginatedVideos = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredVideos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVideos, page]);

  if (!isAuthorized && !isAdmin) {
    return (
      <div className={`p-8 rounded-3xl border text-center max-w-md mx-auto my-12 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#2b2d31] border-[#1e1f22] text-slate-100'
      }`}>
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold mb-2">Acesso Restrito ao Módulo Virais</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Esta funcionalidade é reservada a administradores ou membros autorizados da equipe de criação.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Voltar ao Hub
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-300">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#5865F2] to-emerald-500 text-white shadow-sm">
              Motor V3 Calibrado
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-[#949ba4] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              100% no Servidor (Sem inventar dados)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            Descoberta Viral com IA
            <Sparkles className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#949ba4] mt-0.5 max-w-2xl leading-relaxed">
            Identifique vídeos virais feitos com IA onde o alcance superou o tamanho da conta e explore pautas quentes do Trends prontas para recriação.
          </p>
        </div>

        {/* Controles de Direita: Orçamento, Região e Atualizar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indicador de Orçamento Diário */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e1f22] border-slate-700/60 text-slate-300'
            }`}
            title="Orçamento diário gratuito: Apify máx $0.16/dia, YouTube 8.000 unidades/dia"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono text-[11px]">
              Apify: ${budgetStatus?.apify.usedUsd.toFixed(2) || '0.00'} / $0.16
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 uppercase font-bold text-emerald-500">
              {budgetStatus?.mode || 'leve'}
            </span>
          </div>

          {/* Seletor Regional */}
          <div className="flex items-center gap-1 p-1 rounded-xl border bg-black/5 dark:bg-black/20 border-black/10 dark:border-white/10 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            {(['brasil', 'eua', 'europa', 'all'] as const).map(reg => (
              <button
                key={reg}
                type="button"
                onClick={() => setSelectedRegion(reg)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedRegion === reg
                    ? 'bg-[#5865F2] text-white shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {reg === 'brasil' ? '🇧🇷 BR' : reg === 'eua' ? '🇺🇸 US' : reg === 'europa' ? '🇪🇺 EU' : '🌐 Todos'}
              </button>
            ))}
          </div>

          {/* Botão Atualizar */}
          <button
            type="button"
            onClick={() => loadTrends(true)}
            disabled={isRefreshing || loading}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#5865F2]' : ''}`} />
            <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* ─── BARRA DE NAVEGAÇÃO: ABAS, BUSCA E HISTÓRICO ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Abas Principais */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border bg-black/5 dark:bg-black/20 border-black/10 dark:border-white/10 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('recriar')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'recriar'
                ? 'bg-[#5865F2] text-white shadow-md'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Vídeos de IA (Recriar)</span>
            {videos.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {videos.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pautas')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'pautas'
                ? 'bg-[#5865F2] text-white shadow-md'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Pautas & Notícias</span>
            {topics.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {topics.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('todos')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'todos'
                ? 'bg-[#5865F2] text-white shadow-md'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos os Formatos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favoritos')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'favoritos'
                ? 'bg-[#5865F2] text-white shadow-md'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 fill-current" />
            <span>Favoritos</span>
            {favoriteIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                {favoriteIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Caixa de Busca com Histórico de 7 Dias */}
        <div className="relative flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar em títulos e nichos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => setShowHistoryDropdown(searchHistory.length > 0)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border transition-colors outline-none ${
                isLight
                  ? 'bg-white border-slate-200 focus:border-[#5865F2] text-slate-900'
                  : 'bg-[#1e1f22] border-slate-700/60 focus:border-[#5865F2] text-slate-100'
              }`}
            />
          </div>

          {/* Dropdown de Histórico de Buscas Salvas */}
          {showHistoryDropdown && searchHistory.length > 0 && (
            <div
              className={`absolute right-0 top-10 w-72 z-30 rounded-2xl border shadow-xl p-2 text-xs ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#2b2d31] border-[#1e1f22] text-slate-100'
              }`}
              onMouseLeave={() => setShowHistoryDropdown(false)}
            >
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10 dark:border-white/10 px-2">
                <span className="font-bold text-[10px] uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <History className="w-3 h-3" /> Buscas Recentes (7d)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('diskai_viral_v3_history');
                    setSearchHistory([]);
                  }}
                  className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              </div>
              <div className="space-y-0.5">
                {searchHistory.map((h, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchTerm(h.query === 'Feed Geral' ? '' : h.query);
                      setShowHistoryDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate max-w-[150px] font-medium">{h.query}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{h.timestamp}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── AVISO DE CONFIGURAÇÃO EM MODO FALLBACK ─── */}
      {configWarning && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${
          isLight ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-800/80 text-amber-200'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="flex-1 font-medium">{configWarning}</span>
        </div>
      )}

      {/* ─── MENSAGEM DE ERRO VISUAL OU AUTENTICAÇÃO (SEM REGRESSÃO SILENCIOSA) ─── */}
      {errorMsg && (
        <div className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
          errorMsg.includes('Entre com sua conta')
            ? (isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/40 border-amber-800 text-amber-200')
            : (isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/40 border-rose-800 text-rose-200')
        }`}>
          <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${errorMsg.includes('Entre com sua conta') ? 'text-amber-500' : 'text-rose-500'}`} />
          <div className="flex-1">
            <h3 className="font-bold text-xs uppercase tracking-wider mb-0.5">
              {errorMsg.includes('Entre com sua conta') ? 'Autenticação Necessária' : 'Aviso na Edge Function v3'}
            </h3>
            <p className="text-xs leading-relaxed opacity-90">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => loadTrends(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold text-white transition-colors shadow-sm cursor-pointer ${
              errorMsg.includes('Entre com sua conta') ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* ─── CONTEÚDO PRINCIPAL (RAIAS) ─── */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <RotateCw className="w-8 h-8 text-[#5865F2] animate-spin" />
          <p className="text-xs font-semibold text-slate-500">
            Processando métricas e executando motor VVS2 v3...
          </p>
        </div>
      ) : activeTab === 'pautas' ? (
        // RAIA 2: PAUTAS E NOTÍCIAS REAIS COM OPORTUNIDADE
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Notícias Verificadas com Oportunidade de Vídeo de IA ({topics.length})
            </h2>
          </div>

          {topics.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <p className="text-xs text-slate-500">Nenhuma pauta encontrada para a região selecionada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map(topic => (
                <ViralTopicCardV3
                  key={topic.id}
                  topic={topic}
                  isLight={isLight}
                  onSelectPrompt={p => {
                    setSearchTerm(p.slice(0, 30));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        // RAIA 1: VÍDEOS DE IA (RECRIAR) OU FAVORITOS
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                {activeTab === 'favoritos' ? 'Vídeos Salvos nos Favoritos' : 'Vídeos de IA com Alta Relação Views ÷ Seguidores'}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#5865F2]/10 text-[#5865F2]">
                {filteredVideos.length} vídeos
              </span>
            </div>

            {highAlertCount > 0 && activeTab !== 'favoritos' && (
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-current" />
                {highAlertCount} com Score Viral (≥ 80)
              </span>
            )}
          </div>

          {filteredVideos.length === 0 ? (
            <div className={`py-16 px-4 rounded-3xl border text-center space-y-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
            }`}>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {activeTab === 'favoritos' ? 'Nenhum vídeo favoritado até o momento.' : 'Nenhum vídeo viral localizado para este filtro.'}
              </p>
              <p className="text-xs text-slate-500">
                {activeTab === 'favoritos' ? 'Marque o ícone de marcador nos cards para fixar seus vídeos favoritos.' : 'Tente selecionar outra região geográfica ou clique em "Atualizar".'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {paginatedVideos.map(video => (
                  <ViralVideoCardV3
                    key={video.id}
                    video={video}
                    isLight={isLight}
                    isFavorite={favoriteIds.includes(video.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-40 cursor-pointer ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#2b2d31] border-[#1e1f22]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold px-3 py-1 font-mono">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-40 cursor-pointer ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#2b2d31] border-[#1e1f22]'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

