import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  Pin,
  FileText,
  Send,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Check,
  Clock,
  Users,
  MessageSquare,
  Bot,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  UserX,
  ListTodo,
  CheckCheck,
  Activity
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { askMacawAssistant, Appointment, toggleAppointmentStatus } from '../../services/supabase';
import { Macaw3DViewer, AraraGesture } from './Macaw3DViewer';
import { MacawSkillsGuideModal } from './MacawSkillsGuideModal';

// Animação de flutuação perpétua e fluida via Framer Motion (não estática sob nenhuma hipótese)
const mascotFloatVariants: Variants = {
  float: {
    y: [0, -9, 0],
    rotate: [0, 1, -1, 0],
    transition: {
      duration: 3.2,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut'
    }
  }
};

export const MacawMascot: React.FC = () => {
  const {
    currentUser,
    activeChannel,
    activeServer,
    messages,
    appointments,
    refreshAppointments,
    addAppointment,
    removeAppointment,
    pinnedMessages,
    unpinMessage,
    generateChatSummary,
    isGeneratingChatSummary,
    macawModalOpen,
    setMacawModalOpen,
    participants,
    approveParticipant,
    revokeParticipant,
    theme
  } = useDiskai();

  const isAdmin =
    currentUser.role === 'admin' ||
    currentUser.role === 'Administrador' ||
    currentUser.id === 'admin-campanholo32' ||
    currentUser.email === 'campanholo32@gmail.com';

  const pendingUsers = (participants || []).filter(
    p => p.accessStatus === 'pending' || !p.isApproved
  );
  const pendingCount = pendingUsers.length;

  type MascotTab = 'chat' | 'skills' | 'calendar' | 'pinned' | 'requests';
  const [activeTab, setActiveTab] = useState<MascotTab>('chat');

  // Gestures State
  const [currentGesture, setCurrentGesture] = useState<AraraGesture>('ARARA_IDLE_LOOP');
  const [gestureKey, setGestureKey] = useState<number>(0);
  const [gestureQueue, setGestureQueue] = useState<string[]>([]);

  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    time: string;
    actionTaken?: string | null;
    appointment?: any;
    gesture?: string;
  }>>([
    {
      role: 'assistant',
      content: `Oi, ${currentUser.name || 'amigo(a)'}! 🦜💙 Sou a sua **Arara Assistente** do DiskAI!\n\nPosso gerenciar **agendamentos e tarefas**, listar **mensagens fixadas**, alertar sobre **novos usuários (Admin)** ou **gerar resumos com IA** em segundos. Como posso te ajudar agora? ✨`,
      time: 'Agora',
      gesture: 'ARARA_WAVE_WING'
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [newAppTitle, setNewAppTitle] = useState('');
  const [newAppDate, setNewAppDate] = useState('');
  const [newAppTime, setNewAppTime] = useState('');
  const [newAppType, setNewAppType] = useState<'task' | 'meeting'>('task');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (macawModalOpen && activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, macawModalOpen, activeTab]);

  // Trigger gesture directly
  const triggerGesture = useCallback((gestureName: AraraGesture, sequence?: string[]) => {
    setCurrentGesture(gestureName);
    setGestureKey(prev => prev + 1);
    if (sequence && sequence.length > 0) {
      setGestureQueue(sequence);
    } else if (gestureName !== 'ARARA_IDLE_LOOP') {
      setGestureQueue([gestureName, 'ARARA_IDLE_LOOP']);
    } else {
      setGestureQueue([]);
    }
  }, []);

  const handleGestureEnd = useCallback((completedGesture: string) => {
    if (completedGesture !== 'ARARA_IDLE_LOOP') {
      setCurrentGesture('ARARA_IDLE_LOOP');
      setGestureQueue([]);
    }
  }, []);

  // Reagir a troca de canais (cumprimenta com asas ou aceno)
  const prevChannelIdRef = useRef<string | undefined>(activeChannel?.id);
  useEffect(() => {
    if (activeChannel?.id && prevChannelIdRef.current && activeChannel.id !== prevChannelIdRef.current) {
      const gestures: AraraGesture[] = ['ARARA_WAVE_WING', 'ARARA_OPEN_WINGS', 'ARARA_NOD_YES'];
      const chosen = gestures[Math.floor(Math.random() * gestures.length)];
      triggerGesture(chosen);
    }
    prevChannelIdRef.current = activeChannel?.id;
  }, [activeChannel?.id]);

  // Reagir a troca de servidores (boas-vindas abrindo as asas)
  const prevServerIdRef = useRef<string | undefined>(activeServer?.id);
  useEffect(() => {
    if (activeServer?.id && prevServerIdRef.current && activeServer.id !== prevServerIdRef.current) {
      triggerGesture('ARARA_OPEN_WINGS');
    }
    prevServerIdRef.current = activeServer?.id;
  }, [activeServer?.id]);

  // Reagir a tarefas concluídas ou novos compromissos adicionados
  const prevCompletedCountRef = useRef(appointments.filter(a => a.status === 'completed').length);
  useEffect(() => {
    const currentCompleted = appointments.filter(a => a.status === 'completed').length;
    if (currentCompleted > prevCompletedCountRef.current) {
      triggerGesture('ARARA_SUCCESS');
    }
    prevCompletedCountRef.current = currentCompleted;
  }, [appointments]);

  // Reagir a atividades gerais da plataforma (mensagens enviadas no chat ou DM)
  useEffect(() => {
    const handleActivity = (e: any) => {
      const type = e.detail?.type;
      if (type === 'chat-message') {
        triggerGesture('ARARA_NOD_YES');
      } else if (type === 'appointment-added') {
        triggerGesture('ARARA_MEETING_REMINDER');
      }
    };
    window.addEventListener('diskai:activity', handleActivity);
    return () => window.removeEventListener('diskai:activity', handleActivity);
  }, []);

  // Direct click on the 3D Arara object - interações vivas e diversificadas
  const handleMascotClick = () => {
    if (!macawModalOpen) {
      setMacawModalOpen(true);
      triggerGesture('ARARA_WAVE_WING');
    } else {
      // Lively interactive reactions on click
      const gestures: AraraGesture[] = [
        'ARARA_WAVE_WING',
        'ARARA_OPEN_WINGS',
        'ARARA_NOD_YES',
        'ARARA_SUCCESS',
        'ARARA_PRESENT_RIGHT',
        'ARARA_ALERT_REMINDER'
      ];
      const chosen = gestures[Math.floor(Math.random() * gestures.length)];
      triggerGesture(chosen);
    }
  };

  const handleTabChange = (tab: MascotTab) => {
    setActiveTab(tab);
    if (tab === 'calendar') {
      triggerGesture('ARARA_PRESENT_LEFT');
    } else if (tab === 'pinned') {
      triggerGesture('ARARA_PRESENT_RIGHT');
    } else if (tab === 'requests') {
      triggerGesture('ARARA_ALERT_REMINDER');
    } else {
      triggerGesture('ARARA_NOD_YES');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newHistory = [
      ...chatMessages,
      { role: 'user' as const, content: text, time: nowTime }
    ];
    setChatMessages(newHistory);
    setLoading(true);

    // Arara entra em estado THINKING enquanto analisa a solicitação
    triggerGesture('ARARA_THINKING');

    try {
      const currentChannelMsgs = (messages[activeChannel?.id || ''] || []).map(m => ({
        id: m.id,
        userName: m.userId === currentUser.id ? (currentUser.name || 'Eu') : 'Membro',
        content: m.content,
        timestamp: m.timestamp
      }));

      const res = await askMacawAssistant({
        message: text,
        conversation_history: newHistory.map(m => ({ role: m.role, content: m.content })),
        channel_id: activeChannel?.id || 'ch-geral',
        channel_name: activeChannel?.name || 'geral',
        server_name: activeServer?.name || 'DiskAI',
        user_name: currentUser.name || 'Membro',
        user_id: currentUser.id,
        platformContext: {
          server_name: activeServer?.name || 'DiskAI',
          channel_id: activeChannel?.id || 'ch-geral',
          channel_name: activeChannel?.name || 'geral',
          user_name: currentUser.name || 'Membro',
          user_id: currentUser.id,
          user_role: currentUser.role,
          channel_messages: currentChannelMsgs,
          appointments,
          pinned_messages: (pinnedMessages[activeChannel?.id || ''] || []).map(p => ({
            id: p.id,
            content: p.content,
            authorName: p.authorName
          })),
          pending_users_count: pendingCount
        }
      });

      if ((res.actionTaken === 'create_appointment' || res.actionTaken === 'create_task') && res.appointment) {
        await addAppointment(res.appointment);
        await refreshAppointments();
      }

      // Dispara gesto recebido da IA
      const chosenGesture = (res.gesture || 'ARARA_NOD_YES') as AraraGesture;
      triggerGesture(chosenGesture, res.gestureSequence);

      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          actionTaken: res.actionTaken,
          appointment: res.appointment,
          gesture: chosenGesture
        }
      ]);
    } catch (e: any) {
      setCurrentGesture('ARARA_SHAKE_NO');
      setGestureQueue(['ARARA_SHAKE_NO', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP']);
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'ARARA_SHAKE_NO\n\n🦜 Opa, tive um tropeço momentâneo no ninho! Mas estou pronta de novo. Pode repetir sua mensagem?',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          gesture: 'ARARA_SHAKE_NO'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAppointment = async (id: string) => {
    triggerGesture('ARARA_SUCCESS', ['ARARA_SUCCESS', 'ARARA_IDLE_LOOP']);
    await toggleAppointmentStatus(id);
    await refreshAppointments();
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppTitle.trim()) return;

    let startIso = new Date().toISOString();
    if (newAppDate) {
      const timeStr = newAppTime || '14:00';
      const combined = new Date(`${newAppDate}T${timeStr}:00`);
      if (!isNaN(combined.getTime())) {
        startIso = combined.toISOString();
      }
    }

    const isTask = newAppType === 'task';
    const appData = {
      title: newAppTitle.trim(),
      description: isTask
        ? `Tarefa da equipe registrada no canal #${activeChannel?.name || 'geral'}`
        : `Reunião agendada via Arara Assistente`,
      start_time: startIso,
      channel_id: activeChannel?.id || 'ch-geral',
      server_id: activeServer?.name || 'DiskAI',
      attendees: [currentUser.name || 'Você'],
      status: 'scheduled' as const
    };

    triggerGesture(isTask ? 'ARARA_SUCCESS' : 'ARARA_MEETING_REMINDER', [
      isTask ? 'ARARA_SUCCESS' : 'ARARA_MEETING_REMINDER',
      'ARARA_RETURN_NEUTRAL',
      'ARARA_IDLE_LOOP'
    ]);

    await addAppointment(appData);
    await refreshAppointments();

    setNewAppTitle('');
    setNewAppDate('');
    setNewAppTime('');
    setShowAddAppModal(false);

    setChatMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: isTask
          ? `ARARA_SUCCESS\n\n🦜 Tarefa **"${appData.title}"** salva com sucesso! Você pode marcá-la como concluída a qualquer momento. ✅`
          : `ARARA_MEETING_REMINDER\n\n🦜 Oba! Adicionei a reunião **"${appData.title}"** à sua agenda do DiskAI! 📅✨`,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        gesture: isTask ? 'ARARA_SUCCESS' : 'ARARA_MEETING_REMINDER'
      }
    ]);
  };

  const channelPins = (activeChannel && pinnedMessages[activeChannel.id]) || [];

  return (
    <>
      {/* Balloon Chat Dialog (posicionado de forma limpa ao lado da Arara no desktop, e acima dela no mobile) */}
      <AnimatePresence>
        {macawModalOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`fixed bottom-[240px] left-3 right-3 sm:left-auto sm:bottom-[82px] sm:right-[195px] md:right-[205px] z-50 pointer-events-auto w-[calc(100vw-24px)] sm:w-[420px] md:w-[450px] h-[520px] max-h-[calc(100vh-270px)] sm:max-h-[calc(100vh-165px)] min-h-[300px] rounded-3xl shadow-2xl flex flex-col overflow-hidden font-sans border transition-colors ${
              theme === 'light'
                ? 'bg-white text-black border-2 border-black shadow-[0_16px_40px_rgba(0,0,0,0.2)]'
                : 'bg-[#1a1b1e]/95 backdrop-blur-2xl border border-white/[0.12] text-[#dbdee1] shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
            }`}
          >
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between flex-shrink-0 border-b ${
              theme === 'light'
                ? 'bg-sky-50 border-black/20'
                : 'bg-gradient-to-r from-[#0ea5e9]/20 via-[#0284c7]/20 to-[#38bdf8]/10 border-white/[0.08]'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0284c7]/20 border border-[#0284c7]/40 flex items-center justify-center overflow-hidden">
                  <img src="/arara-mascote.png" alt="Arara" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <h3 className={`text-sm font-extrabold tracking-tight ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                    Arara Assistente
                  </h3>
                  <div className={`text-[11px] font-medium ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                    Assistente de Produtividade & IA
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => refreshAppointments()}
                  title="Sincronizar agenda e dados"
                  className={`p-1.5 rounded-xl transition-colors ${
                    theme === 'light' ? 'text-slate-600 hover:text-black hover:bg-black/5' : 'text-[#949ba4] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMacawModalOpen(false)}
                  className={`p-1.5 rounded-xl transition-colors ${
                    theme === 'light' ? 'text-slate-600 hover:text-black hover:bg-black/5' : 'text-[#949ba4] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Admin Alert Banner for Pending Access Requests */}
            {isAdmin && pendingCount > 0 && (
              <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-200 flex-shrink-0 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                  <span className="truncate">
                    <strong>{pendingCount}</strong> novo(s) usuário(s) aguardando aprovação!
                  </span>
                </div>
                <button
                  onClick={() => handleTabChange('requests')}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 font-bold text-[10px] transition-all flex-shrink-0 ml-1.5"
                >
                  Ver
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className={`flex items-center border-b px-2.5 py-1.5 gap-1 flex-shrink-0 text-xs font-semibold overflow-x-auto no-scrollbar ${
              theme === 'light' ? 'bg-slate-50 border-black/15' : 'bg-[#141517]/80 border-white/[0.06]'
            }`}>
              <button
                onClick={() => handleTabChange('chat')}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-black hover:bg-black/5'
                    : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => handleTabChange('skills')}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'skills'
                    ? 'bg-gradient-to-r from-[#0284c7] to-[#4f46e5] text-white shadow-md'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-black hover:bg-black/5'
                    : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Habilidades</span>
              </button>

              <button
                onClick={() => handleTabChange('calendar')}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'calendar'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-black hover:bg-black/5'
                    : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tarefas ({appointments.length})</span>
              </button>

              <button
                onClick={() => handleTabChange('pinned')}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  activeTab === 'pinned'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-black hover:bg-black/5'
                    : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
                <span>Fixadas ({channelPins.length})</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleTabChange('requests')}
                  className={`relative flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'requests'
                      ? 'bg-[#0284c7] text-white shadow-md'
                      : theme === 'light'
                      ? 'text-slate-600 hover:text-black hover:bg-black/5'
                      : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Acessos ({pendingCount})</span>
                  {pendingCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1 right-1" />
                  )}
                </button>
              )}
            </div>

            {/* Tab: Chat */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Quick Skills Guide Access Pill */}
                <div className="p-2.5 pb-0 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTabChange('skills')}
                    className={`w-full p-2 rounded-xl border transition-all flex items-center justify-between group hover:scale-[1.01] active:scale-95 ${
                      theme === 'light'
                        ? 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200 text-sky-950 shadow-xs'
                        : 'bg-gradient-to-r from-[#0284c7]/15 to-[#6366f1]/15 hover:from-[#0284c7]/25 hover:to-[#6366f1]/25 border-sky-500/30 text-sky-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                      <span className="text-[11px] font-bold truncate">
                        Guia de Habilidades: veja o que sei fazer!
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </button>
                </div>

                {/* Messages scroll area */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3 no-scrollbar">
                  {chatMessages.map((msg, i) => {
                    const cleanText = msg.content.replace(/ARARA_[A-Z_]+\s*/g, '').trim();

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div
                            className="w-7 h-7 rounded-full bg-[#0f172a] border border-[#0284c7]/40 flex-shrink-0 flex items-center justify-center overflow-hidden"
                            title="Arara Assistente"
                          >
                            <img src="/arara-mascote.png" alt="Arara" className="w-5 h-5 object-contain" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-[#0284c7] text-white rounded-br-sm shadow-md'
                              : theme === 'light'
                              ? 'bg-slate-100 border border-black/20 text-slate-900 rounded-bl-sm shadow'
                              : 'bg-white/[0.05] border border-white/[0.08] text-[#dbdee1] rounded-bl-sm shadow'
                          }`}
                        >
                          <div className="whitespace-pre-wrap font-sans">{cleanText}</div>

                          {/* Interactive Task / Appointment Card inside message */}
                          {msg.appointment && (
                            <div className="mt-2.5 p-2.5 bg-[#0284c7]/15 border border-[#0284c7]/30 rounded-xl text-[11px] space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                  {msg.appointment.title.toLowerCase().includes('tarefa') || msg.actionTaken === 'create_task' ? (
                                    <ListTodo className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
                                  ) : (
                                    <Calendar className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
                                  )}
                                  <span className={`truncate ${appointments.find(a => a.id === msg.appointment.id)?.status === 'completed' ? 'line-through text-[#949ba4]' : ''}`}>
                                    {msg.appointment.title}
                                  </span>
                                </div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                  appointments.find(a => a.id === msg.appointment.id)?.status === 'completed'
                                    ? 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/30'
                                    : 'bg-[#0284c7]/30 text-[#38bdf8] border border-[#38bdf8]/30'
                                }`}>
                                  {appointments.find(a => a.id === msg.appointment.id)?.status === 'completed' ? 'Concluída' : 'Pendente'}
                                </span>
                              </div>

                              <div className="text-[#949ba4] text-[10px] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#38bdf8]" />
                                {new Date(msg.appointment.start_time).toLocaleString('pt-BR')}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleAppointment(msg.appointment.id)}
                                className={`w-full py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  appointments.find(a => a.id === msg.appointment.id)?.status === 'completed'
                                    ? 'bg-[#23a55a]/20 text-[#23a55a] hover:bg-[#23a55a]/30'
                                    : 'bg-[#23a55a] hover:bg-[#1f934f] text-white shadow'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {appointments.find(a => a.id === msg.appointment.id)?.status === 'completed'
                                  ? 'Reabrir Tarefa'
                                  : 'Concluir Tarefa'}
                              </button>
                            </div>
                          )}

                          <div
                            className={`text-[9px] mt-1 text-right ${
                              msg.role === 'user' ? 'text-white/70' : 'text-[#949ba4]'
                            }`}
                          >
                            {msg.time}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-[#38bdf8] bg-[#0284c7]/10 p-2.5 rounded-2xl border border-[#0284c7]/20 w-fit animate-pulse">
                      <Sparkles className="w-4 h-4 text-[#38bdf8] animate-spin" />
                      <span>Arara 3D analisando... 🦜</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Quick Action Pills */}
                <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-white/[0.06] bg-[#141517]/40 flex-shrink-0">
                  <button
                    onClick={() => handleSendMessage('Criar tarefa: Revisar relatórios da semana')}
                    className="text-[10px] whitespace-nowrap bg-white/[0.04] hover:bg-[#0284c7]/20 border border-white/[0.08] hover:border-[#0284c7]/40 px-2.5 py-1 rounded-full text-[#dbdee1] hover:text-white transition-all flex items-center gap-1"
                  >
                    <ListTodo className="w-3 h-3 text-[#38bdf8]" />
                    <span>➕ Criar Tarefa</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage('Quais compromissos e tarefas tenho na agenda?')}
                    className="text-[10px] whitespace-nowrap bg-white/[0.04] hover:bg-[#0284c7]/20 border border-white/[0.08] hover:border-[#0284c7]/40 px-2.5 py-1 rounded-full text-[#dbdee1] hover:text-white transition-all"
                  >
                    📅 Ver Agenda
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleSendMessage('Verificar se há novos usuários pendentes de aprovação')}
                      className="text-[10px] whitespace-nowrap bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-200 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Users className="w-3 h-3 text-amber-400" />
                      <span>👥 Solicitações ({pendingCount})</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      triggerGesture('ARARA_SUMMARY_READY');
                      generateChatSummary(activeChannel?.id, activeChannel?.name);
                      setChatMessages(prev => [
                        ...prev,
                        {
                          role: 'assistant',
                          content: `ARARA_SUMMARY_READY\n\n🦜 Iniciei a síntese do canal #${activeChannel?.name || 'geral'} com Gemini Flash! O resumo executivo aparecerá na tela em instantes! ✨`,
                          time: 'Agora',
                          gesture: 'ARARA_SUMMARY_READY'
                        }
                      ]);
                    }}
                    className="text-[10px] whitespace-nowrap bg-white/[0.04] hover:bg-[#0284c7]/20 border border-white/[0.08] hover:border-[#0284c7]/40 px-2.5 py-1 rounded-full text-[#dbdee1] hover:text-white transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-[#f0b232]" /> Resumir Canal
                  </button>
                  <button
                    onClick={() => handleSendMessage('Quais mensagens estão fixadas aqui?')}
                    className="text-[10px] whitespace-nowrap bg-white/[0.04] hover:bg-[#0284c7]/20 border border-white/[0.08] hover:border-[#0284c7]/40 px-2.5 py-1 rounded-full text-[#dbdee1] hover:text-white transition-all"
                  >
                    📌 Fixadas
                  </button>
                </div>

                {/* Input Area */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className={`p-3 border-t flex items-center gap-2 flex-shrink-0 transition-colors ${
                    theme === 'light' ? 'bg-slate-50 border-black/20' : 'bg-[#141517] border-white/[0.08]'
                  }`}
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (e.target.value.length === 1 && currentGesture === 'ARARA_IDLE_LOOP') {
                        triggerGesture('ARARA_THINKING');
                      }
                    }}
                    placeholder="Converse com a Arara Assistente..."
                    className={`flex-1 rounded-xl px-3.5 py-2 text-xs focus:outline-none transition-colors ${
                      theme === 'light'
                        ? 'bg-white text-black border-2 border-black placeholder-slate-500 focus:border-[#0284c7]'
                        : 'bg-[#1e1f22] border border-white/[0.1] text-white placeholder-[#80848e] focus:border-[#38bdf8]'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || loading}
                    className="w-8 h-8 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105 active:scale-95 shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Guia de Habilidades da Arara */}
            {activeTab === 'skills' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <MacawSkillsGuideModal
                  isEmbedded={true}
                  theme={theme}
                  onSelectPrompt={(prompt) => {
                    handleTabChange('chat');
                    handleSendMessage(prompt);
                  }}
                />
              </div>
            )}

            {/* Tab: Calendar & Tasks */}
            {activeTab === 'calendar' && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto no-scrollbar space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ListTodo className="w-4 h-4 text-[#38bdf8]" />
                      Agenda & Tarefas ({appointments.length})
                    </h4>
                    <p className="text-[10px] text-[#949ba4]">Gerencie reuniões, prazos e conclusão de tarefas</p>
                  </div>
                  <button
                    onClick={() => setShowAddAppModal(!showAddAppModal)}
                    className="flex items-center gap-1 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow transition-all hover:scale-105"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova
                  </button>
                </div>

                {/* Quick Add Form */}
                {showAddAppModal && (
                  <form onSubmit={handleCreateAppointment} className="p-3 bg-white/[0.04] border border-white/[0.1] rounded-2xl space-y-2.5 animate-in fade-in">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAppType('task')}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          newAppType === 'task'
                            ? 'bg-[#0284c7] text-white'
                            : 'bg-white/[0.04] text-[#949ba4] hover:text-white'
                        }`}
                      >
                        📝 Tarefa
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAppType('meeting')}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          newAppType === 'meeting'
                            ? 'bg-[#0284c7] text-white'
                            : 'bg-white/[0.04] text-[#949ba4] hover:text-white'
                        }`}
                      >
                        📅 Reunião
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder={newAppType === 'task' ? 'Título da tarefa (ex: Finalizar relatório de vendas)' : 'Título da reunião (ex: Review da Sprint)'}
                      value={newAppTitle}
                      onChange={(e) => setNewAppTitle(e.target.value)}
                      className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors ${
                        theme === 'light'
                          ? 'bg-white text-black border-2 border-black placeholder-slate-500 focus:border-[#0284c7]'
                          : 'bg-[#1e1f22] border border-white/[0.1] text-white placeholder-[#80848e] focus:border-[#38bdf8]'
                      }`}
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={newAppDate}
                        onChange={(e) => setNewAppDate(e.target.value)}
                        className={`rounded-xl px-2 py-1 text-xs focus:outline-none transition-colors ${
                          theme === 'light'
                            ? 'bg-white text-black border-2 border-black'
                            : 'bg-[#1e1f22] border border-white/[0.1] text-white focus:border-[#38bdf8]'
                        }`}
                      />
                      <input
                        type="time"
                        value={newAppTime}
                        onChange={(e) => setNewAppTime(e.target.value)}
                        className={`rounded-xl px-2 py-1 text-xs focus:outline-none transition-colors ${
                          theme === 'light'
                            ? 'bg-white text-black border-2 border-black'
                            : 'bg-[#1e1f22] border border-white/[0.1] text-white focus:border-[#38bdf8]'
                        }`}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddAppModal(false)}
                        className="text-[10px] px-2.5 py-1 text-[#949ba4] hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="text-[10px] px-3 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-lg"
                      >
                        Salvar
                      </button>
                    </div>
                  </form>
                )}

                {/* List of appointments & tasks */}
                <div className="space-y-2">
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#949ba4]">
                      <ListTodo className="w-8 h-8 mx-auto mb-2 text-[#0284c7]/40" />
                      Nenhuma tarefa ou compromisso registrado. Peça à Arara para criar uma!
                    </div>
                  ) : (
                    appointments.map((app) => {
                      const isCompleted = app.status === 'completed';
                      const isTask = app.title.toLowerCase().includes('tarefa') || (app.description && app.description.includes('Tarefa'));

                      return (
                        <div
                          key={app.id}
                          className={`p-3 bg-white/[0.03] hover:bg-white/[0.06] border rounded-2xl flex items-start justify-between gap-2 transition-all ${
                            isCompleted ? 'border-[#23a55a]/30 bg-[#23a55a]/5' : 'border-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Toggle checkbox button */}
                            <button
                              onClick={() => handleToggleAppointment(app.id)}
                              className="mt-0.5 p-0.5 rounded-lg text-[#949ba4] hover:text-[#23a55a] transition-colors flex-shrink-0"
                              title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                            >
                              <CheckCircle2
                                className={`w-4 h-4 transition-all ${
                                  isCompleted ? 'text-[#23a55a] fill-[#23a55a]/20' : 'text-[#949ba4] hover:text-[#23a55a]'
                                }`}
                              />
                            </button>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-bold truncate ${isCompleted ? 'line-through text-[#949ba4]' : 'text-white'}`}>
                                  {app.title}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                  isTask ? 'bg-indigo-500/20 text-indigo-300' : 'bg-sky-500/20 text-sky-300'
                                }`}>
                                  {isTask ? 'Tarefa' : 'Reunião'}
                                </span>
                              </div>

                              <div className="text-[10px] text-[#38bdf8] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(app.start_time).toLocaleString('pt-BR')}
                              </div>

                              {app.attendees && app.attendees.length > 0 && (
                                <div className="text-[10px] text-[#949ba4] flex items-center gap-1 truncate">
                                  <Users className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{app.attendees.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Concluir action button */}
                            <button
                              onClick={() => handleToggleAppointment(app.id)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                                isCompleted
                                  ? 'bg-[#23a55a]/20 text-[#23a55a] hover:bg-[#23a55a]/30'
                                  : 'bg-[#23a55a] hover:bg-[#1f934f] text-white shadow'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{isCompleted ? 'Concluída' : 'Concluir'}</span>
                            </button>

                            <button
                              onClick={() => removeAppointment(app.id)}
                              className="p-1 rounded-lg text-[#949ba4] hover:text-[#f23f43] hover:bg-white/[0.06] transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab: Pinned Messages */}
            {activeTab === 'pinned' && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto no-scrollbar space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                      <Pin className="w-4 h-4 text-[#f0b232]" />
                      Mensagens Fixadas em #{activeChannel?.name || 'geral'}
                    </h4>
                    <p className={`text-[10px] ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                      Informações e destaques prioritários
                    </p>
                  </div>
                  {channelPins.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      {channelPins.length} fixada{channelPins.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {channelPins.length === 0 ? (
                  <div className={`text-center py-8 text-xs ${theme === 'light' ? 'text-slate-500' : 'text-[#949ba4]'}`}>
                    <Pin className="w-8 h-8 mx-auto mb-2 text-[#f0b232]/40" />
                    Nenhuma mensagem fixada neste canal.
                  </div>
                ) : (
                  channelPins.map((pin) => (
                    <div
                      key={pin.id}
                      className={`p-3 rounded-2xl space-y-2 transition-all group relative border ${
                        theme === 'light'
                          ? 'bg-slate-50 hover:bg-slate-100 border-2 border-black text-black shadow-sm'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] text-[#dbdee1]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-bold ${theme === 'light' ? 'text-black font-extrabold' : 'text-white'}`}>
                          {pin.authorName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-[#949ba4]'}`}>
                            {pin.timestamp}
                          </span>
                          <button
                            onClick={() => {
                              if (activeChannel?.id) {
                                unpinMessage(activeChannel.id, pin.id);
                                triggerGesture('ARARA_SUCCESS');
                              }
                            }}
                            title="Desafixar / Excluir mensagem fixada"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className={`text-xs whitespace-pre-wrap leading-relaxed ${theme === 'light' ? 'text-slate-800' : 'text-[#dbdee1]'}`}>
                        {pin.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Admin Access Requests (Solicitações de Novos Usuários) */}
            {isAdmin && activeTab === 'requests' && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto no-scrollbar space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Solicitações de Novos Usuários ({pendingCount})
                  </h4>
                  <p className="text-[10px] text-[#949ba4]">Controle de acesso seguro para novos membros</p>
                </div>

                {pendingUsers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#949ba4] space-y-2">
                    <CheckCheck className="w-8 h-8 mx-auto text-[#23a55a]/70" />
                    <div className="font-bold text-white">Tudo em ordem!</div>
                    <p className="text-[11px] max-w-xs mx-auto">
                      Não há nenhum novo usuário aguardando liberação. Todos os usuários possuem acesso seguro e isolado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 bg-white/[0.04] border border-amber-500/20 rounded-2xl space-y-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-white/[0.1]" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate">{user.name}</div>
                            <div className="text-[10px] text-[#949ba4] truncate">{user.email || user.tag}</div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Pendente
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                          <button
                            onClick={() => {
                              triggerGesture('ARARA_NOD_YES', ['ARARA_NOD_YES', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP']);
                              approveParticipant(user.id);
                              setChatMessages(prev => [
                                ...prev,
                                {
                                  role: 'assistant',
                                  content: `ARARA_NOD_YES\n\n🦜 Acesso do usuário **${user.name}** (${user.email || user.tag}) liberado com sucesso! ✅`,
                                  time: 'Agora',
                                  gesture: 'ARARA_NOD_YES'
                                }
                              ]);
                            }}
                            className="flex-1 py-1.5 px-2 bg-[#23a55a] hover:bg-[#1f934f] text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow transition-all hover:scale-102"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Aprovar Acesso</span>
                          </button>
                          <button
                            onClick={() => {
                              triggerGesture('ARARA_SHAKE_NO', ['ARARA_SHAKE_NO', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP']);
                              revokeParticipant(user.id);
                              setChatMessages(prev => [
                                ...prev,
                                {
                                  role: 'assistant',
                                  content: `ARARA_SHAKE_NO\n\n🦜 Solicitação de acesso de **${user.name}** foi recusada.`,
                                  time: 'Agora',
                                  gesture: 'ARARA_SHAKE_NO'
                                }
                              ]);
                            }}
                            className="py-1.5 px-3 bg-white/[0.06] hover:bg-[#f23f43]/20 hover:text-[#f23f43] text-[#949ba4] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Recusar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Objeto 3D flutuante da Arara (posicionada logo acima da barra de entrada de mensagens do chat) */}
      <div className="fixed bottom-[80px] right-3 sm:bottom-[82px] sm:right-6 z-40 flex items-end justify-end pointer-events-none select-none">
        <div className="pointer-events-auto relative flex flex-col items-center justify-end group">
          {/* Tooltip elegante ao passar o mouse ou quando há notificações */}
          {!macawModalOpen && (
            <div
              onClick={handleMascotClick}
              className={`absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 px-3 py-1.5 rounded-xl shadow-2xl text-[11px] font-extrabold whitespace-nowrap flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 ${
                theme === 'light'
                  ? 'bg-white text-black border-2 border-black shadow-[0_4px_14px_rgba(0,0,0,0.15)]'
                  : 'bg-[#141517]/95 text-white border border-white/[0.12] backdrop-blur-md'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b] animate-pulse" />
              <span>Arara Assistente</span>
              {isAdmin && pendingCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] border font-bold ${
                  theme === 'light'
                    ? 'bg-amber-100 text-amber-900 border-amber-600'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {pendingCount}
                </span>
              )}
            </div>
          )}

          {/* Objeto 3D flutuante com animação contínua e ininterrupta via Framer Motion */}
          <motion.div
            onClick={handleMascotClick}
            variants={mascotFloatVariants}
            animate="float"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer relative flex items-center justify-center w-[155px] h-[155px] sm:w-[170px] sm:h-[170px] pointer-events-auto"
          >
            {/* Canvas WebGL 3D do personagem (100% transparente, sem bordas ou cortes) */}
            <Macaw3DViewer
              gesture={currentGesture}
              gestureKey={gestureKey}
              gestureQueue={gestureQueue}
              interactive={false}
              autonomousBehaviors={true}
              cameraDistance={7.4}
              cameraHeight={0.85}
              targetY={0.85}
              initialRotationY={-0.2}
              onGestureEnd={handleGestureEnd}
              className="w-full h-full"
            />

            {/* Admin pending requests notification dot */}
            {isAdmin && pendingCount > 0 && (
              <span className="absolute top-4 right-4 w-4 h-4 rounded-full bg-amber-500 ring-2 ring-[#0f172a] text-[9px] font-black text-white flex items-center justify-center shadow animate-bounce">
                {pendingCount}
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};
