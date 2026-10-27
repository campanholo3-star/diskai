import React, { useState } from 'react';
import { UserPlus, UserMinus, X, Users, Check, Search, Shield } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';

interface GroupMembersModalProps {
  onClose: () => void;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({ onClose }) => {
  const { friends, activeServer, mainView, activeDmUserId, createGroupDm, addFriend, removeFriend, addServerMembers } = useDiskai();
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');

  const isServerContext = mainView === 'server' || !!activeServer;

  const eligibleFriends = friends.filter(f => f.relationshipStatus === 'friend');
  const filteredFriends = eligibleFriends.filter(f =>
    f.user.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedFriendIds(prev => [...prev, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFriendIds.length === 0) return;
    if (isServerContext && activeServer) {
      addServerMembers(activeServer.id, selectedFriendIds);
    } else {
      createGroupDm(groupName || 'Novo Grupo Diskai', selectedFriendIds);
    }
    onClose();
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#dbdee1]">
        {/* Header */}
        <div className="p-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Users className="w-5 h-5 text-[#5865F2]" />
            <span>{isServerContext ? `Adicionar Pessoas ao Servidor` : 'Gerenciar Membros & Grupos'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isServerContext && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Nome do Grupo (Opcional)
              </label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Ex: Squad de Desenvolvimento"
                className="w-full bg-[#1e1f22] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider flex items-center justify-between">
              <span>Selecione Amigos para Adicionar ao Grupo</span>
              <span className="text-[11px] text-[#5865F2]">{selectedFriendIds.length} selecionados</span>
            </label>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filtrar amigos..."
                className="w-full bg-[#1e1f22] text-xs text-white px-3 py-2 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
              />
            </div>

            {/* Friends Selector List */}
            <div className="max-h-52 overflow-y-auto no-scrollbar space-y-1.5 pt-1">
              {filteredFriends.map(friend => {
                const isSelected = selectedFriendIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleSelectFriend(friend.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                        : 'bg-[#2b2d31] hover:bg-[#35373c] border-transparent text-[#dbdee1]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={friend.user.avatar}
                        alt={friend.user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{friend.user.name}</div>
                        <div className="text-[10px] text-[#949ba4]">#{friend.user.tag}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#5865F2] border-[#5865F2] text-white'
                            : 'border-[#4e5058] bg-[#1e1f22]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      {/* Excluir / Remover amigo direto */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          removeFriend(friend.id);
                        }}
                        title="Remover Amigo"
                        className="p-1 hover:text-[#f23f43] text-[#949ba4] rounded hover:bg-[#1e1f22] transition-colors"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f2023] -mx-5 -mb-5 p-4 bg-[#2b2d31]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#dbdee1] hover:underline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={selectedFriendIds.length === 0}
              className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow"
            >
              <UserPlus className="w-4 h-4" /> {isServerContext ? `Adicionar ao Servidor (${selectedFriendIds.length})` : `Criar Grupo (${selectedFriendIds.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
