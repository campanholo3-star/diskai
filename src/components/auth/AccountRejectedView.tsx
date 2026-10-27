import React, { useState } from 'react';
import {
  ShieldAlert,
  UserX,
  RefreshCw,
  LogOut,
  Mail,
  AlertCircle,
  Shield,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { checkUserApprovalStatus, signOut } from '../../services/supabase';

export const AccountRejectedView: React.FC = () => {
  const { currentUser, updateUserProfile, setAuthModalOpen } = useDiskai();
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  const handleCheckStatus = async () => {
    if (!currentUser.id) return;
    setChecking(true);
    setFeedback(null);

    try {
      const res = await checkUserApprovalStatus(currentUser.id);
      if (res.isApproved) {
        setFeedback({
          type: 'success',
          message: 'Excelente notícia! Seu acesso foi liberado pelo Administrador. Redirecionando...'
        });
        setTimeout(() => {
          updateUserProfile({
            accessStatus: 'approved',
            isApproved: true,
            status: 'online',
            customStatus: '🚀 Acesso Liberado no DiskAI'
          });
        }, 1200);
      } else if (res.status === 'pending') {
        setFeedback({
          type: 'info',
          message: 'Seu cadastro voltou para a fila de análise. O status foi alterado para pendente.'
        });
        setTimeout(() => {
          updateUserProfile({
            accessStatus: 'pending',
            isApproved: false,
            customStatus: 'Aguardando aprovação do Administrador'
          });
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          message: 'O acesso para este cadastro permanece recusado pelo Administrador.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao conectar ao banco de dados.'
      });
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    try {
      localStorage.removeItem('diskai_current_user');
    } catch {}
    window.location.reload();
  };

  const handleOpenAdminLogin = () => {
    setAuthModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141517] text-[#dbdee1] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto select-none">
      {/* Background Decorative Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(242,63,67,0.14),transparent_65%)] pointer-events-none" />

      {/* Main Guard Card */}
      <div className="relative w-full max-w-lg bg-[#1e1f22]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-3xl p-7 sm:p-9 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Rejected Shield Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-[#f23f43]/15 border border-[#f23f43]/40 flex items-center justify-center text-[#f23f43] shadow-xl shadow-[#f23f43]/15">
            <UserX className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1e1f22] border-2 border-[#2b2d31] flex items-center justify-center text-[#f23f43]">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f23f43]/15 border border-[#f23f43]/30 text-[#f23f43] text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Acesso Recusado
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Acesso Não Autorizado
          </h1>
          <p className="text-sm text-[#949ba4] max-w-sm mx-auto leading-relaxed">
            Seu cadastro na plataforma DiskAI foi analisado e <strong>recusado ou suspenso</strong> pelo Administrador da rede.
          </p>
        </div>

        {/* User Profile Card */}
        <div className="w-full bg-[#2b2d31]/60 border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4 text-left">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-[#f23f43]/30 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base truncate">{currentUser.name}</span>
              <span className="text-xs text-[#949ba4] font-medium">#{currentUser.tag}</span>
            </div>
            {currentUser.email && (
              <div className="text-xs text-[#949ba4] truncate flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3 h-3 text-[#f23f43]" />
                <span className="truncate">{currentUser.email}</span>
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#f23f43]">
              <span className="w-2 h-2 rounded-full bg-[#f23f43]" />
              <span>Status: Recusado / Revogado</span>
            </div>
          </div>
        </div>

        {/* Feedback Alert Message */}
        {feedback && (
          <div
            className={`w-full p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all animate-in fade-in duration-150 ${
              feedback.type === 'success'
                ? 'bg-[#23a55a]/15 border-[#23a55a]/40 text-[#23a55a]'
                : feedback.type === 'error'
                ? 'bg-[#f23f43]/15 border-[#f23f43]/40 text-[#f23f43]'
                : 'bg-[#5865F2]/15 border-[#5865F2]/40 text-[#dbdee1]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-left leading-normal">{feedback.message}</span>
          </div>
        )}

        {/* Explanation Box */}
        <div className="w-full bg-[#232428]/80 border border-white/[0.05] rounded-xl p-3.5 text-xs text-[#949ba4] text-left space-y-1.5">
          <div className="flex items-center gap-2 text-white font-bold">
            <Shield className="w-3.5 h-3.5 text-[#f23f43]" />
            <span>Política de Acesso Restrito</span>
          </div>
          <p className="leading-relaxed">
            Se você considera que esta recusa ocorreu por engano ou deseja solicitar uma reavaliação formal, entre em contato diretamente com o administrador:
            <span className="text-[#00b4d8] font-semibold block mt-0.5 select-all">campanholo32@gmail.com</span>
          </p>
        </div>

        {/* Actions */}
        <div className="w-full space-y-2.5 pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full bg-[#2b2d31] hover:bg-[#35373c] text-white py-3 rounded-xl font-bold text-sm transition-all border border-white/[0.08] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Verificando com o Servidor...' : 'Verificar Status Novamente'}</span>
          </button>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={handleSignOut}
              className="flex-1 bg-[#f23f43] hover:bg-[#da373c] active:scale-[0.98] text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-[#f23f43]/20 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta (Logout)</span>
            </button>

            <button
              onClick={handleOpenAdminLogin}
              className="flex-1 bg-[#1e1f22] hover:bg-[#35373c] text-[#f0b232] hover:text-white py-2.5 rounded-xl font-semibold text-xs transition-colors border border-[#f0b232]/30 flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Login Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
