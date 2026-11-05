import React, { useState, useEffect } from 'react';
import { Mic, Square, Sparkles, Volume2 } from 'lucide-react';

export const VoiceCommandOverlay: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  useEffect(() => {
    const handleVoiceStatus = (e: any) => {
      const active = Boolean(e.detail?.isRecording);
      setIsRecording(active);
      if (active) {
        setLastTranscript(null);
      }
    };

    const handleTranscript = (e: any) => {
      const text = e.detail?.text;
      if (text) {
        setLastTranscript(text);
        const timer = setTimeout(() => {
          setLastTranscript(null);
        }, 3500);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('diskai-voice-status', handleVoiceStatus);
    window.addEventListener('diskai-voice-transcript', handleTranscript);

    return () => {
      window.removeEventListener('diskai-voice-status', handleVoiceStatus);
      window.removeEventListener('diskai-voice-transcript', handleTranscript);
    };
  }, []);

  const handleStop = () => {
    window.dispatchEvent(new CustomEvent('diskai-toggle-voice'));
  };

  if (!isRecording && !lastTranscript) {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className={`px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3.5 transition-all ${
        isRecording
          ? 'bg-slate-950/90 border-rose-500/40 text-white shadow-rose-500/10'
          : 'bg-slate-900/90 border-indigo-500/40 text-white shadow-indigo-500/10'
      }`}>
        {/* Ícone de Gravação com Onda Sonora */}
        <div className="relative flex items-center justify-center">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/40 animate-pulse'
              : 'bg-indigo-500/20 text-indigo-400'
          }`}>
            {isRecording ? <Mic className="w-5 h-5 animate-bounce" /> : <Sparkles className="w-5 h-5 text-indigo-400" />}
          </div>
          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
          )}
        </div>

        {/* Informações do Comando de Voz */}
        <div className="min-w-0 max-w-xs sm:max-w-md">
          {isRecording ? (
            <>
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Escutando em Português (pt-BR)...</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Fale agora ou pressione <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Ctrl + Espaço</kbd>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Comando reconhecido:</span>
              </div>
              <p className="text-[11px] text-white font-medium truncate italic">
                "{lastTranscript}"
              </p>
            </>
          )}
        </div>

        {/* Botão de Finalizar */}
        {isRecording && (
          <button
            type="button"
            onClick={handleStop}
            title="Finalizar gravação agora"
            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer ml-1"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
};

