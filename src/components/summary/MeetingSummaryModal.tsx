import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  Play,
  Pause,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Users,
  MessageSquare,
  Volume2,
  FileText,
  RotateCw,
  Send,
  ListOrdered,
  AlertTriangle,
  History,
  FileCode,
  Plus,
  Flame,
  CheckSquare,
  TrendingUp,
  BrainCircuit,
  BookmarkCheck
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { summaryToMarkdown, compressTranscriptToMarkdown } from '../../utils/aiSummarizer';
import { ActionItem, MeetingSummary } from '../../types';

export const MeetingSummaryModal: React.FC = () => {
  const {
    activeSummaryModal,
    closeSummaryModal,
    toggleActionItem,
    updateMeetingSummary,
    addMeetingSummaryTask,
    postSummaryToChat,
    activeServer,
    summaries,
    currentUser,
    theme
  } = useDiskai();

  const isLight = theme === 'light';

  // Ordem sequencial e estruturada em 4 Passos lógicos
  type StudioStep = 'step1_transcription' | 'step2_summary' | 'step3_timeline' | 'step4_tasks';
  const [activeStep, setActiveStep] = useState<StudioStep>('step1_transcription');

  // Seleção de reunião atual vs histórico anterior
  const [selectedSummaryId, setSelectedSummaryId] = useState<string>(
    activeSummaryModal ? activeSummaryModal.id : (summaries[0]?.id || '')
  );

  useEffect(() => {
    if (activeSummaryModal?.id) {
      setSelectedSummaryId(activeSummaryModal.id);
    }
  }, [activeSummaryModal?.id]);

  const currentSummary = summaries.find(s => s.id === selectedSummaryId) || activeSummaryModal;

  // Estados do Passo 1: Regra de Pós-Reunião (Pendente) para conferir título e anotações
  const [editedTitle, setEditedTitle] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [titleSavedSuccess, setTitleSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentSummary) {
      setEditedTitle(currentSummary.title || '');
      setEditedNotes(currentSummary.meetingNotes || '');
    }
  }, [currentSummary?.id, currentSummary?.title]);

  // Estados do Passo 4: Adicionar Tarefa Manualmente
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser?.name || 'Equipe');
  const [newTaskPriority, setNewTaskPriority] = useState<'alta' | 'média' | 'baixa'>('alta');

  // Estados de Áudio e Ações
  const [copied, setCopied] = useState(false);
  const [copiedCompressed, setCopiedCompressed] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  if (!activeSummaryModal || !currentSummary) return null;

  const handleCopyMarkdown = () => {
    const md = summaryToMarkdown(currentSummary);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCompressedTranscript = () => {
    const md = compressTranscriptToMarkdown(currentSummary);
    navigator.clipboard.writeText(md);
    setCopiedCompressed(true);
    setTimeout(() => setCopiedCompressed(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = summaryToMarkdown(currentSummary);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ata_Studio_${currentSummary.channelName.replace(/\s+/g, '_')}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCompressedTranscript = () => {
    const md = compressTranscriptToMarkdown(currentSummary);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Transcricao_Otimizada_${currentSummary.channelName.replace(/\s+/g, '_')}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePostToChat = () => {
    const textChannels = activeServer.categories.flatMap(c => c.channels).filter(c => c.type === 'text');
    const targetChannel = textChannels.find(c => c.name.includes('resumo')) || textChannels[0];

    if (targetChannel) {
      postSummaryToChat(currentSummary.id, targetChannel.id);
      setPostedSuccess(true);
      setTimeout(() => setPostedSuccess(false), 3000);
    }
  };

  const togglePlayAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
      }
    }
  };

  const changePlaybackSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Salvar Título e Anotações da Regra de Pós-Reunião (Pendente)
  const handleSaveTitleAndNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedTitle.trim()) return;

    updateMeetingSummary(currentSummary.id, {
      title: editedTitle.trim(),
      meetingNotes: editedNotes.trim(),
      titlePending: false
    });

    setTitleSavedSuccess(true);
    setTimeout(() => setTitleSavedSuccess(false), 3000);
  };

  // Adicionar Tarefa Manualmente no Passo 4
  const handleCreateManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    addMeetingSummaryTask(currentSummary.id, {
      task: newTaskText.trim(),
      assignee: newTaskAssignee || 'Equipe',
      priority: newTaskPriority
    });

    setNewTaskText('');
  };

  const handleRefineSummary = async () => {
    if (!customPrompt.trim()) return;
    setIsRefining(true);
    await new Promise(r => setTimeout(r, 900));
    updateMeetingSummary(currentSummary.id, {
      executiveSummary: `[Refinamento IA: "${customPrompt}"]: ` + currentSummary.executiveSummary
    });
    setIsRefining(false);
    setCustomPrompt('');
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-colors ${
        isLight
          ? 'bg-white border border-slate-300 text-slate-800'
          : 'bg-[#2b2d31] border border-[#3e4047] text-[#dbdee1]'
      }`}>
        {/* Header do Studio de Reuniões */}
        <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#1f2023]'
        }`}>
          <div className="space-y-1 min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border ${
                isLight
                  ? 'bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/30'
                  : 'bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]/40'
              }`}>
                Studio de Reuniões & Atas IA
              </span>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight truncate ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {currentSummary.title}
              </h2>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 flex-shrink-0 ${
                isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-[#23a55a]/15 text-[#23a55a] border-[#23a55a]/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
                {currentSummary.sentiment}
              </span>
            </div>

            <div className={`flex items-center gap-3 text-xs flex-wrap ${
              isLight ? 'text-slate-600 font-medium' : 'text-[#949ba4]'
            }`}>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {currentSummary.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {currentSummary.durationFormatted}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {currentSummary.participants.length} participantes
              </span>
              {currentSummary.titlePending && (
                <span className={`font-bold flex items-center gap-1 animate-pulse ${
                  isLight ? 'text-amber-800' : 'text-amber-400'
                }`}>
                  <AlertTriangle className="w-3 h-3" /> Título Pendente de Conferência
                </span>
              )}
            </div>
          </div>

          <button
            onClick={closeSummaryModal}
            className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Áudio Sincronizada */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-4 text-xs flex-shrink-0 transition-colors ${
          isLight ? 'bg-slate-100/90 border-slate-200 text-slate-800' : 'bg-[#1e1f22]/70 border-[#1f2023] text-white'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={togglePlayAudio}
              className="w-8 h-8 rounded-full bg-[#5865F2] hover:bg-[#4752c4] text-white flex items-center justify-center transition-all shadow flex-shrink-0 active:scale-95"
            >
              {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="truncate">
              <div className={`font-bold truncate flex items-center gap-1.5 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <Volume2 className="w-3.5 h-3.5 text-[#5865F2]" />
                Áudio da Reunião
              </div>
              <div className={`text-[11px] ${isLight ? 'text-slate-500 font-medium' : 'text-[#949ba4]'}`}>
                Gravação sincronizada e processada
              </div>
            </div>
            {currentSummary.audioUrl && (
              <audio
                ref={audioRef}
                src={currentSummary.audioUrl}
                onEnded={() => setIsPlayingAudio(false)}
              />
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={changePlaybackSpeed}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-colors ${
                isLight
                  ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                  : 'bg-[#2b2d31] hover:bg-[#35373c] text-white border-[#3e4047]'
              }`}
            >
              {playbackSpeed}x
            </button>
            {currentSummary.audioUrl && (
              <a
                href={currentSummary.audioUrl}
                download={`Reuniao_${Date.now()}.webm`}
                className={`text-[11px] px-2.5 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                    : 'bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white border-[#3e4047]'
                }`}
              >
                <Download className="w-3 h-3" /> Baixar Áudio
              </a>
            )}
          </div>
        </div>

        {/* ORDEM SEQUENCIAL E FLUXO LÓGICO DOS 4 PASSOS ESTRUTURADOS */}
        <div className={`px-6 py-2.5 border-b flex-shrink-0 transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#1f2023]'
        }`}>
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl border transition-colors ${
            isLight ? 'bg-slate-200/80 border-slate-300/70' : 'bg-[#1e1f22] border-white/5'
          }`}>
            <button
              type="button"
              onClick={() => setActiveStep('step1_transcription')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeStep === 'step1_transcription'
                  ? 'bg-[#5865F2] text-white shadow-md'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-white/90'
                  : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Passo 1: Transcrição</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('step2_summary')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeStep === 'step2_summary'
                  ? 'bg-[#5865F2] text-white shadow-md'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-white/90'
                  : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-300'}`} />
              <span>Passo 2: Resumos IA</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('step3_timeline')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeStep === 'step3_timeline'
                  ? 'bg-[#5865F2] text-white shadow-md'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-white/90'
                  : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <ListOrdered className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-300'}`} />
              <span>Passo 3: Linha do Tempo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('step4_tasks')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeStep === 'step4_tasks'
                  ? 'bg-[#5865F2] text-white shadow-md'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-white/90'
                  : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              <span>Passo 4: Tarefas & Ações</span>
            </button>
          </div>
        </div>

        {/* CONTEÚDO DOS PASSOS DO STUDIO */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 no-scrollbar">
          {/* ========================================================================= */}
          {/* PASSO 1 — TRANSCRIÇÃO EM TEMPO REAL, HISTÓRICO & REGRA DE PÓS-REUNIÃO     */}
          {/* ========================================================================= */}
          {activeStep === 'step1_transcription' && (
            <div className="space-y-4">
              {/* REGRA DE PÓS-REUNIÃO: Status Pendente com Destaque em Anotações */}
              {currentSummary.titlePending && (
                <div className={`p-4 rounded-2xl shadow-sm space-y-3 animate-in fade-in border-2 ${
                  isLight
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border-amber-500/50 text-[#dbdee1]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 animate-pulse flex-shrink-0 ${
                        isLight ? 'text-amber-800' : 'text-amber-400'
                      }`} />
                      <span className={`text-xs font-black uppercase tracking-wider ${
                        isLight ? 'text-amber-900' : 'text-amber-300'
                      }`}>
                        Status Pós-Reunião: Conferir Título e Anotações
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isLight
                        ? 'bg-amber-200/80 text-amber-900 border-amber-400/60'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      Pendente de Aprovação
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed ${
                    isLight ? 'text-amber-950 font-medium' : 'text-[#dbdee1]'
                  }`}>
                    Confirme o título oficial e as anotações principais para registrar na base da ata.
                  </p>

                  <form onSubmit={handleSaveTitleAndNotes} className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2 space-y-1">
                        <label className={`text-[10px] font-bold uppercase ${
                          isLight ? 'text-amber-900' : 'text-[#949ba4]'
                        }`}>
                          Título Oficial da Reunião:
                        </label>
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={e => setEditedTitle(e.target.value)}
                          placeholder="Ex: Alinhamento Estratégico de Produto"
                          className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border shadow-xs ${
                            isLight
                              ? 'bg-white border-amber-400/80 text-slate-900 placeholder-slate-400 focus:border-amber-600'
                              : 'bg-[#18191c] border-amber-500/30 text-white placeholder-[#80848e] focus:border-amber-400'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className={`text-[10px] font-bold uppercase ${
                          isLight ? 'text-amber-900' : 'text-[#949ba4]'
                        }`}>
                          Anotações Principais:
                        </label>
                        <input
                          type="text"
                          value={editedNotes}
                          onChange={e => setEditedNotes(e.target.value)}
                          placeholder="Notas de contexto da reunião..."
                          className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border shadow-xs ${
                            isLight
                              ? 'bg-white border-amber-400/80 text-slate-900 placeholder-slate-400 focus:border-amber-600'
                              : 'bg-[#18191c] border-amber-500/30 text-white placeholder-[#80848e] focus:border-amber-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {titleSavedSuccess ? (
                        <span className={`text-xs font-bold flex items-center gap-1 ${
                          isLight ? 'text-emerald-700' : 'text-emerald-400'
                        }`}>
                          <Check className="w-3.5 h-3.5" /> Título e anotações confirmados!
                        </span>
                      ) : (
                        <div />
                      )}

                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow transition-all hover:scale-102 active:scale-98 flex items-center gap-1.5 ml-auto"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmar Título Oficial</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Seletor do Histórico de Reuniões Anteriores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className={`flex items-center gap-1.5 font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    <History className="w-4 h-4 text-[#5865F2]" />
                    <span>Histórico de Transcrições ({summaries.length})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {summaries.map(s => {
                    const isSelected = s.id === currentSummary.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSummaryId(s.id)}
                        className={`p-2.5 rounded-2xl border text-left min-w-[200px] max-w-[240px] flex-shrink-0 transition-all ${
                          isSelected
                            ? isLight
                              ? 'bg-[#5865F2]/10 border-2 border-[#5865F2] text-slate-900 shadow-sm'
                              : 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-md'
                            : isLight
                            ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 shadow-xs'
                            : 'bg-[#1e1f22]/70 hover:bg-[#1e1f22] border-[#3e4047] text-[#949ba4] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className={`font-mono truncate max-w-[120px] ${
                            isLight ? 'text-sky-700 font-bold' : 'text-[#38bdf8]'
                          }`}>
                            #{s.channelName}
                          </span>
                          <span className={isLight ? 'text-slate-600' : 'text-[#949ba4]'}>{s.durationFormatted}</span>
                        </div>
                        <div className={`font-bold text-xs truncate ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>{s.title}</div>
                        <div className={`text-[10px] mt-0.5 truncate ${
                          isLight ? 'text-slate-500 font-medium' : 'text-[#949ba4]'
                        }`}>{s.date}</div>
                        {s.titlePending && (
                          <div className={`mt-1 text-[9px] font-bold flex items-center gap-1 ${
                            isLight ? 'text-amber-800' : 'text-amber-400'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pendente
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Barra de Ações Rápidas da Transcrição: Salvar Markdown Otimizado */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#1e1f22] border-[#3e4047]'
              }`}>
                <div className={`flex items-center gap-2 text-xs font-semibold ${
                  isLight ? 'text-slate-900' : 'text-[#dbdee1]'
                }`}>
                  <FileCode className="w-4 h-4 text-[#5865F2]" />
                  <span>
                    Transcrição em Markdown ({currentSummary.transcript.length} falas)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCompressedTranscript}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 ${
                      isLight
                        ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                        : 'bg-[#2b2d31] hover:bg-[#35373c] text-white border-[#3e4047]'
                    }`}
                  >
                    {copiedCompressed ? <Check className="w-3.5 h-3.5 text-[#23a55a]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCompressed ? 'Copiado!' : 'Copiar Markdown'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCompressedTranscript}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 active:scale-95 ${
                      isLight
                        ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                        : 'bg-[#2b2d31] hover:bg-[#35373c] text-white border-[#3e4047]'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar (.md)</span>
                  </button>
                </div>
              </div>

              {/* Linhas da Transcrição da Reunião Selecionada */}
              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {currentSummary.transcript.length === 0 ? (
                  <div className={`text-center py-8 text-xs ${
                    isLight ? 'text-slate-500' : 'text-[#949ba4]'
                  }`}>
                    Nenhuma transcrição gravada para esta reunião.
                  </div>
                ) : (
                  currentSummary.transcript.map((line, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl border space-y-1 transition-colors ${
                        isLight
                          ? 'bg-white border-slate-200 hover:border-[#5865F2]/40 shadow-xs'
                          : 'bg-[#1e1f22]/60 border-[#3e4047]/60 hover:border-[#5865F2]/40'
                      }`}
                    >
                      <div className={`flex items-center justify-between text-xs ${
                        isLight ? 'text-slate-600' : 'text-[#949ba4]'
                      }`}>
                        <span className={`font-bold flex items-center gap-1.5 ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" />
                          {line.speaker}
                        </span>
                        <span className={`font-mono text-[11px] font-bold ${
                          isLight ? 'text-sky-700' : 'text-[#38bdf8]'
                        }`}>
                          {line.time}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed pl-3 border-l-2 border-[#5865F2]/30 ${
                        isLight ? 'text-slate-700' : 'text-[#dbdee1]'
                      }`}>
                        {line.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASSO 2 — RESUMOS INTELIGENTES COM PONTOS ESPECÍFICOS E CRUCIAIS          */}
          {/* ========================================================================= */}
          {activeStep === 'step2_summary' && (
            <div className="space-y-4">
              {/* Síntese Executiva com Pontos Cruciais */}
              <div className={`rounded-2xl p-4 border space-y-2 shadow-xs transition-colors ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-[#1e1f22]/70 border-[#3e4047]/60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#5865F2] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Síntese Executiva</span>
                  </div>
                </div>
                <p className={`text-sm leading-relaxed font-medium ${
                  isLight ? 'text-slate-800' : 'text-[#dbdee1]'
                }`}>
                  {currentSummary.executiveSummary}
                </p>
              </div>

              {/* Decisões Tomadas */}
              <div className="space-y-2.5">
                <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  <BookmarkCheck className="w-4 h-4 text-[#23a55a]" />
                  <span>Decisões e Acordos ({currentSummary.decisions.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {currentSummary.decisions.map((dec, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs shadow-xs transition-colors ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-[#1e1f22]/50 border-[#3e4047] text-[#dbdee1]'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-lg font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#23a55a]/15 text-[#23a55a]'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="leading-snug font-medium">{dec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barra de Refinamento Interativo com IA */}
              <div className={`p-2 rounded-2xl border flex items-center gap-2 shadow-xs transition-colors ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#1e1f22] border-[#3e4047]'
              }`}>
                <Sparkles className="w-4 h-4 text-[#5865F2] ml-2 flex-shrink-0 animate-pulse" />
                <input
                  type="text"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRefineSummary();
                  }}
                  placeholder="Pedir ajuste à IA (ex: Resumir em tópicos)..."
                  className={`bg-transparent text-xs flex-1 px-2 py-1.5 focus:outline-none ${
                    isLight
                      ? 'text-slate-900 placeholder-slate-400'
                      : 'text-white placeholder-[#80848e]'
                  }`}
                />
                <button
                  onClick={handleRefineSummary}
                  disabled={!customPrompt.trim() || isRefining}
                  className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-40 shadow active:scale-95 flex-shrink-0"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                  <span>Refinar</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASSO 3 — TÓPICOS POR LINHA DO TEMPO (BLOCOS E ETAPAS DA REUNIÃO)        */}
          {/* ========================================================================= */}
          {activeStep === 'step3_timeline' && (
            <div className="space-y-3">
              <div className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <ListOrdered className={`w-4 h-4 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
                <span>Linha do Tempo da Reunião</span>
              </div>

              <div className="space-y-3">
                {currentSummary.keyTopics.map((topic, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border space-y-1.5 relative transition-colors shadow-xs ${
                      isLight
                        ? 'bg-white border-slate-200 hover:border-cyan-500/40'
                        : 'bg-[#1e1f22]/60 border-[#3e4047] hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                        isLight
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : 'bg-cyan-600/20 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {topic.timestamp}
                      </span>
                      <h4 className={`text-xs font-bold ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>
                        Etapa {i + 1}: {topic.topic}
                      </h4>
                    </div>
                    <p className={`text-xs leading-relaxed pl-14 ${
                      isLight ? 'text-slate-600 font-normal' : 'text-[#949ba4]'
                    }`}>
                      {topic.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASSO 4 — TAREFAS E AÇÕES (MANUAL + GERADAS POR IA + NÍVEL DE URGÊNCIA)   */}
          {/* ========================================================================= */}
          {activeStep === 'step4_tasks' && (
            <div className="space-y-4">
              {/* Título Limpo */}
              <div className="py-1">
                <h3 className={`text-sm font-bold tracking-wide ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Tarefas e Ações da Reunião
                </h3>
              </div>

              {/* Formulário para Adicionar Tarefa Manualmente */}
              <form
                onSubmit={handleCreateManualTask}
                className={`p-3.5 rounded-2xl border space-y-2.5 shadow-xs transition-colors ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#1e1f22] border-[#3e4047]'
                }`}
              >
                <div className={`flex items-center gap-2 text-xs font-bold ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Adicionar Nova Tarefa</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Descrição da tarefa..."
                    className={`sm:col-span-2 rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-[#5865F2] placeholder-slate-400'
                        : 'bg-[#2b2d31] border-[#3e4047] text-white focus:border-[#38bdf8]'
                    }`}
                  />

                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className={`rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-colors border ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                        : 'bg-[#2b2d31] border-[#3e4047] text-white'
                    }`}
                  >
                    <option value={currentUser.name || 'Você'}>@{currentUser.name || 'Você'}</option>
                    {currentSummary.participants.map((p, pIdx) => (
                      <option key={pIdx} value={p}>
                        @{p}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                    className={`rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-colors border ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                        : 'bg-[#2b2d31] border-[#3e4047] text-white'
                    }`}
                  >
                    <option value="alta">🔥 Urgência Alta</option>
                    <option value="média">⚡ Urgência Média</option>
                    <option value="baixa">☕ Urgência Baixa</option>
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!newTaskText.trim()}
                    className="px-4 py-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-40"
                  >
                    + Salvar Tarefa
                  </button>
                </div>
              </form>

              {/* Análise Automatizada da IA sobre Tarefas */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 shadow-xs transition-colors ${
                isLight
                  ? 'bg-emerald-50/90 border-emerald-300'
                  : 'bg-gradient-to-r from-emerald-500/10 via-[#5865F2]/10 to-indigo-500/10 border-emerald-500/30'
              }`}>
                <BrainCircuit className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  isLight ? 'text-emerald-700' : 'text-emerald-400'
                }`} />
                <div className="space-y-1 text-xs">
                  <div className={`font-bold flex items-center gap-2 ${
                    isLight ? 'text-emerald-950' : 'text-white'
                  }`}>
                    <span>Ações identificadas pela IA:</span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                      isLight
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {currentSummary.actionItems.filter(a => a.completed).length} de {currentSummary.actionItems.length} Concluídas
                    </span>
                  </div>
                  <p className={`leading-relaxed text-[11px] ${
                    isLight ? 'text-emerald-900 font-medium' : 'text-[#dbdee1]'
                  }`}>
                    {currentSummary.actionItems.length} pontos de ação registrados. Priorize as tarefas de nível alta.
                  </p>
                </div>
              </div>

              {/* Lista de Tarefas da Reunião com Nível de Urgência */}
              <div className="space-y-2">
                {currentSummary.actionItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleActionItem(currentSummary.id, item.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between gap-3 transition-all shadow-xs ${
                      item.completed
                        ? isLight
                          ? 'bg-emerald-50/40 border-emerald-200 text-slate-400'
                          : 'bg-[#23a55a]/10 border-[#23a55a]/30 text-[#949ba4]'
                        : isLight
                        ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-[#1e1f22]/50 hover:bg-[#1e1f22] border-[#3e4047] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#23a55a] flex-shrink-0" />
                      ) : (
                        <Circle className={`w-4 h-4 flex-shrink-0 ${
                          isLight ? 'text-slate-400' : 'text-[#80848e]'
                        }`} />
                      )}
                      <span className={`text-xs truncate ${
                        item.completed
                          ? 'line-through text-slate-400'
                          : isLight
                          ? 'font-bold text-slate-900'
                          : 'font-medium text-white'
                      }`}>
                        {item.task}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                        isLight
                          ? 'bg-[#5865F2]/10 text-[#5865F2]'
                          : 'bg-[#5865F2]/20 text-[#5865F2]'
                      }`}>
                        @{item.assignee}
                      </span>

                      {/* Tag de Nível de Urgência */}
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                          item.priority === 'alta'
                            ? isLight
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : item.priority === 'média'
                            ? isLight
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isLight
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                        }`}
                      >
                        {item.priority === 'alta' ? '🔥 Alta' : item.priority === 'média' ? '⚡ Média' : '☕ Baixa'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActionItem(currentSummary.id, item.id);
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
                          item.completed
                            ? 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/40'
                            : 'bg-[#23a55a] hover:bg-[#1f9350] text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{item.completed ? 'Concluída' : 'Concluir'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações do Studio */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between gap-3 flex-shrink-0 flex-wrap transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#232428] border-[#1f2023]'
        }`}>
          <button
            onClick={handlePostToChat}
            className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow active:scale-95 ${
              postedSuccess
                ? 'bg-[#23a55a] text-white'
                : 'bg-[#5865F2] hover:bg-[#4752c4] text-white'
            }`}
          >
            {postedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" /> Postado no Canal de Resumos!
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Postar no Canal #resumos-de-reunioes
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-colors active:scale-95 shadow-xs ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-[#2b2d31] hover:bg-[#35373c] text-white border-[#3e4047]'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#23a55a]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Ata Completa'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors active:scale-95 shadow-xs ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-[#2b2d31] hover:bg-[#35373c] text-white border-[#3e4047]'
              }`}
            >
              <Download className="w-3.5 h-3.5" /> Baixar Ata (.md)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
