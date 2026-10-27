import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Search,
  Check,
  Link,
  Copy,
  Users,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { Channel } from '../../types';

interface ChannelInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
}

export const ChannelInviteModal: React.FC<ChannelInviteModalProps> = ({
  isOpen,
  onClose,
  channel
}) => {
  const {
    activeServer,
    friends,
    participants,
    currentUser,
    addServerMembers,
    updateChannel
  } = useDiskai();

  const [search, setSearch] = useState('');
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  if (!isOpen || !channel) return null;

  const isPlatformAdmin =
    currentUser.role === 'Administrador' ||
    currentUser.role === 'admin' ||
    currentUser.id === 'admin-campanholo32' ||
    currentUser.email === 'campanholo32@gmail.com';

  const canInviteToChannel = !channel.isPrivate || isPlatformAdmin || channel.creatorId === currentUser.id;

  const allCandidates = [
    ...friends.map(f => f.user),
    ...participants.map(p => ({
      id: p.id,
      name: p.name,
      tag: p.tag,
      avatar: p.avatar,
      role: p.role,
      status: p.status
    }))
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i && v.id !== currentUser.id);

  const filtered = allCandidates.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.tag.includes(q);
  });

  const handleInvite = (userId: string) => {
    if (!canInviteToChannel) return;

    // 1. Add to server members
    addServerMembers(activeServer.id, [userId]);

    // 2. If private channel, ensure they have access in allowedMemberIds (allowed only to admin or creator)
    if (channel.isPrivate) {
      const currentAllowed = channel.allowedMemberIds || [currentUser.id];
      if (!currentAllowed.includes(userId)) {
        updateChannel(activeServer.id, channel.id, {
          allowedMemberIds: [...currentAllowed, userId]
        });
      }
    }

    setInvitedMap(prev => ({ ...prev, [userId]: true }));
  };

  const inviteLink = `https://diskai.app/channels/${activeServer.id}/${channel.id}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Convidar amigos para #{channel.name}
              </h2>
              <p className="text-[11px] text-[#949ba4]">
                Servidor: {activeServer.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-[#1f2023]">
          {!canInviteToChannel && (
            <div className="mb-3 p-3 rounded-xl bg-[#f23f43]/15 border border-[#f23f43]/30 text-[#f23f43] text-xs font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>A inclusão de usuários neste canal privado é permitida somente ao Administrador do Sistema ou ao Criador do Canal.</span>
            </div>
          )}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar amigos por nome ou tag..."
              className="w-full bg-[#1e1f22] text-xs text-white px-3 py-2 rounded-xl border border-[#3e4047] focus:outline-none focus:border-[#5865F2] pr-8"
            />
            <Search className="w-3.5 h-3.5 text-[#949ba4] absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Member List */}
        <div className="p-4 max-h-64 overflow-y-auto space-y-2 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#949ba4]">
              Nenhum amigo encontrado para o termo.
            </div>
          ) : (
            filtered.map(member => {
              const isInvited = invitedMap[member.id];
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#2b2d31] hover:bg-[#35373c]/50 transition-colors border border-[#3e4047]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{member.name}</div>
                      <div className="text-[10px] text-[#949ba4]">#{member.tag}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInvite(member.id)}
                    disabled={isInvited}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow ${
                      isInvited
                        ? 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/40 cursor-default'
                        : 'bg-[#5865F2] hover:bg-[#4752c4] text-white active:scale-95'
                    }`}
                  >
                    {isInvited ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" /> Convidado
                      </span>
                    ) : (
                      'Convidar'
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Shareable Link Box */}
        <div className="p-4 bg-[#2b2d31] border-t border-[#1f2023] space-y-2">
          <label className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider">
            Ou envie um link de convite do canal
          </label>
          <div className="flex items-center gap-2 bg-[#1e1f22] p-2 rounded-xl border border-[#3e4047]">
            <span className="text-xs text-[#dbdee1] font-mono truncate flex-1 pl-1">
              {inviteLink}
            </span>
            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow ${
                copied
                  ? 'bg-[#23a55a] text-white'
                  : 'bg-[#5865F2] hover:bg-[#4752c4] text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
