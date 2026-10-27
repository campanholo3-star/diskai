import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, X, ArrowRight, Volume2, MoreVertical, Clock, BellOff } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { soundFx } from '../../utils/soundEffects';

export const UnreadPopupToast: React.FC = () => {
  const {
    friends,
    setActiveDmUserId,
    setMainView,
    totalUnreadCount,
    unreadPopupEnabled,
    toggleUnreadPopup
  } = useDiskai();
  const [isVisible, setIsVisible] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);

  // Verifica se as notificações estão silenciadas temporariamente ou permanentemente
  const checkIsMuted = () => {
    try {
      const mutedUntil = Number(localStorage.getItem('diskai_notifications_muted_until') || '0');
      return Date.now() < mutedUntil;
    } catch {
      return false;
    }
  };

  // Find friends with unread messages
  const unreadFriends = friends.filter(f => (f.unreadCount || 0) > 0);
  const primaryUnreadFriend = unreadFriends[0] || (friends.length > 0 ? friends[0] : null);

  useEffect(() => {
    if (!unreadPopupEnabled || checkIsMuted()) {
      setIsVisible(false);
      return;
    }

    // Show toast if there are unread messages, or simulate every 30 seconds
    const interval = setInterval(() => {
      if (!unreadPopupEnabled || checkIsMuted()) return;
      if (totalUnreadCount > 0 || unreadFriends.length > 0) {
        setIsVisible(true);
        setIsBouncing(true);
        soundFx.playMessagePing();
        // Remove bouncing class after 1.5s so it can bounce again on next interval
        setTimeout(() => setIsBouncing(false), 1500);
      }
    }, 30000);

    // Initial check after 3 seconds on mount
    const initialTimer = setTimeout(() => {
      if (!unreadPopupEnabled || checkIsMuted()) return;
      if (totalUnreadCount > 0 || unreadFriends.length > 0) {
        setIsVisible(true);
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 1500);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [totalUnreadCount, unreadFriends.length, unreadPopupEnabled]);

  if (!unreadPopupEnabled || checkIsMuted() || !isVisible || (totalUnreadCount === 0 && unreadFriends.length === 0)) return null;

  const countDisplay = totalUnreadCount > 0 ? totalUnreadCount : unreadFriends.length;

  const handleOpenMessage = () => {
    if (primaryUnreadFriend) {
      setMainView('direct');
      setActiveDmUserId(primaryUnreadFriend.id);
    }
    setIsVisible(false);
  };

  const handleMute = (durationMs: number) => {
    const expireTime = Date.now() + durationMs;
    try {
      localStorage.setItem('diskai_notifications_muted_until', String(expireTime));
    } catch {}
    setShowMuteMenu(false);
    setIsVisible(false);
  };

  const handleMutePermanently = () => {
    try {
      localStorage.setItem('diskai_notifications_muted_until', String(Date.now() + 365 * 24 * 3600 * 1000));
      localStorage.setItem('diskai_unread_popup_enabled', 'false');
    } catch {}
    setShowMuteMenu(false);
    setIsVisible(false);
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isBouncing ? 'animate-jump3' : ''
      }`}
    >
      <div className="bg-[#2b2d31] border-2 border-[#5865F2] rounded-2xl shadow-2xl p-4 w-80 text-[#dbdee1] flex flex-col gap-3 backdrop-blur-md relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-md relative">
              <MessageSquare className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#f23f43] rounded-full ring-2 ring-[#2b2d31] animate-ping" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Mensagens Não Lidas
                <span className="bg-[#f23f43] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {countDisplay}
                </span>
              </div>
              <div className="text-[10px] text-[#949ba4]">Alerta a cada 30s • 3 Pulos</div>
            </div>
          </div>

          {/* Menu de Três Pontos (...) e Botão Fechar (X) */}
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowMuteMenu(prev => !prev)}
              className={`p-1 rounded-lg transition-colors ${
                showMuteMenu ? 'bg-[#5865F2] text-white' : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'
              }`}
              title="Opções de silenciamento"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
              title="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Dropdown Menu de Silenciamento de Notificações */}
            {showMuteMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#1e1f22] border border-[#3e4047] rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#949ba4] uppercase tracking-wider border-b border-white/5 flex items-center justify-between">
                  <span>Silenciar Alertas</span>
                  <BellOff className="w-3 h-3 text-[#f23f43]" />
                </div>
                <div className="py-1 space-y-0.5">
                  <button
                    onClick={() => handleMute(30 * 60 * 1000)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#35373c] text-white flex items-center justify-between transition-colors"
                  >
                    <span>Silenciar por 30 minutos</span>
                    <Clock className="w-3 h-3 text-[#949ba4]" />
                  </button>
                  <button
                    onClick={() => handleMute(60 * 60 * 1000)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#35373c] text-white flex items-center justify-between transition-colors"
                  >
                    <span>Silenciar por 1 hora</span>
                    <Clock className="w-3 h-3 text-[#949ba4]" />
                  </button>
                  <button
                    onClick={() => handleMute(24 * 60 * 60 * 1000)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#35373c] text-white flex items-center justify-between transition-colors"
                  >
                    <span>Silenciar por 24 horas</span>
                    <Clock className="w-3 h-3 text-[#949ba4]" />
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={handleMutePermanently}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 flex items-center justify-between transition-colors font-semibold"
                  >
                    <span>Desativar permanentemente</span>
                    <BellOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {primaryUnreadFriend ? (
          <div className="flex items-center gap-2.5 bg-[#1e1f22] p-2.5 rounded-xl border border-[#3e4047]">
            <img
              src={primaryUnreadFriend.user.avatar}
              alt={primaryUnreadFriend.user.name}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {primaryUnreadFriend.user.name}
              </div>
              <div className="text-[11px] text-[#949ba4] truncate">
                {primaryUnreadFriend.lastMessage || 'Enviou uma nova mensagem para você'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#dbdee1] bg-[#1e1f22] p-2 rounded-lg">
            Você possui mensagens novas não visualizadas no Diskai.
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleOpenMessage}
          className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow"
        >
          <span>Visualizar Mensagens</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
