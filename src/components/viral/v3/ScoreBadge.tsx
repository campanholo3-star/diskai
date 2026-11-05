import React from 'react';
import { Flame, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';

interface ScoreBadgeProps {
  score: number;
  tier: 'elite' | 'alto' | 'medio' | 'baixo';
  isLight?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  tier,
  isLight = false,
  onClick,
  size = 'md'
}) => {
  const getBadgeStyle = () => {
    if (score >= 85 || tier === 'elite') {
      return {
        bg: isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300',
        dot: 'bg-emerald-500',
        label: 'Viral / Atacar Agora',
        icon: <Flame className="w-3.5 h-3.5 text-emerald-500 fill-current" />
      };
    }
    if (score >= 70 || tier === 'alto') {
      return {
        bg: isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700' : 'bg-emerald-950/30 border-emerald-700/40 text-emerald-400',
        dot: 'bg-emerald-400',
        label: 'Alto Potencial / Validado',
        icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
      };
    }
    if (score >= 50 || tier === 'medio') {
      return {
        bg: isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/40 border-amber-600/40 text-amber-300',
        dot: 'bg-amber-400',
        label: 'Médio / Observar',
        icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />
      };
    }
    return {
      bg: isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800/80 border-slate-700 text-slate-400',
      dot: 'bg-slate-500',
      label: 'Baixo / Frio',
      icon: <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
    };
  };

  const style = getBadgeStyle();

  const sizeClasses = size === 'sm'
    ? 'text-[11px] px-2 py-0.5 gap-1.5'
    : size === 'lg'
    ? 'text-sm px-3.5 py-1.5 gap-2'
    : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center font-bold rounded-full border shadow-sm transition-all duration-150 ${sizeClasses} ${style.bg} ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      }`}
      title="Clique para ver a decomposição completa do score (5 critérios e portões)"
    >
      <span className="font-mono font-black">{score}</span>
      <span className="w-1 h-1 rounded-full bg-current opacity-60" />
      <span className="font-semibold">{style.label}</span>
      {style.icon}
    </button>
  );
};

