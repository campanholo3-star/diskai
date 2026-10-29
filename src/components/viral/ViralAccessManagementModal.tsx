import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  Check,
  UserCheck,
  UserX,
  Lock,
  Sparkles,
  Users
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import {
  getAuthorizedUserIds,
  saveAuthorizedUserIds,
  isPlatformAdmin
} from '../../services/viralTrendsService';

interface ViralAccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  onAccessUpdated: () => void;
}

export const ViralAccessManagementModal: React.FC<ViralAccessManagementModalProps> = ({
  isOpen,
  onClose,
  isLight,
  onAccessUpdated
}) => {
  const { currentUser, participants, friends } = useDiskai();
  const [searchTerm, setSearchTerm] = useState('');
  const [authorizedIds, setAuthorizedIds] = useState<string[]>(() => getAuthorizedUserIds());
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  if (!isOpen) return null;

  // Unifica todos os usuários da plataforma (participantes, amigos e usuário atual)
  const allUsersMap = new Map<string, { id: string; name: string; tag: string; avatar: string; role?: string; email?: string }>();

  if (currentUser && currentUser.id) {
    allUsersMap.set(currentUser.id, {
      id: currentUser.id,
      name: currentUser.name,
      tag: currentUser.tag,
      avatar: currentUser.avatar,
      role: currentUser.role || 'Administrador',
      email: currentUser.email
    });
  }

  (participants || []).forEach(p => {
    if (p && p.id && !allUsersMap.has(p.id)) {
      allUsersMap.set(p.id, {
        id: p.id,
        name: p.name,
        tag: p.tag,
        avatar: p.avatar,
        role: p.role || 'Membro',
        email: p.email
      });
    }
  });

  (friends || []).forEach(f => {
    if (f && f.user && f.user.id && !allUsersMap.has(f.user.id)) {
      allUsersMap.set(f.user.id, {
        id: f.user.id,
        name: f.user.name,
        tag: f.user.tag,
        avatar: f.user.avatar,
        role: f.user.role || 'Amigo',
        email: f.user.email
      });
    }
  });

  const allUsers = Array.from(allUsersMap.values());

  const filteredUsers = allUsers.filter(u => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.tag.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const toggleUserAccess = (userId: string, email?: string) => {
    // Admin não pode ser removido
    if (userId === 'admin-campanholo32' || email === 'campanholo32@gmail.com') return;

    let updated: string[];
    const isCurrentlyAuth =
      authorizedIds.includes(userId) || (email && authorizedIds.includes(email));

    if (isCurrentlyAuth) {
      updated = authorizedIds.filter(id => id !== userId && id !== email);
    } else {
      updated = [...authorizedIds, userId];
      if (email) updated.push(email);
    }

    setAuthorizedIds(updated);
    saveAuthorizedUserIds(updated);
    onAccessUpdated();

    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2000);
  };

  const handleGrantAll = () => {
    const allIds = allUsers.map(u => u.id);
    const emails = allUsers.map(u => u.email).filter(Boolean) as string[];
    const combined = Array.from(new Set([...authorizedIds, ...allIds, ...emails]));
    setAuthorizedIds(combined);
    saveAuthorizedUserIds(combined);
    onAccessUpdated();
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border transition-colors ${
          isLight
            ? 'bg-white border-slate-300 text-slate-800'
            : 'bg-[#2b2d31] border-[#383a40] text-[#dbdee1]'
        }`}
      >
        {/* Header do Modal */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-3 ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-900'
              : 'bg-[#232428] border-[#1f2023] text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Gerenciar Acessos à Seção Virais
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#949ba4]">
                Controle exclusivo do Administrador para liberação de inteligência
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pesquisa e Ações Rápidas */}
        <div className="p-4 border-b space-y-3 dark:border-[#1f2023]">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar usuário por nome, @tag ou e-mail..."
              className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border transition-all focus:outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]'
                  : 'bg-[#1e1f22] border-[#383a40] text-white placeholder-[#80848e] focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]'
              }`}
            />
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-[#949ba4]">
              {allUsers.length} usuários na plataforma •{' '}
              <strong className="text-emerald-500 font-bold">
                {authorizedIds.length} autorizados
              </strong>
            </span>

            <button
              type="button"
              onClick={handleGrantAll}
              className="text-[11px] font-bold text-[#5865F2] hover:underline"
            >
              Liberar para todos
            </button>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar max-h-[380px]">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 dark:text-[#949ba4]">
              Nenhum usuário encontrado correspondente a "{searchTerm}".
            </div>
          ) : (
            filteredUsers.map(u => {
              const isAdmin = isPlatformAdmin(u);
              const isAuth =
                isAdmin ||
                authorizedIds.includes(u.id) ||
                (u.email && authorizedIds.includes(u.email));

              return (
                <div
                  key={u.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-[#232428] border-[#383a40] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar || '/app-icon.png'}
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold text-xs truncate ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {u.name}
                        </span>
                        {isAdmin && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                            Admin Master
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-[#949ba4] block truncate">
                        {u.tag} {u.email ? `• ${u.email}` : ''}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isAdmin ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Acesso Permanente
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleUserAccess(u.id, u.email)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                          isAuth
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black'
                            : isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                            : 'bg-white/10 hover:bg-white/20 text-[#dbdee1]'
                        }`}
                      >
                        {isAuth ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Liberado
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Bloqueado
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div
          className={`p-4 border-t flex items-center justify-between text-xs ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-[#232428] border-[#1f2023]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {saveSuccessToast && (
              <span className="text-emerald-500 font-bold flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" /> Alterações salvas!
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold rounded-xl transition-colors shadow"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

