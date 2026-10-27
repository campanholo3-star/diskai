import React, { useState } from 'react';
import { useDiskai } from '../../context/DiskaiContext';
import { User } from '../../types';
import { Bot, Shield, UserPlus, UserMinus, AlertTriangle } from 'lucide-react';
import { UserProfilePopover } from './UserProfilePopover';

export const MemberList: React.FC = () => {
  const {
    activeServer,
    membersListOpen,
    currentUser,
    removeServerMember,
    setServerManagementModalOpen,
    setServerManagementTab,
    theme
  } = useDiskai();

  const [confirmRemoveUser, setConfirmRemoveUser] = useState<User | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<{ user: User; rect: DOMRect } | null>(null);

  if (!membersListOpen) return null;

  // Deduplicate members strictly by unique ID
  const rawMembers = activeServer.members || [];
  const uniqueMap = new Map<string, User>();
  rawMembers.forEach(m => {
    if (!m || !m.id) return;
    const resolved =
      m.id === currentUser.id || m.id === 'user-me' || m.id === 'admin-campanholo32'
        ? currentUser
        : m;
    if (!uniqueMap.has(resolved.id)) {
      uniqueMap.set(resolved.id, resolved);
    }
  });

  const members = Array.from(uniqueMap.values());
  const admins = members.filter(m => m.role === 'Administrador');
  const bots = members.filter(m => m.isBot);
  const onlineMembers = members.filter(m => !m.isBot && m.role !== 'Administrador' && m.status !== 'offline');
  const offlineMembers = members.filter(m => m.status === 'offline');

  const renderMember = (user: User) => {
    const canRemove =
      currentUser.role === 'Administrador' &&
      !user.isBot &&
      user.id !== currentUser.id &&
      user.id !== 'admin-campanholo32';

    const isSelected = selectedUserForProfile?.user.id === user.id;

    return (
      <div
        key={user.id}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setSelectedUserForProfile({ user, rect });
        }}
        className={`flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer group transition-colors ${
          theme === 'light'
            ? isSelected
              ? 'bg-slate-200 border border-black shadow-sm'
              : 'hover:bg-slate-200/80'
            : isSelected
            ? 'bg-[#35373c]'
            : 'hover:bg-[#35373c]/60'
        }`}
      >
        <div className="relative flex-shrink-0">
          <img
            src={user.avatar}
            alt={user.name}
            className={`w-8 h-8 rounded-full object-cover ${theme === 'light' ? 'border border-black/20' : ''}`}
          />
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ${
              theme === 'light' ? 'ring-white' : 'ring-[#2b2d31]'
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
        <div className="truncate flex-1 min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span
              className={`text-sm font-semibold truncate ${
                user.role === 'Administrador'
                  ? theme === 'light' ? 'text-amber-800 font-bold' : 'text-[#f0b232]'
                  : user.isBot
                  ? theme === 'light' ? 'text-indigo-700 font-bold' : 'text-[#5865F2]'
                  : theme === 'light'
                  ? 'text-black group-hover:text-black font-semibold'
                  : 'text-[#dbdee1] group-hover:text-white'
              }`}
            >
              {user.name}
            </span>
            {user.role === 'Administrador' && (
              <Shield className={`w-3.5 h-3.5 flex-shrink-0 ${theme === 'light' ? 'text-amber-700' : 'text-[#f0b232]'}`} />
            )}
            {user.isBot && (
              <span className={`bg-[#5865F2] text-white text-[9px] font-bold px-1 py-0.2 rounded uppercase flex items-center gap-0.5 ${theme === 'light' ? 'border border-black' : ''}`}>
                <Bot className="w-2.5 h-2.5" /> BOT
              </span>
            )}
          </div>
          {user.customStatus && (
            <div className={`text-[11px] truncate leading-tight mt-0.5 ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-[#949ba4]'}`}>
              {user.customStatus}
            </div>
          )}
        </div>

        {canRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmRemoveUser(user);
            }}
            title={`Remover ${user.name} do servidor`}
            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all flex-shrink-0 hover:scale-110 active:scale-95 ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 border border-black/20 hover:border-rose-400'
                : 'bg-white/[0.04] hover:bg-rose-500/15 text-[#949ba4] hover:text-rose-400 border border-transparent hover:border-rose-500/30 hover:shadow-[0_0_10px_rgba(244,63,94,0.3)]'
            }`}
          >
            <UserMinus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`w-60 hidden lg:flex flex-col h-full select-none flex-shrink-0 border-l p-4 space-y-4 overflow-y-auto no-scrollbar transition-colors ${
        theme === 'light'
          ? 'bg-white border-black/20 text-black'
          : 'bg-[#2b2d31] border-[#3e4047] text-[#dbdee1] shadow-sm'
      }`}>
        {/* Quick Invite Button */}
        <button
          onClick={() => {
            setServerManagementTab('members');
            setServerManagementModalOpen(true);
          }}
          className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all backdrop-blur-md hover:scale-[1.02] active:scale-95 ${
            theme === 'light'
              ? 'bg-white hover:bg-slate-50 text-black border-2 border-black shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              : 'bg-gradient-to-r from-indigo-500/10 via-[#5865F2]/15 to-purple-500/10 hover:from-indigo-600 hover:to-[#5865F2] text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Convidar Pessoas</span>
        </button>

        {/* Admins */}
        {admins.length > 0 && (
          <div className="space-y-1">
            <div className={`text-[11px] font-bold tracking-wider uppercase px-2 ${
              theme === 'light' ? 'text-black' : 'text-[#949ba4]'
            }`}>
              Administradores — {admins.length}
            </div>
            {admins.map(renderMember)}
          </div>
        )}

        {/* AI Bots */}
        {bots.length > 0 && (
          <div className="space-y-1">
            <div className={`text-[11px] font-bold tracking-wider uppercase px-2 flex items-center gap-1 ${
              theme === 'light' ? 'text-black' : 'text-[#949ba4]'
            }`}>
              Diskai IA & Bots — {bots.length}
            </div>
            {bots.map(renderMember)}
          </div>
        )}

        {/* Online */}
        {onlineMembers.length > 0 && (
          <div className="space-y-1">
            <div className={`text-[11px] font-bold tracking-wider uppercase px-2 ${
              theme === 'light' ? 'text-black' : 'text-[#949ba4]'
            }`}>
              Disponíveis — {onlineMembers.length}
            </div>
            {onlineMembers.map(renderMember)}
          </div>
        )}

        {/* Offline */}
        {offlineMembers.length > 0 && (
          <div className="space-y-1">
            <div className={`text-[11px] font-bold tracking-wider uppercase px-2 ${
              theme === 'light' ? 'text-black' : 'text-[#949ba4]'
            }`}>
              Offline — {offlineMembers.length}
            </div>
            {offlineMembers.map(renderMember)}
          </div>
        )}
      </div>

      {/* Confirmation Modal to avoid accidental member removal */}
      {confirmRemoveUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl transition-colors ${
            theme === 'light'
              ? 'bg-white border-2 border-black text-black'
              : 'bg-[#2b2d31] border border-[#f23f43]/40 text-[#dbdee1]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                theme === 'light'
                  ? 'bg-rose-100 border-2 border-black text-rose-700'
                  : 'bg-[#f23f43]/20 border border-[#f23f43]/30 text-[#f23f43]'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>Remover do Servidor?</h3>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>Deseja excluir este membro?</p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl flex items-center gap-3 ${
              theme === 'light'
                ? 'bg-slate-100 border-2 border-black text-black'
                : 'bg-[#1e1f22] border border-[#3e4047]'
            }`}>
              <img
                src={confirmRemoveUser.avatar}
                alt={confirmRemoveUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="truncate">
                <div className={`text-xs font-bold truncate ${theme === 'light' ? 'text-black' : 'text-white'}`}>{confirmRemoveUser.name}</div>
                <div className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>#{confirmRemoveUser.tag}</div>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-800' : 'text-[#dbdee1]'}`}>
              Deseja remover <strong>{confirmRemoveUser.name}</strong> do servidor <strong>{activeServer.name}</strong>?
            </p>

            <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
              theme === 'light' ? 'border-black/20' : 'border-[#3e4047]'
            }`}>
              <button
                type="button"
                onClick={() => setConfirmRemoveUser(null)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-black border-black/30'
                    : 'bg-[#1e1f22] hover:bg-[#35373c] text-white border-[#3e4047]'
                }`}
              >
                Não, Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removeServerMember(activeServer.id, confirmRemoveUser.id);
                  setConfirmRemoveUser(null);
                }}
                className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow ${
                  theme === 'light'
                    ? 'bg-rose-600 hover:bg-rose-700 border-2 border-black'
                    : 'bg-[#f23f43] hover:bg-[#da373c]'
                }`}
              >
                <UserMinus className="w-3.5 h-3.5" />
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
      {/* User Profile Popover Modal / Card */}
      {selectedUserForProfile && (
        <UserProfilePopover
          user={selectedUserForProfile.user}
          anchorRect={selectedUserForProfile.rect}
          onClose={() => setSelectedUserForProfile(null)}
        />
      )}
    </>
  );
};
