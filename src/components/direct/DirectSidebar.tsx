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
        ? 'bg-white border-black/20 text-black'
        : 'bg-[#2b2d31] border-[#3e4047] text-[#dbdee1] shadow-sm'
    }`}>
      {/* Top Search bar input */}
      <div className={`h-12 border-b px-3 flex items-center shadow-sm ${
        theme === 'light' ? 'border-black/20' : 'border-[#3e4047]'
      }`}>
        <div className="w-full bg-[#1e1f22] text-[#dbdee1] text-xs font-semibold px-2 py-1.5 rounded flex items-center gap-2 border border-transparent focus-within:border-[#5865F2]">
          <Search className="w-3.5 h-3.5 text-[#949ba4] flex-shrink-0" />
          <input
            type="text"
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            placeholder="Buscar conversa ou amigo..."
            className="w-full bg-transparent text-xs text-white focus:outline-none placeholder:text-[#949ba4]"
          />
          {sidebarSearch && (
            <button
              onClick={() => setSidebarSearch('')}
              className="text-[#949ba4] hover:text-white"
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
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-all ${
              activeDmUserId === null
                ? 'bg-[#404249] text-white'
                : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#80848e]" />
              <span>Amigos</span>
            </div>
            <div className="flex items-center gap-1.5">
              {onlineFriendsCount > 0 && (
                <span className="text-[11px] text-[#23a55a] font-bold">
                  {onlineFriendsCount} online
                </span>
              )}
              {pendingCount > 0 && (
                <span className="bg-[#f23f43] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
          </button>

          {/* Quick Beginner Tutorial Pill */}
          <button
            onClick={() => setTutorialOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-[#5865F2]" />
            <div className="text-left leading-tight">
              <div>Tutorial do Iniciante</div>
              <div className="text-[10px] text-[#949ba4]">Aprenda a usar o Diskai</div>
            </div>
          </button>

          {/* Arara Assistente Shortcut Pill */}
          <button
            onClick={() => setMacawModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold text-[#38bdf8] bg-[#0284c7]/10 hover:bg-[#0284c7]/20 border border-[#38bdf8]/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                <img src="/arara-mascote.png" alt="Arara" className="w-5 h-5 object-contain" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-white group-hover:text-[#38bdf8] transition-colors">Arara Assistente</div>
                <div className="text-[10px] text-[#949ba4]">Agenda & IA DiskAI</div>
              </div>
            </div>
            <span className="text-[9px] bg-[#0284c7] text-white font-bold px-1.5 py-0.5 rounded-full">
              {appointments.length}
            </span>
          </button>
        </div>

        {/* Section Header: MENSAGENS DIRETAS */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pt-2 text-[#949ba4] hover:text-[#dbdee1] text-[11px] font-bold tracking-wider uppercase">
            <span>Mensagens Diretas</span>
            <button
              onClick={() => {
                setActiveDmUserId(null);
                setDmSubTab('all');
              }}
              title="Iniciar nova conversa com amigo"
              className="hover:text-white p-0.5 rounded hover:bg-[#35373c] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* DM conversations list */}
          <div className="space-y-[2px]">
            {filteredDmFriends.length === 0 ? (
              <div className="text-center py-6 px-3 space-y-2">
                <MessageSquare className="w-8 h-8 text-[#949ba4]/40 mx-auto" />
                <p className="text-xs text-[#949ba4]">Nenhuma conversa encontrada</p>
                <button
                  onClick={() => {
                    setActiveDmUserId(null);
                    setDmSubTab('all');
                  }}
                  className="text-xs text-[#5865F2] hover:underline font-semibold"
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
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-all ${
                        isActive
                          ? 'bg-[#404249] text-white font-medium shadow-sm'
                          : isUserInDmCall
                          ? 'bg-[#23a55a]/15 text-[#23a55a] font-medium'
                          : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={friend.user.avatar}
                            alt={friend.user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#2b2d31] ${
                              friend.user.status === 'online'
                                ? 'bg-[#23a55a]'
                                : friend.user.status === 'idle'
                                ? 'bg-[#f0b232]'
                                : friend.user.status === 'dnd'
                                ? 'bg-[#f23f43]'
                                : 'bg-[#80848e]'
                            }`}
                          />
                        </div>
                        <div className="truncate text-left flex-1 min-w-0">
                          <div className="truncate flex items-center justify-between gap-1 leading-tight">
                            <span className={`truncate font-semibold ${isActive ? 'text-white' : ''}`}>
                              {friend.user.name}
                            </span>
                            {friend.lastMessageTime && (
                              <span className="text-[10px] text-[#949ba4] flex-shrink-0 opacity-80">
                                {friend.lastMessageTime}
                              </span>
                            )}
                          </div>
                          {friend.lastMessage ? (
                            <div className="text-[11px] text-[#949ba4] truncate leading-tight mt-0.5">
                              {friend.lastMessage}
                            </div>
                          ) : friend.user.activity ? (
                            <div className="text-[10px] text-[#5865F2] truncate leading-tight mt-0.5 font-medium">
                              Jogando {friend.user.activity.name}
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#80848e] truncate leading-tight mt-0.5">
                              #{friend.user.tag}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {friend.unreadCount ? (
                          <span className="bg-[#f23f43] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow">
                            {friend.unreadCount}
                          </span>
                        ) : null}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            closeDmConversation(friend.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-white rounded hover:bg-[#1e1f22]"
                          title="Fechar conversa (não remove amizade)"
                        >
                          <X className="w-3 h-3 text-[#949ba4]" />
                        </div>
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
      <div className={`h-[52px] px-2 flex items-center justify-between select-none transition-colors ${
        theme === 'light'
          ? 'bg-white border-t-2 border-black text-black'
          : 'bg-[#232428] border-t border-[#3e4047]'
      }`}>
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
    </div>
  );
};
