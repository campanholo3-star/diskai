import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  ThumbsDown,
  ThumbsUp,
  ShieldCheck,
  Info,
  Flame,
  Check,
  Copy,
  Mic,
  Video,
  Zap
} from 'lucide-react';
import { ScoreBreakdown } from '../../../types/viralV3';

interface ScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  videoUrl: string;
  score: number;
  breakdown: ScoreBreakdown;
  isLight: boolean;
  opportunityWindow?: string;
  scriptIdea?: {
    hook: string;
    hookPt?: string;
    hookOriginal?: string;
    hookWhy?: string;
    scenes: string[];
    narration: string;
    narrationPt?: string;
  };
  hookTranscript?: string;
  onSendFeedback?: (feedbackType: 'not_ai' | 'irrelevant' | 'helpful') => void;
}

export const ScoreBreakdownModal: React.FC<ScoreBreakdownModalProps> = ({
  isOpen,
  onClose,
  videoTitle,
  videoUrl,
  score,
  breakdown,
  isLight,
  opportunityWindow = "Próximas 16 horas",
  scriptIdea,
  hookTranscript,
  onSendFeedback
}) => {
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [copiedHook, setCopiedHook] = useState(false);
  const [copiedNarration, setCopiedNarration] = useState(false);

  if (!isOpen) return null;

  const handleFeedback = (type: 'not_ai' | 'irrelevant' | 'helpful') => {
    setFeedbackSent(type);
    if (onSendFeedback) onSendFeedback(type);
    setTimeout(() => setFeedbackSent(null), 3000);
  };

  const getPillarLabel = (pillar: string) => {
    switch (pillar) {
      case 'reach':
        return 'Alcance vs. Tamanho do Perfil (30 pts)';
      case 'velocity':
        return 'Recência e Velocidade de Tração (25 pts)';
      case 'hook':
        return 'Força do Gancho e Ideia (20 pts)';
      case 'engagement':
        return 'Engajamento Real Ponderado (15 pts)';
      case 'account':
        return 'Consistência da Conta (10 pts)';
      default:
        return pillar;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#2b2d31] border-[#1e1f22] text-slate-100'
        }`}
      >
        {/* Header do Modal */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between gap-3 ${
          isLight ? 'border-slate-100 bg-slate-50/50' : 'border-[#1e1f22] bg-[#1e1f22]/40'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded bg-[#5865F2] text-white">
                VVS2 v3 Transparente
              </span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Versão: {breakdown.configVersion}
              </span>
            </div>
            <h2 className="text-lg font-bold leading-tight line-clamp-1">
              Decomposição do Score Viral
            </h2>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-300'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Card Principal de Resumo: Score, Confiança e Janela */}
          <div className={`p-4 sm:p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-[#1e1f22] border-slate-700/60'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border ${
                score >= 80
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : score >= 60
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
              }`}>
                {score}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  Potencial Calculado
                </span>
                <span className="text-base font-bold text-emerald-500 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-current" />
                  {score >= 80 ? 'Viral / Atacar Agora' : score >= 60 ? 'Médio Potencial / Validado' : 'Baixo Potencial / Observar'}
                </span>
              </div>
            </div>

            {/* Janela de Oportunidade com Alto Contraste (Correção Solicitada) */}
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Janela Ideal de Recriação:
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border shadow-sm ${
                isLight
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : 'bg-emerald-500 text-slate-950 border-emerald-300'
              }`}>
                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                {opportunityWindow}
              </span>
            </div>
          </div>

          {/* Seção Roteiro & Gancho Traduzido (PT-BR) para Recriar */}
          {(scriptIdea || hookTranscript) && (
            <div className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
              isLight ? 'bg-amber-50/70 border-amber-200 text-slate-800' : 'bg-amber-500/10 border-amber-500/25 text-amber-100'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Gancho & Roteiro Adaptado para Recriar (PT-BR)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Pronto para Gravar
                </span>
              </div>

              {/* Gancho em Português */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    Gancho de Abertura (0 a 3s - PT-BR):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = scriptIdea?.hookPt || scriptIdea?.hook || hookTranscript || '';
                      navigator.clipboard.writeText(text);
                      setCopiedHook(true);
                      setTimeout(() => setCopiedHook(false), 2500);
                    }}
                    className="text-[11px] font-semibold text-[#5865F2] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedHook ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedHook ? 'Copiado!' : 'Copiar Gancho'}
                  </button>
                </div>
                <div className={`p-3 rounded-xl border text-sm font-semibold italic ${
                  isLight ? 'bg-white border-amber-200/80 text-amber-950 shadow-sm' : 'bg-black/30 border-amber-500/20 text-amber-200'
                }`}>
                  "{scriptIdea?.hookPt || scriptIdea?.hook || hookTranscript}"
                </div>
              </div>

              {/* Áudio/Texto Original (se houver) */}
              {scriptIdea?.hookOriginal && (
                <div className="text-xs space-y-0.5">
                  <span className="text-[10px] font-bold uppercase opacity-60">Áudio Original no Vídeo Estrangeiro:</span>
                  <p className="italic text-[11px] opacity-80 pl-2 border-l-2 border-amber-400/40">
                    "{scriptIdea.hookOriginal}"
                  </p>
                </div>
              )}

              {/* Gatilho Psicológico / Por que funcionou */}
              {scriptIdea?.hookWhy && (
                <div className="text-xs space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Gatilho de Retenção (Por que funcionou):
                  </span>
                  <p className="text-[11px] opacity-90 pl-2">
                    {scriptIdea.hookWhy}
                  </p>
                </div>
              )}

              {/* Locução em Português (30s) */}
              {(scriptIdea?.narrationPt || scriptIdea?.narration) && (
                <div className="space-y-1 pt-1.5 border-t border-amber-200/50 dark:border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5" /> Locução PT-BR (Pronta para ElevenLabs):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const text = scriptIdea?.narrationPt || scriptIdea?.narration || '';
                        navigator.clipboard.writeText(text);
                        setCopiedNarration(true);
                        setTimeout(() => setCopiedNarration(false), 2500);
                      }}
                      className="text-[11px] font-semibold text-[#5865F2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedNarration ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedNarration ? 'Copiada!' : 'Copiar Locução'}
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90 p-2.5 rounded-lg bg-black/5 dark:bg-black/20">
                    {scriptIdea?.narrationPt || scriptIdea?.narration}
                  </p>
                </div>
              )}

              {/* Cenas recomendadas para gerar na IA */}
              {scriptIdea?.scenes && scriptIdea.scenes.length > 0 && (
                <div className="space-y-1.5 pt-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> Prompts Visuais Recomendados (Midjourney / Kling):
                  </span>
                  <div className="space-y-1">
                    {scriptIdea.scenes.map((scene, idx) => (
                      <div key={idx} className="text-[11px] font-mono p-2 rounded-lg bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 flex items-start gap-1.5">
                        <span className="font-bold text-[#5865F2] shrink-0">Cena {idx + 1}:</span>
                        <span className="select-all opacity-90">{scene}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Portões de Bloqueio (Gates) */}
          <div className="space-y-2.5">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#5865F2]" />
              Portões de Qualificação (Gates de Entrada):
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {breakdown.gates.map((g, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    g.passed
                      ? isLight ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                      : isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/30 border-rose-900/50 text-rose-300'
                  }`}
                >
                  {g.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">{g.label}</span>
                    <span className="text-[11px] opacity-80">{g.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Os 5 Critérios Ponderados */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Pontuação dos 5 Pilares (Fórmula Calibrada):
            </h3>

            <div className="space-y-2">
              {breakdown.criteria.map((c, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border transition-colors ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#1e1f22] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-xs">{c.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-sm text-[#5865F2] dark:text-[#808bf5]">
                        {c.points}
                      </span>
                      <span className="text-xs opacity-60">/ {c.weight} pts</span>
                    </div>
                  </div>

                  {/* Barra de Progresso do Critério */}
                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#5865F2] to-emerald-400 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, (c.points / (c.weight || 1)) * 100))}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] opacity-80">
                    <span>{c.note || `${c.raw}`}</span>
                    {c.benchmark && (
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        Meta: {c.benchmark}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivos e Destaques */}
          {(breakdown.reasonsUp?.length > 0 || breakdown.reasonsDown?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {breakdown.reasonsUp?.length > 0 && (
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-900/40'
                }`}>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Pontos Fortes:
                  </span>
                  <ul className="space-y-1 text-[11px]">
                    {breakdown.reasonsUp.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-emerald-500">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {breakdown.reasonsDown?.length > 0 && (
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-950/20 border-amber-900/40'
                }`}>
                  <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Observações:
                  </span>
                  <ul className="space-y-1 text-[11px]">
                    {breakdown.reasonsDown.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-amber-500">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Botões de Feedback da Classificação */}
          <div className={`pt-4 border-t flex flex-wrap items-center justify-between gap-3 ${
            isLight ? 'border-slate-100' : 'border-slate-800'
          }`}>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Avaliação do algoritmo correta?
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFeedback('not_ai')}
                disabled={Boolean(feedbackSent)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  isLight
                    ? 'hover:bg-rose-50 border-rose-200 text-rose-700'
                    : 'hover:bg-rose-950/40 border-rose-900/50 text-rose-300'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                Não é IA
              </button>

              <button
                type="button"
                onClick={() => handleFeedback('irrelevant')}
                disabled={Boolean(feedbackSent)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  isLight
                    ? 'hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'hover:bg-white/5 border-slate-700 text-slate-300'
                }`}
              >
                Irrelevante
              </button>

              <button
                type="button"
                onClick={() => handleFeedback('helpful')}
                disabled={Boolean(feedbackSent)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#5865F2] hover:bg-[#4752c4] text-white transition-all flex items-center gap-1.5 shadow-sm"
              >
                {feedbackSent === 'helpful' ? <Check className="w-3.5 h-3.5" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                Excelente Pauta
              </button>
            </div>
          </div>

          {feedbackSent && (
            <p className="text-center text-xs font-medium text-emerald-500 animate-in fade-in">
              ✓ Obrigado pelo feedback! Registrado para calibração contínua do motor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

