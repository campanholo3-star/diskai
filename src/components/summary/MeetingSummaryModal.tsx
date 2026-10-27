import React, { useState, useRef } from 'react';
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
  ListOrdered
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { summaryToMarkdown } from '../../utils/aiSummarizer';

export const MeetingSummaryModal: React.FC = () => {
  const {
    activeSummaryModal,
    closeSummaryModal,
    toggleActionItem,
    postSummaryToChat,
    activeServer
  } = useDiskai();

  const [activeTab, setActiveTab] = useState<'resumo' | 'tarefas' | 'topicos' | 'transcricao'>('resumo');
  const [copied, setCopied] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  if (!activeSummaryModal) return null;

  const summary = activeSummaryModal;

  const handleCopyMarkdown = () => {
    const md = summaryToMarkdown(summary);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = summaryToMarkdown(summary);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ata_Diskai_${summary.channelName.replace(/\s+/g, '_')}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePostToChat = () => {
    const textChannels = activeServer.categories.flatMap(c => c.channels).filter(c => c.type === 'text');
    const targetChannel = textChannels.find(c => c.name.includes('resumo')) || textChannels[0];

    if (targetChannel) {
      postSummaryToChat(summary.id, targetChannel.id);
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

  const handleRefineSummary = async () => {
    if (!customPrompt.trim()) return;
    setIsRefining(true);
    await new Promise(r => setTimeout(r, 900));
    summary.executiveSummary = `[Foco: "${customPrompt}"]: ` + summary.executiveSummary;
    setIsRefining(false);
    setCustomPrompt('');
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-[#2b2d31] border border-[#3e4047] w-full max-w-3xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1]">
        {/* Clean Header */}
        <div className="px-6 py-4 bg-[#232428] border-b border-[#1f2023] flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white tracking-tight">{summary.title}</h2>
              <span className="text-[11px] bg-[#23a55a]/15 text-[#23a55a] font-bold px-2 py-0.5 rounded-full border border-[#23a55a]/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
                {summary.sentiment}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#949ba4]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {summary.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {summary.durationFormatted}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {summary.participants.length} participantes
              </span>
            </div>
          </div>

          <button
            onClick={closeSummaryModal}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compact, Integrated Audio Bar */}
        <div className="px-6 py-2.5 bg-[#1e1f22]/70 border-b border-[#1f2023] flex items-center justify-between gap-4 text-xs">
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
              <div className="text-[11px] text-[#949ba4]">Gravação sincronizada</div>
            </div>
            {summary.audioUrl && (
              <audio
                ref={audioRef}
                src={summary.audioUrl}
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
            {summary.audioUrl && (
              <a
                href={summary.audioUrl}
                download={`Reuniao_${Date.now()}.webm`}
                className="text-[11px] bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white px-2.5 py-1 rounded-md border border-[#3e4047] flex items-center gap-1 transition-colors"
              >
                <Download className="w-3 h-3" /> Baixar
              </a>
            )}
          </div>
        </div>

        {/* Segmented Pill Tabs */}
        <div className="px-6 py-2 bg-[#232428] border-b border-[#1f2023]">
          <div className="flex items-center gap-1 bg-[#1e1f22] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('resumo')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'resumo'
                  ? 'bg-[#35373c] text-white shadow'
                  : 'text-[#949ba4] hover:text-[#dbdee1]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Resumo</span>
            </button>

            <button
              onClick={() => setActiveTab('tarefas')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'tarefas'
                  ? 'bg-[#35373c] text-white shadow'
                  : 'text-[#949ba4] hover:text-[#dbdee1]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#23a55a]" />
              <span>Tarefas</span>
              <span className="text-[10px] bg-[#5865F2] text-white px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {summary.actionItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('topicos')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'topicos'
                  ? 'bg-[#35373c] text-white shadow'
                  : 'text-[#949ba4] hover:text-[#dbdee1]'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-[#f0b232]" />
              <span>Tópicos</span>
            </button>

            <button
              onClick={() => setActiveTab('transcricao')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'transcricao'
                  ? 'bg-[#35373c] text-white shadow'
                  : 'text-[#949ba4] hover:text-[#dbdee1]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#dbdee1]" />
              <span>Transcrição</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 no-scrollbar">
          {/* TAB 1: RESUMO EXECUTIVO & DECISÕES */}
          {activeTab === 'resumo' && (
            <div className="space-y-5">
              {/* Síntese Executiva */}
              <div className="bg-[#1e1f22]/60 rounded-xl p-4 border border-[#3e4047]/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5865F2] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Síntese da Reunião</span>
                </div>
                <p className="text-sm text-[#dbdee1] leading-relaxed">
                  {summary.executiveSummary}
                </p>
              </div>

              {/* Decisões Tomadas */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#23a55a]" />
                  <span>Decisões Tomadas</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {summary.decisions.map((dec, i) => (
                    <div
                      key={i}
                      className="bg-[#1e1f22]/40 p-3 rounded-xl border border-[#3e4047]/40 flex items-start gap-2.5 text-xs text-[#dbdee1]"
                    >
                      <span className="w-5 h-5 rounded-md bg-[#23a55a]/15 text-[#23a55a] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-snug">{dec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* IA Refine Bar */}
              <div className="bg-[#1e1f22] p-1.5 rounded-xl border border-[#3e4047] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5865F2] ml-2 flex-shrink-0" />
                <input
                  type="text"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRefineSummary();
                  }}
                  placeholder="Instrua a IA: Ex: 'Resumir em 3 tópicos' ou 'Focar em decisões técnicas'..."
                  className="bg-transparent text-xs text-white placeholder-[#80848e] flex-1 px-2 py-1.5 focus:outline-none"
                />
                <button
                  onClick={handleRefineSummary}
                  disabled={!customPrompt.trim() || isRefining}
                  className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-sm active:scale-95"
                >
                  <RotateCw className={`w-3 h-3 ${isRefining ? 'animate-spin' : ''}`} />
                  <span>Refinar</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TAREFAS */}
          {activeTab === 'tarefas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#dbdee1] uppercase tracking-wider">
                  Tarefas & Ações da Equipe
                </span>
                <span className="text-[#949ba4]">
                  Concluídas:{' '}
                  <strong className="text-[#23a55a]">
                    {summary.actionItems.filter(a => a.completed).length}/{summary.actionItems.length}
                  </strong>
                </span>
              </div>

              <div className="space-y-2">
                {summary.actionItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleActionItem(summary.id, item.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
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
                      <span className="text-[11px] bg-[#5865F2]/20 text-[#5865F2] font-semibold px-2 py-0.5 rounded">
                        @{item.assignee}
                      </span>
                      {item.priority && (
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            item.priority === 'alta'
                              ? 'bg-[#f23f43]/20 text-[#f23f43]'
                              : item.priority === 'média'
                              ? 'bg-[#f0b232]/20 text-[#f0b232]'
                              : 'bg-[#80848e]/20 text-[#80848e]'
                          }`}
                        >
                          {item.priority}
                        </span>
                      )}

                      {/* Botão de Concluir Tarefa */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActionItem(summary.id, item.id);
                        }}
                        title={item.completed ? 'Marcar tarefa como pendente' : 'Concluir tarefa'}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                          item.completed
                            ? 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/40 hover:bg-[#23a55a]/30'
                            : 'bg-[#23a55a] hover:bg-[#1f9350] text-white hover:scale-105'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{item.completed ? 'Concluída' : 'Concluir'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TÓPICOS */}
          {activeTab === 'topicos' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider mb-2">
                Linha do Tempo de Discussão
              </div>
              <div className="space-y-2.5">
                {summary.keyTopics.map((topic, i) => (
                  <div key={i} className="bg-[#1e1f22]/50 p-3.5 rounded-xl border border-[#3e4047] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold bg-[#5865F2] text-white px-2 py-0.5 rounded">
                        {topic.timestamp}
                      </span>
                      <h4 className="text-xs font-bold text-white">{topic.topic}</h4>
                    </div>
                    <p className="text-xs text-[#949ba4] leading-relaxed pl-12">{topic.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TRANSCRIÇÃO */}
          {activeTab === 'transcricao' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider mb-2">
                Transcrição Automática
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                {summary.transcript.map((line, i) => (
                  <div key={i} className="bg-[#1e1f22]/50 p-3 rounded-lg border border-[#3e4047]/60 space-y-0.5">
                    <div className="flex items-center justify-between text-xs text-[#949ba4]">
                      <span className="font-bold text-white">{line.speaker}</span>
                      <span className="font-mono text-[11px]">{line.time}</span>
                    </div>
                    <p className="text-xs text-[#dbdee1] leading-relaxed">{line.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clean Footer Actions */}
        <div className="px-6 py-3.5 bg-[#232428] border-t border-[#1f2023] flex items-center justify-between gap-3">
          <button
            onClick={handlePostToChat}
            className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow active:scale-95 ${
              postedSuccess
                ? 'bg-[#23a55a] text-white'
                : 'bg-[#5865F2] hover:bg-[#4752c4] text-white'
            }`}
          >
            {postedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" /> Postado no Chat!
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
              className="bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold px-3 py-2 rounded-lg border border-[#3e4047] flex items-center gap-1.5 transition-colors active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#23a55a]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Markdown'}
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold px-3 py-2 rounded-lg border border-[#3e4047] flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Ata (.md)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
