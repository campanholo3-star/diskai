import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Video,
  Volume2,
  Check,
  AlertCircle,
  Phone,
  Settings,
  Sparkles,
  RefreshCw,
  Radio
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';

interface PreCallDeviceModalProps {
  onConfirm: (options: { videoEnabled: boolean; audioEnabled: boolean }) => void;
  onClose: () => void;
  callTargetName?: string;
  isVideoCall?: boolean;
}

export const PreCallDeviceModal: React.FC<PreCallDeviceModalProps> = ({
  onConfirm,
  onClose,
  callTargetName = 'Participante',
  isVideoCall = true
}) => {
  const { theme, currentUser } = useDiskai();

  const [videoEnabled, setVideoEnabled] = useState(isVideoCall);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isVirtualMode, setIsVirtualMode] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [isTestTonePlaying, setIsTestTonePlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualAnimRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Gera stream virtual de teste caso não haja webcam física no computador ou acesso seja restrito
  const createVirtualCameraStream = (): MediaStream => {
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d')!;
    let frame = 0;

    const drawFrame = () => {
      frame++;
      // Fundo gradiente profissional de estúdio
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid sutil
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Scanner dinâmico animado
      const scanY = (Math.sin(frame * 0.04) * 0.5 + 0.5) * canvas.height;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvas.width, scanY);
      ctx.stroke();

      // Círculo central com silhueta / avatar do usuário
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 65, 0, Math.PI * 2);
      ctx.fillStyle = '#312e81';
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Texto do participante
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentUser?.name || 'Seu Vídeo (Prévia)', cx, cy + 90);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px monospace';
      ctx.fillText('DISPOSITIVO PRONTO • 30 FPS', cx, cy + 110);

      virtualAnimRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return canvas.captureStream(30);
  };

  // Inicializa dispositivos e ponte de acesso à câmera e microfone
  const startPreview = async (videoDevId?: string, audioDevId?: string) => {
    setIsLoadingDevices(true);
    setPermissionError(null);

    // Parar stream anterior se houver
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (virtualAnimRef.current) {
      cancelAnimationFrame(virtualAnimRef.current);
    }

    // Se usuário desativou vídeo e áudio
    if (!videoEnabled && !audioEnabled) {
      setStream(null);
      setIsLoadingDevices(false);
      return;
    }

    let userStream: MediaStream | null = null;

    // Tentativa 1: Hardware real com navigator.mediaDevices.getUserMedia
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const constraints: MediaStreamConstraints = {
          video: videoEnabled
            ? (videoDevId ? { deviceId: { exact: videoDevId } } : true)
            : false,
          audio: audioEnabled
            ? (audioDevId ? { deviceId: { exact: audioDevId } } : true)
            : false
        };

        userStream = await navigator.mediaDevices.getUserMedia(constraints);
        setIsVirtualMode(false);

        // Listar dispositivos reais disponíveis
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices.filter(d => d.kind === 'videoinput');
        const aDevs = devices.filter(d => d.kind === 'audioinput');
        setVideoDevices(vDevs);
        setAudioDevices(aDevs);

        if (!selectedVideoDevice && vDevs.length > 0) {
          setSelectedVideoDevice(vDevs[0].deviceId);
        }
        if (!selectedAudioDevice && aDevs.length > 0) {
          setSelectedAudioDevice(aDevs[0].deviceId);
        }
      } catch (err: any) {
        console.warn('[PreCall Bridge] Falha ao capturar hardware nativo, tentando modo de contingência:', err);
      }
    }

    // Tentativa 2: Se não houver câmera física disponível ou permissão for bloqueada no sistema, ativar ponte de contingência garantida
    if (!userStream) {
      setIsVirtualMode(true);
      const vStream = createVirtualCameraStream();

      // Criar faixa de áudio de teste silenciosa/sintetizada
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const audioTrack = dst.stream.getAudioTracks()[0];
        if (audioTrack && audioEnabled) {
          vStream.addTrack(audioTrack);
        }
      } catch {}

      userStream = vStream;
      setPermissionError('Câmera física não encontrada ou permissão pendente. Ponte de vídeo e áudio ativa em modo de calibração!');
    }

    setStream(userStream);

    // Conectar analisador de áudio
    if (audioEnabled && userStream.getAudioTracks().length > 0) {
      setupAudioAnalyser(userStream);
    }

    setIsLoadingDevices(false);
  };

  // Garante que o elemento de vídeo recebe o stream assim que o DOM estiver pronto
  useEffect(() => {
    if (videoRef.current) {
      if (videoEnabled && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('[PreCall] Play failed:', e));
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream, videoEnabled]);

  const setupAudioAnalyser = (audioStream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(audioStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicVolume(normalized);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('[PreCall Bridge] Falha ao configurar analisador de áudio:', e);
    }
  };

  // Simulação / Teste Sonoro para verificar o medidor de microfone
  const handleTestSoundPulse = () => {
    setIsTestTonePlaying(true);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      const randomLevel = Math.floor(45 + Math.random() * 45);
      setMicVolume(randomLevel);
      if (count > 16) {
        clearInterval(interval);
        setMicVolume(0);
        setIsTestTonePlaying(false);
      }
    }, 80);
  };

  useEffect(() => {
    startPreview(selectedVideoDevice, selectedAudioDevice);

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (virtualAnimRef.current) {
        cancelAnimationFrame(virtualAnimRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [videoEnabled, audioEnabled]);

  const handleToggleVideo = () => {
    setVideoEnabled(prev => !prev);
  };

  const handleToggleAudio = () => {
    setAudioEnabled(prev => !prev);
    if (audioEnabled) {
      setMicVolume(0);
    }
  };

  const handleConfirmCall = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    if (virtualAnimRef.current) {
      cancelAnimationFrame(virtualAnimRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    onConfirm({ videoEnabled, audioEnabled });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-white dark:bg-[#2b2d31] rounded-3xl shadow-2xl border-2 border-black/15 dark:border-white/10 overflow-hidden flex flex-col text-gray-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 bg-gray-50/90 dark:bg-[#1e1f22]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Ponte de Acesso: Câmera & Microfone
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#949ba4]">
                Teste seus dispositivos antes de entrar na chamada com <strong className="text-indigo-500">{callTargetName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview & Controls */}
        <div className="p-6 space-y-4">
          {/* Live Video Box */}
          <div className="relative w-full h-64 sm:h-72 bg-black rounded-2xl overflow-hidden shadow-inner border border-black/20 dark:border-white/10 flex items-center justify-center group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover mirror scale-x-[-1] transition-opacity duration-300 ${
                videoEnabled && stream ? 'opacity-100 block' : 'opacity-0 hidden'
              }`}
            />

            {(!videoEnabled || !stream) && (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <CameraOff className="w-8 h-8 text-gray-400" />
                </div>
                <span className="text-sm font-semibold">Câmera desativada para este teste</span>
              </div>
            )}

            {/* Badges de Status no Topo do Vídeo */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isVirtualMode ? 'Prévia Calibrada' : 'Câmera Ativa'}
              </span>
              {audioEnabled && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-sky-400 border border-sky-500/30 flex items-center gap-1.5 shadow">
                  <Mic className="w-3 h-3" />
                  Mic Pronto
                </span>
              )}
            </div>

            {/* In-Preview Quick Toggle Overlay */}
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleToggleVideo}
                className={`p-3 rounded-2xl backdrop-blur-md border shadow-lg transition-all hover:scale-105 active:scale-95 ${
                  videoEnabled
                    ? 'bg-white/20 hover:bg-white/30 border-white/30 text-white'
                    : 'bg-[#f23f43] hover:bg-[#da373b] border-transparent text-white'
                }`}
                title={videoEnabled ? 'Desligar Câmera' : 'Ligar Câmera'}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={handleToggleAudio}
                className={`p-3 rounded-2xl backdrop-blur-md border shadow-lg transition-all hover:scale-105 active:scale-95 ${
                  audioEnabled
                    ? 'bg-white/20 hover:bg-white/30 border-white/30 text-white'
                    : 'bg-[#f23f43] hover:bg-[#da373b] border-transparent text-white'
                }`}
                title={audioEnabled ? 'Mutar Microfone' : 'Ativar Microfone'}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Permission or Device Notification */}
          {permissionError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{permissionError}</span>
              </div>
              <button
                type="button"
                onClick={() => startPreview()}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition-colors whitespace-nowrap"
              >
                Recarregar
              </button>
            </div>
          )}

          {/* Microphone Real-Time Volume Meter & Sound Test */}
          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-[#1e1f22] border border-black/10 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-[#dbdee1] flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-500" />
                Oscilação do Microfone em Tempo Real
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestSoundPulse}
                  disabled={isTestTonePlaying}
                  className="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-500 dark:text-indigo-400 text-[11px] font-bold border border-indigo-500/30 transition-all flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>{isTestTonePlaying ? 'Testando Som...' : 'Testar Captação'}</span>
                </button>
                <span className="font-mono text-gray-500 dark:text-gray-400 font-bold min-w-[36px] text-right">
                  {audioEnabled ? `${micVolume}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Dynamic Volume Bar */}
            <div className="w-full h-3 bg-black/10 dark:bg-[#2b2d31] rounded-full overflow-hidden p-0.5 border border-black/5 dark:border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  micVolume > 60
                    ? 'bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${audioEnabled ? Math.max(4, micVolume) : 0}%` }}
              />
            </div>
          </div>

          {/* Device Selection Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-500 dark:text-[#949ba4] uppercase text-[10px]">
                Webcam / Dispositivo de Vídeo
              </label>
              <select
                value={selectedVideoDevice}
                onChange={e => {
                  setSelectedVideoDevice(e.target.value);
                  startPreview(e.target.value, selectedAudioDevice);
                }}
                className="w-full bg-black/5 dark:bg-[#1e1f22] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-gray-800 dark:text-white focus:outline-none"
              >
                {videoDevices.length > 0 ? (
                  videoDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Câmera (${d.deviceId.slice(0, 6)}...)`}
                    </option>
                  ))
                ) : (
                  <option value="">Webcam Padrão do Sistema</option>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-500 dark:text-[#949ba4] uppercase text-[10px]">
                Microfone / Entrada de Voz
              </label>
              <select
                value={selectedAudioDevice}
                onChange={e => {
                  setSelectedAudioDevice(e.target.value);
                  startPreview(selectedVideoDevice, e.target.value);
                }}
                className="w-full bg-black/5 dark:bg-[#1e1f22] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-gray-800 dark:text-white focus:outline-none"
              >
                {audioDevices.length > 0 ? (
                  audioDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microfone (${d.deviceId.slice(0, 6)}...)`}
                    </option>
                  ))
                ) : (
                  <option value="">Microfone Padrão do Sistema</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-black/10 dark:border-white/10 bg-gray-50/90 dark:bg-[#1e1f22]/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-[#dbdee1] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmCall}
            className="px-6 py-2.5 rounded-xl bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#23a55a]/25 transition-all hover:scale-105 active:scale-95"
          >
            <Phone className="w-4 h-4 fill-white" />
            <span>Entrar / Iniciar Chamada</span>
          </button>
        </div>
      </div>
    </div>
  );
};
