import React, { useState, useEffect } from 'react';
import {
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
  Trash2,
  RefreshCw,
  ArrowLeft,
  Filter,
  Sparkles,
  LogOut,
  KeyRound
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { Participant } from '../../types';

interface AdminDashboardViewProps {
  onBackToApp?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onBackToApp }) => {
  const {
    currentUser,
    participants,
    refreshParticipants,
    approveParticipant,
    revokeParticipant,
    removeParticipant,
    inviteParticipant,
    setAdminCreateUserModalOpen,
    logout
  } = useDiskai();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);

  useEffect(() => {
    refreshParticipants();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshParticipants();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filtered = participants.filter(p => {
    if (activeTab === 'pending' && p.accessStatus !== 'pending') return false;
    if (activeTab === 'approved' && p.accessStatus !== 'approved') return false;
    if (activeTab === 'rejected' && p.accessStatus !== 'rejected' && p.accessStatus !== 'revoked') return false;
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
  const pendingCount = participants.filter(p => p.accessStatus === 'pending').length;
  const approvedCount = participants.filter(p => p.accessStatus === 'approved').length;
  const rejectedCount = participants.filter(p => p.accessStatus === 'rejected' || p.accessStatus === 'revoked').length;

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
    }, 1400);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141517] text-[#dbdee1] overflow-hidden select-none">
      {/* Top Admin Header Bar */}
      <header className="h-16 bg-[#1a1b1e]/90 backdrop-blur-xl border-b border-white/[0.08] px-6 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.08] transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao App</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shadow-lg shadow-[#5865F2]/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">Painel do Administrador</h1>
                <span className="text-[10px] font-bold bg-[#f0b232]/15 text-[#f0b232] px-2.5 py-0.5 rounded-full border border-[#f0b232]/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Privado
                </span>
              </div>
              <p className="text-xs text-[#949ba4]">
                Aprovação instantânea de membros, auditoria de cadastros e Row Level Security
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-[#dbdee1] hover:text-white transition-all disabled:opacity-50"
            title="Atualizar lista com o banco de dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#5865F2]' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={() => setAdminCreateUserModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#23a55a] to-[#1f8b4c] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-[#23a55a]/20 transition-all hover:scale-[1.02] active:scale-95"
            title="Cadastrar usuário com email e senha no banco de dados"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário (Login & Senha)</span>
          </button>

          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#4752c4] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-[#5865F2]/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Pré-Autorizar</span>
          </button>

          <button
            onClick={async () => {
              if (window.confirm('Deseja realmente sair da sua conta?')) {
                await logout();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f23f43]/10 hover:bg-[#f23f43]/20 border border-[#f23f43]/30 text-xs font-semibold text-[#f23f43] hover:text-white transition-all hover:scale-[1.02] active:scale-95"
            title="Sair da Conta (Logout)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 overflow-hidden max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Cards Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          <div
            onClick={() => setActiveTab('pending')}
            className={`cursor-pointer bg-[#1e1f22]/80 backdrop-blur-md p-4 rounded-2xl border transition-all duration-200 ${
              activeTab === 'pending'
                ? 'border-[#f0b232] ring-2 ring-[#f0b232]/20 shadow-lg shadow-[#f0b232]/10 scale-[1.02]'
                : 'border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#f0b232]">Pendentes</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#f0b232] animate-ping" />
            </div>
            <div className="text-3xl font-black text-white mt-1">{pendingCount}</div>
            <p className="text-xs text-[#949ba4] mt-1">Aguardando sua liberação</p>
          </div>

          <div
            onClick={() => setActiveTab('approved')}
            className={`cursor-pointer bg-[#1e1f22]/80 backdrop-blur-md p-4 rounded-2xl border transition-all duration-200 ${
              activeTab === 'approved'
                ? 'border-[#23a55a] ring-2 ring-[#23a55a]/20 shadow-lg shadow-[#23a55a]/10 scale-[1.02]'
                : 'border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#23a55a]">Aprovados</span>
              <UserCheck className="w-4 h-4 text-[#23a55a]" />
            </div>
            <div className="text-3xl font-black text-[#23a55a] mt-1">{approvedCount}</div>
            <p className="text-xs text-[#949ba4] mt-1">Com acesso normal ativo</p>
          </div>

          <div
            onClick={() => setActiveTab('rejected')}
            className={`cursor-pointer bg-[#1e1f22]/80 backdrop-blur-md p-4 rounded-2xl border transition-all duration-200 ${
              activeTab === 'rejected'
                ? 'border-[#f23f43] ring-2 ring-[#f23f43]/20 shadow-lg shadow-[#f23f43]/10 scale-[1.02]'
                : 'border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#f23f43]">Recusados</span>
              <UserX className="w-4 h-4 text-[#f23f43]" />
            </div>
            <div className="text-3xl font-black text-[#f23f43] mt-1">{rejectedCount}</div>
            <p className="text-xs text-[#949ba4] mt-1">Bloqueados da plataforma</p>
          </div>

          <div
            onClick={() => setActiveTab('all')}
            className={`cursor-pointer bg-[#1e1f22]/80 backdrop-blur-md p-4 rounded-2xl border transition-all duration-200 ${
              activeTab === 'all'
                ? 'border-[#5865F2] ring-2 ring-[#5865F2]/20 shadow-lg shadow-[#5865F2]/10 scale-[1.02]'
                : 'border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">Total no Banco</span>
              <Users className="w-4 h-4 text-[#949ba4]" />
            </div>
            <div className="text-3xl font-black text-white mt-1">{totalCount}</div>
            <p className="text-xs text-[#949ba4] mt-1">Contas registradas</p>
          </div>
        </section>

        {/* Filter Bar & Search */}
        <section className="bg-[#1e1f22]/90 backdrop-blur-xl border border-white/[0.08] p-3 rounded-2xl flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-[#141517] p-1 rounded-xl border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-[#f0b232] text-black shadow-md'
                  : 'text-[#949ba4] hover:text-white'
              }`}
            >
              <span>Pendentes</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'pending' ? 'bg-black/20 text-black' : 'bg-[#f0b232]/20 text-[#f0b232]'}`}>
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'approved'
                  ? 'bg-[#23a55a] text-white shadow-md'
                  : 'text-[#949ba4] hover:text-white'
              }`}
            >
              <span>Aprovados</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'approved' ? 'bg-black/20 text-white' : 'bg-[#23a55a]/20 text-[#23a55a]'}`}>
                {approvedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'rejected'
                  ? 'bg-[#f23f43] text-white shadow-md'
                  : 'text-[#949ba4] hover:text-white'
              }`}
            >
              <span>Recusados</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'rejected' ? 'bg-black/20 text-white' : 'bg-[#f23f43]/20 text-[#f23f43]'}`}>
                {rejectedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white/10 text-white shadow-md'
                  : 'text-[#949ba4] hover:text-white'
              }`}
            >
              Todos ({totalCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, email ou tag..."
              className="w-full bg-[#141517] text-xs text-white px-3.5 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#5865F2] pr-9"
            />
            <Search className="w-4 h-4 text-[#949ba4] absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </section>

        {/* Users List Container */}
        <section className="flex-1 bg-[#1a1b1e]/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden flex flex-col">
          <div className="p-4 overflow-y-auto space-y-2.5 flex-1 no-scrollbar">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-[#949ba4] space-y-2">
                <Users className="w-12 h-12 mx-auto text-white/20" />
                <p className="text-sm font-semibold text-white">Nenhum participante nesta categoria.</p>
                <p className="text-xs text-[#949ba4] max-w-xs mx-auto">
                  {activeTab === 'pending'
                    ? '🎉 Todos os usuários cadastrados já foram aprovados ou processados!'
                    : 'Não há registros com os filtros atuais.'}
                </p>
              </div>
            ) : (
              filtered.map(participant => {
                const isApproved = participant.accessStatus === 'approved';
                const isPending = participant.accessStatus === 'pending';
                const isRejected = participant.accessStatus === 'rejected' || participant.accessStatus === 'revoked';
                const isSelf = participant.id === currentUser.id;

                return (
                  <div
                    key={participant.id}
                    className="bg-[#1e1f22]/90 hover:bg-[#25272c] border border-white/[0.06] hover:border-white/[0.12] p-4 rounded-2xl flex items-center justify-between gap-4 transition-all duration-150"
                  >
                    {/* Left: Avatar & Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={participant.avatar}
                          alt={participant.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e1f22] ${
                            isApproved
                              ? 'bg-[#23a55a]'
                              : isPending
                              ? 'bg-[#f0b232] animate-pulse'
                              : 'bg-[#f23f43]'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm truncate">{participant.name}</span>
                          <span className="text-xs text-[#949ba4] font-medium">#{participant.tag}</span>
                          {participant.role === 'Administrador' && (
                            <span className="bg-[#f0b232]/15 text-[#f0b232] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#f0b232]/30 flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" /> ADMIN
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#949ba4] flex items-center gap-2 mt-1 truncate">
                          {participant.email ? (
                            <span className="flex items-center gap-1 truncate text-[#dbdee1]">
                              <Mail className="w-3 h-3 text-[#5865F2]" />
                              {participant.email}
                            </span>
                          ) : (
                            <span className="text-white/40 italic">Sem email registrado</span>
                          )}
                          <span>•</span>
                          <span>Entrou: {participant.joinedAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & Actions */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {/* Current Status Pill */}
                      {isApproved ? (
                        <span className="px-3 py-1 bg-[#23a55a]/15 border border-[#23a55a]/30 text-[#23a55a] text-xs font-bold rounded-xl flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Aprovado
                        </span>
                      ) : isPending ? (
                        <span className="px-3 py-1 bg-[#f0b232]/15 border border-[#f0b232]/30 text-[#f0b232] text-xs font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" /> Pendente
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-[#f23f43]/15 border border-[#f23f43]/30 text-[#f23f43] text-xs font-bold rounded-xl flex items-center gap-1.5">
                          <UserX className="w-3.5 h-3.5" /> Recusado
                        </span>
                      )}

                      {/* Action Buttons */}
                      {!isSelf ? (
                        <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                          {/* Botão Aprovar */}
                          <button
                            onClick={() => approveParticipant(participant.id)}
                            disabled={isApproved}
                            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                              isApproved
                                ? 'bg-white/[0.04] text-white/30 border border-white/[0.05] cursor-not-allowed'
                                : 'bg-[#23a55a] hover:bg-[#1f934f] text-white shadow-[#23a55a]/20 hover:scale-105 active:scale-95'
                            }`}
                            title="Aprovar e conceder acesso instantâneo"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Aprovar</span>
                          </button>

                          {/* Botão Recusar */}
                          <button
                            onClick={() => revokeParticipant(participant.id)}
                            disabled={isRejected}
                            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                              isRejected
                                ? 'bg-white/[0.04] text-white/30 border-white/[0.05] cursor-not-allowed'
                                : 'bg-transparent hover:bg-[#f23f43]/15 text-[#f23f43] border-[#f23f43]/40 hover:scale-105 active:scale-95'
                            }`}
                            title="Recusar ou revogar acesso"
                          >
                            <UserX className="w-4 h-4" />
                            <span>Recusar</span>
                          </button>

                          {/* Botão Excluir */}
                          <button
                            onClick={() => setParticipantToDelete(participant)}
                            className="p-2 rounded-xl text-[#949ba4] hover:text-[#f23f43] hover:bg-[#f23f43]/10 transition-colors"
                            title="Excluir permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#949ba4] italic px-2">Você</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {participantToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#1e1f22] border border-[#f23f43]/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl text-[#dbdee1]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#f23f43]/20 border border-[#f23f43]/40 flex items-center justify-center text-[#f23f43] flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir participante?</h3>
                <p className="text-xs text-[#949ba4]">Esta ação removerá a conta do banco de dados.</p>
              </div>
            </div>

            <div className="bg-[#141517] p-3.5 rounded-2xl border border-white/[0.06] flex items-center gap-3">
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
              Deseja remover <strong>{participantToDelete.name}</strong> da base de dados do Supabase?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setParticipantToDelete(null)}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold rounded-xl transition-colors border border-white/[0.08]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removeParticipant(participantToDelete.id);
                  setParticipantToDelete(null);
                }}
                className="px-4 py-2 bg-[#f23f43] hover:bg-[#da373c] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#f23f43]/20 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-authorization Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-white/[0.08] rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#5865F2]" />
                <span>Pré-Autorizar Participante</span>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-[#949ba4] hover:text-white"
              >
                ✕
              </button>
            </div>

            {inviteSuccess && (
              <div className="p-3 bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/40 rounded-xl text-xs font-bold flex items-center gap-2">
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
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full bg-[#141517] text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#dbdee1] uppercase">Email (Opcional)</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="carlos@empresa.com"
                  className="w-full bg-[#141517] text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#5865F2]/20"
                >
                  Autorizar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
