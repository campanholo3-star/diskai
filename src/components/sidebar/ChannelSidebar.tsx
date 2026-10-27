import React, { useState } from 'react';
import {
  Hash,
  Volume2,
  ChevronDown,
  Mic,
  MicOff,
  Headphones,
  Settings,
  PhoneOff,
  Radio,
  FileText,
  Sparkles,
  Bot,
  Database,
  Shield,
  UserPlus,
  Trash2,
  Plus,
  Lock,
  MessagesSquare,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { Channel } from '../../types';
import { signOut } from '../../services/supabase';
import { GroupMembersModal } from '../modals/GroupMembersModal';

export const ChannelSidebar: React.FC = () => {
  const {
    activeServer,
    activeChannel,
    setActiveChannelId,
    activeVoiceChannel,
    joinVoiceChannel,
    leaveVoiceChannel,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    currentUser,
    logout,
    setSettingsModalOpen,
    isRecording,
    recordingDuration,
    summaries,
    openSummaryModal,
    setAuthModalOpen,
    setAdminModalOpen,
    setServerManagementModalOpen,
    setServerManagementTab,
    setCreateChannelModalOpen,
    setCreateChannelTargetCategory,
    setChannelSettingsModalOpen,
    setChannelSettingsTarget,
    setChannelInviteModalOpen,
    setChannelInviteTarget,
    appointments,
    setMacawModalOpen,
    theme
  } = useDiskai();

  const isPlatformAdmin =
    currentUser.role === 'Administrador' ||
    currentUser.role === 'admin' ||
    currentUser.id === 'admin-campanholo32' ||
    currentUser.email === 'campanholo32@gmail.com';

  const isServerOwner =
    activeServer.ownerId === currentUser.id ||
    (!activeServer.ownerId && isPlatformAdmin) ||
    (activeServer.id.startsWith('server-') && !['server-diskai', 'server-ai', 'server-zk'].includes(activeServer.id));

  const canManageChannels = isPlatformAdmin || isServerOwner;

  const isChannelVisible = (channel: Channel) => {
    // Canais Públicos: Todos os membros possuem acesso livre
    if (!channel.isPrivate) return true;
    // Canais Privados: Acesso permitido apenas ao Administrador do sistema, ao Criador do canal ou membros autorizados
    return (
      isPlatformAdmin ||
      channel.creatorId === currentUser.id ||
      channel.allowedMemberIds?.includes(currentUser.id)
    );
  };

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleChannelClick = (channel: Channel) => {
    if (channel.type === 'text') {
      setActiveChannelId(channel.id);
    } else {
      // Voice channel click
      joinVoiceChannel(channel);
    }
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-60 flex flex-col h-full select-none flex-shrink-0 z-10 border-r transition-colors ${
      theme === 'light'
        ? 'bg-white border-black/20 text-black'
        : 'bg-[#2b2d31] border-[#3e4047] text-[#dbdee1] shadow-sm'
    }`}>
      {/* Server Header Dropdown */}
      <div className="relative">
        <div
          onClick={() => setServerMenuOpen(prev => !prev)}
          className={`h-12 border-b px-4 flex items-center justify-between font-bold transition-colors cursor-pointer shadow-sm ${
            theme === 'light'
              ? 'border-black/20 text-black hover:bg-slate-100'
              : 'border-[#3e4047] text-white hover:bg-[#35373c]'
          }`}
        >
          <div className="flex items-center gap-2.5 truncate">
            {activeServer.icon ? (
              <img src={activeServer.icon} alt={activeServer.name} className="w-7 h-7 rounded-xl object-cover flex-shrink-0 shadow-sm ring-1 ring-white/10" />
            ) : (
              <div className="w-7 h-7 rounded-xl bg-[#5865F2] text-[11px] flex items-center justify-center text-white flex-shrink-0 font-bold shadow-sm">
                {activeServer.acronym.slice(0, 2)}
              </div>
            )}
            <span className="truncate tracking-wide font-extrabold">{activeServer.name}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Botão Configurações do Servidor */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setServerManagementTab('edit');
                setServerManagementModalOpen(true);
              }}
              title="Configurações do Servidor"
              className={`p-1 rounded-lg border transition-all hover:scale-110 active:scale-95 ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 text-black border-black/20'
                  : 'bg-white/[0.06] hover:bg-white/[0.14] text-[#dbdee1] hover:text-white border-white/[0.08]'
              }`}
            >
              <Settings className="w-4 h-4 text-[#949ba4] hover:text-white" />
            </button>

            {/* Botão funcional Adicionar Pessoas ao Servidor */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setServerManagementTab('members');
                setServerManagementModalOpen(true);
              }}
              title="Adicionar Pessoas ao Servidor"
              className={`p-1 rounded-lg border transition-all hover:scale-110 active:scale-95 ${
                theme === 'light'
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-black/20'
                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-white border-indigo-500/30'
              }`}
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
            </button>

            <ChevronDown
              className={`w-4 h-4 text-[#949ba4] transition-transform duration-200 ${
                serverMenuOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {serverMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setServerMenuOpen(false)}
            />
            <div className="absolute top-13 left-2 right-2 bg-[#111214] border border-[#3e4047] rounded-xl shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setServerMenuOpen(false);
                  setServerManagementTab('edit');
                  setServerManagementModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[#dbdee1] hover:bg-[#35373c] hover:text-white transition-colors"
              >
                <span>Configurações do Servidor</span>
                <Settings className="w-4 h-4 text-[#949ba4]" />
              </button>

              <button
                onClick={() => {
                  setServerMenuOpen(false);
                  setServerManagementTab('members');
                  setServerManagementModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[#5865F2] hover:bg-[#5865F2] hover:text-white transition-colors"
              >
                <span>Adicionar Pessoas ao Servidor</span>
                <UserPlus className="w-4 h-4" />
              </button>

              <div className="h-[1px] bg-[#35373c] my-1" />

              <button
                onClick={() => {
                  setServerMenuOpen(false);
                  setServerManagementTab('edit');
                  setServerManagementModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[#f23f43] hover:bg-[#f23f43] hover:text-white transition-colors"
              >
                <span>Excluir Servidor</span>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {/* Quick Hub: Meeting Summaries Shortcut Banner */}
        <div className="px-1 space-y-1.5">
          <button
            onClick={() => {
              if (summaries.length > 0) openSummaryModal(summaries[0]);
              else setActiveChannelId('ch-resumos');
            }}
            className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all group text-left ${
              theme === 'light'
                ? 'bg-indigo-50/80 hover:bg-indigo-100 border-2 border-black text-black shadow-sm'
                : 'bg-gradient-to-r from-[#5865F2]/20 to-[#23a55a]/15 hover:from-[#5865F2]/30 hover:to-[#23a55a]/25 border border-[#5865F2]/30 hover:border-[#5865F2]/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
              theme === 'light'
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'bg-[#5865F2]/20 group-hover:bg-[#5865F2] text-[#5865F2] group-hover:text-white'
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                Diskai AI Studio
                <span className="text-[9px] bg-[#5865F2] text-white px-1.5 py-0.2 rounded-full font-bold">
                  {summaries.length}
                </span>
              </div>
              <div className={`text-[11px] truncate ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                Atas & Gravações com IA
              </div>
            </div>
          </button>

          {/* Quick Hub: Arara Assistente */}
          <button
            onClick={() => setMacawModalOpen(true)}
            className={`w-full p-2.5 rounded-lg flex items-center gap-2.5 transition-all group text-left ${
              theme === 'light'
                ? 'bg-sky-50/80 hover:bg-sky-100 border-2 border-black text-black shadow-sm'
                : 'bg-gradient-to-r from-[#0284c7]/20 to-[#38bdf8]/15 hover:from-[#0284c7]/30 hover:to-[#38bdf8]/25 border border-[#38bdf8]/30 hover:border-[#38bdf8]/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 overflow-hidden ${
              theme === 'light'
                ? 'bg-[#0284c7]/15 border border-[#0284c7]/40'
                : 'bg-[#0284c7]/20 group-hover:bg-[#0284c7] text-[#38bdf8] group-hover:text-white'
            }`}>
              <img src="/arara-mascote.png" alt="Arara" className="w-6 h-6 object-contain" />
            </div>
            <div className="overflow-hidden flex-1">
              <div className={`text-xs font-bold flex items-center justify-between ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                <span>Arara Assistente</span>
                <span className="text-[9px] bg-[#0284c7] text-white px-1.5 py-0.5 rounded-full font-bold">
                  {appointments.length} eventos
                </span>
              </div>
              <div className={`text-[11px] truncate ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                Agenda, Tarefas & IA
              </div>
            </div>
          </button>
        </div>

        {/* Categories & Channels */}
        {activeServer.categories.map(category => {
          const isCollapsed = collapsedCategories[category.id];
          return (
            <div key={category.id} className="space-y-0.5">
              {/* Category Header */}
              <div className="flex items-center justify-between px-1 py-1 group/cat">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-1 text-[#949ba4] hover:text-[#dbdee1] text-[11px] font-bold tracking-wider uppercase transition-colors truncate flex-1 text-left"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                  <span className="truncate">{category.name}</span>
                </button>

                {canManageChannels && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreateChannelTargetCategory({ id: category.id, name: category.name });
                      setCreateChannelModalOpen(true);
                    }}
                    title="Criar canal"
                    className="p-1 rounded-md text-[#949ba4] hover:text-white bg-white/[0.02] hover:bg-white/[0.08] border border-transparent hover:border-white/[0.1] transition-all opacity-80 group-hover/cat:opacity-100 hover:scale-110 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Channel Items */}
              {!isCollapsed && (
                <div className="space-y-[2px]">
                  {category.channels.filter(isChannelVisible).map(channel => {
                    const isTextActive = channel.type === 'text' && activeChannel.id === channel.id;
                    const isVoiceActive = activeVoiceChannel?.id === channel.id;
                    const isForumActive = channel.type === 'forum' && activeChannel.id === channel.id;
                    const isSelected = isTextActive || isForumActive;

                    return (
                      <div key={channel.id} className="group/item relative">
                        <button
                          onClick={() => handleChannelClick(channel)}
                          className={`w-full flex items-center justify-between pl-2.5 pr-1.5 py-1.5 rounded-md text-sm transition-all ${
                            isSelected
                              ? 'bg-[#404249] text-white font-medium'
                              : isVoiceActive
                              ? 'bg-[#23a55a]/15 text-[#23a55a] font-medium'
                              : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                            {channel.isPrivate ? (
                              <Lock className="w-4 h-4 flex-shrink-0 text-[#f0b232]" />
                            ) : channel.type === 'voice' ? (
                              <Volume2
                                className={`w-4 h-4 flex-shrink-0 ${
                                  isVoiceActive ? 'text-[#23a55a] animate-pulse' : 'text-[#80848e] group-hover/item:text-[#dbdee1]'
                                }`}
                              />
                            ) : channel.type === 'forum' ? (
                              <MessagesSquare className={`w-4 h-4 flex-shrink-0 ${isForumActive ? 'text-white' : 'text-[#80848e]'}`} />
                            ) : (
                              <Hash className={`w-4 h-4 flex-shrink-0 ${isTextActive ? 'text-white' : 'text-[#80848e]'}`} />
                            )}
                            <span className="truncate">{channel.name}</span>
                          </div>

                          {/* Right action buttons: Badges + Invite & Settings */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Badges when not hovering */}
                            <div className="flex items-center gap-1 group-hover/item:hidden">
                              {channel.isMeetingHub && (
                                <span className="text-[10px] bg-[#5865F2]/20 text-[#5865F2] font-semibold px-1.5 py-0.5 rounded border border-[#5865F2]/30">
                                  IA
                                </span>
                              )}
                              {isVoiceActive && isRecording && (
                                <span className="flex items-center gap-1 text-[10px] bg-[#f23f43]/20 text-[#f23f43] font-semibold px-1.5 py-0.5 rounded border border-[#f23f43]/30 animate-pulse">
                                  REC {formatSecs(recordingDuration)}
                                </span>
                              )}
                            </div>

                            {/* Action Buttons on Hover */}
                            <div className="hidden group-hover/item:flex items-center gap-1">
                              {/* Add / Invite Participant button: em canais privados, somente Admin ou Criador podem incluir membros */}
                              {(!channel.isPrivate || isPlatformAdmin || channel.creatorId === currentUser.id) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChannelInviteTarget(channel);
                                    setChannelInviteModalOpen(true);
                                  }}
                                  title="Convidar para o Canal"
                                  className="p-1 rounded-md text-[#949ba4] hover:text-indigo-400 bg-white/[0.02] hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all hover:scale-110 active:scale-95"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Settings / Gear button */}
                              {canManageChannels && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChannelSettingsTarget(channel);
                                    setChannelSettingsModalOpen(true);
                                  }}
                                  title="Editar Canal"
                                  className="p-1 rounded-md text-[#949ba4] hover:text-white bg-white/[0.02] hover:bg-white/[0.08] border border-transparent hover:border-white/[0.1] transition-all hover:scale-110 active:scale-95 hover:rotate-45"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* List connected members in voice channel */}
                        {isVoiceActive && (
                          <div className="pl-6 pr-2 py-1 space-y-1">
                            {/* Current user */}
                            <div className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-[#35373c]/50 text-xs text-[#dbdee1]">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <img
                                    src={currentUser.avatar}
                                    alt={currentUser.name}
                                    className="w-5 h-5 rounded-full object-cover ring-1 ring-[#23a55a]"
                                  />
                                </div>
                                <span className="truncate">{currentUser.name} (Você)</span>
                              </div>
                              <div className="flex items-center gap-1 text-[#949ba4]">
                                {isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
                              </div>
                            </div>

                            {/* Simulated teammates in call */}
                            <div className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-[#35373c]/50 text-xs text-[#dbdee1]">
                              <div className="flex items-center gap-2">
                                <img
                                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
                                  alt="Ana"
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <span className="truncate">Ana Silva</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-[#35373c]/50 text-xs text-[#dbdee1]">
                              <div className="flex items-center gap-2">
                                <img
                                  src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80"
                                  alt="Carlos"
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <span className="truncate">Carlos Mendes</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-[#35373c]/50 text-xs text-[#5865F2] font-semibold">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                                  <Bot className="w-3.5 h-3.5 text-[#5865F2]" />
                                </div>
                                <span className="truncate">Diskai AI Bot</span>
                              </div>
                              <span className="text-[9px] bg-[#5865F2] text-white px-1 rounded">Transcrevendo</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Voice Connection Status Bar (when user is in call) */}
      {activeVoiceChannel && (
        <div className="border-t border-[#1f2023] bg-[#23a55a]/10 p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Radio className="w-4 h-4 text-[#23a55a] animate-pulse" />
            <div className="truncate">
              <div className="font-bold text-[#23a55a] truncate flex items-center gap-1.5">
                Voz Conectada
                {isRecording && (
                  <span className="w-2 h-2 rounded-full bg-[#f23f43] animate-ping" />
                )}
              </div>
              <div className="text-[11px] text-[#949ba4] truncate">{activeVoiceChannel.name}</div>
            </div>
          </div>
          <button
            onClick={leaveVoiceChannel}
            title="Desconectar da chamada"
            className="p-1.5 hover:bg-[#35373c] rounded text-[#949ba4] hover:text-[#f23f43] transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Profile Bar */}
      <div className={`h-[52px] px-2 flex items-center justify-between select-none transition-colors ${
        theme === 'light'
          ? 'bg-white border-t-2 border-black text-black'
          : 'bg-[#232428] border-t border-[#3e4047]'
      }`}>
        {/* Avatar & Name */}
        <div
          onClick={() => setSettingsModalOpen(true)}
          className={`flex items-center gap-2 p-1 -ml-1 rounded-md cursor-pointer max-w-[125px] transition-colors ${
            theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-[#35373c]'
          }`}
        >
          <div className="relative flex-shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className={`w-8 h-8 rounded-full object-cover ${theme === 'light' ? 'border border-black/20' : ''}`}
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ${
                theme === 'light' ? 'ring-white' : 'ring-[#232428]'
              } ${
                currentUser.status === 'online'
                  ? 'bg-[#23a55a]'
                  : currentUser.status === 'idle'
                  ? 'bg-[#f0b232]'
                  : currentUser.status === 'dnd'
                  ? 'bg-[#f23f43]'
                  : 'bg-[#80848e]'
              }`}
            />
          </div>
          <div className="truncate">
            <div className={`text-xs font-semibold leading-tight truncate ${
              theme === 'light' ? 'text-black font-bold' : 'text-white'
            }`}>
              {currentUser.name}
            </div>
            <div className={`text-[10px] leading-tight ${
              theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'
            }`}>
              #{currentUser.tag}
            </div>
          </div>
        </div>

        {/* Audio / Settings Control Icons */}
        <div className={`flex items-center gap-1 ${theme === 'light' ? 'text-black' : 'text-[#b5bac1]'}`}>
          <button
            onClick={toggleMute}
            title={isMuted ? 'Desativar Mudo' : 'Ativar Mudo'}
            className={`p-1.5 rounded-xl transition-all duration-200 border backdrop-blur-sm ${
              isMuted
                ? 'bg-[#f23f43]/15 border-[#f23f43]/40 text-[#f23f43] shadow-sm shadow-[#f23f43]/20 scale-105'
                : theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-black/20 text-black hover:scale-105'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.05] hover:border-white/[0.15] text-[#949ba4] hover:text-white hover:scale-105'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Desativar Ensudecer' : 'Ensurdecer'}
            className={`p-1.5 rounded-xl transition-all duration-200 border backdrop-blur-sm ${
              isDeafened
                ? 'bg-[#f23f43]/15 border-[#f23f43]/40 text-[#f23f43] shadow-sm shadow-[#f23f43]/20 scale-105'
                : theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-black/20 text-black hover:scale-105'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.05] hover:border-white/[0.15] text-[#949ba4] hover:text-white hover:scale-105'
            }`}
          >
            <Headphones className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSettingsModalOpen(true)}
            title="Configurações de Usuário & IA"
            className={`p-1.5 rounded-xl border hover:scale-105 transition-all duration-200 backdrop-blur-sm group ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-black/20 text-black'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.05] hover:border-white/[0.15] text-[#949ba4] hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
          </button>
          <button
            onClick={async () => {
              if (window.confirm('Deseja realmente sair da sua conta?')) {
                await logout();
              }
            }}
            title="Sair da Conta (Logout)"
            className={`p-1.5 rounded-xl border hover:scale-105 transition-all duration-200 backdrop-blur-sm ${
              theme === 'light'
                ? 'bg-rose-50 hover:bg-rose-100 border-black/20 text-rose-700'
                : 'bg-white/[0.03] hover:bg-[#f23f43]/15 border-white/[0.05] hover:border-[#f23f43]/30 text-[#949ba4] hover:text-[#f23f43]'
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Group Members / Add Members Modal */}
      {showAddMembersModal && <GroupMembersModal onClose={() => setShowAddMembersModal(false)} />}
    </div>
  );
};
