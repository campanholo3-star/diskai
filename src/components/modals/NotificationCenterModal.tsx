import React from 'react';
import { Bell, Check, Trash2, X, Sparkles, UserPlus, MessageSquare } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';

interface NotificationCenterProps {
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const {
    notifications,
    markAllNotificationsRead,
    clearNotification,
    openSummaryModal,
    summaries,
    acceptFriendRequest,
    removeFriend,
    friends,
    theme
  } = useDiskai();

  const [actionFeedback, setActionFeedback] = React.useState<Record<string, { status: 'accepted' | 'rejected'; text: string }>>({});

  const handleAcceptFriend = (notif: any) => {
    const friendMatch = friends.find(f =>
      f.user.name.toLowerCase().includes('gabriel') ||
      notif.message.toLowerCase().includes(f.user.name.toLowerCase())
    );
    const targetId = friendMatch?.id || 'friend-gabriel';
    acceptFriendRequest(targetId);
    setActionFeedback(prev => ({
      ...prev,
      [notif.id]: { status: 'accepted', text: 'Pedido aceito! Agora vocês são amigos.' }
    }));
    setTimeout(() => {
      clearNotification(notif.id);
    }, 2200);
  };

  const handleDeclineFriend = (notif: any) => {
    const friendMatch = friends.find(f =>
      f.user.name.toLowerCase().includes('gabriel') ||
      notif.message.toLowerCase().includes(f.user.name.toLowerCase())
    );
    const targetId = friendMatch?.id || 'friend-gabriel';
    removeFriend(targetId);
    setActionFeedback(prev => ({
      ...prev,
      [notif.id]: { status: 'rejected', text: 'Pedido de amizade recusado.' }
    }));
    setTimeout(() => {
      clearNotification(notif.id);
    }, 1800);
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className={`w-80 md:w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col select-none z-50 animate-in fade-in duration-150 transition-colors ${
        theme === 'light'
          ? 'bg-white text-black border-2 border-black shadow-[0_12px_36px_rgba(0,0,0,0.18)]'
          : 'bg-[#2b2d31] border border-[#3e4047] text-[#dbdee1]'
      }`}
    >
      {/* Header */}
      <div className={`p-3.5 border-b flex items-center justify-between ${
        theme === 'light' ? 'bg-slate-50 border-black/20 text-black' : 'bg-[#232428] border-[#1f2023] text-white'
      }`}>
        <div className="flex items-center gap-2 font-bold text-sm">
          <Bell className="w-4 h-4 text-[#5865F2]" />
          <span>Notificações</span>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="bg-[#f23f43] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={markAllNotificationsRead}
            title="Marcar todas como lidas"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              theme === 'light'
                ? 'hover:bg-slate-200 text-slate-700 hover:text-black border border-black/20'
                : 'hover:text-white text-[#949ba4] hover:bg-[#35373c]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lidas</span>
          </button>
          {notifications.length > 0 && (
            <button
              onClick={() => {
                notifications.forEach(n => clearNotification(n.id));
              }}
              title="Limpar e concluir todas as notificações"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                theme === 'light'
                  ? 'hover:bg-rose-100 text-rose-700 border border-black/20'
                  : 'hover:text-rose-400 text-[#949ba4] hover:bg-rose-500/10'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'light'
                ? 'hover:bg-slate-200 text-black'
                : 'hover:text-white text-[#949ba4] hover:bg-[#35373c]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto no-scrollbar p-2 space-y-1.5">
        {notifications.length === 0 ? (
          <div className={`py-8 text-center text-xs ${theme === 'light' ? 'text-slate-500' : 'text-[#949ba4]'}`}>
            Nenhuma notificação nova no momento.
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-3 rounded-xl border transition-all flex items-start gap-3 relative group ${
                theme === 'light'
                  ? notif.read
                    ? 'bg-slate-50 border-black/10 text-slate-600'
                    : 'bg-white border-2 border-black text-black shadow-sm'
                  : notif.read
                  ? 'bg-[#313338]/50 border-transparent text-[#949ba4]'
                  : 'bg-[#313338] border-[#5865F2]/40 text-white'
              }`}
            >
              {/* Type Icon */}
              <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2] flex-shrink-0 mt-0.5">
                {notif.type === 'meeting' ? (
                  <Sparkles className="w-4 h-4" />
                ) : notif.type === 'friend' ? (
                  <UserPlus className="w-4 h-4" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold truncate ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                    {notif.title}
                  </span>
                  <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-[#949ba4]'}`}>
                    {notif.time}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 leading-snug ${theme === 'light' ? 'text-slate-700' : 'text-[#dbdee1]'}`}>
                  {notif.message}
                </p>

                {notif.summaryId && (
                  <button
                    onClick={() => {
                      const sum = summaries.find(s => s.id === notif.summaryId);
                      if (sum) openSummaryModal(sum);
                      clearNotification(notif.id); // Conclui automaticamente e libera espaço
                      onClose();
                    }}
                    className="mt-2 text-[11px] font-bold text-[#5865F2] hover:underline flex items-center gap-1"
                  >
                    Ver Resumo da Reunião →
                  </button>
                )}

                {/* Friend Request Action Buttons: Aceitar / Recusar */}
                {(notif.type === 'friend' || notif.title.toLowerCase().includes('amizade')) && (
                  <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center gap-2">
                    {actionFeedback[notif.id] ? (
                      <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                        actionFeedback[notif.id].status === 'accepted' ? 'text-[#23a55a]' : 'text-slate-500'
                      }`}>
                        {actionFeedback[notif.id].status === 'accepted' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {actionFeedback[notif.id].text}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAcceptFriend(notif)}
                          className="bg-[#23a55a] hover:bg-[#1f9350] active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aceitar</span>
                        </button>
                        <button
                          onClick={() => handleDeclineFriend(notif)}
                          className={`active:scale-95 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                            theme === 'light'
                              ? 'bg-slate-100 hover:bg-slate-200 text-black border border-black/20'
                              : 'bg-[#35373c] hover:bg-[#3e4047] hover:text-[#f23f43] text-[#dbdee1]'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Recusar</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Conclude & dismiss button */}
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(notif.id);
                  }}
                  className="p-1 text-slate-400 hover:text-[#23a55a] hover:bg-[#23a55a]/10 rounded transition-all"
                  title="Concluir e fechar notificação"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(notif.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all"
                  title="Excluir notificação"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
