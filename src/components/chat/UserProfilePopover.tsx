import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  UserCheck,
  MoreHorizontal,
  MessageSquare,
  Phone,
  Video,
  Smile,
  Send,
  Shield,
  Bot,
  Circle
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { User } from '../../types';
import { EmojiPickerModal } from '../common/EmojiPickerModal';

interface UserProfilePopoverProps {
  user: User;
  anchorRect: DOMRect | null;
  onClose: () => void;
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  user,
  anchorRect,
  onClose
}) => {
  const {
    currentUser,
    friends,
    addFriend,
    removeFriend,
    startDmCall,
    sendDirectMessage,
    setActiveDmUserId,
    setMainView,
    activeServer,
    theme
  } = useDiskai();

  const [quickMessage, setQuickMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isFriend = friends.some(
    f => (f.id === user.id || f.user.id === user.id) && f.relationshipStatus === 'friend'
  );

  const isSelf = user.id === currentUser.id || user.id === 'user-me' || user.id === 'admin-campanholo32';

  const handleSendQuickMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickMessage.trim() || isSelf) return;

    sendDirectMessage(user.id, quickMessage);
    setActiveDmUserId(user.id);
    setMainView('direct');
    onClose();
  };

  const handleToggleFriend = () => {
    if (isSelf) return;
    if (isFriend) {
      if (window.confirm(`Remover ${user.name} da sua lista de amigos?`)) {
        removeFriend(user.id);
      }
    } else {
      addFriend(user.name);
    }
  };

  // Cores de banner padrão
  const bannerColor =
    user.bannerColor ||
    (user.role === 'Administrador' ? '#da373c' : user.isBot ? '#5865F2' : '#23a55a');

  // Cálculo de posição para ficar alinhado à esquerda do item na lista de membros (como no Discord)
  let top = 100;
  let right = 260; // Largura da sidebar da direita + gap
  if (anchorRect) {
    top = Math.min(anchorRect.top, window.innerHeight - 440);
    top = Math.max(top, 60);
    right = window.innerWidth - anchorRect.left + 12;
  }

  return (
    <div
      ref={cardRef}
      style={{ top: `${top}px`, right: `${right}px` }}
      className={`fixed z-50 w-72 md:w-80 rounded-2xl shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150 transition-colors ${
        theme === 'light'
          ? 'bg-white text-black border-2 border-black shadow-[0_12px_36px_rgba(0,0,0,0.18)]'
          : 'bg-[#232428] text-[#dbdee1] border border-[#35363c]'
      }`}
      onClick={e => e.stopPropagation()}
    >
      {/* Top Banner */}
      <div
        className={`h-20 w-full relative transition-colors duration-200 ${
          theme === 'light' ? 'border-b-2 border-black' : ''
        }`}
        style={{ backgroundColor: bannerColor }}
      >
        {/* Ações no Topo Direito do Banner */}
        {!isSelf && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            {/* Botão Adicionar/Amigo */}
            <button
              onClick={handleToggleFriend}
              title={isFriend ? 'Já são amigos (clique para remover)' : 'Adicionar Amigo'}
              className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95 ${
                isFriend
                  ? 'bg-[#23a55a] text-white hover:bg-[#1f9250] border border-black/20'
                  : theme === 'light'
                  ? 'bg-white text-black hover:bg-slate-100 border-2 border-black shadow'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              {isFriend ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </button>

            {/* Iniciar Chamada de Voz Rápida */}
            <button
              onClick={() => {
                startDmCall(user.id, false);
                onClose();
              }}
              title="Ligar para usuário"
              className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95 ${
                theme === 'light'
                  ? 'bg-white text-black hover:bg-slate-100 border-2 border-black shadow'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              <Phone className="w-4 h-4" />
            </button>

            {/* Iniciar Videochamada Rápida */}
            <button
              onClick={() => {
                startDmCall(user.id, true);
                onClose();
              }}
              title="Iniciar Videochamada LiveKit"
              className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95 ${
                theme === 'light'
                  ? 'bg-white text-black hover:bg-slate-100 border-2 border-black shadow'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Avatar e Status Indicator */}
      <div className={`px-4 pb-4 pt-0 relative transition-colors ${
        theme === 'light' ? 'bg-white text-black' : 'bg-[#111214] text-[#dbdee1]'
      }`}>
        <div className="relative -top-11 mb-[-36px] flex items-end justify-between">
          <div className="relative">
            <div className={`w-20 h-20 rounded-full ring-[6px] overflow-hidden shadow-xl ${
              theme === 'light'
                ? 'ring-white bg-slate-200 border-2 border-black'
                : 'ring-[#111214] bg-[#2b2d31]'
            }`}>
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Status dot */}
            <div
              className={`absolute bottom-0 right-0 w-5 h-5 rounded-full ring-4 flex items-center justify-center ${
                theme === 'light' ? 'ring-white border border-black/30' : 'ring-[#111214]'
              } ${
                user.status === 'online'
                  ? 'bg-[#23a55a]'
                  : user.status === 'idle'
                  ? 'bg-[#f0b232]'
                  : user.status === 'dnd'
                  ? 'bg-[#f23f43]'
                  : 'bg-[#80848e]'
              }`}
            />
          </div>

          {/* Badges de papel / role */}
          {user.role === 'Administrador' && (
            <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1 ${
              theme === 'light'
                ? 'bg-amber-100 text-amber-900 border-2 border-black'
                : 'bg-[#f0b232]/10 text-[#f0b232] border border-[#f0b232]/30'
            }`}>
              <Shield className="w-3 h-3" />
              Admin
            </span>
          )}
          {user.isBot && (
            <span className={`flex items-center gap-1 text-[10px] font-bold bg-[#5865F2] text-white px-2 py-0.5 rounded-full uppercase mb-1 ${
              theme === 'light' ? 'border-2 border-black' : ''
            }`}>
              <Bot className="w-3 h-3" /> BOT
            </span>
          )}
        </div>

        {/* Informações do Usuário */}
        <div className="pt-2 space-y-2">
          <div>
            <h3 className={`text-lg font-bold leading-tight flex items-center gap-1.5 ${
              theme === 'light' ? 'text-black font-extrabold' : 'text-white'
            }`}>
              {user.name}
            </h3>
            <p className={`text-xs font-semibold ${
              theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'
            }`}>
              @{user.name.toLowerCase().replace(/\s+/g, '')}
              {user.tag && <span className="opacity-75">#{user.tag}</span>}
            </p>
          </div>

          {/* Resumo de Servidores e Amigos Mútuos */}
          <div className={`flex items-center gap-2 pt-1 text-[11px] border-t ${
            theme === 'light' ? 'text-slate-700 border-black/15 font-medium' : 'text-[#949ba4] border-[#2b2d31]'
          }`}>
            <div className="flex -space-x-1.5 overflow-hidden">
              <img
                className={`inline-block h-4 w-4 rounded-full ring-1 ${
                  theme === 'light' ? 'ring-black/30' : 'ring-[#111214]'
                }`}
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50"
                alt=""
              />
              <img
                className={`inline-block h-4 w-4 rounded-full ring-1 ${
                  theme === 'light' ? 'ring-black/30' : 'ring-[#111214]'
                }`}
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50"
                alt=""
              />
            </div>
            <span>
              {activeServer?.name ? `1 servidor mútuo (${activeServer.name})` : 'Membro do Diskai'}
            </span>
          </div>

          {/* Status customizado ou bio */}
          {user.customStatus && (
            <div className="pt-1">
              <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${
                theme === 'light' ? 'text-black' : 'text-[#949ba4]'
              }`}>
                Atividade / Status
              </div>
              <div className={`text-xs px-2.5 py-1.5 rounded-lg inline-block ${
                theme === 'light'
                  ? 'bg-slate-100 text-black border-2 border-black font-semibold'
                  : 'text-[#dbdee1] bg-[#1e1f22] border border-[#2b2d31]'
              }`}>
                {user.customStatus}
              </div>
            </div>
          )}

          {user.bio && (
            <div className={`pt-1 text-xs leading-relaxed italic p-2 rounded-lg ${
              theme === 'light'
                ? 'bg-slate-100 text-slate-800 border-2 border-black font-medium'
                : 'text-[#b5bac1] bg-[#1e1f22]/50 border border-[#2b2d31]/50'
            }`}>
              "{user.bio}"
            </div>
          )}

          {/* Campo de Mensagem Rápida (Conversar com @Nome) */}
          {!isSelf && (
            <div className={`pt-3 border-t relative ${
              theme === 'light' ? 'border-black/15' : 'border-[#2b2d31]'
            }`}>
              <form onSubmit={handleSendQuickMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={quickMessage}
                  onChange={e => setQuickMessage(e.target.value)}
                  placeholder={`Conversar com @${user.name}`}
                  className={`w-full rounded-xl pl-3 pr-16 py-2 text-xs transition-colors ${
                    theme === 'light'
                      ? 'bg-white border-2 border-black text-black placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-black'
                      : 'bg-[#1e1f22] border border-[#35363c] text-white placeholder-[#949ba4] focus:outline-none focus:border-[#5865F2]'
                  }`}
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-1 transition-colors ${
                      theme === 'light' ? 'text-slate-700 hover:text-black' : 'text-[#949ba4] hover:text-white'
                    }`}
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!quickMessage.trim()}
                    className={`p-1 transition-all ${
                      theme === 'light'
                        ? 'text-sky-600 hover:text-sky-700 disabled:opacity-30'
                        : 'text-[#5865F2] hover:text-[#4752c4] disabled:opacity-30'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {showEmojiPicker && (
                <div className="absolute bottom-12 right-0 z-50">
                  <EmojiPickerModal
                    onSelectEmoji={emoji => {
                      setQuickMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
