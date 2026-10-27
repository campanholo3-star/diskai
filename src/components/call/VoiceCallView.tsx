import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Sparkles,
  Bot,
  Radio,
  FileText,
  Volume2,
  Share2,
  Music,
  Maximize2
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { soundFx } from '../../utils/soundEffects';

export const VoiceCallView: React.FC = () => {
  const {
    activeVoiceChannel,
    isMuted,
    toggleMute,
    isVideoOn,
    toggleVideo,
    isScreenSharing,
    toggleScreenShare,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    endCallAndSummarize,
    leaveVoiceChannel,
    localStream,
    screenStream,
    liveTranscript,
    isGeneratingSummary,
    currentUser
  } = useDiskai();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [showLiveTranscript, setShowLiveTranscript] = useState(true);

  // Audio wave visualizer simulation
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animId: number;
    const updateWave = () => {
      if (!isMuted) {
        // Dynamic pulse when mic is open
        const level = Math.random() * 0.7 + 0.3;
        setAudioLevel(level);
      } else {
        setAudioLevel(0);
      }
      animId = window.requestAnimationFrame(updateWave);
    };
    animId = window.requestAnimationFrame(updateWave);
    return () => window.cancelAnimationFrame(animId);
  }, [isMuted]);

  // Connect streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream && isVideoOn) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOn]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream && isScreenSharing) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing]);

  if (!activeVoiceChannel) return null;

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] relative overflow-hidden select-none">
      {/* Top Meeting Header & Live Recording Banner */}
      <div className="h-14 border-b border-[#2b2d31] px-6 flex items-center justify-between z-10 bg-[#1e1f22]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#23a55a] animate-pulse" />
          <h2 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
            {activeVoiceChannel.name}
            <span className="text-xs font-normal text-[#949ba4] bg-[#2b2d31] px-2 py-0.5 rounded-full border border-[#35373c]">
              HD Voice & AI Hub
            </span>
          </h2>
        </div>

        {/* Recording Status & Quick Recorder Action */}
        <div className="flex items-center gap-3">
          {isRecording ? (
            <div className="flex items-center gap-2 bg-[#f23f43]/15 border border-[#f23f43]/40 px-3 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f23f43] animate-ping" />
              <span className="text-xs font-bold text-[#f23f43] tracking-wider uppercase">
                Gravando • {formatSecs(recordingDuration)}
              </span>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 bg-[#f23f43] hover:bg-[#da373c] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-[#f23f43]/20 transition-all hover:scale-105"
            >
              <Radio className="w-3.5 h-3.5" />
              Iniciar Gravação
            </button>
          )}

          {/* Toggle Live AI Transcript Drawer */}
          <button
            onClick={() => setShowLiveTranscript(!showLiveTranscript)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              showLiveTranscript
                ? 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2]'
                : 'bg-[#2b2d31] border-[#35373c] text-[#949ba4] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Transcrição ao Vivo
          </button>
        </div>
      </div>

      {/* Main Grid: Participants & Screen Share */}
      <div className="flex-1 p-6 flex gap-4 overflow-hidden relative">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr h-full">
          {/* User Tile */}
          <div
            className={`relative rounded-2xl bg-[#2b2d31] overflow-hidden flex flex-col items-center justify-center border-2 transition-all ${
              !isMuted && audioLevel > 0.4 ? 'border-[#23a55a] shadow-lg shadow-[#23a55a]/20' : 'border-transparent'
            }`}
          >
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-24 h-24 rounded-full object-cover shadow-2xl ring-4 ring-[#1e1f22]"
                  />
                  {!isMuted && (
                    <div
                      className="absolute inset-0 rounded-full border-4 border-[#23a55a] transition-all"
                      style={{ transform: `scale(${1 + audioLevel * 0.15})` }}
                    />
                  )}
                </div>
                <div className="text-white font-bold text-base flex items-center gap-2">
                  {currentUser.name} (Você)
                </div>
              </div>
            )}

            {/* Bottom Tag */}
            <div className="absolute bottom-3 left-3 bg-[#111214]/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-2">
              <span>{currentUser.name}</span>
              {isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
            </div>
          </div>

          {/* Screen Share Tile (if active) */}
          {isScreenSharing && (
            <div className="relative rounded-2xl bg-[#111214] overflow-hidden flex items-center justify-center border-2 border-[#5865F2] shadow-xl md:col-span-2">
              <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
              <div className="absolute top-3 left-3 bg-[#5865F2] text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow">
                <Monitor className="w-3.5 h-3.5" />
                Compartilhando Tela
              </div>
            </div>
          )}

          {/* Teammate Tile 1: Ana Silva */}
          <div className="relative rounded-2xl bg-[#2b2d31] overflow-hidden flex flex-col items-center justify-center border-2 border-transparent hover:border-[#35373c] transition-all">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
                  alt="Ana Silva"
                  className="w-24 h-24 rounded-full object-cover shadow-2xl ring-4 ring-[#1e1f22]"
                />
                <div className="absolute inset-0 rounded-full border-2 border-[#23a55a] animate-pulse opacity-60" />
              </div>
              <div className="text-white font-bold text-base">Ana Silva</div>
            </div>
            <div className="absolute bottom-3 left-3 bg-[#111214]/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-2">
              <span>Ana Silva</span>
              <Mic className="w-3.5 h-3.5 text-[#23a55a]" />
            </div>
          </div>

          {/* Teammate Tile 2: Carlos Mendes */}
          <div className="relative rounded-2xl bg-[#2b2d31] overflow-hidden flex flex-col items-center justify-center border-2 border-transparent hover:border-[#35373c] transition-all">
            <div className="flex flex-col items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80"
                alt="Carlos"
                className="w-24 h-24 rounded-full object-cover shadow-2xl ring-4 ring-[#1e1f22]"
              />
              <div className="text-white font-bold text-base">Carlos Mendes</div>
            </div>
            <div className="absolute bottom-3 left-3 bg-[#111214]/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-2">
              <span>Carlos Mendes</span>
              <Mic className="w-3.5 h-3.5 text-[#23a55a]" />
            </div>
          </div>

          {/* Diskai AI Bot Tile */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#2b2d31] to-[#5865F2]/20 overflow-hidden flex flex-col items-center justify-center border-2 border-[#5865F2]/40 shadow-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-[#5865F2]/30 flex items-center justify-center border-2 border-[#5865F2] shadow-2xl">
                <Bot className="w-12 h-12 text-[#5865F2] animate-bounce-subtle" />
              </div>
              <div className="text-white font-bold text-base flex items-center gap-1.5">
                Diskai AI Bot
                <Sparkles className="w-4 h-4 text-[#5865F2] animate-spin-slow" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3 bg-[#5865F2]/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1.5">
              <span>IA Gravando & Atenta</span>
            </div>
          </div>
        </div>

        {/* Live Transcript & Real-Time AI Feed Drawer */}
        {showLiveTranscript && (
          <div className="w-80 bg-[#2b2d31] rounded-2xl border border-[#35373c] p-4 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#35373c]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5865F2]" />
                <span className="font-bold text-white text-sm">Transcrição em Tempo Real</span>
              </div>
              <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] font-bold px-2 py-0.5 rounded uppercase">
                Ativo
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar text-xs">
              {liveTranscript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#949ba4] px-4 space-y-2">
                  <Bot className="w-8 h-8 text-[#5865F2] opacity-70" />
                  <p>Inicie a gravação para ver a transcrição em tempo real aqui.</p>
                </div>
              ) : (
                liveTranscript.map((t, idx) => (
                  <div key={idx} className="bg-[#313338] p-2.5 rounded-lg border border-[#383a40] space-y-1">
                    <div className="flex items-center justify-between text-[#949ba4] font-semibold text-[11px]">
                      <span className="text-white">{t.speaker}</span>
                      <span>{t.time}</span>
                    </div>
                    <p className="text-[#dbdee1] leading-relaxed">{t.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#35373c] text-center">
              <span className="text-[11px] text-[#949ba4]">
                Ao encerrar a call, a IA sintetizará todas as falas em um resumo executivo com tarefas.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Call Control Deck with Luxury Glassmorphism */}
      <div className="h-20 bg-[#111214]/85 backdrop-blur-xl border-t border-white/[0.08] px-8 flex items-center justify-center gap-4 z-20">
        {/* Mic Toggle */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Desativar Mudo' : 'Ativar Mudo'}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/[0.08] hover:border-white/[0.16] hover:scale-105 active:scale-95'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          title={isVideoOn ? 'Desligar Câmera' : 'Ligar Câmera'}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border ${
            isVideoOn
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/[0.08] hover:border-white/[0.16] hover:scale-105 active:scale-95'
          }`}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Parar Compartilhamento' : 'Compartilhar Tela'}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border ${
            isScreenSharing
              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/[0.08] hover:border-white/[0.16] hover:scale-105 active:scale-95'
          }`}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Meeting Recording Toggle Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? 'Pausar/Parar Gravação' : 'Gravar Reunião'}
          className={`px-4 h-12 rounded-2xl flex items-center gap-2.5 font-bold text-xs tracking-wide transition-all backdrop-blur-md border ${
            isRecording
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_18px_rgba(244,63,94,0.35)] animate-pulse'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/[0.08] hover:border-white/[0.16] hover:scale-105 active:scale-95'
          }`}
        >
          <Radio className="w-4 h-4" />
          {isRecording ? `Gravando (${formatSecs(recordingDuration)})` : 'Gravar Reunião'}
        </button>

        {/* Soundboard Quick Trigger */}
        <button
          onClick={() => soundFx.playRecordStart()}
          title="Tocar efeito sonoro da reunião"
          className="w-12 h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-[#dbdee1] hover:text-white border border-white/[0.08] hover:border-white/[0.16] flex items-center justify-center transition-all backdrop-blur-md hover:scale-105 active:scale-95"
        >
          <Music className="w-5 h-5" />
        </button>

        {/* KEY HIGHLIGHT: End Call & Generate AI Summary */}
        <button
          onClick={endCallAndSummarize}
          disabled={isGeneratingSummary}
          title="Encerrar a chamada e gerar o resumo executivo com IA"
          className="h-12 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 hover:brightness-110 text-white font-bold text-sm flex items-center gap-2.5 transition-all shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:shadow-[0_0_28px_rgba(244,63,94,0.55)] border border-rose-400/40 hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <PhoneOff className="w-4 h-4" />
          {isGeneratingSummary ? (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              Gerando Resumo com IA...
            </span>
          ) : (
            'Encerrar & Resumir Reunião'
          )}
        </button>
      </div>
    </div>
  );
};
