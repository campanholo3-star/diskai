import React, { useState } from 'react';
import {
  Users,
  Plus,
  X,
  Mic,
  MicOff,
  Headphones,
  Settings,
  Sparkles,
  PhoneOff,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  LogOut,
  MessageSquare
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { initialFriends } from '../../data/initialData';
import { signOut } from '../../services/supabase';

export const DirectSidebar: React.FC = () => {
  const {
    friends,
    activeDmUserId,
    setActiveDmUserId,
    activeDmCallUser,
    activeVoiceChannel,
    leaveVoiceChannel,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    currentUser,
    logout,
    setSettingsModalOpen,
    isRecording,
    setTutorialOpen,
    setAdminModalOpen,
    directMessages,
    closeDmConversation,
    setDmSubTab,
    appointments,
    setMacawModalOpen,
    theme
  } = useDiskai();

  const isPlatformAdmin =
    currentUser.role === 'Administrador' ||
    currentUser.role === 'admin' ||
    currentUser.id === 'admin-campanholo32' ||
    currentUser.email === 'campanholo32@gmail.com';

  const [sidebarSearch, setSidebarSearch] = useState('');
  const [quickNewDmModal, setQuickNewDmModal] = useState(false);

  // Guarantee list has friends (fallback to initial if wiped)
  const baseFriends = friends && friends.length > 0 ? friends : initialFriends;
  const dmFriends = baseFriends.filter(f => f.relationshipStatus === 'friend');

  // Sort friends:
  // 1. Unread messages at the very top
  // 2. Most conversed / messages exchanged (interactivity count)
  // 3. Alphabetical
  const sortedDmFriends = [...dmFriends].sort((a, b) => {
    const unreadA = a.unreadCount || 0;
    const unreadB = b.unreadCount || 0;
    if (unreadA !== unreadB) return unreadB - unreadA;

    const msgsA = (directMessages[a.id] || []).length;
    const msgsB = (directMessages[b.id] || []).length;
    if (msgsA !== msgsB) return msgsB - msgsA;

    return a.user.name.localeCompare(b.user.name);
  });

  const filteredDmFriends = sortedDmFriends.filter(f => {
    if (!sidebarSearch.trim()) return true;
    const q = sidebarSearch.toLowerCase();
    return (
      f.user.name.toLowerCase().includes(q) ||
      f.user.tag.includes(q) ||
      (f.lastMessage && f.lastMessage.toLowerCase().includes(q))
    );
  });

  const pendingCount = baseFriends.filter(f => f.relationshipStatus === 'pending_incoming').length;
  const onlineFriendsCount = baseFriends.filter(
    f => f.relationshipStatus === 'friend' && f.user.status !== 'offline'
  ).length;

  return (
    <div className={`w-60 flex flex-col h-full select-none flex-shrink-0 z-10 border-r transition-colors ${
      theme === 'light'
        ? 'bg-white border-slate-200 text-slate-900'
        : 'bg-[#1A1D23] border-[#22262E] text-[#F8FAFC]'
    }`}>
      {/* Top Search bar input */}
      <div className={`h-12 border-b px-3 flex items-center ${
        theme === 'light' ? 'border-slate-200' : 'border-[#22262E]'
      }`}>
        <div className={`w-full text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-2 border transition-colors ${
          theme === 'light'
            ? 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#16B99A] focus-within:bg-white'
            : 'bg-[#131519] border-[#2C313C] text-[#F8FAFC] focus-within:border-[#16B99A]'
        }`}>
          <Search className={`w-3.5 h-3.5 flex-shrink-0 ${theme === 'light' ? 'text-slate-400' : 'text-[#94A3B8]'}`} />
          <input
            type="text"
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            placeholder="Buscar conversa ou amigo..."
            className={`w-full bg-transparent text-xs focus:outline-none ${
              theme === 'light' ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-[#64748B]'
            }`}
          />
          {sidebarSearch && (
            <button
              onClick={() => setSidebarSearch('')}
              className={`${theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-[#94A3B8] hover:text-white'}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main navigation in DM sidebar */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {/* Friends Tab */}
        <div className="space-y-0.5">
          <button
            onClick={() => setActiveDmUserId(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeDmUserId === null
                ? 'bg-[#22262E] text-white border-l-2 border-[#16B99A] pl-2.5'
                : 'text-[#94A3B8] hover:bg-[#20242A] hover:text-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#94A3B8]" />
              <span>Amigos</span>
            </div>
            <div className="flex items-center gap-1.5">
              {onlineFriendsCount > 0 && (
                <span className="text-[11px] text-[#10B981] font-bold">
                  {onlineFriendsCount} online
                </span>
              )}
              {pendingCount > 0 && (
                <span className="bg-[#16B99A] text-[#131519] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
          </button>

          {/* Quick Beginner Tutorial Pill */}
          <button
            onClick={() => setTutorialOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <div className="text-left leading-tight">
              <div>Tutorial do Iniciante</div>
              <div className="text-[10px] text-[#94A3B8]">Aprenda a usar o Diskai</div>
            </div>
          </button>

          {/* Arara Assistente Shortcut Pill */}
          <button
            onClick={() => setMacawModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-[#38bdf8] bg-[#0284c7]/10 hover:bg-[#0284c7]/20 border border-[#38bdf8]/20 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                <img src="/arara-mascote.png" alt="Arara" className="w-5 h-5 object-contain" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-white group-hover:text-[#38bdf8] transition-colors">Arara Assistente</div>
                <div className="text-[10px] text-[#94A3B8]">Agenda & IA DiskAI</div>
              </div>
            </div>
            <span className="text-[9px] bg-[#0284c7] text-white font-bold px-1.5 py-0.5 rounded-full">
              {appointments.length}
            </span>
          </button>
        </div>

        {/* Section Header: MENSAGENS DIRETAS */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pt-2 text-[#94A3B8] hover:text-white text-[10.5px] font-bold tracking-wider uppercase">
            <span>Mensagens Diretas</span>
            <button
              onClick={() => {
                setActiveDmUserId(null);
                setDmSubTab('all');
              }}
              title="Iniciar nova conversa com amigo"
              className="hover:text-white p-0.5 rounded hover:bg-[#20242A] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* DM conversations list */}
          <div className="space-y-[2px]">
            {filteredDmFriends.length === 0 ? (
              <div className="text-center py-6 px-3 space-y-2">
                <MessageSquare className="w-8 h-8 text-[#94A3B8]/30 mx-auto" />
                <p className="text-xs text-[#94A3B8]">Nenhuma conversa encontrada</p>
                <button
                  onClick={() => {
                    setActiveDmUserId(null);
                    setDmSubTab('all');
                  }}
                  className="text-xs text-[#16B99A] hover:underline font-semibold"
                >
                  Ver todos os amigos
                </button>
              </div>
            ) : (
              filteredDmFriends.map(friend => {
                const isActive = activeDmUserId === friend.id;
                const isUserInDmCall = activeDmCallUser?.id === friend.id;
                const messageCount = (directMessages[friend.id] || []).length;

                return (
                  <div key={friend.id} className="relative group">
                    <button
                      onClick={() => setActiveDmUserId(friend.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-[#22262E] text-white font-medium border-l-2 border-[#16B99A] pl-2'
                          : isUserInDmCall
                          ? 'bg-[#10B981]/15 text-[#10B981] font-medium border-l-2 border-[#10B981] pl-2'
                          : 'text-[#94A3B8] hover:bg-[#20242A] hover:text-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={friend.user.avatar}
                            alt={friend.user.name}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10"
                          />
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#1A1D23] ${
                              friend.user.status === 'online'
                                ? 'bg-[#10B981]'
                                : friend.user.status === 'idle'
                                ? 'bg-[#F59E0B]'
                                : friend.user.status === 'dnd'
                                ? 'bg-[#EF4444]'
                                : 'bg-[#64748B]'
                            }`}
                          />
                        </div>
                        <div className="truncate text-left">
                          <div className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-[#F8FAFC]'}`}>
                            {friend.user.name}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] truncate max-w-[120px]">
                            {friend.lastMessage || `#${friend.user.tag}`}
                          </div>
                        </div>
                      </div>

                      {/* Unread badge & close DM button */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {friend.unreadCount && friend.unreadCount > 0 ? (
                          <span className="bg-[#16B99A] text-[#131519] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {friend.unreadCount}
                          </span>
                        ) : null}

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            closeDmConversation(friend.id);
                          }}
                          title="Fechar conversa"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2C313C] rounded text-[#94A3B8] hover:text-white transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Voice Connection Status Bar (if in DM or server call) */}
      {(activeVoiceChannel || activeDmCallUser) && (
        <div className="border-t border-[#1f2023] bg-[#23a55a]/10 p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Radio className="w-4 h-4 text-[#23a55a] animate-pulse" />
            <div className="truncate">
              <div className="font-bold text-[#23a55a] truncate flex items-center gap-1.5">
                Voz Conectada
                {isRecording && <span className="w-2 h-2 rounded-full bg-[#f23f43] animate-ping" />}
              </div>
              <div className="text-[11px] text-[#949ba4] truncate">
                {activeDmCallUser ? `Call 1-on-1 com ${activeDmCallUser.name}` : activeVoiceChannel?.name}
              </div>
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
      <div className={`h-[54px] px-2.5 flex items-center justify-between select-none transition-colors ${
        theme === 'light'
          ? 'bg-slate-50 border-t border-slate-200 text-slate-900'
          : 'bg-[#131519] border-t border-[#22262E]'
      }`}>
        <div
          onClick={() => setSettingsModalOpen(true)}
          className={`flex items-center gap-2 p-1 -ml-1 rounded-lg cursor-pointer max-w-[125px] transition-colors ${
            theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-[#1A1D23]'
          }`}
        >
          <div className="relative flex-shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className={`w-8 h-8 rounded-lg object-cover ${theme === 'light' ? 'border border-slate-200' : 'ring-1 ring-white/10'}`}
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ${
                theme === 'light' ? 'ring-white' : 'ring-[#131519]'
              } ${
                currentUser.status === 'online'
                  ? 'bg-[#10B981]'
                  : currentUser.status === 'idle'
                  ? 'bg-[#F59E0B]'
                  : currentUser.status === 'dnd'
                  ? 'bg-[#EF4444]'
                  : 'bg-[#64748B]'
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

        <div className={`flex items-center gap-1 ${theme === 'light' ? 'text-slate-700' : 'text-[#94A3B8]'}`}>
          <button
            onClick={toggleMute}
            title={isMuted ? 'Desativar Mudo' : 'Ativar Mudo'}
            className={`p-1.5 rounded-lg transition-all duration-200 border ${
              isMuted
                ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444] shadow-sm'
                : theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-[#2C313C] text-[#94A3B8] hover:text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Desativar Ensudecer' : 'Ensurdecer'}
            className={`p-1.5 rounded-lg transition-all duration-200 border ${
              isDeafened
                ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444] shadow-sm'
                : theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-[#2C313C] text-[#94A3B8] hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSettingsModalOpen(true)}
            title="Configurações de Usuário & IA"
            className={`p-1.5 rounded-lg border transition-all duration-200 group ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-[#2C313C] text-[#94A3B8] hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
          </button>
          <button
            onClick={async () => {
              if (window.confirm('Deseja realmente sair da sua conta?')) {
                await logout();
              }
            }}
            title="Sair da Conta (Logout)"
            className={`p-1.5 rounded-lg border transition-all duration-200 ${
              theme === 'light'
                ? 'bg-rose-50 hover:bg-rose-100 border-slate-200 text-rose-700'
                : 'bg-white/[0.03] hover:bg-[#EF4444]/15 border-[#2C313C] hover:border-[#EF4444]/30 text-[#94A3B8] hover:text-[#EF4444]'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
