import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Check,
  AlertCircle,
  Shield,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { signInWithEmail, signUpWithEmail } from '../../services/supabase';

export const LoginView: React.FC = () => {
  const { loginUser } = useDiskai();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);

    setLoginLoading(true);
    const res = await signInWithEmail(loginEmail, loginPassword);
    setLoginLoading(false);

    if (res.success && res.user) {
      setLoginSuccess(`Login efetuado com sucesso! Bem-vindo(a), ${res.user.name}.`);
      setTimeout(() => {
        loginUser(res.user!);
      }, 700);
    } else {
      setLoginError(res.error || 'Credenciais inválidas. Verifique seu email e senha.');
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
      if (res.isPending) {
        setSignupSuccess('Cadastro realizado! Sua conta aguarda aprovação do Administrador.');
      } else {
        setSignupSuccess('Conta criada com sucesso! Conectando...');
      }
      setTimeout(() => {
        loginUser(res.user!);
      }, 1000);
    } else {
      setSignupError(res.error || 'Falha ao criar conta.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0c0e12] text-[#dbdee1] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      {/* Background Loop Video: Arara */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      >
        <source src="/arara.video.mp4" type="video/mp4" />
        <source src="/arara.video" type="video/mp4" />
        <source src="/arara.mp4" type="video/mp4" />
      </video>

      {/* Subtle overlay for optimal contrast and text readability */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-0" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-md z-10 my-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#5865F2]/25 to-[#00b4d8]/25 rounded-3xl blur-2xl opacity-75 pointer-events-none" />

        <div className="relative bg-[#1a1b1e]/95 backdrop-blur-2xl border border-white/[0.1] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-[#dbdee1]">
          {/* Top Brand Header */}
          <div className="px-6 pt-7 pb-4 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/[0.06] text-center flex flex-col items-center">
            <div className="relative mb-3">
              <img
                src="/app-icon.png"
                alt="Diskai"
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10 shadow-xl shadow-[#0ea5e9]/25"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#23a55a] border-2 border-[#1a1b1e] flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
            </div>

            <div className="flex items-center justify-center">
              <h1 className="text-2xl font-black text-white tracking-tight">Diskai</h1>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/[0.06] bg-black/25 px-6 gap-2 pt-2">
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
              <span>Entrar na Conta</span>
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

          {/* Form Content */}
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
                      type="text"
                      required
                      name="diskai_login_user_field"
                      id="diskai_login_user_field"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="Digite seu email ou usuário"
                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">Senha</label>
                  <div className="flex items-center gap-2.5 bg-[#141517] px-3.5 py-3 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2] focus-within:ring-2 focus-within:ring-[#5865F2]/20 transition-all">
                    <Lock className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      name="diskai_login_pass_field"
                      id="diskai_login_pass_field"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="text-[#949ba4] hover:text-white"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                        type={showSignupPassword ? 'text' : 'password'}
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
                        type={showSignupPassword ? 'text' : 'password'}
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
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
