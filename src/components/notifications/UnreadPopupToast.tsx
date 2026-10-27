import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, X, ArrowRight, Volume2 } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { soundFx } from '../../utils/soundEffects';

export const UnreadPopupToast: React.FC = () => {
  const {
    friends,
    setActiveDmUserId,
    setMainView,
    totalUnreadCount,
    unreadPopupEnabled
  } = useDiskai();
  const [isVisible, setIsVisible] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  // Find friends with unread messages
  const unreadFriends = friends.filter(f => (f.unreadCount || 0) > 0);
  const primaryUnreadFriend = unreadFriends[0] || (friends.length > 0 ? friends[0] : null);

  useEffect(() => {
    if (!unreadPopupEnabled) {
      setIsVisible(false);
      return;
    }

    // Show toast if there are unread messages, or simulate every 30 seconds
    const interval = setInterval(() => {
      if (!unreadPopupEnabled) return;
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
      if (!unreadPopupEnabled) return;
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

  if (!unreadPopupEnabled || !isVisible || (totalUnreadCount === 0 && unreadFriends.length === 0)) return null;

  const countDisplay = totalUnreadCount > 0 ? totalUnreadCount : unreadFriends.length;

  const handleOpenMessage = () => {
    if (primaryUnreadFriend) {
      setMainView('direct');
      setActiveDmUserId(primaryUnreadFriend.id);
    }
    setIsVisible(false);
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isBouncing ? 'animate-jump3' : ''
      }`}
    >
      <div className="bg-[#2b2d31] border-2 border-[#5865F2] rounded-2xl shadow-2xl p-4 w-80 text-[#dbdee1] flex flex-col gap-3 backdrop-blur-md">
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
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
            title="Dispensar aviso"
          >
            <X className="w-4 h-4" />
          </button>
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
