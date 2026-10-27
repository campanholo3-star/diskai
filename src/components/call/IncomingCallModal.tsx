import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Mic, Volume2 } from 'lucide-react';
import { IncomingCallData } from '../../types';
import { soundFx } from '../../utils/soundEffects';

interface IncomingCallModalProps {
  incomingCall: IncomingCallData | null;
  onAccept: (call: IncomingCallData) => void;
  onReject: (call: IncomingCallData) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  incomingCall,
  onAccept,
  onReject
}) => {
  const [secondsRinging, setSecondsRinging] = useState(0);

  useEffect(() => {
    if (!incomingCall) {
      setSecondsRinging(0);
      return;
    }

    // Tocar som de chamada recebida (ringtone)
    soundFx.playJoin();
    const soundInterval = setInterval(() => {
      soundFx.playJoin();
    }, 3000);

    // Cronômetro de toque
    const timerInterval = setInterval(() => {
      setSecondsRinging(prev => {
        if (prev >= 45) {
          // Desconectar automaticamente por falta de resposta após 45s
          onReject(incomingCall);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      clearInterval(soundInterval);
      clearInterval(timerInterval);
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-6 overflow-hidden">
        {/* Glow de chamada no topo */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#23a55a] via-[#5865F2] to-[#23a55a] animate-pulse" />

        {/* Header de Status */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#949ba4]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#23a55a] animate-ping" />
          {incomingCall.withVideo ? 'Chamada de Vídeo Recebida' : 'Chamada de Voz Recebida'}
        </div>

        {/* Avatar com Ondas Pulsantes */}
        <div className="relative flex items-center justify-center my-2">
          {/* Ondas pulsantes de áudio */}
          <div className="absolute w-28 h-28 rounded-full bg-[#5865F2]/20 animate-ping" />
          <div className="absolute w-24 h-24 rounded-full bg-[#23a55a]/30 animate-pulse" />

          {/* Imagem do Perfil */}
          <div className="relative z-10 w-20 h-20 rounded-full ring-4 ring-[#5865F2] overflow-hidden shadow-xl bg-[#2b2d31]">
            <img
              src={incomingCall.caller.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={incomingCall.caller.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Ícone de Vídeo/Áudio no canto do Avatar */}
          <div className="absolute -bottom-1 -right-1 z-20 w-7 h-7 rounded-full bg-[#23a55a] ring-2 ring-[#1e1f22] flex items-center justify-center text-white shadow">
            {incomingCall.withVideo ? <Video className="w-4 h-4" /> : <Phone className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Informações do Chamador */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white tracking-tight">{incomingCall.caller.name}</h3>
          {incomingCall.caller.tag && (
            <p className="text-xs text-[#949ba4]">#{incomingCall.caller.tag}</p>
          )}
          <p className="text-xs text-[#23a55a] font-medium pt-1">
            Chamando... ({secondsRinging}s)
          </p>
        </div>

        {/* Botões de Ação: Atender e Recusar */}
        <div className="flex items-center justify-center gap-6 w-full pt-2">
          {/* Botão Recusar */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => onReject(incomingCall)}
              className="w-14 h-14 rounded-full bg-[#f23f43] hover:bg-[#da373c] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-[#f23f43]/30 transition-all duration-150"
              title="Recusar chamada"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-[#dbdee1]">Recusar</span>
          </div>

          {/* Botão Atender */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => onAccept(incomingCall)}
              className="w-14 h-14 rounded-full bg-[#23a55a] hover:bg-[#1f9250] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-[#23a55a]/30 transition-all duration-150 animate-bounce"
              title="Atender chamada"
            >
              {incomingCall.withVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-[11px] font-semibold text-[#dbdee1]">Atender</span>
          </div>
        </div>
      </div>
    </div>
  );
};
