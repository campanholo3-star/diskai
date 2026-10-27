import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  Check,
  AlertTriangle,
  Lock,
  Mail,
  Users,
  Trash2
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { Participant } from '../../types';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    participants,
    refreshParticipants,
    approveParticipant,
    revokeParticipant,
    removeParticipant,
    inviteParticipant,
    setAdminCreateUserModalOpen
  } = useDiskai();

  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      refreshParticipants();
    }
  }, [isOpen]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'Administrador';

  const filtered = participants.filter(p => {
    if (activeTab === 'approved' && p.accessStatus !== 'approved') return false;
    if (activeTab === 'pending' && p.accessStatus !== 'pending') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.tag.includes(q) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalCount = participants.length;
  const approvedCount = participants.filter(p => p.accessStatus === 'approved').length;
  const pendingCount = participants.filter(p => p.accessStatus === 'pending').length;

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;

    inviteParticipant(inviteName.trim(), inviteEmail.trim());
    setInviteSuccess(`Acesso pré-aprovado para ${inviteName}!`);
    setInviteName('');
    setInviteEmail('');
    setTimeout(() => {
      setInviteSuccess(null);
      setInviteModalOpen(false);
    }, 1500);
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1] max-h-[88vh]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f0b232]/20 border border-[#f0b232]/40 flex items-center justify-center text-[#f0b232]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Painel de Administração DiskAI</h2>
                <span className="text-[10px] font-bold bg-[#f0b232]/20 text-[#f0b232] px-2 py-0.5 rounded-full border border-[#f0b232]/40 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Exclusivo do Administrador
                </span>
              </div>
              <p className="text-xs text-[#949ba4]">
                Gerenciamento de acessos seguros, aprovação de participantes e permissões na nuvem.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice Banner */}
        <div className="bg-[#1e1f22] px-6 py-3 border-b border-[#1f2023] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#dbdee1]">
            <ShieldCheck className="w-4 h-4 text-[#23a55a] flex-shrink-0" />
            <span>
              <strong>Controle Rigoroso de Acesso:</strong> Somente você como Administrador pode aprovar a entrada de novos participantes.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdminCreateUserModalOpen(true)}
              className="bg-[#23a55a] hover:bg-[#1f8b4c] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow"
              title="Cadastrar usuário com email e senha no banco de dados"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Usuário (Login/Senha)</span>
            </button>

            <button
              onClick={() => setInviteModalOpen(true)}
              className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Pré-Autorizar Participante</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-[#2b2d31]/40 border-b border-[#1f2023] flex-shrink-0">
          <div className="bg-[#2b2d31] p-3 rounded-xl border border-[#3e4047] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#949ba4]">Total Registrados</div>
              <div className="text-xl font-bold text-white">{totalCount}</div>
            </div>
            <Users className="w-6 h-6 text-[#949ba4]" />
          </div>

          <div className="bg-[#2b2d31] p-3 rounded-xl border border-[#3e4047] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#23a55a]">Acessos Aprovados</div>
              <div className="text-xl font-bold text-[#23a55a]">{approvedCount}</div>
            </div>
            <UserCheck className="w-6 h-6 text-[#23a55a]" />
          </div>

          <div className="bg-[#2b2d31] p-3 rounded-xl border border-[#3e4047] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#f0b232]">Pendentes de Aprovação</div>
              <div className="text-xl font-bold text-[#f0b232]">{pendingCount}</div>
            </div>
            <AlertTriangle className="w-6 h-6 text-[#f0b232]" />
          </div>
        </div>

        {/* Controls: Search & Tabs */}
        <div className="px-6 py-3 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#1e1f22] p-1 rounded-xl border border-[#3e4047]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-[#35373c] text-white shadow'
                  : 'text-[#949ba4] hover:text-[#dbdee1]'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'approved'
                  ? 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/40 shadow'
                  : 'text-[#949ba4] hover:text-[#dbdee1]'
              }`}
            >
              Aprovados ({approvedCount})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pending'
                  ? 'bg-[#f0b232]/20 text-[#f0b232] border border-[#f0b232]/40 shadow'
                  : 'text-[#949ba4] hover:text-[#dbdee1]'
              }`}
            >
              Pendentes ({pendingCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar participantes por nome ou tag..."
              className="w-full bg-[#1e1f22] text-xs text-white px-3 py-1.5 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2] pr-8"
            />
            <Search className="w-3.5 h-3.5 text-[#949ba4] absolute right-2.5 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Participants List */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#949ba4]">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Nenhum participante encontrado.</p>
              <p className="text-xs">Tente buscar por outro termo ou limpe os filtros.</p>
            </div>
          ) : (
            filtered.map(participant => {
              const isApproved = participant.accessStatus === 'approved';
              const isPending = participant.accessStatus === 'pending';
              const isParticipantAdmin = participant.role === 'Administrador';

              return (
                <div
                  key={participant.id}
                  className="bg-[#2b2d31] hover:bg-[#35373c]/50 border border-[#3e4047] p-3.5 rounded-xl flex items-center justify-between gap-3 transition-colors"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={participant.avatar}
                      alt={participant.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">
                          {participant.name}
                        </span>
                        <span className="text-xs text-[#949ba4]">#{participant.tag}</span>
                        {isParticipantAdmin && (
                          <span className="bg-[#f0b232]/20 text-[#f0b232] text-[10px] font-bold px-1.5 py-0.2 rounded border border-[#f0b232]/40 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" /> ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#949ba4] flex items-center gap-2 mt-0.5 truncate">
                        {participant.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" /> {participant.email}
                          </span>
                        )}
                        <span>• Entrou em: {participant.joinedAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Pill & Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status Badge */}
                    {isApproved ? (
                      <span className="px-2.5 py-1 bg-[#23a55a]/20 border border-[#23a55a]/40 text-[#23a55a] text-xs font-semibold rounded-lg flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Acesso Liberado
                      </span>
                    ) : isPending ? (
                      <span className="px-2.5 py-1 bg-[#f0b232]/20 border border-[#f0b232]/40 text-[#f0b232] text-xs font-semibold rounded-lg flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pendente de Aprovação
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-[#f23f43]/20 border border-[#f23f43]/40 text-[#f23f43] text-xs font-semibold rounded-lg flex items-center gap-1">
                        <UserX className="w-3.5 h-3.5" /> Acesso Revogado
                      </span>
                    )}

                    {/* Action Buttons (Disabled for self admin) */}
                    {participant.id !== currentUser.id && (
                      <div className="flex items-center gap-1.5 ml-2 border-l border-[#3e4047] pl-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => approveParticipant(participant.id)}
                              title="Aprovar entrada deste participante"
                              className="bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow hover:scale-105 active:scale-95"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Aprovar</span>
                            </button>
                            <button
                              onClick={() => revokeParticipant(participant.id)}
                              title="Recusar cadastro deste participante"
                              className="bg-transparent hover:bg-[#f23f43]/20 text-[#f23f43] border border-[#f23f43]/40 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Recusar</span>
                            </button>
                          </>
                        ) : isApproved ? (
                          <button
                            onClick={() => revokeParticipant(participant.id)}
                            title="Suspender ou revogar acesso deste participante"
                            className="bg-[#2b2d31] hover:bg-[#f23f43]/20 text-[#949ba4] hover:text-[#f23f43] border border-[#3e4047] hover:border-[#f23f43]/40 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Revogar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => approveParticipant(participant.id)}
                            title="Reativar acesso"
                            className="bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Reativar</span>
                          </button>
                        )}

                        <button
                          onClick={() => setParticipantToDelete(participant)}
                          title="Excluir participante com confirmação"
                          className="p-1.5 hover:bg-[#f23f43]/20 text-[#949ba4] hover:text-[#f23f43] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal de Confirmação de Exclusão de Participante */}
        {participantToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#2b2d31] border border-[#f23f43]/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-[#dbdee1]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f23f43]/20 border border-[#f23f43]/30 flex items-center justify-center text-[#f23f43] flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Deseja excluir este participante?</h3>
                  <p className="text-xs text-[#949ba4]">Confirmação necessária para evitar exclusões acidentais.</p>
                </div>
              </div>

              <div className="bg-[#1e1f22] p-3 rounded-xl border border-[#3e4047] flex items-center gap-3">
                <img
                  src={participantToDelete.avatar}
                  alt={participantToDelete.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{participantToDelete.name}</div>
                  <div className="text-xs text-[#949ba4] truncate">
                    {participantToDelete.email || `#${participantToDelete.tag}`}
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#dbdee1] leading-relaxed">
                Você deseja realmente excluir <strong>{participantToDelete.name}</strong> da plataforma DiskAI? O acesso do usuário será permanentemente cancelado.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#3e4047]">
                <button
                  type="button"
                  onClick={() => setParticipantToDelete(null)}
                  className="px-4 py-2 bg-[#1e1f22] hover:bg-[#35373c] text-white text-xs font-semibold rounded-lg transition-colors border border-[#3e4047]"
                >
                  Não, Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeParticipant(participantToDelete.id);
                    setParticipantToDelete(null);
                  }}
                  className="px-4 py-2 bg-[#f23f43] hover:bg-[#da373c] text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-[#f23f43]/20 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sim, Excluir Participante
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invite / Pre-authorize Modal Popup */}
        {inviteModalOpen && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
            <div className="bg-[#2b2d31] border border-[#3e4047] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#3e4047] pb-3">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#5865F2]" />
                  <span>Pré-Autorizar Participante no DiskAI</span>
                </div>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="text-[#949ba4] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {inviteSuccess && (
                <div className="p-3 bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/40 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dbdee1] uppercase">Nome do Participante</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Ex: Roberto Gomes"
                    className="w-full bg-[#1e1f22] text-xs text-white px-3 py-2 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dbdee1] uppercase">Email (Opcional)</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="roberto@empresa.com"
                    className="w-full bg-[#1e1f22] text-xs text-white px-3 py-2 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div className="text-xs text-[#949ba4] bg-[#1e1f22] p-2.5 rounded-lg border border-[#35373c]">
                  💡 Ao salvar, este membro terá acesso autorizado previamente e poderá entrar no DiskAI sem esperar na fila de aprovação.
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-4 py-2 bg-[#1e1f22] hover:bg-[#35373c] text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-lg text-xs font-bold transition-colors shadow"
                  >
                    Autorizar Acesso
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
