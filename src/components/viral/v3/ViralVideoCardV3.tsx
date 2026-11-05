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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bot,
  UserCheck
} from 'lucide-react';
import { ViralVideoItemV3 } from '../../../types/viralV3';
import { ScoreBadge } from './ScoreBadge';
import { ScoreBreakdownModal } from './ScoreBreakdownModal';

interface ViralVideoCardV3Props {
  video: ViralVideoItemV3;
  isLight: boolean;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenDetails?: (video: ViralVideoItemV3) => void;
}

export const ViralVideoCardV3: React.FC<ViralVideoCardV3Props> = ({
  video,
  isLight,
  isFavorite,
  onToggleFavorite,
  onOpenDetails
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCardHook, setCopiedCardHook] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(video.videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlatformBadge = (platform: ViralVideoItemV3['platform']) => {
    switch (platform) {
      case 'tiktok':
        return { name: 'TikTok', bg: 'bg-black text-white border-white/20', dot: 'bg-[#00f2fe]' };
      case 'instagram':
        return { name: 'Instagram', bg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white border-transparent', dot: 'bg-white' };
      case 'youtube':
        return { name: 'YouTube', bg: 'bg-red-600 text-white border-transparent', dot: 'bg-white' };
      case 'x':
        return { name: 'X', bg: 'bg-neutral-900 text-white border-white/20', dot: 'bg-white' };
      case 'reddit':
        return { name: 'Reddit', bg: 'bg-orange-600 text-white border-transparent', dot: 'bg-white' };
      case 'google_trends':
        return { name: 'Trends', bg: 'bg-blue-600 text-white border-transparent', dot: 'bg-white' };
      case 'news':
        return { name: 'Notícias', bg: 'bg-emerald-600 text-white border-transparent', dot: 'bg-white' };
      default:
        return { name: platform, bg: 'bg-slate-700 text-white', dot: 'bg-white' };
    }
  };

  const getRegionLabel = (region: string) => {
    switch (region?.toLowerCase()) {
      case 'br':
      case 'brasil':
        return '🇧🇷 Brasil';
      case 'us':
      case 'eua':
        return '🇺🇸 EUA';
      case 'eu':
      case 'europa':
        return '🇪🇺 Europa';
      default:
        return '🌐 Global';
    }
  };

  // Formatação de data/hora no Fuso Horário de Brasília
  const formatBrasiliaTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      const full = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
      const diffH = Math.max(0, Math.round((Date.now() - d.getTime()) / 3_600_000));
      const relative = diffH === 0 ? 'Agora há pouco' : diffH < 24 ? `há ${diffH} h` : `há ${Math.round(diffH / 24)} d`;
      return `${relative} (${full})`;
    } catch (_) {
      return isoDate;
    }
  };

  // Duração em formato h:mm:ss
  const formatDurationHms = (sec: number | null) => {
    if (sec === null || sec === undefined || isNaN(sec)) return '0:30';
    const s = Math.round(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const remSec = s % 60;
    const secStr = remSec < 10 ? `0${remSec}` : `${remSec}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${secStr}`;
    }
    return `${m}:${secStr}`;
  };

  const platformInfo = getPlatformBadge(video.platform);
  const formattedPublishTime = formatBrasiliaTime(video.publishedAt);
  const formattedDuration = formatDurationHms(video.durationSec);

  // Bloco de Gancho Real: somente se enriquecido com T2 ou se houver roteiro/ideia real
  const hasRealHook = Boolean(
    video.aiVideoScriptIdea?.hook ||
    (typeof (video as any).hookStrength === 'number' && !(video as any).hookPending)
  );

  return (
    <>
      <div
        onClick={() => {
          if (onOpenDetails) onOpenDetails(video);
          else setShowScoreModal(true);
        }}
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

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40 pointer-events-none" />

          {/* Badges de Destaque Superior Esquerdo: Score Badge & Fresh */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
            <ScoreBadge
              score={video.score}
              tier={video.scoreBreakdown?.tier || (video.score >= 80 ? 'elite' : video.score >= 60 ? 'alto' : 'baixo')}
              isLight={isLight}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowScoreModal(true);
              }}
            />

            {video.isFresh && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#5865F2] text-white font-black text-[10px] tracking-wider uppercase shadow-md shadow-[#5865F2]/40 border border-white/20">
                <Sparkles className="w-3 h-3 fill-current" />
                <span>NOVO</span>
              </div>
            )}
          </div>

          {/* Badges de Plataforma e Região (Superior Direito) */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1 ${platformInfo.bg}`}>
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
              {formattedDuration}
            </span>
          </div>
        </div>

        {/* Conteúdo do Card */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3">
            {/* Header do Criador e Tags */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={video.author.avatarUrl}
                  alt={video.author.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-black/10 dark:ring-white/10 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
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

              {/* Badges de Ferramenta / Conta Emergente */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {video.toolGuess && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                    isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-indigo-950/40 border-indigo-700/50 text-indigo-300'
                  }`}>
                    <Bot className="w-3 h-3" />
                    {video.toolGuess}
                  </span>
                )}
                {video.accountTags?.includes('conta-emergente') && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/30 border-emerald-700/40 text-emerald-300'
                  }`} title="Criador em ascensão que furou a bolha">
                    Emergente
                  </span>
                )}
              </div>
            </div>

            {/* Título e Descrição com Ver Mais / Menos */}
            <div className="space-y-1">
              <h3 className={`font-bold text-sm leading-snug line-clamp-2 group-hover:text-[#5865F2] transition-colors ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {video.title}
              </h3>
              <p className={`text-xs leading-relaxed ${isExpanded ? '' : 'line-clamp-2'} ${
                isLight ? 'text-slate-600' : 'text-[#949ba4]'
              }`}>
                {video.description}
              </p>
              {video.description && video.description.length > 90 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-[11px] font-semibold text-[#5865F2] hover:underline flex items-center gap-0.5 pt-0.5 cursor-pointer"
                >
                  {isExpanded ? <>Ver menos <ChevronUp className="w-3 h-3" /></> : <>Ver mais <ChevronDown className="w-3 h-3" /></>}
                </button>
              )}
            </div>

            {/* Bloco de Gancho Real Adaptado para PT-BR */}
            {hasRealHook && (
              <div className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-1.5 transition-all ${
                isLight ? 'bg-amber-50/70 border-amber-200/80 text-amber-950' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
              }`}>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-3 h-3" />
                    <span>Gancho Adaptado (PT-BR)</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const hookText = video.aiVideoScriptIdea?.hookPt || video.aiVideoScriptIdea?.hook || (video as any).hookTranscript || video.title;
                      navigator.clipboard.writeText(hookText);
                      setCopiedCardHook(true);
                      setTimeout(() => setCopiedCardHook(false), 2000);
                    }}
                    className="text-[10px] font-bold text-[#5865F2] hover:underline flex items-center gap-0.5 cursor-pointer"
                    title="Copiar Gancho"
                  >
                    {copiedCardHook ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedCardHook ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="italic font-semibold text-[11px] line-clamp-2">
                  "{video.aiVideoScriptIdea?.hookPt || video.aiVideoScriptIdea?.hook || (video as any).hookTranscript || video.title}"
                </p>
                {video.aiVideoScriptIdea?.hookOriginal && (
                  <p className="text-[10px] opacity-75 line-clamp-1 italic">
                    Orig: "{video.aiVideoScriptIdea.hookOriginal}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Rodapé: Data/Hora Fuso Brasília e Ações */}
          <div className={`pt-3 border-t flex items-center justify-between gap-2 mt-1 ${
            isLight ? 'border-slate-200' : 'border-[#383a40]'
          }`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-500 dark:text-[#949ba4]">
                {formattedPublishTime}
              </span>
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

      {/* Modal de Decomposição do Score & Roteiro */}
      {video.scoreBreakdown && (
        <ScoreBreakdownModal
          isOpen={showScoreModal}
          onClose={() => setShowScoreModal(false)}
          videoTitle={video.title}
          videoUrl={video.videoUrl}
          score={video.score}
          breakdown={video.scoreBreakdown}
          isLight={isLight}
          opportunityWindow={(video as any).metrics?.opportunityWindow || "Próximas 16 horas"}
          scriptIdea={video.aiVideoScriptIdea}
          hookTranscript={(video as any).hookTranscript}
        />
      )}
    </>
  );
};

