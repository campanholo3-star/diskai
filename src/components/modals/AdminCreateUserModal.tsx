import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  KeyRound,
  Check,
  AlertCircle,
  Copy,
  Sparkles,
  UserPlus
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { adminCreateUserWithCredentials } from '../../services/supabase';

interface AdminCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCreateUserModal: React.FC<AdminCreateUserModalProps> = ({ isOpen, onClose }) => {
  const { refreshParticipants } = useDiskai();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [status, setStatus] = useState<'approved' | 'pending'>('approved');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; pass: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  };

  const handleCopyCredentials = () => {
    if (!createdInfo) return;
    const text = `Credenciais de Acesso ao DiskAI:\nEmail: ${createdInfo.email}\nSenha: ${createdInfo.pass}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, digite o nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um email válido.');
      return;
    }
    if (!password || password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminCreateUserWithCredentials({
        name: name.trim(),
        email: email.trim(),
        password: password,
        role: role,
        status: status
      });

      if (res.success && res.user) {
        setCreatedInfo({
          email: email.trim(),
          pass: password,
          name: name.trim()
        });
        await refreshParticipants();
      } else {
        setError(res.error || 'Erro ao criar novo usuário no banco de dados.');
      }
    } catch (err: any) {
      setError(err.message || 'Exceção ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndAddAnother = () => {
    setName('');
    setEmail('');
    setPassword('');
    setCreatedInfo(null);
    setError(null);
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#1a1b1e]/95 backdrop-blur-2xl border border-white/[0.1] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-[#dbdee1]">
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shadow-lg shadow-[#5865F2]/10">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">Criar Novo Usuário</h2>
                <span className="text-[10px] font-bold bg-[#f0b232]/15 text-[#f0b232] px-2 py-0.5 rounded-full border border-[#f0b232]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Painel Admin
                </span>
              </div>
              <p className="text-xs text-[#949ba4]">Cadastre um acesso exclusivo com login e senha no banco</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#949ba4] hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[80vh]">
          {/* Sucesso de Criação com resumo das credenciais */}
          {createdInfo ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-[#23a55a]/15 border border-[#23a55a]/30 text-white space-y-2">
                <div className="flex items-center gap-2 text-[#23a55a] font-bold text-sm">
                  <Check className="w-5 h-5" />
                  <span>Usuário Criado com Sucesso no Banco de Dados!</span>
                </div>
                <p className="text-xs text-[#dbdee1] leading-relaxed">
                  O acesso para <strong>{createdInfo.name}</strong> foi registrado com segurança e isolamento de perfil. Você pode repassar estas credenciais para o usuário logar imediatamente:
                </p>

                <div className="bg-[#141517] p-3.5 rounded-xl border border-white/[0.08] space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between text-[#949ba4]">
                    <span>Login / Email:</span>
                    <span className="text-white font-semibold select-all">{createdInfo.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#949ba4]">
                    <span>Senha de Acesso:</span>
                    <span className="text-[#00b4d8] font-bold select-all">{createdInfo.pass}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#949ba4] pt-1 border-t border-white/[0.06]">
                    <span>Status de Acesso:</span>
                    <span className="text-[#23a55a] font-bold">{status === 'approved' ? 'Liberado (Aprovado)' : 'Pendente'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-bold text-white transition-all flex items-center justify-center gap-2 border border-white/[0.08]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Credenciais Copiadas!' : 'Copiar Email e Senha'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndAddAnother}
                  className="flex-1 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow"
                >
                  Adicionar Outro Usuário
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold transition-all border border-white/[0.08]"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-[#f23f43]/15 border border-[#f23f43]/30 rounded-xl text-xs text-[#f23f43] font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Nome */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">
                  Nome Completo
                </label>
                <div className="flex items-center gap-2.5 bg-[#141517] px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2]">
                  <UserIcon className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Carlos Roberto"
                    className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">
                  Email de Acesso (Login)
                </label>
                <div className="flex items-center gap-2.5 bg-[#141517] px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2]">
                  <Mail className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>

              {/* Senha com Gerador Automático */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-[#00b4d8] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <KeyRound className="w-3 h-3" /> Gerar Senha Segura
                  </button>
                </div>
                <div className="flex items-center gap-2.5 bg-[#141517] px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus-within:border-[#5865F2]">
                  <Lock className="w-4 h-4 text-[#949ba4] flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Digite ou gere a senha (mínimo 6 dígitos)"
                    className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#949ba4] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Cargo & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Cargo */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">
                    Cargo / Nível
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full bg-[#141517] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="user">Membro Comum (Padrão)</option>
                    <option value="admin">Administrador (Controle Total)</option>
                  </select>
                </div>

                {/* Status Inicial */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#dbdee1] uppercase tracking-wider">
                    Liberação de Acesso
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-[#141517] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="approved">Aprovado (Acesso Liberado)</option>
                    <option value="pending">Pendente (Fila de Análise)</option>
                  </select>
                </div>
              </div>

              {/* Security Isolation Banner */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5 text-xs text-[#949ba4]">
                <Shield className="w-4 h-4 text-[#23a55a] flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Privacidade & Isolamento de Dados:</strong> O novo usuário receberá seu próprio ID único no banco de dados. Mensagens e conversas privadas são protegidas por Row Level Security (RLS) e inacessíveis a terceiros.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors border border-white/[0.08]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#4752c4] hover:brightness-110 active:scale-95 text-xs font-bold text-white transition-all shadow-lg shadow-[#5865F2]/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Cadastrando no Banco...' : 'Criar Usuário no Banco'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
