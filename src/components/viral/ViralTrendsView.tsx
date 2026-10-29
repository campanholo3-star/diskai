import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Search,
  Filter,
  Globe,
  Layers,
  ShieldCheck,
  Key,
  Bookmark,
  Sparkles,
  Lock,
  RotateCcw,
  RotateCw,
  TrendingUp,
  BarChart2,
  SlidersHorizontal,
  ChevronDown,
  X,
  AlertCircle,
  Shield
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import {
  ViralPlatform,
  ViralNiche,
  ViralRegion,
  ViralVideoItem,
  isUserAuthorizedForVirals,
  isPlatformAdmin,
  getFavoriteViralVideoIds,
  toggleFavoriteViralVideo
} from '../../services/viralTrendsService';
import { searchAndAnalyzeViralTrends } from '../../services/viralApiConnector';
import { ViralVideoCard } from './ViralVideoCard';
import { ViralAccessManagementModal } from './ViralAccessManagementModal';
import { ViralApiKeysModal } from './ViralApiKeysModal';
import { ViralVideoDetailModal } from './ViralVideoDetailModal';

interface ViralTrendsViewProps {
  onBackToServers?: () => void;
  onClose?: () => void;
}

export const ViralTrendsView: React.FC<ViralTrendsViewProps> = ({ onBackToServers, onClose }) => {
  const { currentUser, theme } = useDiskai();
  const isLight = theme === 'light';

  // Permissões
  const isAdmin = isPlatformAdmin(currentUser);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() =>
    isUserAuthorizedForVirals(currentUser)
  );

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<ViralPlatform>('all');
  const [selectedNiche, setSelectedNiche] = useState<ViralNiche>('all');
  const [selectedRegion, setSelectedRegion] = useState<ViralRegion>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Estados de Dados e Diagnóstico
  const [videos, setVideos] = useState<ViralVideoItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteViralVideoIds());
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [highAlertCount, setHighAlertCount] = useState(0);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [liveErrors, setLiveErrors] = useState<string[]>([]);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [keysPresent, setKeysPresent] = useState<{ youtube: boolean; apify: boolean }>({
    youtube: false,
    apify: false
  });

  // Modais
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);
  const [selectedDetailVideo, setSelectedDetailVideo] = useState<ViralVideoItem | null>(null);

  // Re-avalia autorização
  const refreshAccessState = () => {
    setIsAuthorized(isUserAuthorizedForVirals(currentUser));
  };

  // Carrega vídeos conforme os filtros e aciona a Edge Function
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(() => {
      searchAndAnalyzeViralTrends({
        query: searchTerm,
        platform: selectedPlatform,
        niche: selectedNiche,
        region: selectedRegion,
        demoMode
      })
        .then(res => {
          if (isMounted) {
            if (res.errors && res.errors.length > 0) {
              setLiveErrors(res.errors);
            } else {
              setLiveErrors([]);
            }
            setDbWarning(res.dbError || null);
            if (res.keysPresent) {
              setKeysPresent(res.keysPresent);
            }

            if (onlyFavorites) {
              setVideos(res.videos.filter(v => favoriteIds.includes(v.id)));
            } else {
              setVideos(res.videos);
            }
            setHighAlertCount(res.highViralAlertCount);
            setLoading(false);
          }
        })
        .catch(err => {
          if (isMounted) {
            setLiveErrors([err?.message || 'Erro inesperado na análise de tendências']);
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, selectedPlatform, selectedNiche, selectedRegion, onlyFavorites, favoriteIds, demoMode]);

  const handleToggleFavorite = (videoId: string) => {
    const updated = toggleFavoriteViralVideo(videoId);
    setFavoriteIds(updated);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedPlatform('all');
    setSelectedNiche('all');
    setSelectedRegion('all');
    setOnlyFavorites(false);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await searchAndAnalyzeViralTrends({
        query: searchTerm,
        platform: selectedPlatform,
        niche: selectedNiche,
        region: selectedRegion,
        refreshSeed: Date.now(),
        isManualRefresh: true,
        demoMode
      });

      if (res.errors && res.errors.length > 0) {
        setLiveErrors(res.errors);
      } else {
        setLiveErrors([]);
      }
      setDbWarning(res.dbError || null);
      if (res.keysPresent) {
        setKeysPresent(res.keysPresent);
      }

      if (onlyFavorites) {
        setVideos(res.videos.filter(v => favoriteIds.includes(v.id)));
      } else {
        setVideos(res.videos);
      }
      setHighAlertCount(res.highViralAlertCount);

      if (res.videos.length > 0) {
        const msg = demoMode
          ? `${res.videos.length} cards gerados no Modo Demonstração (DEMO)`
          : `${res.videos.length} novos vídeos coletados em tempo real via Edge Function`;
        setSyncNotice(msg);
        setTimeout(() => setSyncNotice(null), 5000);
      }
    } catch (err: any) {
      setLiveErrors([err?.message || 'Falha ao atualizar']);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Se o usuário não tiver permissão
  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-lg border border-amber-500/20">
          <Lock className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h2
            className={`text-xl font-black tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            Acesso Restrito: Inteligência de Vídeos Virais
          </h2>
          <p
            className={`text-xs leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-[#949ba4]'
            }`}
          >
            Esta seção estratégica monitora tendências do X, TikTok, Meta e YouTube.
            O acesso é restrito ao Administrador e a membros autorizados.
          </p>
        </div>

        {onBackToServers && (
          <button
            type="button"
            onClick={onBackToServers}
            className="px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs rounded-xl transition-all shadow"
          >
            Voltar para Comunidades
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* CABEÇALHO DA SEÇÃO VIRAIS COM TÍTULO E AÇÕES DO ADMINISTRADOR         */}
      {/* ===================================================================== */}
      <div
        className={`px-6 py-4 border-b flex items-center justify-between gap-4 flex-shrink-0 transition-colors ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#232428] border-[#1f2023]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <h2
            className={`font-black text-base sm:text-lg tracking-tight truncate ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            Inteligência de Vídeos Virais
          </h2>
        </div>

        {/* Controles de Acesso, APIs, Favoritos e Botão Fechar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdmin && (
            <>
              {/* Botão Gerenciar Acessos */}
              <button
                type="button"
                onClick={() => setAccessModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Gerenciar Acessos</span>
              </button>

              {/* Botão Status das Chaves de API */}
              <button
                type="button"
                onClick={() => setApiKeysModalOpen(true)}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#dbdee1]'
                }`}
                title="Status das Chaves de API (Segurança)"
              >
                <Key className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Toggle Modo Demonstração */}
          <button
            type="button"
            onClick={() => setDemoMode(prev => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              demoMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#dbdee1]'
            }`}
            title="Alterna entre busca ao vivo no YouTube/Apify e modo de demonstração offline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{demoMode ? 'Modo DEMO' : 'Demonstração'}</span>
          </button>

          {/* Botão de Filtro Rápido Favoritos */}
          <button
            type="button"
            onClick={() => setOnlyFavorites(prev => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              onlyFavorites
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-md'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#dbdee1]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">Favoritos</span>
            {favoriteIds.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                {favoriteIds.length}
              </span>
            )}
          </button>

          {/* Separador e Botão Fechar Modal */}
          {onClose && (
            <div className="flex items-center pl-2 ml-1 border-l border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'
                }`}
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BARRA DE FILTROS, PESQUISA E LOCALIDADE                               */}
      {/* ===================================================================== */}
      <div
        className={`px-6 py-3 border-b space-y-2.5 flex-shrink-0 transition-colors ${
          isLight
            ? 'bg-slate-50/80 border-slate-200'
            : 'bg-[#1e1f22] border-[#2b2d31]'
        }`}
      >
        {/* Linha 1: Barra de Pesquisa Geral e Seletores de Nicho & Localidade */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Barra de Pesquisa Geral com Ícone de Lupa */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por assunto ou tendência (ex: inteligência artificial)..."
              className={`w-full text-xs pl-9 pr-3.5 py-2 rounded-xl border transition-all focus:outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#5865F2]'
                  : 'bg-[#18191c] border-[#383a40] text-white placeholder-[#80848e] focus:border-[#5865F2]'
              }`}
            />
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro de Nicho Temático */}
          <div className="relative sm:w-48">
            <select
              value={selectedNiche}
              onChange={e => setSelectedNiche(e.target.value as ViralNiche)}
              className={`w-full text-xs px-3 py-2 rounded-xl border appearance-none font-semibold transition-all focus:outline-none cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-[#5865F2]'
                  : 'bg-[#18191c] border-[#383a40] text-white focus:border-[#5865F2]'
              }`}
            >
              <option value="all">📂 Todos os Nichos</option>
              <option value="ia_tech">🤖 IA & Tecnologia</option>
              <option value="negocios">💼 Negócios & SaaS</option>
              <option value="educacao">📚 Educação</option>
              <option value="entretenimento">🎮 Entretenimento</option>
              <option value="lifestyle">🌿 Lifestyle</option>
              <option value="geral">🌐 Geral</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3 pointer-events-none text-slate-400" />
          </div>

          {/* Filtro de Localidade */}
          <div className="relative sm:w-48">
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value as ViralRegion)}
              className={`w-full text-xs px-3 py-2 rounded-xl border appearance-none font-semibold transition-all focus:outline-none cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-[#5865F2]'
                  : 'bg-[#18191c] border-[#383a40] text-white focus:border-[#5865F2]'
              }`}
            >
              <option value="all">🌐 Todas as Regiões</option>
              <option value="brasil">🇧🇷 Brasil</option>
              <option value="eua">🇺🇸 Estados Unidos</option>
              <option value="europa">🇪🇺 Europa</option>
              <option value="asia">🌏 Ásia</option>
              <option value="global">🌐 Global</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3 pointer-events-none text-slate-400" />
          </div>

          {/* Botão Atualizar Tendências em Tempo Real */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer flex-shrink-0 ${
              isLight
                ? 'bg-[#5865F2] hover:bg-[#4752c4] text-white border-[#5865F2]'
                : 'bg-[#5865F2] hover:bg-[#4752c4] text-white border-[#5865F2]'
            } disabled:opacity-50`}
            title="Atualizar lote de vídeos virais e recalcular tendências em tempo real"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">{isRefreshing ? 'Atualizando...' : 'Atualizar Tendências'}</span>
          </button>
        </div>

        {/* Linha 2: Filtro de Plataformas */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-[#949ba4] mr-1 flex-shrink-0">
            Plataformas:
          </span>

          {[
            { id: 'all', label: 'Todas' },
            { id: 'youtube', label: 'YouTube' },
            { id: 'tiktok', label: 'TikTok' },
            { id: 'instagram', label: 'Instagram (Meta)' },
            { id: 'x', label: 'X (Twitter)' }
          ].map(p => {
            const active = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id as ViralPlatform)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#5865F2] text-white border-[#5865F2] shadow-sm font-bold'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-[#18191c] hover:bg-white/5 border-[#383a40] text-[#dbdee1]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BANNERS DE DIAGNÓSTICO E ERROS AO VIVO (PONTO 3 DA AUDITORIA)         */}
      {/* ===================================================================== */}
      {liveErrors.length > 0 && !demoMode && (
        <div className="mx-6 mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <div className="flex-1 space-y-1">
            <div className="font-bold flex items-center justify-between">
              <span>Fonte ao vivo indisponível:</span>
              <button
                type="button"
                onClick={() => setDemoMode(true)}
                className="underline text-[11px] font-bold hover:text-amber-700 dark:hover:text-amber-100 cursor-pointer"
              >
                Ativar Modo Demonstração
              </button>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
              {liveErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {dbWarning && (
        <div className="mx-6 mt-2 p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-500 dark:text-[#949ba4] text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
          <span>Aviso do banco de dados: {dbWarning}</span>
        </div>
      )}

      {syncNotice && (
        <div className="mx-6 mt-2 p-2.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2] dark:text-indigo-300 text-[11px] font-semibold flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* GRADE DE CARDS DE VÍDEOS VIRAIS                                       */}
      {/* ===================================================================== */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-[#5865F2]/20 border-t-[#5865F2] rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-400">
              {demoMode
                ? 'Gerando cards em Modo Demonstração...'
                : 'Consultando Edge Function viral-analyzer e computando VVS2...'}
            </p>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3
                className={`font-bold text-sm ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Nenhum vídeo retornado
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#949ba4] max-w-sm">
                {liveErrors.length > 0
                  ? 'As fontes ao vivo apresentaram pendências ou chaves não configuradas nos secrets.'
                  : 'Nenhum resultado correspondeu aos filtros aplicados.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-all cursor-pointer"
              >
                Redefinir Filtros
              </button>
              <button
                type="button"
                onClick={() => setDemoMode(true)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all cursor-pointer"
              >
                Ver Modo Demonstração
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map(video => (
              <ViralVideoCard
                key={video.id}
                video={video}
                isLight={isLight}
                isFavorite={favoriteIds.includes(video.id)}
                onToggleFavorite={handleToggleFavorite}
                onOpenDetails={setSelectedDetailVideo}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAIS: GERENCIAR ACESSOS, STATUS DE CHAVES E DETALHE DO VÍDEO        */}
      {/* ===================================================================== */}
      <ViralAccessManagementModal
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        isLight={isLight}
        onAccessUpdated={refreshAccessState}
      />

      <ViralApiKeysModal
        isOpen={apiKeysModalOpen}
        onClose={() => setApiKeysModalOpen(false)}
        isLight={isLight}
        keysPresent={keysPresent}
      />

      <ViralVideoDetailModal
        video={selectedDetailVideo}
        onClose={() => setSelectedDetailVideo(null)}
        isLight={isLight}
        isFavorite={selectedDetailVideo ? favoriteIds.includes(selectedDetailVideo.id) : false}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
};
