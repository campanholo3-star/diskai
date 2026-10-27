import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  Phone,
  Video,
  Search,
  Check,
  X,
  Sparkles,
  HelpCircle,
  Clock,
  UserPlus
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { DmSubTab, Friend } from '../../types';
import { PreCallDeviceModal } from '../call/PreCallDeviceModal';

export const FriendsView: React.FC = () => {
  const {
    friends,
    dmSubTab,
    setDmSubTab,
    setActiveDmUserId,
    startDmCall,
    addFriend,
    removeFriend,
    acceptFriendRequest,
    setTutorialOpen,
    participants,
    currentUser,
    theme
  } = useDiskai();

  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendFeedback, setAddFriendFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const [preCallModal, setPreCallModal] = useState<{
    isOpen: boolean;
    isVideo: boolean;
    targetUser: { id: string; name: string };
  } | null>(null);

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim()) return;

    const res = addFriend(addFriendInput);
    setAddFriendFeedback({ success: res.success, text: res.message });
    if (res.success) {
      setAddFriendInput('');
      setTimeout(() => {
        setAddFriendFeedback(null);
        setDmSubTab('all');
      }, 1500);
    }
  };

  // Filter friends based on search query or current tab
  const getFilteredFriends = () => {
    const q = searchQuery.trim().toLowerCase();

    // If searching, search across all friends regardless of subtab
    if (q) {
      return friends.filter(
        f =>
          f.user.name.toLowerCase().includes(q) ||
          f.user.tag.includes(q) ||
          `${f.user.name.toLowerCase()}#${f.user.tag}`.includes(q)
      );
    }

    let list = friends;
    if (dmSubTab === 'online') {
      list = list.filter(f => f.relationshipStatus === 'friend' && f.user.status !== 'offline');
    } else if (dmSubTab === 'all') {
      list = list.filter(f => f.relationshipStatus === 'friend');
    } else if (dmSubTab === 'pending') {
      list = list.filter(f => f.relationshipStatus === 'pending_incoming' || f.relationshipStatus === 'pending_outgoing');
    } else if (dmSubTab === 'blocked') {
      list = list.filter(f => f.relationshipStatus === 'blocked');
    }

    return list;
  };

  const filteredFriends = getFilteredFriends();

  // Find participants who match the search but are not yet in friends list
  const matchingNonFriendParticipants = searchQuery.trim()
    ? (participants || []).filter(p => {
        if (p.id === currentUser.id) return false;
        const alreadyFriend = friends.some(f => f.id === p.id || f.user.name.toLowerCase() === p.name.toLowerCase());
        if (alreadyFriend) return false;
        const q = searchQuery.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.tag.includes(q) ||
          (p.email && p.email.toLowerCase().includes(q))
        );
      })
    : [];

  const onlineCount = friends.filter(f => f.relationshipStatus === 'friend' && f.user.status !== 'offline').length;
  const pendingCount = friends.filter(f => f.relationshipStatus === 'pending_incoming').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#313338] select-none overflow-hidden">
      {/* Top Header */}
      <div className={`h-12 border-b px-4 flex items-center justify-between shadow-sm flex-shrink-0 ${
        theme === 'light'
          ? 'bg-white border-black/20 text-black'
          : 'bg-[#313338] border-[#3e4047] text-white'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Users className="w-5 h-5 text-[#80848e]" />
            <span>Amigos</span>
          </div>

          <div className="w-[1px] h-4 bg-[#4e5058]" />

          {/* Subtabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDmSubTab('online')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                dmSubTab === 'online'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              Disponível ({onlineCount})
            </button>
            <button
              onClick={() => setDmSubTab('all')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                dmSubTab === 'all'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              Todos ({friends.filter(f => f.relationshipStatus === 'friend').length})
            </button>
            <button
              onClick={() => setDmSubTab('pending')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                dmSubTab === 'pending'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              Pendente
              {pendingCount > 0 && (
                <span className="bg-[#f23f43] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setDmSubTab('blocked')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                dmSubTab === 'blocked'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              Bloqueado
            </button>
            <button
              onClick={() => setDmSubTab('add')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                dmSubTab === 'add'
                  ? 'bg-[#23a55a] text-white shadow'
                  : 'text-[#23a55a] hover:bg-[#23a55a]/10'
              }`}
            >
              Adicionar Amigo
            </button>
          </div>
        </div>

        {/* Action Header Button: Beginner Tutorial */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTutorialOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-br from-amber-500/10 to-yellow-600/20 hover:from-amber-500/20 hover:to-yellow-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:shadow-[0_0_18px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Guia do Iniciante</span>
          </button>
        </div>
      </div>

      {/* Main Content + Right Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Center Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar space-y-5">
          {/* TAB: Adicionar Amigo */}
          {dmSubTab === 'add' ? (
            <div className="space-y-4 max-w-xl">
              <div>
                <h2 className="text-white font-bold text-base uppercase tracking-wider">Adicionar Amigo</h2>
                <p className="text-xs text-[#949ba4] mt-1">
                  Você pode adicionar amigos com o nome ou a tag do Diskai. Tente adicionar <strong>carlos#2048</strong> ou <strong>ana#1024</strong>.
                </p>
              </div>

              <form onSubmit={handleAddFriendSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={addFriendInput}
                    onChange={e => setAddFriendInput(e.target.value)}
                    placeholder="Digite o nome de usuário#0000"
                    className="w-full bg-[#1e1f22] text-sm text-white px-4 py-3 rounded-xl border border-[#1f2023] focus:outline-none focus:border-[#5865F2] shadow-inner pr-36"
                  />
                  <button
                    type="submit"
                    disabled={!addFriendInput.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Enviar Pedido
                  </button>
                </div>

                {addFriendFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      addFriendFeedback.success
                        ? 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/40'
                        : 'bg-[#f23f43]/20 text-[#f23f43] border border-[#f23f43]/40'
                    }`}
                  >
                    {addFriendFeedback.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>{addFriendFeedback.text}</span>
                  </div>
                )}
              </form>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar amigos por nome ou #tag..."
                  className="w-full bg-[#1e1f22] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#2b2d31] focus:outline-none focus:border-[#5865F2] pr-10"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-2.5 text-[#80848e] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Search className="w-4 h-4 text-[#80848e] absolute right-3.5 top-3" />
                )}
              </div>

              {/* Title & Count */}
              <div className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider flex items-center justify-between">
                <span>
                  {searchQuery.trim()
                    ? `Resultados da busca — ${filteredFriends.length + matchingNonFriendParticipants.length}`
                    : dmSubTab === 'online'
                    ? `Disponíveis — ${filteredFriends.length}`
                    : dmSubTab === 'all'
                    ? `Todos os Amigos — ${filteredFriends.length}`
                    : dmSubTab === 'pending'
                    ? `Pedidos Pendentes — ${filteredFriends.length}`
                    : `Usuários Bloqueados — ${filteredFriends.length}`}
                </span>
                {searchQuery.trim() && (
                  <span className="text-[10px] text-[#5865F2] font-semibold lowercase">
                    buscando em todos os usuários
                  </span>
                )}
              </div>

              {/* Friends List Items */}
              <div className="space-y-1">
                {filteredFriends.length === 0 && matchingNonFriendParticipants.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-[#949ba4] space-y-3">
                    <Users className="w-12 h-12 text-[#404249]" />
                    {searchQuery.trim() ? (
                      <div className="space-y-3">
                        <p className="text-sm text-white">Nenhum amigo encontrado para "{searchQuery}".</p>
                        <button
                          onClick={() => {
                            const res = addFriend(searchQuery);
                            setAddFriendFeedback({ success: res.success, text: res.message });
                            setSearchQuery('');
                            setDmSubTab('all');
                          }}
                          className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors shadow"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Adicionar "{searchQuery}" aos amigos</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm">Nenhum amigo encontrado nesta categoria.</p>
                    )}
                  </div>
                ) : (
                  filteredFriends.map(friend => (
                    <div
                      key={friend.id}
                      onClick={() => setActiveDmUserId(friend.id)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-[#35373c]/50 border-t border-[#35373c]/40 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={friend.user.avatar}
                            alt={friend.user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-[#313338] ${
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
                        <div>
                          <div className="flex items-center gap-1.5 leading-tight">
                            <span className="font-bold text-sm text-white">{friend.user.name}</span>
                            <span className="text-xs text-[#949ba4]">#{friend.user.tag}</span>
                          </div>
                          <div className="text-xs text-[#949ba4] mt-0.5">
                            {friend.user.activity ? (
                              <span className="text-[#dbdee1]">
                                {friend.user.activity.type === 'playing' ? 'Jogando ' : 'Ouvindo '}
                                <strong>{friend.user.activity.name}</strong>
                              </span>
                            ) : (
                              friend.user.customStatus || (friend.user.status === 'online' ? 'Disponível' : 'Offline')
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {friend.relationshipStatus === 'pending_incoming' ? (
                          <>
                            <button
                              onClick={() => acceptFriendRequest(friend.id)}
                              title="Aceitar Pedido"
                              className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => removeFriend(friend.id)}
                              title="Recusar Pedido"
                              className="w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 flex items-center justify-center transition-all backdrop-blur-md shadow-[0_0_12px_rgba(244,63,94,0.15)] hover:shadow-[0_0_18px_rgba(244,63,94,0.35)] hover:scale-105 active:scale-95"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Open DM Chat */}
                            <button
                              onClick={() => setActiveDmUserId(friend.id)}
                              title="Abrir Conversa"
                              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-indigo-500/20 text-[#b5bac1] hover:text-indigo-300 border border-white/[0.08] hover:border-indigo-500/40 flex items-center justify-center transition-all backdrop-blur-md hover:scale-105 active:scale-95 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>

                            {/* Voice Call 1-on-1 with Pre-Call Test Bridge */}
                            <button
                              onClick={() =>
                                setPreCallModal({
                                  isOpen: true,
                                  isVideo: false,
                                  targetUser: { id: friend.id, name: friend.user.name }
                                })
                              }
                              title="Testar Câmera/Microfone & Iniciar Chamada de Voz"
                              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 text-[#b5bac1] hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/40 flex items-center justify-center transition-all backdrop-blur-md hover:scale-105 active:scale-95 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            >
                              <Phone className="w-4 h-4" />
                            </button>

                            {/* Video Call 1-on-1 with Pre-Call Test Bridge */}
                            <button
                              onClick={() =>
                                setPreCallModal({
                                  isOpen: true,
                                  isVideo: true,
                                  targetUser: { id: friend.id, name: friend.user.name }
                                })
                              }
                              title="Testar Câmera/Microfone & Iniciar Chamada de Vídeo"
                              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-indigo-500/20 text-[#b5bac1] hover:text-indigo-300 border border-white/[0.08] hover:border-indigo-500/40 flex items-center justify-center transition-all backdrop-blur-md hover:scale-105 active:scale-95 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            >
                              <Video className="w-4 h-4" />
                            </button>

                            {/* Remove friend */}
                            <button
                              onClick={() => removeFriend(friend.id)}
                              title="Remover Amigo"
                              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-[#b5bac1] hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/40 flex items-center justify-center transition-all backdrop-blur-md hover:scale-105 active:scale-95 hover:shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Members of Platform found (Non-friends) */}
              {matchingNonFriendParticipants.length > 0 && (
                <div className="pt-4 border-t border-[#3e4047] space-y-2">
                  <div className="text-[11px] font-bold text-[#f0b232] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Membros do DiskAI Encontrados ({matchingNonFriendParticipants.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchingNonFriendParticipants.map(participant => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#2b2d31]/60 hover:bg-[#2b2d31] border border-[#3e4047]/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white">{participant.name}</span>
                              <span className="text-xs text-[#949ba4]">#{participant.tag}</span>
                              <span className="text-[10px] bg-[#5865F2]/20 text-[#5865F2] px-1.5 py-0.2 rounded font-semibold">
                                {participant.role}
                              </span>
                            </div>
                            <div className="text-xs text-[#949ba4]">
                              {participant.email || 'Membro verificado'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            addFriend(participant.name);
                            setSearchQuery('');
                          }}
                          className="bg-[#23a55a] hover:bg-[#1f8b4d] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Adicionar aos Amigos</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar: "Ativo Agora" (Active Now) */}
        <div className="w-80 border-l border-[#1f2023]/50 p-4 hidden xl:flex flex-col space-y-4">
          <h3 className="text-white font-bold text-sm tracking-wide">Ativo Agora</h3>

          <div className="space-y-3">
            {friends
              .filter(f => f.relationshipStatus === 'friend' && f.user.activity)
              .map(f => (
                <div
                  key={f.id}
                  onClick={() => setActiveDmUserId(f.id)}
                  className="bg-[#2b2d31] p-3.5 rounded-xl border border-[#383a40] hover:border-[#5865F2] cursor-pointer transition-all space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={f.user.avatar}
                      alt={f.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{f.user.name}</div>
                      <div className="text-[11px] text-[#23a55a] font-semibold truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a]" />
                        {f.user.activity?.name}
                      </div>
                    </div>
                  </div>

                  {f.user.activity?.details && (
                    <div className="bg-[#1e1f22] p-2 rounded text-[11px] text-[#949ba4] truncate">
                      {f.user.activity.details}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-[#949ba4] pt-1 border-t border-[#35373c]/50">
                    <span>Clique para enviar DM</span>
                    <MessageSquare className="w-3 h-3" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Pre-Call Camera & Microphone Device Test Bridge */}
      {preCallModal && preCallModal.isOpen && (
        <PreCallDeviceModal
          callTargetName={preCallModal.targetUser.name}
          isVideoCall={preCallModal.isVideo}
          onClose={() => setPreCallModal(null)}
          onConfirm={({ videoEnabled }) => {
            const targetId = preCallModal.targetUser.id;
            setPreCallModal(null);
            startDmCall(targetId, videoEnabled);
          }}
        />
      )}
    </div>
  );
};
