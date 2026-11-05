import React, { useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
  Flame,
  Film
} from 'lucide-react';
import { ViralTopicItem } from '../../../types/viralV3';

interface ViralTopicCardV3Props {
  topic: ViralTopicItem;
  isLight: boolean;
  onSelectPrompt?: (prompt: string) => void;
}

export const ViralTopicCardV3: React.FC<ViralTopicCardV3Props> = ({
  topic,
  isLight,
  onSelectPrompt
}) => {
  const [copiedHook, setCopiedHook] = useState(false);

  const handleCopyHook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (topic.visualHookIdea) {
      navigator.clipboard.writeText(topic.visualHookIdea);
      setCopiedHook(true);
      setTimeout(() => setCopiedHook(false), 2000);
      if (onSelectPrompt) onSelectPrompt(topic.visualHookIdea);
    }
  };

  const getOpportunityBadge = (type: ViralTopicItem['opportunityType']) => {
    switch (type) {
      case 'antes_da_onda':
        return {
          label: 'Antes da Onda (Pauta Inexplorada)',
          icon: <Flame className="w-3.5 h-3.5 text-amber-400" />,
          bg: isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/40 text-amber-300 border-amber-700/50'
        };
      case 'onda_subindo':
        return {
          label: 'Onda Subindo (Alta Tração)',
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
          bg: isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
        };
      case 'saturada':
      default:
        return {
          label: 'Saturada (Muitos Vídeos Existentes)',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />,
          bg: isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700'
        };
    }
  };

  const oppBadge = getOpportunityBadge(topic.opportunityType);
  const legalRisk = topic.legalRiskScore ?? 2;
  const isHighRisk = legalRisk > 5;

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-lg ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
          : 'bg-[#2b2d31] border-[#1e1f22] text-slate-100 shadow-md'
      }`}
    >
      {/* Top Header: Opportunity Badge & Verification Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${oppBadge.bg}`}
          >
            {oppBadge.icon}
            {oppBadge.label}
          </span>

          {/* Verification Badge */}
          {topic.verified ? (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              }`}
              title="Confirmado por 2 ou mais veículos independentes da imprensa"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Verificada (Imprensa)
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isLight
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-amber-950/30 text-amber-400 border-amber-800/40'
              }`}
              title="Ainda não confirmada por 2 veículos independentes"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Não confirmada (Em apuração)
            </span>
          )}
        </div>

        {/* Volume & Growth from Trends */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`font-mono font-semibold px-2 py-0.5 rounded ${
              isLight ? 'bg-slate-100 text-slate-700' : 'bg-black/30 text-slate-300'
            }`}
          >
            🔥 {topic.trendVolume ? `${(topic.trendVolume / 1000).toFixed(0)}k+ buscas` : 'Em alta'}
          </span>
          <span className="text-emerald-500 font-bold">
            +{topic.trendGrowth || 150}%
          </span>
        </div>
      </div>

      {/* Main Headline */}
      <h3 className="text-base sm:text-lg font-bold leading-snug mb-2 line-clamp-2">
        {topic.translatedHeadline || topic.topic}
      </h3>

      {/* Verified Press Sources */}
      {topic.sources && topic.sources.length > 0 && (
        <div className="mb-4">
          <span className={`text-[11px] font-semibold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Fontes de Notícia:
          </span>
          <div className="flex flex-wrap gap-2">
            {topic.sources.slice(0, 3).map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#1e1f22] text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{src.name}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Visual Hook & IA Angle Box */}
      {topic.visualHookIdea && (
        <div
          className={`p-3 rounded-lg border mb-3 ${
            isLight
              ? 'bg-indigo-50/70 border-indigo-100 text-indigo-950'
              : 'bg-[#1e1f22] border-indigo-900/40 text-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500">
              <Film className="w-3.5 h-3.5" />
              Gancho Visual Recomendado (Cena de Abertura):
            </span>
            <button
              onClick={handleCopyHook}
              className={`p-1 rounded text-xs transition-colors flex items-center gap-1 ${
                isLight ? 'hover:bg-indigo-100 text-indigo-700' : 'hover:bg-indigo-950 text-indigo-300'
              }`}
              title="Copiar prompt de abertura para IA"
            >
              {copiedHook ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copiedHook ? 'Copiado!' : 'Copiar Prompt'}</span>
            </button>
          </div>
          <p className="text-xs leading-relaxed italic">
            "{topic.visualHookIdea}"
          </p>
        </div>
      )}

      {/* Suggested Angles */}
      {topic.suggestedAngles && topic.suggestedAngles.length > 0 && (
        <div className="mb-3">
          <span className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Ângulos de Roteiro para IA:
          </span>
          <ul className="space-y-1">
            {topic.suggestedAngles.map((angle, idx) => (
              <li
                key={idx}
                className={`text-xs flex items-start gap-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <span>{angle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer Metrics: Legal Risk & Replicability */}
      <div
        className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
          isLight ? 'border-slate-100 text-slate-500' : 'border-slate-800 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]">Replicabilidade em IA:</span>
          <span className="font-semibold text-emerald-500">
            {'★'.repeat(topic.replicabilityScore || 4)}
            {'☆'.repeat(5 - (topic.replicabilityScore || 4))}
          </span>
        </div>

        {isHighRisk && (
          <div className="flex items-center gap-1 text-rose-500 font-medium" title="Atenção a pessoas públicas e marcas registradas">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="text-[11px]">Risco de Imagem / Marca ({legalRisk}/10)</span>
          </div>
        )}
      </div>
    </div>
  );
};

