import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mic,
  Volume2,
  Sparkles,
  Palette,
  Check,
  Sun,
  Moon,
  Camera,
  Shield,
  Smile,
  Upload,
  FolderOpen,
  Image as ImageIcon,
  RotateCcw,
  Database,
  Server,
  ExternalLink,
  Bell,
  LogOut,
  Key,
  AlertCircle
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { UserStatus } from '../../types';
import { saveUserProfileToDb } from '../../services/supabase';
import { compressAvatarImage, saveAvatarToVault } from '../../utils/imageUtils';
import { getGeminiApiKey, setGeminiApiKey, testGeminiApiKey } from '../../services/geminiService';
import { PreCallDeviceModal } from '../call/PreCallDeviceModal';

export const UserSettingsModal: React.FC = () => {
  const {
    currentUser,
    logout,
    settingsModalOpen,
    setSettingsModalOpen,
    updateUserStatus,
    updateCustomStatus,
    updateUserProfile,
    soundEnabled,
    toggleSound,
    theme,
    setThemeMode,
    toggleTheme,
    setAuthModalOpen,
    setAdminModalOpen,
    unreadPopupEnabled,
    toggleUnreadPopup
  } = useDiskai();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'audio' | 'ai'>('profile');

  // Profile form state
  const [displayName, setDisplayName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.tag);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);
  const [bannerColor, setBannerColor] = useState(currentUser.bannerColor || '#5865F2');
  const [pronouns, setPronouns] = useState(currentUser.pronouns || 'ele/dele');
  const [bio, setBio] = useState(currentUser.bio || '💻 Apaixonado por tecnologia, Discord e inteligência artificial.');
  const [customStatusText, setCustomStatusText] = useState(currentUser.customStatus || '');
  const [savedToast, setSavedToast] = useState(false);
  const [showPreCallDeviceModal, setShowPreCallDeviceModal] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(getGeminiApiKey());
  const [geminiTestState, setGeminiTestState] = useState<{
    loading: boolean;
    success: boolean | null;
    message: string | null;
  }>({ loading: false, success: null, message: null });
  const [savedKeyToast, setSavedKeyToast] = useState(false);
  const [localAvatarFileName, setLocalAvatarFileName] = useState<string | null>(null);
  const [localAvatarError, setLocalAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado local sempre que currentUser mudar ou a modal reabrir
  useEffect(() => {
    setDisplayName(currentUser.name);
    setUsername(currentUser.tag);
    setAvatarUrl(currentUser.avatar);
    setBannerColor(currentUser.bannerColor || '#5865F2');
    setPronouns(currentUser.pronouns || 'ele/dele');
    setBio(currentUser.bio || '💻 Apaixonado por tecnologia, Discord e inteligência artificial.');
    setCustomStatusText(currentUser.customStatus || '');
  }, [currentUser, settingsModalOpen]);

  const handleLocalAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalAvatarError('Por favor selecione um arquivo de imagem válido (PNG, JPG, WebP, GIF).');
      return;
    }

    setLocalAvatarError(null);
    setLocalAvatarFileName(file.name);

    try {
      // Comprime a foto de forma inteligente para no máximo 256x256 e ~20KB
      const compressedImg = await compressAvatarImage(file, 256, 0.85);
      setAvatarUrl(compressedImg);
      // Persistir imediatamente no Avatar Vault, perfil e banco de dados Supabase
      saveAvatarToVault(currentUser.id, currentUser.email, compressedImg);
      updateUserProfile({ avatar: compressedImg });
      await saveUserProfileToDb({ id: currentUser.id, email: currentUser.email, avatar: compressedImg });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (err: any) {
      setLocalAvatarError(err.message || 'Falha ao processar imagem.');
    }
  };

  if (!settingsModalOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      name: displayName,
      tag: username,
      avatar: avatarUrl,
      bannerColor,
      pronouns,
      bio,
      customStatus: customStatusText,
      email: currentUser.email
    };
    saveAvatarToVault(currentUser.id, currentUser.email, avatarUrl);
    updateUserProfile(updatedData);
    saveUserProfileToDb({ id: currentUser.id, email: currentUser.email, ...updatedData });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const presetAvatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'
  ];

  const presetBanners = ['#5865F2', '#23a55a', '#f23f43', '#f0b232', '#eb459e', '#58355e', '#1e1f22'];

  const statuses: { label: string; value: UserStatus; color: string }[] = [
    { label: 'Disponível (Online)', value: 'online', color: 'bg-[#23a55a]' },
    { label: 'Ausente (Idle)', value: 'idle', color: 'bg-[#f0b232]' },
    { label: 'Não Perturbar (DND)', value: 'dnd', color: 'bg-[#f23f43]' },
    { label: 'Invisível (Offline)', value: 'offline', color: 'bg-[#80848e]' }
  ];

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1] h-[640px]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-wide">Configurações do Usuário</h2>
            <span className="text-xs text-[#949ba4] bg-[#1e1f22] px-2 py-0.5 rounded-full border border-[#3e4047]">
              Diskai v1.0
            </span>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body with Sidebar and Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Settings Tabs Sidebar */}
          <div className="w-52 bg-[#2b2d31] p-3 space-y-1 border-r border-[#1f2023]/60">
            <div className="text-[10px] font-bold text-[#949ba4] uppercase px-3 py-1">Configurações de Usuário</div>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Perfil do Usuário
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Palette className="w-4 h-4" />
              Aparência (Claro/Escuro)
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'audio'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Mic className="w-4 h-4" />
              Voz, Vídeo & Sons
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Bell className="w-4 h-4" />
              Notificações & Popups
            </button>

            <div className="text-[10px] font-bold text-[#949ba4] uppercase px-3 py-1 pt-3">Diskai Intelligence</div>
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'ai'
                  ? 'bg-[#5865F2] text-white'
                  : 'text-[#5865F2] hover:bg-[#5865F2]/10'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Motor de Resumo IA
            </button>


            {currentUser.role === 'Administrador' && (
              <>
                <div className="text-[10px] font-bold text-[#f0b232] uppercase px-3 py-1 pt-3">Administração</div>
                <button
                  onClick={() => {
                    setSettingsModalOpen(false);
                    setAdminModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all bg-[#f0b232]/10 text-[#f0b232] hover:bg-[#f0b232]/20 border border-[#f0b232]/30"
                >
                  <Shield className="w-4 h-4 text-[#f0b232]" />
                  Controle de Participantes
                </button>
              </>
            )}

            <div className="pt-3 border-t border-[#3e4047]/60 mt-3">
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Deseja realmente sair da sua conta?')) {
                    setSettingsModalOpen(false);
                    await logout();
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-[#f23f43] hover:bg-[#f23f43]/10"
              >
                <LogOut className="w-4 h-4" />
                Sair da Conta
              </button>
            </div>
          </div>

          {/* Settings Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
            {/* TAB: Perfil Editável */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Perfil do Usuário</h3>
                    <p className="text-xs text-[#949ba4]">Personalize como você aparece nos servidores e mensagens diretas.</p>
                  </div>
                  {savedToast && (
                    <div className="bg-[#23a55a]/20 border border-[#23a55a] text-[#23a55a] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-4 h-4" /> Alterações salvas!
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Form Fields */}
                  <div className="space-y-4">
                    {/* Display Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#dbdee1] uppercase">Nome de Exibição</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full bg-[#1e1f22] text-sm text-white px-3.5 py-2 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
                      />
                    </div>

                    {/* Tag / Username */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#dbdee1] uppercase">Nome de Usuário / Tag</label>
                      <div className="flex items-center gap-1 bg-[#1e1f22] px-3.5 py-2 rounded-lg border border-[#3e4047]">
                        <span className="text-xs text-[#949ba4]">#</span>
                        <input
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="w-full bg-transparent text-sm text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Pronouns */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#dbdee1] uppercase">Pronomes</label>
                      <input
                        type="text"
                        value={pronouns}
                        onChange={e => setPronouns(e.target.value)}
                        placeholder="Ex: ele/dele ou she/her"
                        className="w-full bg-[#1e1f22] text-sm text-white px-3.5 py-2 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
                      />
                    </div>

                    {/* Avatar Local Upload & Preset Selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#dbdee1] uppercase">Avatar do Perfil</label>
                        {localAvatarFileName && (
                          <span className="text-[11px] text-[#23a55a] font-medium truncate max-w-[180px]">
                            ✓ {localAvatarFileName}
                          </span>
                        )}
                      </div>

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLocalAvatarUpload}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                      />

                      {/* Upload from PC Button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 bg-[#2b2d31] hover:bg-[#35373c] text-white px-3 py-2 rounded-lg border border-[#3e4047] hover:border-[#5865F2] text-xs font-bold transition-all shadow-sm group"
                        >
                          <FolderOpen className="w-4 h-4 text-[#5865F2] group-hover:scale-110 transition-transform" />
                          <span>Carregar Foto do Computador</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAvatarUrl(presetAvatars[0]);
                            setLocalAvatarFileName(null);
                            updateUserProfile({ avatar: presetAvatars[0] });
                            saveUserProfileToDb({ id: currentUser.id, avatar: presetAvatars[0] });
                            setSavedToast(true);
                            setTimeout(() => setSavedToast(false), 2000);
                          }}
                          title="Restaurar avatar padrão"
                          className="p-2 bg-[#2b2d31] hover:bg-[#35373c] text-[#949ba4] hover:text-white rounded-lg border border-[#3e4047] transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      {localAvatarError && (
                        <p className="text-xs text-[#f23f43] font-medium">{localAvatarError}</p>
                      )}

                      {/* Quick Presets */}
                      <div className="pt-1">
                        <span className="text-[10px] text-[#949ba4] uppercase font-semibold block mb-1">
                          Ou escolha um avatar pré-definido:
                        </span>
                        <div className="flex items-center gap-2">
                          {presetAvatars.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              onClick={() => {
                                setAvatarUrl(url);
                                setLocalAvatarFileName(null);
                                saveAvatarToVault(currentUser.id, currentUser.email, url);
                                updateUserProfile({ avatar: url });
                                saveUserProfileToDb({ id: currentUser.id, email: currentUser.email, avatar: url });
                                setSavedToast(true);
                                setTimeout(() => setSavedToast(false), 2000);
                              }}
                              alt="Preset"
                              className={`w-9 h-9 rounded-full object-cover cursor-pointer transition-all hover:scale-110 ${
                                avatarUrl === url ? 'ring-2 ring-[#5865F2] scale-105' : 'opacity-70 hover:opacity-100'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <input
                        type="text"
                        value={avatarUrl.startsWith('data:') ? '[Foto carregada do computador]' : avatarUrl}
                        onChange={e => {
                          if (!e.target.value.startsWith('[Foto')) {
                            setAvatarUrl(e.target.value);
                            setLocalAvatarFileName(null);
                            updateUserProfile({ avatar: e.target.value });
                          }
                        }}
                        placeholder="Ou cole a URL da sua foto"
                        className="w-full bg-[#1e1f22] text-xs text-white px-3 py-1.5 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
                      />
                    </div>

                    {/* Banner Color Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#dbdee1] uppercase">Cor do Banner</label>
                      <div className="flex items-center gap-2">
                        {presetBanners.map(color => (
                          <div
                            key={color}
                            onClick={() => setBannerColor(color)}
                            style={{ backgroundColor: color }}
                            className={`w-7 h-7 rounded-full cursor-pointer transition-all hover:scale-110 ${
                              bannerColor === color ? 'ring-2 ring-white scale-110' : ''
                            }`}
                          />
                        ))}
                        <input
                          type="color"
                          value={bannerColor}
                          onChange={e => setBannerColor(e.target.value)}
                          className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0"
                          title="Escolher cor personalizada"
                        />
                      </div>
                    </div>

                    {/* About Me / Bio */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#dbdee1] uppercase">Sobre Mim (Bio)</label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="Escreva algo sobre você..."
                        className="w-full bg-[#1e1f22] text-xs text-white px-3.5 py-2 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2] resize-none"
                      />
                    </div>

                    {/* Custom Status */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#dbdee1] uppercase">Status Personalizado</label>
                      <div className="flex items-center gap-2 bg-[#1e1f22] px-3 py-1.5 rounded-lg border border-[#3e4047]">
                        <Smile className="w-4 h-4 text-[#5865F2]" />
                        <input
                          type="text"
                          value={customStatusText}
                          onChange={e => setCustomStatusText(e.target.value)}
                          placeholder="Definir status..."
                          className="w-full bg-transparent text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Profile Card Preview */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#949ba4] uppercase tracking-wider block">
                      Pré-visualização do Perfil
                    </label>

                    <div className="bg-[#232428] rounded-2xl overflow-hidden shadow-2xl border border-[#3e4047] max-w-sm mx-auto">
                      {/* Banner */}
                      <div
                        className="h-24 w-full transition-colors relative"
                        style={{ backgroundColor: bannerColor }}
                      />

                      {/* Avatar & Badges */}
                      <div className="px-4 pb-4 relative pt-12 space-y-3">
                        <div className="absolute -top-10 left-4">
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            title="Clique para escolher foto do computador"
                            className="relative cursor-pointer group"
                          >
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-20 h-20 rounded-full object-cover ring-8 ring-[#232428] shadow-xl group-hover:brightness-75 transition-all"
                            />
                            <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white text-[10px] font-bold">
                              <Camera className="w-5 h-5 mb-0.5" />
                              <span>Trocar</span>
                            </div>
                            <div
                              className={`absolute bottom-0 right-0 w-5 h-5 rounded-full ring-4 ring-[#232428] ${
                                currentUser.status === 'online'
                                  ? 'bg-[#23a55a]'
                                  : currentUser.status === 'idle'
                                  ? 'bg-[#f0b232]'
                                  : currentUser.status === 'dnd'
                                  ? 'bg-[#f23f43]'
                                  : 'bg-[#80848e]'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Name and Pronouns */}
                        <div>
                          <div className="text-base font-bold text-white leading-tight">{displayName}</div>
                          <div className="text-xs text-[#949ba4] leading-tight">#{username}</div>
                          {pronouns && (
                            <div className="text-[11px] text-[#b5bac1] mt-0.5">{pronouns}</div>
                          )}
                        </div>

                        {/* Custom Status */}
                        {customStatusText && (
                          <div className="bg-[#1e1f22] p-2 rounded-lg text-xs text-[#dbdee1] flex items-center gap-1.5 border border-[#35373c]">
                            <Smile className="w-3.5 h-3.5 text-[#5865F2]" />
                            <span>{customStatusText}</span>
                          </div>
                        )}

                        {/* Bio */}
                        {bio && (
                          <div className="space-y-1 pt-2 border-t border-[#35373c]">
                            <div className="text-[10px] font-bold text-[#949ba4] uppercase">Sobre Mim</div>
                            <p className="text-xs text-[#dbdee1] leading-relaxed whitespace-pre-line">{bio}</p>
                          </div>
                        )}

                        {/* Roles */}
                        <div className="space-y-1 pt-2 border-t border-[#35373c]">
                          <div className="text-[10px] font-bold text-[#949ba4] uppercase">Cargos</div>
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[10px] font-bold bg-[#f0b232]/20 text-[#f0b232] px-2 py-0.5 rounded border border-[#f0b232]/40 flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Administrador
                            </span>
                            <span className="text-[10px] font-bold bg-[#5865F2]/20 text-[#5865F2] px-2 py-0.5 rounded border border-[#5865F2]/40">
                              Diskai Pioneer
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-[#313338]/95 backdrop-blur-sm pt-3 pb-1 border-t border-[#35373c] flex items-center justify-between z-10">
                  <div className="text-xs text-[#949ba4] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#5865F2]" />
                    <span>Fotos e avatares são salvos instantaneamente!</span>
                  </div>
                  <button
                    type="submit"
                    className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow"
                  >
                    <Check className="w-4 h-4" />
                    Salvar Alterações de Perfil
                  </button>
                </div>
              </form>
            )}

            {/* TAB: Aparência (Temas & Cores) */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">Aparência do Diskai</h3>
                  <p className="text-xs text-[#949ba4]">
                    Personalize a interface com os temas clássicos e gradientes inspirados no Discord Nitro.
                  </p>
                </div>

                {/* 5 Theme Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* 1. Escuro (Discord Night) */}
                  <div
                    onClick={() => setThemeMode('dark')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-44 ${
                      theme === 'dark'
                        ? 'bg-[#1e1f22] border-[#5865F2] shadow-xl shadow-[#5865F2]/20 ring-2 ring-[#5865F2]/40'
                        : 'bg-[#2b2d31] border-transparent hover:border-[#3e4047]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-sm">
                        <Moon className="w-4 h-4 text-[#5865F2]" />
                        <span>Escuro (Padrão)</span>
                      </div>
                      {theme === 'dark' && <Check className="w-4 h-4 text-[#5865F2]" />}
                    </div>

                    <div className="space-y-2 bg-[#313338] p-3 rounded-xl border border-[#3e4047]">
                      <div className="w-16 h-2 bg-[#5865F2] rounded" />
                      <div className="w-24 h-2 bg-[#4e5058] rounded" />
                    </div>

                    <span className="text-[11px] text-[#949ba4]">Visual clássico escuro original do Discord.</span>
                  </div>

                  {/* 2. Claro (White Day) */}
                  <div
                    onClick={() => setThemeMode('light')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-44 ${
                      theme === 'light'
                        ? 'bg-[#f2f3f5] border-[#5865F2] shadow-xl shadow-[#5865F2]/20 ring-2 ring-[#5865F2]/40 text-gray-900'
                        : 'bg-[#2b2d31] border-transparent hover:border-[#3e4047]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 font-bold text-sm ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        <Sun className="w-4 h-4 text-[#f0b232]" />
                        <span>Claro Suave</span>
                      </div>
                      {theme === 'light' && <Check className="w-4 h-4 text-[#5865F2]" />}
                    </div>

                    <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-300">
                      <div className="w-16 h-2 bg-[#5865F2] rounded" />
                      <div className="w-24 h-2 bg-gray-300 rounded" />
                    </div>

                    <span className="text-[11px] text-[#949ba4]">Tema claro com alto contraste para o dia a dia.</span>
                  </div>

                  {/* 3. Floresta Esmeralda (Verde) */}
                  <div
                    onClick={() => setThemeMode('emerald')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-44 ${
                      theme === 'emerald'
                        ? 'bg-[#142920] border-[#23a55a] shadow-xl shadow-[#23a55a]/20 ring-2 ring-[#23a55a]/40'
                        : 'bg-[#2b2d31] border-transparent hover:border-[#3e4047]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-sm">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#23a55a] flex-shrink-0" />
                        <span>Esmeralda (Verde)</span>
                      </div>
                      {theme === 'emerald' && <Check className="w-4 h-4 text-[#23a55a]" />}
                    </div>

                    <div className="space-y-2 bg-[#0d1b15] p-3 rounded-xl border border-[#1a382a]">
                      <div className="w-16 h-2 bg-[#23a55a] rounded" />
                      <div className="w-24 h-2 bg-[#1b362b] rounded" />
                    </div>

                    <span className="text-[11px] text-[#949ba4]">Tons de floresta e esmeralda profunda.</span>
                  </div>

                  {/* 4. Vinho Carmim (Vermelho) */}
                  <div
                    onClick={() => setThemeMode('crimson')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-44 ${
                      theme === 'crimson'
                        ? 'bg-[#261215] border-[#f23f43] shadow-xl shadow-[#f23f43]/20 ring-2 ring-[#f23f43]/40'
                        : 'bg-[#2b2d31] border-transparent hover:border-[#3e4047]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-sm">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#f23f43] flex-shrink-0" />
                        <span>Carmim (Vermelho)</span>
                      </div>
                      {theme === 'crimson' && <Check className="w-4 h-4 text-[#f23f43]" />}
                    </div>

                    <div className="space-y-2 bg-[#1a0c0e] p-3 rounded-xl border border-[#3a1b20]">
                      <div className="w-16 h-2 bg-[#f23f43] rounded" />
                      <div className="w-24 h-2 bg-[#33181c] rounded" />
                    </div>

                    <span className="text-[11px] text-[#949ba4]">Tons de veludo rubi e vinho avermelhado.</span>
                  </div>

                  {/* 5. Sakura Neon (Rosa) */}
                  <div
                    onClick={() => setThemeMode('sakura')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-44 sm:col-span-2 lg:col-span-1 ${
                      theme === 'sakura'
                        ? 'bg-[#261226] border-[#eb459e] shadow-xl shadow-[#eb459e]/20 ring-2 ring-[#eb459e]/40'
                        : 'bg-[#2b2d31] border-transparent hover:border-[#3e4047]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-sm">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#eb459e] flex-shrink-0" />
                        <span>Sakura (Rosa)</span>
                      </div>
                      {theme === 'sakura' && <Check className="w-4 h-4 text-[#eb459e]" />}
                    </div>

                    <div className="space-y-2 bg-[#180b18] p-3 rounded-xl border border-[#3f1a3f]">
                      <div className="w-16 h-2 bg-[#eb459e] rounded" />
                      <div className="w-24 h-2 bg-[#361836] rounded" />
                    </div>

                    <span className="text-[11px] text-[#949ba4]">Tons fúcsia e flores de cerejeira neon.</span>
                  </div>
                </div>

                <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3e4047] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Alternância Rápida de Tema</div>
                    <div className="text-xs text-[#949ba4]">O tema selecionado é salvo e permanece ativo automaticamente em todas as sessões.</div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-lg bg-[#1e1f22] text-white hover:bg-[#35373c] transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    <Sun className="w-4 h-4 text-[#f0b232]" />
                    <span>Alternar Rápido</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: Áudio & Voz */}
            {activeTab === 'audio' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">Dispositivos & Efeitos Sonoros</h3>
                  <p className="text-xs text-[#949ba4]">Configure o som, teste a câmera e a qualidade da captura de áudio.</p>
                </div>

                {/* Test Camera & Mic Bridge Card */}
                <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3e4047] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Camera className="w-4 h-4 text-indigo-400" />
                        <span>Ponte de Teste de Câmera & Microfone</span>
                      </div>
                      <div className="text-xs text-[#949ba4] mt-0.5">
                        Veja-se antecipadamente na câmera e acompanhe as oscilações do medidor de volume do microfone em tempo real.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPreCallDeviceModal(true)}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 hover:scale-105 active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Testar Câmera & Mic</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3e4047] flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Efeitos Sonoros do Discord</div>
                    <div className="text-xs text-[#949ba4]">Toques de chamada, mute e alertas sintetizados</div>
                  </div>
                  <button
                    onClick={toggleSound}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      soundEnabled ? 'bg-[#23a55a] text-white' : 'bg-[#35373c] text-[#949ba4]'
                    }`}
                  >
                    {soundEnabled ? 'Ativado' : 'Desativado'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: Notificações & Popups */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#5865F2]" />
                    Configurações de Notificações
                  </h3>
                  <p className="text-xs text-[#949ba4]">
                    Controle os alertas e avisos popups flutuantes que surgem no Diskai.
                  </p>
                </div>

                <div className="bg-[#2b2d31] p-5 rounded-2xl border border-[#3e4047] space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Popup de Mensagens Não Lidas (3 Pulos a cada 30s)</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            unreadPopupEnabled
                              ? 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/40'
                              : 'bg-[#80848e]/20 text-[#80848e]'
                          }`}
                        >
                          {unreadPopupEnabled ? 'Ativado' : 'Desativado'}
                        </span>
                      </div>
                      <p className="text-xs text-[#949ba4] max-w-md mt-1">
                        Exibe o cartão animado com 3 pulos no canto inferior direito a cada 30 segundos enquanto houver mensagens pendentes.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleUnreadPopup}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow flex-shrink-0 ${
                        unreadPopupEnabled
                          ? 'bg-[#f23f43] hover:bg-[#da373c] text-white'
                          : 'bg-[#23a55a] hover:bg-[#1f934f] text-white'
                      }`}
                    >
                      {unreadPopupEnabled ? 'Remover / Desativar Popup' : 'Ativar Popup'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Motor de IA & Chave Gemini */}
            {activeTab === 'ai' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#5865F2]" />
                    Configurações de IA & Chave Gemini da Arara Assistente
                  </h3>
                  <p className="text-xs text-[#949ba4]">
                    Configure sua chave de API do Google Gemini para a Arara Assistente analisar em tempo real mensagens, compromissos, canais e responder com inteligência completa.
                  </p>
                </div>

                {/* Gemini API Key Box */}
                <div className="bg-[#2b2d31] p-5 rounded-2xl border border-[#3e4047] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>Chave da API do Google Gemini</span>
                    </div>
                    {savedKeyToast && (
                      <span className="text-xs font-bold text-[#23a55a] flex items-center gap-1 animate-in fade-in">
                        <Check className="w-3.5 h-3.5" /> Chave salva!
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#949ba4]">
                    Insira sua chave <strong className="text-amber-400">Google Gemini</strong> (ex: <code className="bg-[#1e1f22] px-1 py-0.5 rounded text-gray-300">AIzaSy...</code>). Quando ativa, a Arara responderá relacionando todas as informações da plataforma em tempo real.
                  </p>

                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiApiKeyInput}
                      onChange={e => setGeminiApiKeyInput(e.target.value)}
                      className="w-full bg-[#1e1f22] text-sm text-white px-3.5 py-2.5 rounded-xl border border-[#3e4047] focus:outline-none focus:border-[#5865F2] font-mono"
                    />

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        disabled={geminiTestState.loading || !geminiApiKeyInput.trim()}
                        onClick={async () => {
                          setGeminiTestState({ loading: true, success: null, message: null });
                          const res = await testGeminiApiKey(geminiApiKeyInput);
                          setGeminiTestState({ loading: false, success: res.success, message: res.message });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#1e1f22] hover:bg-[#35373c] text-white text-xs font-bold border border-[#3e4047] transition-all disabled:opacity-50"
                      >
                        {geminiTestState.loading ? 'Testando conexão...' : 'Testar Conexão com Gemini'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGeminiApiKey(geminiApiKeyInput);
                          setSavedKeyToast(true);
                          setTimeout(() => setSavedKeyToast(false), 2000);
                        }}
                        className="px-5 py-2 rounded-xl bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all shadow-md"
                      >
                        Salvar Chave
                      </button>
                    </div>

                    {geminiTestState.message && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-center gap-2 mt-2 ${
                          geminiTestState.success
                            ? 'bg-[#23a55a]/15 border-[#23a55a]/40 text-[#23a55a]'
                            : 'bg-[#f23f43]/15 border-[#f23f43]/40 text-[#f23f43]'
                        }`}
                      >
                        {geminiTestState.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span>{geminiTestState.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3e4047] space-y-3">
                  <div className="text-sm font-bold text-white">Status do Motor de IA</div>
                  <div className="p-3 bg-[#1e1f22] rounded-lg border border-[#23a55a]/40 text-xs text-[#23a55a] font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#23a55a] animate-pulse" />
                    {geminiApiKeyInput.trim()
                      ? 'Arara Assistente Conectada ao Google Gemini 1.5 Flash (Análise em Tempo Real Ativa)'
                      : 'Motor Local Inteligente Ativo (Gratuito & Ilimitado - Adicione sua chave para Gemini)'}
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Pre-Call Camera & Mic Device Test Modal */}
      {showPreCallDeviceModal && (
        <PreCallDeviceModal
          callTargetName="Teste de Dispositivos"
          isVideoCall={true}
          onClose={() => setShowPreCallDeviceModal(false)}
          onConfirm={() => setShowPreCallDeviceModal(false)}
        />
      )}
    </div>
  );
};
