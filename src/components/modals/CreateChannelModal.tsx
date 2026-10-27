import React, { useState } from 'react';
import {
  X,
  Hash,
  Volume2,
  MessagesSquare,
  Lock,
  Smile,
  Check,
  Users,
  ShieldAlert
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { ChannelType, Channel } from '../../types';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: { id: string; name: string } | null;
}

const POPULAR_EMOJIS = ['💬', '🚀', '📢', '🎙️', '🎉', '🎮', '💡', '🤖', '🔥', '📌', '🧠', '🛡️', '⚡', '☕', '📈'];

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  category
}) => {
  const {
    activeServer,
    addChannel,
    participants,
    friends,
    currentUser
  } = useDiskai();

  const [channelType, setChannelType] = useState<ChannelType>(() => {
    if (category?.name.toLowerCase().includes('voz')) {
      return 'voice';
    }
    return 'text';
  });

  const [channelName, setChannelName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  if (!isOpen) return null;

  const targetCategoryName = category?.name || (channelType === 'voice' ? 'CANAIS DE VOZ' : 'CANAIS DE TEXTO');
  const targetCategoryId = category?.id || (channelType === 'voice' ? `cat-${activeServer.id}-voice` : `cat-${activeServer.id}-text`);

  // Candidate members to select when channel is private
  const allCandidates = [
    ...friends.map(f => f.user),
    ...participants.map(p => ({
      id: p.id,
      name: p.name,
      tag: p.tag,
      avatar: p.avatar,
      role: p.role
    }))
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i && v.id !== currentUser.id);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = channelName.trim();
    if (!cleanName) return;

    // Slug format for text/forum channels, standard for voice
    const formattedName = channelType === 'voice'
      ? cleanName
      : cleanName.toLowerCase().replace(/\s+/g, '-');

    addChannel(
      activeServer.id,
      targetCategoryId,
      formattedName,
      channelType,
      isPrivate,
      isPrivate ? selectedMembers : undefined
    );

    // Reset and close
    setChannelName('');
    setIsPrivate(false);
    setSelectedMembers([currentUser.id]);
    onClose();
  };

  const handleInsertEmoji = (emoji: string) => {
    setChannelName(prev => prev + emoji);
    setEmojiPickerOpen(false);
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1]">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Criar canal</h2>
            <p className="text-xs text-[#949ba4] font-medium mt-0.5">
              em {targetCategoryName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* 1. Tipo de Canal (Radio Options) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
              Tipo de canal
            </label>
            <div className="space-y-2">
              {/* Option: Texto */}
              <label
                onClick={() => setChannelType('text')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  channelType === 'text'
                    ? 'bg-[#383a40] border-[#5865F2] shadow-sm'
                    : 'bg-[#2b2d31] border-[#3e4047] hover:bg-[#35373c]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-[#949ba4]" />
                  <div>
                    <div className="text-sm font-semibold text-white">Texto</div>
                    <div className="text-xs text-[#949ba4]">
                      Envie mensagens, imagens, GIFs, emojis, opiniões e piadas
                    </div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    channelType === 'text'
                      ? 'border-[#5865F2] bg-[#5865F2]'
                      : 'border-[#949ba4]'
                  }`}
                >
                  {channelType === 'text' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>

              {/* Option: Voz */}
              <label
                onClick={() => setChannelType('voice')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  channelType === 'voice'
                    ? 'bg-[#383a40] border-[#5865F2] shadow-sm'
                    : 'bg-[#2b2d31] border-[#3e4047] hover:bg-[#35373c]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[#949ba4]" />
                  <div>
                    <div className="text-sm font-semibold text-white">Voz</div>
                    <div className="text-xs text-[#949ba4]">
                      Passe tempo com a turma com voz, vídeo e compartilhamento de tela
                    </div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    channelType === 'voice'
                      ? 'border-[#5865F2] bg-[#5865F2]'
                      : 'border-[#949ba4]'
                  }`}
                >
                  {channelType === 'voice' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>

              {/* Option: Fórum */}
              <label
                onClick={() => setChannelType('forum')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  channelType === 'forum'
                    ? 'bg-[#383a40] border-[#5865F2] shadow-sm'
                    : 'bg-[#2b2d31] border-[#3e4047] hover:bg-[#35373c]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessagesSquare className="w-5 h-5 text-[#949ba4]" />
                  <div>
                    <div className="text-sm font-semibold text-white">Fórum</div>
                    <div className="text-xs text-[#949ba4]">
                      Crie um espaço para discussões organizadas
                    </div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    channelType === 'forum'
                      ? 'border-[#5865F2] bg-[#5865F2]'
                      : 'border-[#949ba4]'
                  }`}
                >
                  {channelType === 'forum' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>
            </div>
          </div>

          {/* 2. Nome do Canal */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
              Nome do canal
            </label>
            <div className="flex items-center bg-[#1e1f22] border border-[#3e4047] rounded-xl px-3 py-2.5 focus-within:border-[#5865F2] transition-colors">
              <span className="text-[#949ba4] mr-2 flex items-center">
                {channelType === 'voice' ? (
                  <Volume2 className="w-4 h-4" />
                ) : channelType === 'forum' ? (
                  <MessagesSquare className="w-4 h-4" />
                ) : (
                  <Hash className="w-4 h-4" />
                )}
              </span>
              <input
                type="text"
                required
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                placeholder="novo-canal"
                className="w-full bg-transparent text-sm text-white placeholder-[#80848e] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setEmojiPickerOpen(prev => !prev)}
                title="Inserir emoji no nome"
                className="text-[#949ba4] hover:text-white p-1 rounded hover:bg-[#35373c] transition-colors ml-1"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Emoji Picker Popover */}
            {emojiPickerOpen && (
              <div className="absolute right-0 top-16 bg-[#2b2d31] border border-[#3e4047] rounded-xl shadow-2xl p-2.5 z-20 grid grid-cols-5 gap-1.5 animate-in fade-in zoom-in-95">
                {POPULAR_EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleInsertEmoji(em)}
                    className="w-8 h-8 rounded hover:bg-[#35373c] flex items-center justify-center text-lg transition-transform hover:scale-125"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Canal Privado Switch */}
          <div className="bg-[#2b2d31] border border-[#3e4047] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#949ba4]" />
                <div>
                  <div className="text-sm font-semibold text-white">Canal privado</div>
                  <div className="text-xs text-[#949ba4] leading-relaxed">
                    Somente membros e cargos selecionados poderão visualizar esse canal.
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsPrivate(prev => !prev)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
                  isPrivate ? 'bg-[#5865F2]' : 'bg-[#4e5058]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isPrivate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Members Selector when Private is checked */}
            {isPrivate && (
              <div className="pt-2 border-t border-[#3e4047] space-y-2 animate-in fade-in duration-150">
                <div className="text-xs font-bold text-[#dbdee1] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>Selecionar participantes autorizados ({selectedMembers.length}):</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#1e1f22]/60 text-xs">
                    <div className="flex items-center gap-2">
                      <img src={currentUser.avatar} alt="You" className="w-5 h-5 rounded-full object-cover" />
                      <span className="font-semibold text-white">{currentUser.name} (Você / Dono)</span>
                    </div>
                    <span className="text-[10px] text-[#23a55a] font-bold">Acesso Total</span>
                  </div>

                  {allCandidates.map(cand => {
                    const isChecked = selectedMembers.includes(cand.id);
                    return (
                      <div
                        key={cand.id}
                        onClick={() => toggleMemberSelection(cand.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#5865F2]/20 border border-[#5865F2]/40' : 'bg-[#1e1f22] hover:bg-[#35373c]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={cand.avatar} alt={cand.name} className="w-5 h-5 rounded-full object-cover" />
                          <span className="font-medium text-white truncate">{cand.name}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked ? 'bg-[#5865F2] border-[#5865F2]' : 'border-[#4e5058]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white hover:underline transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!channelName.trim()}
              className="px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.98] text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none"
            >
              Criar canal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
