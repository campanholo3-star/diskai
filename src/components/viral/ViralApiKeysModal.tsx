import React, { useState } from 'react';
import {
  X,
  Key,
  Shield,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal
} from 'lucide-react';

interface ViralApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  keysPresent?: {
    youtube: boolean;
    apify: boolean;
  };
}

export const ViralApiKeysModal: React.FC<ViralApiKeysModalProps> = ({
  isOpen,
  onClose,
  isLight,
  keysPresent = { youtube: false, apify: false }
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const secretCommand = 'npx supabase secrets set YOUTUBE_API_KEY="..." APIFY_API_TOKEN="..."';

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(secretCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border transition-colors ${
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5865F2] text-white flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Status das Chaves de API (Segurança)
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#949ba4]">
                Gerenciamento seguro via Supabase Edge Function Secrets
              </p>
            </div>
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

        {/* Conteúdo Informativo */}
        <div className="p-6 space-y-5 overflow-y-auto no-scrollbar">
          <div
            className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
              isLight
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-4 h-4" />
              <span>Chaves protegidas no servidor (Zero Client Exposure)</span>
            </div>
            <p className="text-[11px] opacity-90">
              Por conformidade de segurança e auditoria, as chaves de API nunca são salvas no navegador (localStorage).
              A coleta é realizada exclusivamente pela Edge Function <code>viral-analyzer</code>.
            </p>
          </div>

          {/* Cards de Status das Chaves na Edge Function */}
          <div className="space-y-2.5">
            <h3
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-700' : 'text-[#dbdee1]'
              }`}
            >
              Conectores de Busca ao Vivo
            </h3>

            {/* YouTube API Status */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#383a40]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 flex-shrink-0" />
                <div>
                  <h4 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    YouTube Data API v3
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#949ba4]">
                    Busca de vídeos, métricas e estatísticas reais de canais
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {keysPresent.youtube ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ativa
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Não configurada
                  </span>
                )}
              </div>
            </div>

            {/* Apify Status (TikTok, Instagram, X) */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#383a40]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00f2fe] flex-shrink-0" />
                <div>
                  <h4 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Apify API (TikTok, Instagram & X)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#949ba4]">
                    Scrapers síncronos com termo de busca direto
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {keysPresent.apify ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ativa
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Não configurada
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Instruções para Configuração via Supabase CLI */}
          <div
            className={`p-4 rounded-2xl border space-y-2.5 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#1e1f22] border-[#383a40]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Terminal className="w-3.5 h-3.5" />
                Como configurar as chaves no Supabase Secrets:
              </span>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="text-[11px] font-semibold flex items-center gap-1 text-[#5865F2] hover:underline"
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCmd ? 'Copiado!' : 'Copiar comando'}
              </button>
            </div>
            <pre className="text-[11px] font-mono p-2.5 rounded-xl bg-black/80 text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">
              {secretCommand}
            </pre>
            <p className="text-[10px] text-slate-500 dark:text-[#949ba4]">
              Execute este comando no seu terminal com a CLI do Supabase para injetar as credenciais diretamente na nuvem.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-4 border-t flex items-center justify-end ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-[#232428] border-[#1f2023]'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs transition-colors shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
