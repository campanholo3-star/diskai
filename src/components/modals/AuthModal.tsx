import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Check,
  AlertCircle,
  Shield,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { signInWithEmail, signUpWithEmail } from '../../services/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = useDiskai();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);

    setLoginLoading(true);
    const res = await signInWithEmail(loginEmail, loginPassword);
    setLoginLoading(false);

    if (res.success && res.user) {
      updateUserProfile(res.user);
      setLoginSuccess(`Login realizado com sucesso! Bem-vindo(a), ${res.user.name}.`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setLoginError(res.error || 'Falha ao autenticar.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccess(null);

    if (signupPassword !== signupConfirm) {
      setSignupError('As senhas digitadas não coincidem.');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setSignupLoading(true);
    const res = await signUpWithEmail(signupEmail, signupPassword, signupName);
    setSignupLoading(false);

    if (res.success && res.user) {
      updateUserProfile(res.user);
      if (res.isPending) {
        setSignupSuccess('Conta cadastrada com sucesso! Seu acesso está aguardando aprovação do Administrador.');
      } else {
        setSignupSuccess(`Conta criada com sucesso! Bem-vindo(a) ao Diskai.`);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setSignupError(res.error || 'Falha ao criar conta.');
    }
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      {/* Outer Glow */}
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#5865F2]/30 to-[#00b4d8]/30 rounded-3xl blur-xl opacity-70 pointer-events-none" />

        <div className="relative bg-[#1a1b1e]/95 backdrop-blur-2xl border border-white/[0.1] w-full rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-[#dbdee1]">
          {/* Top Brand Header */}
          <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/app-icon.png"
                  alt="Diskai"
                  className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white/10 shadow-lg shadow-[#0ea5e9]/20"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#23a55a] border-2 border-[#1a1b1e] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-white tracking-tight">DiskAI Connect</h2>
                  <span className="text-[10px] bg-[#23a55a]/15 text-[#23a55a] font-extrabold px-2 py-0.5 rounded-full border border-[#23a55a]/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Seguro
                  </span>
                </div>
                <p className="text-xs text-[#949ba4]">Ambiente corporativo de alta segurança</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#949ba4] hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation (Login vs Signup) */}
          <div className="flex border-b border-white/[0.06] bg-black/20 px-6 gap-2 pt-2">
            <button
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
                setLoginSuccess(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'border-[#5865F2] text-white shadow-sm'
                  : 'border-transparent text-[#949ba4] hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Entrar (Login)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setSignupError(null);
                setSignupSuccess(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'signup'
                  ? 'border-[#5865F2] text-white shadow-sm'
                  : 'border-transparent text-[#949ba4] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Criar Conta</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* TAB: LOGIN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-[#f23f43]/15 border border-[#f23f43]/40 rounded-2xl text-xs text-[#f23f43] font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {loginSuccess && (
                  <div className="p-3 bg-[#23a55a]/15 border border-[#23a55a]/40 rounded-2xl text-xs text-[#23a55a] font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>{loginSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">Email</label>
                  <div className="flex items-center gap-2.5 bg-[#141517] px-3.5 py-3 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2] focus-within:ring-2 focus-within:ring-[#5865F2]/20 transition-all">
                    <Mail className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">Senha</label>
                  <div className="flex items-center gap-2.5 bg-[#141517] px-3.5 py-3 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2] focus-within:ring-2 focus-within:ring-[#5865F2]/20 transition-all">
                    <Lock className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-white/30"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-gradient-to-r from-[#5865F2] to-[#4752c4] hover:brightness-110 active:scale-[0.98] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#5865F2]/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{loginLoading ? 'Autenticando...' : 'Acessar Conta'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-[#949ba4]">Não possui acesso ainda? </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className="text-xs font-bold text-[#5865F2] hover:text-[#7983f5] transition-colors"
                  >
                    Criar cadastro
                  </button>
                </div>
              </form>
            )}

            {/* TAB: SIGNUP */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3.5">
                {signupError && (
                  <div className="p-3 bg-[#f23f43]/15 border border-[#f23f43]/40 rounded-2xl text-xs text-[#f23f43] font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{signupError}</span>
                  </div>
                )}

                {signupSuccess && (
                  <div className="p-3 bg-[#23a55a]/15 border border-[#23a55a]/40 rounded-2xl text-xs text-[#23a55a] font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>{signupSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">Nome Completo</label>
                  <div className="flex items-center gap-2.5 bg-[#141517] px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2] focus-within:ring-2 focus-within:ring-[#5865F2]/20 transition-all">
                    <UserIcon className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      placeholder="Ex: Carlos Mendes"
                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">Email Corporativo</label>
                  <div className="flex items-center gap-2.5 bg-[#141517] px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2] focus-within:ring-2 focus-within:ring-[#5865F2]/20 transition-all">
                    <Mail className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-white/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">Senha</label>
                    <div className="flex items-center gap-2 bg-[#141517] px-3 py-2.5 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2] focus-within:ring-2 focus-within:ring-[#5865F2]/20 transition-all">
                      <Lock className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                      <input
                        type="password"
                        required
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        placeholder="Mín. 6 dígitos"
                        className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-white/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">Confirmar</label>
                    <div className="flex items-center gap-2 bg-[#141517] px-3 py-2.5 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2] focus-within:ring-2 focus-within:ring-[#5865F2]/20 transition-all">
                      <Lock className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                      <input
                        type="password"
                        required
                        value={signupConfirm}
                        onChange={e => setSignupConfirm(e.target.value)}
                        placeholder="Repita a senha"
                        className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-white/30"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full bg-gradient-to-r from-[#5865F2] to-[#4752c4] hover:brightness-110 active:scale-[0.98] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#5865F2]/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <span>{signupLoading ? 'Processando Registro...' : 'Solicitar Cadastro no Diskai'}</span>
                  <Sparkles className="w-4 h-4" />
                </button>

                <div className="text-center pt-1">
                  <span className="text-xs text-[#949ba4]">Já tem conta? </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-xs font-bold text-[#5865F2] hover:text-[#7983f5] transition-colors"
                  >
                    Entrar agora
                  </button>
                </div>
              </form>
            )}

            {/* Security Guarantee Note */}
            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-start gap-2.5 text-[11px] text-[#949ba4]">
              <Shield className="w-4 h-4 text-[#23a55a] flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Aprovação por Administrador:</strong> Novos cadastros são registrados com status <em>pendente</em> e passam por liberação segura antes de terem acesso às mensagens e salas de voz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
