import React, { useState } from 'react';
import {
  Flame,
  Copy,
  Check,
  Bookmark,
  ExternalLink,
  Play,
  TrendingUp,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ViralVideoItem } from '../../services/viralTrendsService';

interface ViralVideoCardProps {
  video: ViralVideoItem;
  isLight: boolean;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenDetails: (video: ViralVideoItem) => void;
}

export const ViralVideoCard: React.FC<ViralVideoCardProps> = ({
  video,
  isLight,
  isFavorite,
  onToggleFavorite,
  onOpenDetails
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(video.videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlatformBadge = (platform: ViralVideoItem['platform']) => {
    switch (platform) {
      case 'tiktok':
        return {
          name: 'TikTok',
          bg: 'bg-black text-white border-white/20',
          dot: 'bg-[#00f2fe]'
        };
      case 'instagram':
        return {
          name: 'Instagram',
          bg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white border-transparent',
          dot: 'bg-white'
        };
      case 'youtube':
        return {
          name: 'YouTube',
          bg: 'bg-red-600 text-white border-transparent',
          dot: 'bg-white'
        };
      case 'x':
        return {
          name: 'X (Twitter)',
          bg: 'bg-neutral-900 text-white border-white/20',
          dot: 'bg-white'
        };
      default:
        return { name: platform, bg: 'bg-slate-700 text-white', dot: 'bg-white' };
    }
  };

  const getRegionLabel = (region: ViralVideoItem['region']) => {
    switch (region) {
      case 'brasil':
        return '🇧🇷 Brasil';
      case 'eua':
        return '🇺🇸 EUA';
      case 'europa':
        return '🇪🇺 Europa';
      case 'asia':
        return '🌏 Ásia';
      case 'global':
        return '🌐 Global';
      default:
        return '🌐 Global';
    }
  };

  const getNicheLabel = (niche: ViralVideoItem['niche']) => {
    switch (niche) {
      case 'ia_tech':
        return 'IA & Tecnologia';
      case 'negocios':
        return 'Negócios';
      case 'educacao':
        return 'Educação';
      case 'entretenimento':
        return 'Entretenimento';
      case 'lifestyle':
        return 'Lifestyle';
      case 'geral':
      default:
        return 'Geral';
    }
  };

  const platformInfo = getPlatformBadge(video.platform);

  return (
    <div
      onClick={() => onOpenDetails(video)}
      className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl ${
        isLight
          ? 'bg-white border-slate-200 hover:border-slate-400 text-slate-800'
          : 'bg-[#2b2d31] border-[#383a40] hover:border-[#5865F2]/80 text-[#dbdee1]'
      }`}
    >
      {/* Top Banner do Vídeo / Thumbnail Geométrico */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradiente de proteção */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 pointer-events-none" />

        {/* Badges de Destaque: DEMO, NOVO e Em Alta */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
          {video.isDemo && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md shadow-amber-500/40 border border-amber-300">
              <span>DEMO</span>
            </div>
          )}
          {video.isFresh && !video.isDemo && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#5865F2] text-white font-black text-[10px] tracking-wider uppercase shadow-md shadow-[#5865F2]/40 border border-white/20 animate-pulse">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>NOVO</span>
            </div>
          )}
          {video.isTrendAlert && (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-lg shadow-emerald-500/30">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Em Alta</span>
            </div>
          )}
        </div>

        {/* Badges de Plataforma e Região (Superior Direito) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1 ${platformInfo.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${platformInfo.dot}`} />
            {platformInfo.name}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm">
            {getRegionLabel(video.region)}
          </span>
        </div>

        {/* Botão de Play Central com Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Duração & Visualizações */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between text-[11px] font-bold text-white">
          <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            {video.stats.viewsFormatted} views
          </span>
          <span className="bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10">
            {video.durationFormatted}
          </span>
        </div>
      </div>

      {/* Conteúdo do Card: Limpo, Alinhado e Geométrico */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-3">
          {/* Header do Criador */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={video.author.avatarUrl}
                alt={video.author.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-black/10 dark:ring-white/10 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className={`font-bold text-xs truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {video.author.name}
                  </span>
                  {video.author.verified && (
                    <CheckCircle2 className="w-3 h-3 text-[#5865F2] flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-[#949ba4]">
                  <span>{video.author.handle}</span>
                  <span>•</span>
                  <span>{video.author.followersFormatted} seg.</span>
                </div>
              </div>
            </div>

            {/* Nicho */}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border flex-shrink-0 ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-white/5 border-white/10 text-[#dbdee1]'
              }`}
            >
              {getNicheLabel(video.niche)}
            </span>
          </div>

          {/* Título e Descrição */}
          <div className="space-y-1">
            <h3
              className={`font-bold text-sm leading-snug line-clamp-2 group-hover:text-[#5865F2] transition-colors ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {video.title}
            </h3>
            <p
              className={`text-xs line-clamp-2 leading-relaxed ${
                isLight ? 'text-slate-600' : 'text-[#949ba4]'
              }`}
            >
              {video.description}
            </p>
          </div>

          {/* Gancho (Hook) em Destaque Minimalista */}
          <div
            className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-1 ${
              isLight
                ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3 h-3" />
              <span>Gancho de Abertura</span>
            </div>
            <p className="italic font-medium text-[11px] line-clamp-2">{video.hookTranscript}</p>
          </div>
        </div>

        {/* Rodapé: Publicação e Ações Rápidas (Sem Números de Score) */}
        <div
          className={`pt-3 border-t flex items-center justify-between gap-2 mt-1 ${
            isLight ? 'border-slate-200' : 'border-[#383a40]'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#949ba4]">
              {video.publishedAt}
            </span>
            {video.metrics?.signalsEstimated && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-500/10 dark:bg-white/10 text-slate-500 dark:text-[#949ba4]"
                title="Shares e saves não fornecidos pela API: score calculado via likes e comentários"
              >
                score aproximado
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {/* Salvar Favorito */}
            <button
              type="button"
              onClick={() => onToggleFavorite(video.id)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isFavorite
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#dbdee1]'
              }`}
              title={isFavorite ? 'Salvo nos Favoritos' : 'Salvar Vídeo'}
            >
              <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Copiar Link Direto */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500 font-bold'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#dbdee1]'
              }`}
              title={copied ? 'Link Copiado!' : 'Copiar Link do Vídeo'}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Abrir Link Original */}
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white transition-colors shadow-sm"
              title="Abrir no app original"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
