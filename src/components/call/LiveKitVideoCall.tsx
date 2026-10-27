import React, { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  ParticipantTile,
  useLocalParticipant
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  Sparkles,
  Users,
  ShieldCheck
} from 'lucide-react';
import { fetchLiveKitToken, getLiveKitUrl } from '../../services/livekit';
import { User } from '../../types';
import { soundFx } from '../../utils/soundEffects';

interface LiveKitVideoCallProps {
  roomName: string;
  participantName: string;
  participantId: string;
  partnerUser?: Partial<User> | null;
  initialVideo?: boolean;
  onDisconnect: () => void;
}

export const LiveKitVideoCall: React.FC<LiveKitVideoCallProps> = ({
  roomName,
  participantName,
  participantId,
  partnerUser,
  initialVideo = true,
  onDisconnect
}) => {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);

  const serverUrl = getLiveKitUrl();

  // Obter o Access Token seguro
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchLiveKitToken(roomName, participantName, participantId)
      .then(resToken => {
        if (!isMounted) return;
        setToken(resToken);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('[LiveKitVideoCall] Erro ao obter token:', err);
        setError('Não foi possível gerar o token de acesso à sala.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [roomName, participantName, participantId]);

  // Cronômetro da chamada
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleHangup = () => {
    soundFx.playLeave();
    onDisconnect();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1f22] text-white space-y-4">
        <div className="w-12 h-12 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-bold text-base">Conectando à Videochamada LiveKit...</p>
          <p className="text-xs text-[#949ba4]">Sala segura: {roomName}</p>
        </div>
      </div>
    );
  }

  // Se não foi possível gerar o token ou houver erro impeditivo
  if (error || !token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1f22] text-white p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#f23f43]/20 flex items-center justify-center text-[#f23f43]">
          <PhoneOff className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h3 className="font-bold text-lg text-white">Falha ao Conectar à Chamada</h3>
          <p className="text-xs text-[#949ba4] leading-relaxed">
            {error || 'Token inválido ou credenciais LiveKit não configuradas no .env.'}
          </p>
        </div>
        <button
          onClick={handleHangup}
          className="bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold px-6 py-2.5 rounded-lg text-xs transition-colors shadow"
        >
          Voltar para o Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] overflow-hidden relative select-none">
      {/* LiveKit Room Wrapper */}
      <LiveKitRoom
        video={initialVideo}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleHangup}
        data-lk-theme="default"
        className="flex-1 flex flex-col h-full overflow-hidden"
      >
        {/* Top Call Info Bar */}
        <div className="h-12 bg-[#1e1f22]/90 backdrop-blur border-b border-[#2b2d31] px-5 flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#23a55a] animate-pulse" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                {partnerUser ? `Chamada com ${partnerUser.name}` : `Sala: ${roomName}`}
              </span>
              <span className="text-[11px] font-mono font-medium text-[#23a55a] bg-[#23a55a]/10 px-2 py-0.5 rounded border border-[#23a55a]/20">
                {formatTimer(callDuration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#949ba4]">
            <span className="hidden sm:flex items-center gap-1.5 bg-[#2b2d31] px-2.5 py-1 rounded-full text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#23a55a]" />
              LiveKit WebRTC E2EE
            </span>
          </div>
        </div>

        {/* Video Grid Area */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden relative">
          <VideoGrid partnerUser={partnerUser} />
        </div>

        {/* Floating Custom Controls Bar (Discord Style) */}
        <CustomControlBar onHangup={handleHangup} />

        {/* Renderer for remote audio tracks */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

// ==============================================================================
// SUBCOMPONENTE: GRID DE VÍDEOS DOS PARTICIPANTES
// ==============================================================================

interface VideoGridProps {
  partnerUser?: Partial<User> | null;
}

const VideoGrid: React.FC<VideoGridProps> = ({ partnerUser }) => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false }
    ],
    { onlySubscribed: false }
  );

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-3 p-8">
        <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#5865F2] shadow-2xl">
          <img
            src={partnerUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt="Participante"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="font-bold text-white text-base">{partnerUser?.name || 'Aguardando participante...'}</p>
        <p className="text-xs text-[#949ba4]">Conectando mídia ao servidor LiveKit...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-3 max-w-6xl max-h-full items-center justify-center">
      {tracks.map((trackRef, idx) => (
        <div
          key={`${trackRef.participant.identity}-${trackRef.source}-${idx}`}
          className="relative w-full h-full min-h-[220px] max-h-[480px] bg-[#111214] rounded-2xl overflow-hidden border border-[#2b2d31] shadow-xl flex items-center justify-center group"
        >
          <ParticipantTile trackRef={trackRef} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
};

// ==============================================================================
// SUBCOMPONENTE: BARRA DE CONTROLES CUSTOMIZADA (DISCORD STYLE)
// ==============================================================================

interface CustomControlBarProps {
  onHangup: () => void;
}

const CustomControlBar: React.FC<CustomControlBarProps> = ({ onHangup }) => {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    if (!localParticipant) return;
    setIsMuted(!localParticipant.isMicrophoneEnabled);
    setIsVideoMuted(!localParticipant.isCameraEnabled);
    setIsScreenSharing(localParticipant.isScreenShareEnabled);
  }, [localParticipant]);

  const handleToggleMic = async () => {
    if (!localParticipant) return;
    const next = !isMuted;
    await localParticipant.setMicrophoneEnabled(!next);
    setIsMuted(next);
    if (next) soundFx.playMute();
    else soundFx.playUnmute();
  };

  const handleToggleCamera = async () => {
    if (!localParticipant) return;
    const next = !isVideoMuted;
    await localParticipant.setCameraEnabled(!next);
    setIsVideoMuted(next);
  };

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return;
    const next = !isScreenSharing;
    try {
      await localParticipant.setScreenShareEnabled(next);
      setIsScreenSharing(next);
    } catch (err) {
      console.warn('[CustomControlBar] Erro ao alternar compartilhamento de tela:', err);
    }
  };

  return (
    <div className="h-20 bg-[#111214]/85 backdrop-blur-xl border-t border-white/[0.08] py-3 px-6 flex items-center justify-center gap-4 z-30 flex-shrink-0">
      {/* Botão Microfone */}
      <button
        onClick={handleToggleMic}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border ${
          isMuted
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95'
            : 'bg-white/[0.04] text-white hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.16] hover:scale-105 active:scale-95'
        }`}
        title={isMuted ? 'Ativar Microfone' : 'Desativar Microfone'}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Botão Câmera */}
      <button
        onClick={handleToggleCamera}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border ${
          isVideoMuted
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95'
        }`}
        title={isVideoMuted ? 'Ligar Câmera' : 'Desligar Câmera'}
      >
        {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
      </button>

      {/* Botão Compartilhar Tela */}
      <button
        onClick={handleToggleScreenShare}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border ${
          isScreenSharing
            ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95'
            : 'bg-white/[0.04] text-white hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.16] hover:scale-105 active:scale-95'
        }`}
        title="Compartilhar Tela"
      >
        <Monitor className="w-5 h-5" />
      </button>

      {/* Botão Desligar / Encerrar Chamada */}
      <button
        onClick={onHangup}
        className="w-14 h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 active:scale-95 text-white flex items-center justify-center shadow-[0_0_18px_rgba(244,63,94,0.4)] hover:shadow-[0_0_25px_rgba(244,63,94,0.6)] border border-rose-400/40 transition-all hover:scale-105"
        title="Desligar Chamada"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
};
