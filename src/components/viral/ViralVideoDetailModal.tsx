import React, { useState } from 'react';
import {
  X,
  Flame,
  ExternalLink,
  Copy,
  Check,
  Bookmark,
  Share2,
  TrendingUp,
  Zap,
  Clock,
  Sparkles,
  BarChart2,
  CheckCircle2,
  Play
} from 'lucide-react';
import { ViralVideoItem } from '../../services/viralTrendsService';

interface ViralVideoDetailModalProps {
  video: ViralVideoItem | null;
  onClose: () => void;
  isLight: boolean;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export const ViralVideoDetailModal: React.FC<ViralVideoDetailModalProps> = ({
  video,
  onClose,
  isLight,
  isFavorite,
  onToggleFavorite
}) => {
  const [copied, setCopied] = useState(false);

  if (!video) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(video.videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border transition-colors ${
          isLight
            ? 'bg-white border-slate-300 text-slate-800'
            : 'bg-[#2b2d31] border-[#383a40] text-[#dbdee1]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-3 ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-900'
              : 'bg-[#232428] border-[#1f2023] text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                video.isTrendAlert
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {video.isTrendAlert ? 'Alta Tendência' : 'Conteúdo em Alta'}
            </span>

            {video.isTrendAlert && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-current" />
                Alerta de Tendência Ativa
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Detalhe */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Player / Preview Principal */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg">
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-16 h-16 rounded-full bg-[#5865F2] hover:bg-[#4752c4] text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
              >
                <Play className="w-7 h-7 fill-current ml-1" />
              </a>
              <span className="text-white font-bold text-sm tracking-wide bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                Clique para abrir no app oficial do {video.platform.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Dados do Autor e Ações */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src={video.author.avatarUrl}
                alt={video.author.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-black/10 dark:ring-white/10"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4
                    className={`font-bold text-base ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {video.author.name}
                  </h4>
                  {video.author.verified && (
                    <CheckCircle2 className="w-4 h-4 text-[#5865F2]" />
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#949ba4] flex items-center gap-2">
                  <span>{video.author.handle}</span>
                  <span>•</span>
                  <span>{video.author.followersFormatted} seguidores</span>
                  <span>•</span>
                  <span>{video.publishedAt}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleFavorite(video.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isFavorite
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#dbdee1]'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'Salvo' : 'Salvar'}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  copied
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#dbdee1]'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Link Copiado' : 'Copiar Link'}
              </button>

              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold rounded-xl transition-colors shadow flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Assistir no {video.platform.toUpperCase()}
              </a>
            </div>
          </div>

          {/* Título & Descrição Original */}
          <div className="space-y-2">
            <h2
              className={`text-lg font-black leading-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {video.title}
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isLight ? 'text-slate-600' : 'text-[#949ba4]'
              }`}
            >
              {video.description}
            </p>
          </div>

          {/* Gancho (Hook) e Transcrição em Destaque */}
          <div
            className={`p-4 rounded-2xl border space-y-2 ${
              isLight
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Gancho de Abertura (Hook) Analisado pela IA
              </span>
              <span>Nota do Hook: {video.metrics.hookStrength}/100</span>
            </div>
            <p className="text-sm font-medium italic leading-relaxed">
              {video.hookTranscript}
            </p>
            <p className="text-[11px] opacity-80 pt-1 border-t border-amber-200/50 dark:border-amber-500/20">
              💡 <strong>Por que funcionou:</strong> O criador quebra a objeção do público nos primeiros 2.3 segundos, estabelecendo contraste de curiosidade e promessa clara de transformação imediata.
            </p>
          </div>

          {/* Detalhamento das Métricas */}
          <div className="space-y-3">
            <h3
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Telemetria & Métricas de Desempenho
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#383a40]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#949ba4]">Taxa de Engajamento</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {video.metrics.engagementRate}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#80848e]">
                  {video.stats.likesFormatted} curtidas e {video.stats.sharesFormatted} compartilhamentos diretos.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#383a40]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#949ba4]">Velocidade / Momentum</span>
                  <span className="font-extrabold text-[#5865F2] dark:text-indigo-400">
                    {video.metrics.growthVelocity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#80848e]">
                  Aceleração de entrega nas recomendações de feed "Para Você" / Explore.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#383a40]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#949ba4]">Anomalia do Canal</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">
                    {video.metrics.channelAnomalyRatio}x da média
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#80848e]">
                  O conteúdo performou muito acima da média habitual de views do perfil.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#383a40]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#949ba4]">Janela de Oportunidade</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {video.metrics.opportunityWindow}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#80848e]">
                  Tempo estimado em que recriar ou modelar este ângulo gerará tração máxima.
                </p>
              </div>
            </div>

            {/* Portões de Validação Algorítmica VVS2 */}
            <div className="space-y-2 pt-1">
              <h4 className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Portões de Validação Algorítmica
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  video.stats.viewsCount >= 15000
                    ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-[#949ba4]'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-semibold">Massa Crítica</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  video.metrics.channelAnomalyRatio >= 2.5
                    ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-[#949ba4]'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-semibold">Anomalia &ge; 2.5x</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  video.metrics.sharesRatio >= 0.2 || video.metrics.engagementRate >= 8
                    ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-[#949ba4]'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-semibold">Compartilhamento</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  video.score >= 60
                    ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-[#949ba4]'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-semibold">Janela Aberta</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div
          className={`p-4 border-t flex items-center justify-between text-xs ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-[#232428] border-[#1f2023]'
          }`}
        >
          <span className="text-slate-500 dark:text-[#949ba4]">
            ID: <code className="font-mono">{video.id}</code>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold rounded-xl transition-colors shadow"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

