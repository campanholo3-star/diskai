import React from 'react';
import { Pin, X, MessageSquare } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';

interface PinnedMessagesProps {
  onClose: () => void;
}

export const PinnedMessagesModal: React.FC<PinnedMessagesProps> = ({ onClose }) => {
  const { pinnedMessages, unpinMessage, activeChannel, mainView, activeDmUserId } = useDiskai();

  const channelKey = mainView === 'direct' ? (activeDmUserId || 'dm') : activeChannel.id;
  const currentPinned = pinnedMessages[channelKey] || [];

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="w-80 md:w-96 bg-[#2b2d31] border border-[#3e4047] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#dbdee1] select-none z-50 animate-in fade-in duration-150"
    >
      <div className="p-3.5 bg-[#232428] border-b border-[#1f2023] flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Pin className="w-4 h-4 text-[#f0b232] fill-[#f0b232]" />
          <span>Mensagens Fixadas</span>
          <span className="text-xs text-[#949ba4]">({currentPinned.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:text-white text-[#949ba4] rounded hover:bg-[#35373c] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto no-scrollbar p-3 space-y-2">
        {currentPinned.length === 0 ? (
          <div className="py-8 text-center text-[#949ba4] text-xs space-y-1">
            <Pin className="w-6 h-6 mx-auto text-[#949ba4]/40" />
            <p>Nenhuma mensagem fixada nesta conversa.</p>
            <p className="text-[11px] text-[#949ba4]/60">Passe o mouse sobre uma mensagem e clique no ícone de alfinete para fixá-la.</p>
          </div>
        ) : (
          currentPinned.map(msg => (
            <div
              key={msg.id}
              className="p-3 bg-[#313338] rounded-xl border border-[#3e4047] space-y-1.5 group hover:border-[#5865F2]/50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-[#949ba4]">
                <div className="flex items-center gap-1.5">
                  <Pin className="w-3 h-3 text-[#f0b232] fill-[#f0b232]" />
                  <span className="font-bold text-white">{msg.authorName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">{msg.timestamp}</span>
                  <button
                    onClick={() => unpinMessage(channelKey, msg.id)}
                    title="Desfixar Mensagem"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#f23f43]/20 text-[#949ba4] hover:text-[#f23f43] transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#dbdee1] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
