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
    currentUser
  } = useDiskai();

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
      <div className="bg-[#2b2d31] border border-[#3e4047] w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1]">
        {/* Header do Studio de Reuniões */}
        <div className="px-6 py-4 bg-[#232428] border-b border-[#1f2023] flex items-center justify-between flex-shrink-0">
          <div className="space-y-1 min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40">
                Studio de Reuniões & Atas IA
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {currentSummary.title}
              </h2>
              <span className="text-[11px] bg-[#23a55a]/15 text-[#23a55a] font-bold px-2 py-0.5 rounded-full border border-[#23a55a]/30 flex items-center gap-1.5 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
                {currentSummary.sentiment}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#949ba4] flex-wrap">
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
                <span className="text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Título Pendente de Conferência
                </span>
              )}
            </div>
          </div>

          <button
            onClick={closeSummaryModal}
            className="p-2 rounded-xl text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Áudio Sincronizada */}
        <div className="px-6 py-2.5 bg-[#1e1f22]/70 border-b border-[#1f2023] flex items-center justify-between gap-4 text-xs flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={togglePlayAudio}
              className="w-8 h-8 rounded-full bg-[#5865F2] hover:bg-[#4752c4] text-white flex items-center justify-center transition-all shadow flex-shrink-0 active:scale-95"
            >
              {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="truncate">
              <div className="font-semibold text-white truncate flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#5865F2]" />
                Áudio da Reunião
              </div>
              <div className="text-[11px] text-[#949ba4]">Gravação sincronizada e processada</div>
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
              className="text-[11px] font-bold bg-[#2b2d31] hover:bg-[#35373c] text-white px-2.5 py-1 rounded-md border border-[#3e4047] transition-colors"
            >
              {playbackSpeed}x
            </button>
            {currentSummary.audioUrl && (
              <a
                href={currentSummary.audioUrl}
                download={`Reuniao_${Date.now()}.webm`}
                className="text-[11px] bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white px-2.5 py-1 rounded-md border border-[#3e4047] flex items-center gap-1 transition-colors"
              >
                <Download className="w-3 h-3" /> Baixar Áudio
              </a>
            )}
          </div>
        </div>

        {/* ORDEM SEQUENCIAL E FLUXO LÓGICO DOS 4 PASSOS ESTRUTURADOS CONFORME REQUISITO 4 */}
        <div className="px-6 py-2.5 bg-[#232428] border-b border-[#1f2023] flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#1e1f22] p-1.5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveStep('step1_transcription')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeStep === 'step1_transcription'
                  ? 'bg-[#5865F2] text-white shadow-md'
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
                  : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Passo 2: Resumos IA</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('step3_timeline')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeStep === 'step3_timeline'
                  ? 'bg-[#5865F2] text-white shadow-md'
                  : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-cyan-300" />
              <span>Passo 3: Linha do Tempo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('step4_tasks')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeStep === 'step4_tasks'
                  ? 'bg-[#5865F2] text-white shadow-md'
                  : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border-2 border-amber-500/50 shadow-lg space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                        Status Pós-Reunião Pendente: Conferir Título e Anotações Oficiais
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Pendente de Aprovação
                    </span>
                  </div>

                  <p className="text-xs text-[#dbdee1] leading-relaxed">
                    A reunião foi finalizada com sucesso. Como criador da reunião, confirme o título definitivo e as anotações principais para registrar na base oficial do Studio.
                  </p>

                  <form onSubmit={handleSaveTitleAndNotes} className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-[#949ba4] uppercase">
                          Título Oficial da Reunião:
                        </label>
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={e => setEditedTitle(e.target.value)}
                          placeholder="Ex: Alinhamento Estratégico de Produto & Roadmap Q4"
                          className="w-full bg-[#18191c] border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 placeholder-[#80848e]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#949ba4] uppercase">
                          Anotações Principais:
                        </label>
                        <input
                          type="text"
                          value={editedNotes}
                          onChange={e => setEditedNotes(e.target.value)}
                          placeholder="Notas de contexto da reunião..."
                          className="w-full bg-[#18191c] border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 placeholder-[#80848e]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {titleSavedSuccess ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Título e anotações salvos e confirmados!
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#949ba4]">
                          O status pendente será removido após a confirmação.
                        </span>
                      )}

                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow transition-all hover:scale-102 active:scale-98 flex items-center gap-1.5"
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
                  <div className="flex items-center gap-1.5 text-white font-bold uppercase tracking-wider">
                    <History className="w-4 h-4 text-[#5865F2]" />
                    <span>Histórico de Transcrições de Reuniões ({summaries.length})</span>
                  </div>
                  <span className="text-[11px] text-[#949ba4]">
                    Clique para alternar entre as reuniões registradas
                  </span>
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
                            ? 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-md'
                            : 'bg-[#1e1f22]/70 hover:bg-[#1e1f22] border-[#3e4047] text-[#949ba4] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="font-mono text-[#38bdf8] truncate max-w-[120px]">#{s.channelName}</span>
                          <span>{s.durationFormatted}</span>
                        </div>
                        <div className="font-bold text-xs truncate text-white">{s.title}</div>
                        <div className="text-[10px] text-[#949ba4] mt-0.5 truncate">{s.date}</div>
                        {s.titlePending && (
                          <div className="mt-1 text-[9px] font-bold text-amber-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pendente
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Barra de Ações Rápidas da Transcrição: Salvar Markdown Otimizado */}
              <div className="p-3 bg-[#1e1f22] rounded-2xl border border-[#3e4047] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#dbdee1]">
                  <FileCode className="w-4 h-4 text-[#5865F2]" />
                  <span>
                    Transcrição Otimizada em Markdown ({currentSummary.transcript.length} falas)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCompressedTranscript}
                    className="px-3 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold rounded-xl border border-[#3e4047] transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    {copiedCompressed ? <Check className="w-3.5 h-3.5 text-[#23a55a]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCompressed ? 'Copiado!' : 'Copiar Markdown Otimizado'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCompressedTranscript}
                    className="px-3 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold rounded-xl border border-[#3e4047] transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Transcrição (.md)</span>
                  </button>
                </div>
              </div>

              {/* Linhas da Transcrição da Reunião Selecionada */}
              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {currentSummary.transcript.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#949ba4]">
                    Nenhuma transcrição gravada para esta reunião.
                  </div>
                ) : (
                  currentSummary.transcript.map((line, i) => (
                    <div
                      key={i}
                      className="bg-[#1e1f22]/60 p-3 rounded-2xl border border-[#3e4047]/60 space-y-1 hover:border-[#5865F2]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs text-[#949ba4]">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" />
                          {line.speaker}
                        </span>
                        <span className="font-mono text-[11px] text-[#38bdf8]">{line.time}</span>
                      </div>
                      <p className="text-xs text-[#dbdee1] leading-relaxed pl-3 border-l-2 border-[#5865F2]/30">
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
              <div className="bg-[#1e1f22]/70 rounded-2xl p-4 border border-[#3e4047]/60 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#5865F2] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Síntese Executiva & Pontos Cruciais</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#949ba4]">
                    Motor Gemini Flash
                  </span>
                </div>
                <p className="text-sm text-[#dbdee1] leading-relaxed">
                  {currentSummary.executiveSummary}
                </p>
              </div>

              {/* Decisões Tomadas */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-[#23a55a]" />
                  <span>Decisões Tomadas e Acordos Formais ({currentSummary.decisions.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {currentSummary.decisions.map((dec, i) => (
                    <div
                      key={i}
                      className="bg-[#1e1f22]/50 p-3 rounded-2xl border border-[#3e4047] flex items-start gap-2.5 text-xs text-[#dbdee1]"
                    >
                      <span className="w-5 h-5 rounded-lg bg-[#23a55a]/15 text-[#23a55a] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-snug">{dec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barra de Refinamento Interativo com IA */}
              <div className="bg-[#1e1f22] p-2 rounded-2xl border border-[#3e4047] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5865F2] ml-2 flex-shrink-0 animate-pulse" />
                <input
                  type="text"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRefineSummary();
                  }}
                  placeholder="Instrua a IA: Ex: 'Resumir em 3 tópicos executivos' ou 'Focar em decisões de backend'..."
                  className="bg-transparent text-xs text-white placeholder-[#80848e] flex-1 px-2 py-1.5 focus:outline-none"
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
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-cyan-400" />
                <span>Linha do Tempo Cronológica: Etapas e Tópicos Abordados</span>
              </div>

              <div className="space-y-3">
                {currentSummary.keyTopics.map((topic, i) => (
                  <div
                    key={i}
                    className="bg-[#1e1f22]/60 p-4 rounded-2xl border border-[#3e4047] space-y-1.5 relative hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-mono font-bold bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                        {topic.timestamp}
                      </span>
                      <h4 className="text-xs font-bold text-white">Etapa {i + 1}: {topic.topic}</h4>
                    </div>
                    <p className="text-xs text-[#949ba4] leading-relaxed pl-14">
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
              {/* Título e Descrição Perfeitamente Centralizados e Limpos */}
              <div className="text-center py-2 space-y-1">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Tarefas e Ações da Reunião
                </h3>
                <p className="text-xs text-[#949ba4] max-w-md mx-auto">
                  Gerenciamento organizado de tarefas manuais e automatizadas identificadas com auxílio da IA.
                </p>
              </div>

              {/* Formulário para Adicionar Tarefa Manualmente */}
              <form
                onSubmit={handleCreateManualTask}
                className="p-3.5 bg-[#1e1f22] rounded-2xl border border-[#3e4047] space-y-2.5"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Adicionar Nova Tarefa Manualmente</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Descrição da tarefa (ex: Finalizar revisão da entrega)..."
                    className="sm:col-span-2 bg-[#2b2d31] border border-[#3e4047] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                  />

                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className="bg-[#2b2d31] border border-[#3e4047] rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
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
                    className="bg-[#2b2d31] border border-[#3e4047] rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
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
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-[#5865F2]/10 to-indigo-500/10 border border-emerald-500/30 flex items-start gap-3">
                <BrainCircuit className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>Análise Automatizada de Ações pela IA:</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full font-bold">
                      {currentSummary.actionItems.filter(a => a.completed).length} de {currentSummary.actionItems.length} Concluídas
                    </span>
                  </div>
                  <p className="text-[#dbdee1] leading-relaxed text-[11px]">
                    A IA identificou {currentSummary.actionItems.length} pontos de ação críticos durante a reunião. As tarefas com nível de urgência alta devem ser priorizadas nas primeiras 24 horas.
                  </p>
                </div>
              </div>

              {/* Lista de Tarefas da Reunião com Nível de Urgência */}
              <div className="space-y-2">
                {currentSummary.actionItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleActionItem(currentSummary.id, item.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                      item.completed
                        ? 'bg-[#23a55a]/10 border-[#23a55a]/30 text-[#949ba4]'
                        : 'bg-[#1e1f22]/50 hover:bg-[#1e1f22] border-[#3e4047] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#23a55a] flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#80848e] flex-shrink-0" />
                      )}
                      <span className={`text-xs truncate ${item.completed ? 'line-through text-[#949ba4]' : 'font-medium'}`}>
                        {item.task}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] bg-[#5865F2]/20 text-[#5865F2] font-semibold px-2 py-0.5 rounded-lg">
                        @{item.assignee}
                      </span>

                      {/* Tag de Nível de Urgência */}
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                          item.priority === 'alta'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : item.priority === 'média'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
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
        <div className="px-6 py-3.5 bg-[#232428] border-t border-[#1f2023] flex items-center justify-between gap-3 flex-shrink-0 flex-wrap">
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
              className="bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold px-3 py-2 rounded-xl border border-[#3e4047] flex items-center gap-1.5 transition-colors active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#23a55a]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Ata Completa'}
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#3e4047] flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Ata (.md)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
