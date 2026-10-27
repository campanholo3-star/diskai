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
  Music,
  Users,
  CheckCircle2,
  Wifi,
  RadioTower,
  Clock,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Plus,
  MessageSquare
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { soundFx } from '../../utils/soundEffects';
import { MessageAttachment } from '../../types';

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
    localStream,
    screenStream,
    liveTranscript,
    isGeneratingSummary,
    currentUser,
    participants,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    theme
  } = useDiskai();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [showLiveTranscript, setShowLiveTranscript] = useState(true);
  const [sideDrawerTab, setSideDrawerTab] = useState<'all' | 'participants' | 'transcript'>('all');

  // Chat na Aba Geral
  const [chatInputText, setChatInputText] = useState('');
  const [stagedAttachments, setStagedAttachments] = useState<MessageAttachment[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio wave visualizer simulation
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animId: number;
    const updateWave = () => {
      if (!isMuted) {
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

  // Rolar para a última mensagem ao enviar ou receber
  useEffect(() => {
    if (sideDrawerTab === 'all') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages[activeVoiceChannel?.id || '']?.length, sideDrawerTab]);

  if (!activeVoiceChannel) return null;

  const channelMessages = messages[activeVoiceChannel.id] || [];

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getAuthor = (userId: string) => {
    if (userId === currentUser.id) return currentUser;
    const found = participants.find(p => p.id === userId);
    if (found) return found;
    return {
      id: userId,
      name: 'Membro da Reunião',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: MessageAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: reader.result as string
        };
        setStagedAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setStagedAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim() && stagedAttachments.length === 0) return;

    sendMessage(
      chatInputText.trim(),
      activeVoiceChannel.id,
      stagedAttachments.length > 0 ? stagedAttachments : undefined
    );
    setChatInputText('');
    setStagedAttachments([]);
    setShowEmojiPicker(false);
  };

  const handleStartEdit = (msgId: string, currentContent: string) => {
    setEditingMessageId(msgId);
    setEditingText(currentContent);
    setActiveMessageMenuId(null);
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editingText.trim()) return;
    editMessage(msgId, editingText.trim(), activeVoiceChannel.id);
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleDeleteMessage = (msgId: string) => {
    deleteMessage(msgId, activeVoiceChannel.id);
    setActiveMessageMenuId(null);
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    toggleReaction(msgId, emoji);
    setActiveMessageMenuId(null);
  };

  const quickEmojis = ['👍', '❤️', '🔥', '🚀', '🎉', '😂', '🦜', '💡', '👏', '✅'];

  // Lista de participantes conectados em tempo real na chamada
  const connectedParticipants = [
    {
      id: currentUser.id,
      name: `${currentUser.name} (Você)`,
      avatar: currentUser.avatar,
      role: 'Host da Reunião',
      isSpeaking: !isMuted && audioLevel > 0.4,
      isMuted: isMuted,
      isVideo: isVideoOn,
      status: 'Conectado'
    },
    {
      id: 'user-ana',
      name: 'Ana Silva',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      role: 'Product Manager',
      isSpeaking: Math.sin(Date.now() / 2400) > 0.4,
      isMuted: false,
      isVideo: true,
      status: 'Falando'
    },
    {
      id: 'user-carlos',
      name: 'Carlos Mendes',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      role: 'Tech Lead',
      isSpeaking: false,
      isMuted: false,
      isVideo: false,
      status: 'Conectado'
    },
    {
      id: 'user-diskai-bot',
      name: 'Diskai AI Bot',
      avatar: '',
      isBot: true,
      role: 'IA Gravando & Atenta',
      isSpeaking: isRecording,
      isMuted: false,
      isVideo: false,
      status: 'Transcrevendo'
    }
  ];

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

          {/* Toggle Live AI Transcript & Participants Drawer (sem o indicador numérico) */}
          <button
            onClick={() => setShowLiveTranscript(!showLiveTranscript)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              showLiveTranscript
                ? 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2]'
                : 'bg-[#2b2d31] border-[#35373c] text-[#949ba4] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Painel da Reunião</span>
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
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
                alt="Ana Silva"
                className="w-24 h-24 rounded-full object-cover shadow-xl ring-4 ring-[#1e1f22]"
              />
              <div className="text-white font-bold text-base flex items-center gap-2">
                Ana Silva
                <span className="w-2 h-2 rounded-full bg-[#23a55a]" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3 bg-[#111214]/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-2">
              <span>Ana Silva</span>
            </div>
          </div>

          {/* Teammate Tile 2: Carlos Mendes */}
          <div className="relative rounded-2xl bg-[#2b2d31] overflow-hidden flex flex-col items-center justify-center border-2 border-transparent hover:border-[#35373c] transition-all">
            <div className="flex flex-col items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80"
                alt="Carlos Mendes"
                className="w-24 h-24 rounded-full object-cover shadow-xl ring-4 ring-[#1e1f22]"
              />
              <div className="text-white font-bold text-base flex items-center gap-2">
                Carlos Mendes
              </div>
            </div>
            <div className="absolute bottom-3 left-3 bg-[#111214]/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-2">
              <span>Carlos Mendes</span>
            </div>
          </div>

          {/* Teammate Tile 3: Diskai AI Assistant */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#1e1f22] to-[#2b2d31] overflow-hidden flex flex-col items-center justify-center border-2 border-[#5865F2]/40 shadow-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-[#5865F2]/20 border-2 border-[#5865F2] flex items-center justify-center text-[#5865F2] shadow-2xl relative">
                <Bot className="w-12 h-12" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#23a55a] rounded-full ring-4 ring-[#1e1f22] animate-pulse" />
              </div>
              <div className="text-white font-bold text-base flex items-center gap-1.5">
                Diskai AI Bot
                <Sparkles className="w-4 h-4 text-[#5865F2]" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3 bg-[#5865F2]/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1.5">
              <span>IA Gravando & Atenta</span>
            </div>
          </div>
        </div>

        {/* Live Drawer: Chat Geral com Input Fixo, Participantes e Transcrição */}
        {showLiveTranscript && (
          <div className="w-88 sm:w-96 bg-[#2b2d31] rounded-2xl border border-[#35373c] p-4 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 h-full">
            {/* Header com Abas Segmentadas (Sem número indicador) */}
            <div className="flex items-center justify-between pb-3 border-b border-[#35373c] flex-shrink-0">
              <div className="flex items-center gap-1 bg-[#1e1f22] p-1 rounded-xl border border-white/5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSideDrawerTab('all')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    sideDrawerTab === 'all'
                      ? 'bg-[#5865F2] text-white shadow'
                      : 'text-[#949ba4] hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Geral</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSideDrawerTab('participants')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    sideDrawerTab === 'participants'
                      ? 'bg-[#5865F2] text-white shadow'
                      : 'text-[#949ba4] hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Participantes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSideDrawerTab('transcript')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    sideDrawerTab === 'transcript'
                      ? 'bg-[#5865F2] text-white shadow'
                      : 'text-[#949ba4] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Transcrição</span>
                </button>
              </div>

              <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
                Ao Vivo
              </span>
            </div>

            {/* ABA 1: CHAT GERAL DA REUNIÃO (Lista de Participantes 100% Removida daqui) */}
            {sideDrawerTab === 'all' && (
              <div className="flex-1 flex flex-col min-h-0 pt-2 relative">
                {/* Cabeçalho do Chat */}
                <div className="flex items-center justify-between pb-2 text-xs font-bold text-white flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-[#5865F2]">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat da Reunião</span>
                  </div>
                  <span className="text-[10px] text-[#949ba4]">
                    {channelMessages.length} mensagens
                  </span>
                </div>

                {/* Área de Mensagens com Rolagem */}
                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar text-xs pr-0.5 pb-2">
                  {channelMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#949ba4] px-4 space-y-2 py-10">
                      <div className="w-10 h-10 rounded-2xl bg-[#1e1f22] flex items-center justify-center text-[#5865F2] border border-[#3e4047]">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-white text-xs">Nenhuma mensagem enviada ainda</p>
                      <p className="text-[11px]">Envie textos, reações e documentos aos participantes abaixo.</p>
                    </div>
                  ) : (
                    channelMessages.map(msg => {
                      const author = getAuthor(msg.userId);
                      const isMe = msg.userId === currentUser.id;

                      return (
                        <div
                          key={msg.id}
                          className="group relative p-2.5 rounded-xl bg-[#1e1f22]/70 hover:bg-[#1e1f22] border border-white/[0.04] transition-all space-y-1.5"
                        >
                          {/* Top Author & Timestamp & Menu de Três Pontos (...) */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={author.avatar}
                                alt={author.name}
                                className="w-5 h-5 rounded-full object-cover border border-white/10 flex-shrink-0"
                              />
                              <span className="font-bold text-white text-[11px] truncate">{author.name}</span>
                              <span className="text-[10px] text-[#949ba4]">{msg.timestamp}</span>
                              {msg.isEdited && (
                                <span className="text-[9px] text-[#949ba4] italic">(editado)</span>
                              )}
                            </div>

                            {/* Menu de Três Pontos (...) ao lado da mensagem */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id)}
                                className="p-1 rounded-md text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
                                title="Opções da mensagem"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* Dropdown Menu de Edição / Reações */}
                              {activeMessageMenuId === msg.id && (
                                <div className="absolute right-0 top-full mt-1 w-44 bg-[#2b2d31] border border-[#3e4047] rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                                  {/* Linha rápida de reações */}
                                  <div className="flex items-center justify-between px-1 py-1 border-b border-white/5 mb-1">
                                    {['👍', '❤️', '🔥', '👏', '🦜'].map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleToggleReaction(msg.id, emoji)}
                                        className="hover:scale-125 transition-transform text-sm p-0.5"
                                        title={`Reagir com ${emoji}`}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Opção de Editar */}
                                  <button
                                    onClick={() => handleStartEdit(msg.id, msg.content)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#35373c] text-white flex items-center gap-2 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                                    <span>Editar mensagem</span>
                                  </button>

                                  {/* Opção de Excluir */}
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Conteúdo ou Modo de Edição Inline */}
                          {editingMessageId === msg.id ? (
                            <div className="space-y-1.5 pt-1">
                              <input
                                type="text"
                                value={editingText}
                                onChange={e => setEditingText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit(msg.id);
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                className="w-full bg-[#2b2d31] border border-[#5865F2] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                autoFocus
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-2 py-1 text-[10px] text-[#949ba4] hover:text-white"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-[#5865F2] text-white rounded-md shadow"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[#dbdee1] leading-relaxed break-words">{msg.content}</p>
                          )}

                          {/* Anexos da Mensagem */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {msg.attachments.map(att => (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 bg-[#2b2d31] hover:bg-[#35373c] border border-white/10 px-2 py-1 rounded-lg text-[10px] text-white transition-colors"
                                >
                                  <Paperclip className="w-3 h-3 text-[#38bdf8]" />
                                  <span className="truncate max-w-[150px]">{att.name}</span>
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Reações exibidas */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {msg.reactions.map((r, rIdx) => {
                                const hasReacted = r.users.includes(currentUser.id);
                                return (
                                  <button
                                    key={rIdx}
                                    onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-all ${
                                      hasReacted
                                        ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                                        : 'bg-[#2b2d31] border-white/10 text-[#dbdee1] hover:border-white/20'
                                    }`}
                                  >
                                    <span>{r.emoji}</span>
                                    <span className="font-bold">{r.count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Visualizador de Anexos Estagiados antes do Envio */}
                {stagedAttachments.length > 0 && (
                  <div className="p-2 border-t border-[#35373c] bg-[#1e1f22] rounded-xl mb-1.5 space-y-1">
                    <div className="text-[10px] font-bold text-[#949ba4] uppercase">Anexos ({stagedAttachments.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {stagedAttachments.map(att => (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 bg-[#2b2d31] border border-white/10 px-2 py-0.5 rounded-lg text-[10px] text-white"
                        >
                          <Paperclip className="w-3 h-3 text-[#38bdf8]" />
                          <span className="truncate max-w-[120px]">{att.name}</span>
                          <button
                            onClick={() => removeAttachment(att.id)}
                            className="text-[#949ba4] hover:text-rose-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popover Rápido de Emojis */}
                {showEmojiPicker && (
                  <div className="absolute bottom-14 right-2 bg-[#1e1f22] border border-[#3e4047] rounded-xl shadow-2xl p-2 z-50 grid grid-cols-5 gap-1.5 text-base">
                    {quickEmojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setChatInputText(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-1 hover:bg-[#35373c] rounded-lg transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* CAMPO DE TEXTO FUNCIONAL FIXO NO CANTO INFERIOR (Conforme Requisito 1) */}
                <form
                  onSubmit={handleSendMessage}
                  className="pt-2 border-t border-[#35373c] flex items-center gap-1.5 flex-shrink-0"
                >
                  {/* Botão de Anexo (+) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Anexar arquivos ou fotos"
                    className="p-2 rounded-xl bg-[#1e1f22] hover:bg-[#35373c] text-[#949ba4] hover:text-white border border-white/5 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 text-[#38bdf8]" />
                  </button>

                  {/* Input de Mensagem */}
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={e => setChatInputText(e.target.value)}
                    placeholder="Conversar na reunião..."
                    className="flex-1 bg-[#1e1f22] border border-[#3e4047] focus:border-[#5865F2] rounded-xl px-3 py-2 text-xs text-white placeholder-[#949ba4] focus:outline-none transition-colors"
                  />

                  {/* Botão Seletor de Emojis */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Adicionar emoji"
                    className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                      showEmojiPicker
                        ? 'bg-[#5865F2] text-white'
                        : 'bg-[#1e1f22] hover:bg-[#35373c] text-[#949ba4] hover:text-white border border-white/5'
                    }`}
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  {/* Botão de Envio */}
                  <button
                    type="submit"
                    disabled={!chatInputText.trim() && stagedAttachments.length === 0}
                    title="Enviar mensagem"
                    className="p-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white transition-all shadow disabled:opacity-40 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* ABA 2: LISTA DE PARTICIPANTES EM TEMPO REAL (Painel lateral dedicado) */}
            {sideDrawerTab === 'participants' && (
              <div className="flex-1 flex flex-col min-h-0 pt-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-[#38bdf8]">
                    <Users className="w-3.5 h-3.5" />
                    <span>Participantes Presentes</span>
                  </div>
                  <span className="text-[10px] text-[#23a55a] font-semibold flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Conectados
                  </span>
                </div>

                <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar pr-0.5">
                  {connectedParticipants.map(p => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-[#1e1f22]/70 border border-white/[0.04] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.isBot ? (
                          <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] flex-shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                        ) : p.avatar ? (
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-white text-[11px] truncate flex items-center gap-1">
                            {p.name}
                            {p.isSpeaking && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-ping" />
                            )}
                          </div>
                          <div className="text-[10px] text-[#949ba4] truncate">{p.role}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {p.isMuted ? (
                          <span title="Microfone Desligado" className="p-1.5 rounded-md bg-rose-500/10 text-rose-400">
                            <MicOff className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span title="Microfone Ativo" className="p-1.5 rounded-md bg-[#23a55a]/15 text-[#23a55a]">
                            <Mic className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {p.isVideo && (
                          <span title="Câmera Ligada" className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                            <Video className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 3: TRANSCRIÇÃO DA CHAMADA EM TEMPO REAL */}
            {sideDrawerTab === 'transcript' && (
              <div className="flex-1 flex flex-col min-h-0 pt-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Transcrição da Chamada</span>
                  </div>
                  <span className="text-[10px] text-[#949ba4]">
                    {liveTranscript.length} falas
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 no-scrollbar text-xs pr-0.5">
                  {liveTranscript.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#949ba4] px-4 space-y-2 py-8">
                      <Bot className="w-8 h-8 text-[#5865F2] opacity-70" />
                      <p className="text-xs">Inicie a gravação para ver a transcrição em tempo real aqui.</p>
                    </div>
                  ) : (
                    liveTranscript.map((t, idx) => (
                      <div key={idx} className="bg-[#1e1f22]/70 p-2.5 rounded-xl border border-[#383a40] space-y-1">
                        <div className="flex items-center justify-between text-[#949ba4] font-semibold text-[11px]">
                          <span className="text-white font-bold">{t.speaker}</span>
                          <span className="font-mono text-[10px]">{t.time}</span>
                        </div>
                        <p className="text-[#dbdee1] leading-relaxed text-xs">{t.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-[#35373c] text-center flex-shrink-0">
                  <span className="text-[10px] text-[#949ba4]">
                    Ao encerrar a call, a IA sintetizará todas as falas em um resumo executivo com tarefas.
                  </span>
                </div>
              </div>
            )}
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

        {/* End Call & Generate AI Summary */}
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
