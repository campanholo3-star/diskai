import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Smile,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Eye,
  Shield,
  Key,
  Link,
  Bot,
  AlertTriangle,
  Check,
  Hash,
  Volume2,
  MessagesSquare,
  Lock
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { Channel } from '../../types';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
}

const SLOW_MODE_OPTIONS = [
  { value: 0, label: 'Desligado' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
  { value: 600, label: '10m' },
  { value: 900, label: '15m' },
  { value: 1800, label: '30m' },
  { value: 3600, label: '1h' },
  { value: 7200, label: '2h' },
  { value: 21600, label: '6h' }
];

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  isOpen,
  onClose,
  channel
}) => {
  const {
    activeServer,
    updateChannel,
    deleteChannel,
    participants,
    friends,
    currentUser
  } = useDiskai();

  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'invites' | 'integrations'>('overview');
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [slowMode, setSlowMode] = useState<number>(0);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowedMembers, setAllowedMembers] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setTopic(channel.topic || '');
      setSlowMode(channel.slowMode || 0);
      setIsSpoiler(!!channel.isSpoiler);
      setIsPrivate(!!channel.isPrivate);
      setAllowedMembers(channel.allowedMemberIds || [currentUser.id]);
      setDeleteConfirmOpen(false);
    }
  }, [channel]);

  if (!isOpen || !channel) return null;

  const isDirty =
    name !== channel.name ||
    topic !== (channel.topic || '') ||
    slowMode !== (channel.slowMode || 0) ||
    isSpoiler !== (!!channel.isSpoiler) ||
    isPrivate !== (!!channel.isPrivate) ||
    JSON.stringify(allowedMembers) !== JSON.stringify(channel.allowedMemberIds || []);

  const handleReset = () => {
    setName(channel.name);
    setTopic(channel.topic || '');
    setSlowMode(channel.slowMode || 0);
    setIsSpoiler(!!channel.isSpoiler);
    setIsPrivate(!!channel.isPrivate);
    setAllowedMembers(channel.allowedMemberIds || [currentUser.id]);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    updateChannel(activeServer.id, channel.id, {
      name: channel.type === 'voice' ? name.trim() : name.trim().toLowerCase().replace(/\s+/g, '-'),
      topic: topic.trim(),
      slowMode,
      isSpoiler,
      isPrivate,
      allowedMemberIds: isPrivate ? allowedMembers : undefined
    });

    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
    }, 1500);
  };

  const handleDelete = () => {
    deleteChannel(activeServer.id, channel.id);
    onClose();
  };

  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    setTopic(prev => `${prev} ${prefix}texto${suffix}`);
  };

  // Keyboard shortcut ESC
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="fixed inset-0 bg-[#313338] z-50 flex text-[#dbdee1] overflow-hidden focus:outline-none animate-in fade-in duration-150"
    >
      {/* 1. Left Navigation Sidebar */}
      <div className="w-60 bg-[#2b2d31] p-6 flex flex-col justify-between border-r border-[#1f2023] flex-shrink-0">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider flex items-center gap-1.5 truncate">
              {channel.type === 'voice' ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : channel.type === 'forum' ? (
                <MessagesSquare className="w-3.5 h-3.5" />
              ) : (
                <Hash className="w-3.5 h-3.5" />
              )}
              <span className="truncate">{channel.name}</span>
            </div>
            <div className="text-[10px] text-[#80848e] uppercase font-semibold">
              {channel.type === 'voice' ? 'Canais de Voz' : 'Canais de Texto'}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${
                activeTab === 'overview'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <span>Visão geral</span>
            </button>

            <button
              onClick={() => setActiveTab('permissions')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${
                activeTab === 'permissions'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <span>Permissões</span>
              {isPrivate && <Lock className="w-3.5 h-3.5 text-[#f0b232]" />}
            </button>

            <button
              onClick={() => setActiveTab('invites')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${
                activeTab === 'invites'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <span>Convites</span>
            </button>

            <button
              onClick={() => setActiveTab('integrations')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${
                activeTab === 'integrations'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <span>Integrações</span>
            </button>

            {/* Divider and Delete Channel */}
            <div className="pt-2 border-t border-[#3e4047]">
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-[#f23f43] hover:bg-[#f23f43]/15 transition-colors flex items-center justify-between group"
              >
                <span>Excluir canal</span>
                <Trash2 className="w-4 h-4 text-[#f23f43] group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </nav>
        </div>

        {/* Server & Channel info footer */}
        <div className="text-xs text-[#80848e] bg-[#1e1f22] p-3 rounded-xl border border-[#383a40]">
          Servidor: <strong>{activeServer.name}</strong>
        </div>
      </div>

      {/* 2. Right Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header with ESC Button */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-bold text-white tracking-tight">
            {activeTab === 'overview'
              ? 'Visão geral'
              : activeTab === 'permissions'
              ? 'Permissões do canal'
              : activeTab === 'invites'
              ? 'Convites ativos'
              : 'Integrações & Webhooks'}
          </h1>

          {/* Discord-style ESC button */}
          <div className="flex flex-col items-center">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-[#4e5058] hover:bg-[#35373c] flex items-center justify-center text-[#949ba4] hover:text-white transition-all shadow"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-[10px] text-[#949ba4] font-bold mt-1 uppercase">ESC</span>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto px-8 pb-24 space-y-6 max-w-2xl">
          {/* ===================== TAB: OVERVIEW ===================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Field 1: Nome do canal */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
                  Nome do canal
                </label>
                <div className="flex items-center bg-[#1e1f22] border border-[#3e4047] rounded-xl px-3 py-2.5 focus-within:border-[#5865F2] transition-colors">
                  <span className="text-[#949ba4] mr-2">
                    {channel.type === 'voice' ? <Volume2 className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="geral"
                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setName(prev => prev + '💡')}
                    className="text-[#949ba4] hover:text-white p-1 rounded hover:bg-[#35373c] transition-colors ml-1"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Field 2: Assunto do canal (Topic) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
                  Assunto do canal
                </label>
                <div className="bg-[#1e1f22] border border-[#3e4047] rounded-xl overflow-hidden focus-within:border-[#5865F2] transition-colors">
                  {/* Rich text formatting bar */}
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-[#2b2d31] bg-[#232428] text-[#949ba4]">
                    <button
                      type="button"
                      onClick={() => applyFormatting('**')}
                      title="Negrito"
                      className="p-1.5 hover:text-white hover:bg-[#35373c] rounded"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('*')}
                      title="Itálico"
                      className="p-1.5 hover:text-white hover:bg-[#35373c] rounded"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('__')}
                      title="Sublinhado"
                      className="p-1.5 hover:text-white hover:bg-[#35373c] rounded"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('~~')}
                      title="Tachado"
                      className="p-1.5 hover:text-white hover:bg-[#35373c] rounded"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('||')}
                      title="Spoiler"
                      className="p-1.5 hover:text-white hover:bg-[#35373c] rounded"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => applyFormatting('✨')}
                      className="p-1.5 hover:text-white hover:bg-[#35373c] rounded"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    maxLength={1024}
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Mostre pra todo mundo como se usa este canal!"
                    className="w-full bg-transparent p-3 text-sm text-white placeholder-[#80848e] focus:outline-none resize-none"
                  />
                  <div className="px-3 pb-2 text-right text-[11px] text-[#80848e]">
                    {1024 - topic.length}
                  </div>
                </div>
              </div>

              {/* Field 3: Modo Lento (Slow Mode) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
                  Modo Lento
                </label>
                <div className="relative">
                  <select
                    value={slowMode}
                    onChange={e => setSlowMode(Number(e.target.value))}
                    className="w-full bg-[#1e1f22] border border-[#3e4047] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#5865F2] cursor-pointer"
                  >
                    {SLOW_MODE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-[#2b2d31]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-[#949ba4] leading-relaxed">
                  Membros só poderão enviar uma mensagem e criar um tópico a cada intervalo deste, a menos que tenham a permissão Ignorar Modo Lento.
                </p>
              </div>

              {/* Field 4: Visibilidade do Conteúdo */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
                  Visibilidade do conteúdo
                </label>
                <div className="space-y-3">
                  <label
                    onClick={() => setIsSpoiler(false)}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={!isSpoiler}
                      onChange={() => setIsSpoiler(false)}
                      className="mt-1 accent-[#5865F2]"
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">Padrão</div>
                      <div className="text-xs text-[#949ba4]">O conteúdo do canal fica sempre visível.</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setIsSpoiler(true)}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={isSpoiler}
                      onChange={() => setIsSpoiler(true)}
                      className="mt-1 accent-[#5865F2]"
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">Canal de spoiler</div>
                      <div className="text-xs text-[#949ba4] leading-relaxed">
                        Marque este canal como contendo spoilers, para que plot twists, assuntos pesados e outras discussões sensíveis fiquem ocultas até que os usuários escolham visualizá-las.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: PERMISSIONS ===================== */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#3e4047] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-5 h-5 text-[#f0b232]" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Canal Privado</h3>
                      <p className="text-xs text-[#949ba4]">
                        Apenas pessoas e cargos selecionados podem ver e interagir neste canal.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(prev => !prev)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      isPrivate ? 'bg-[#5865F2]' : 'bg-[#4e5058]'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        isPrivate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
                  Membros com Acesso ao Canal ({allowedMembers.length})
                </h4>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1e1f22] border border-[#3e4047]">
                    <div className="flex items-center gap-2.5">
                      <img src={currentUser.avatar} alt="You" className="w-6 h-6 rounded-full object-cover" />
                      <div>
                        <div className="text-xs font-bold text-white">{currentUser.name} (Você)</div>
                        <div className="text-[10px] text-[#949ba4]">Dono / Administrador</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#23a55a] font-bold bg-[#23a55a]/10 px-2 py-0.5 rounded border border-[#23a55a]/30">
                      Permissão Permanente
                    </span>
                  </div>

                  {friends.map(f => {
                    const isChecked = allowedMembers.includes(f.user.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() => {
                          setAllowedMembers(prev =>
                            prev.includes(f.user.id)
                              ? prev.filter(uid => uid !== f.user.id)
                              : [...prev, f.user.id]
                          );
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#5865F2]/20 border-[#5865F2]/40' : 'bg-[#1e1f22] border-[#3e4047] hover:bg-[#35373c]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={f.user.avatar} alt={f.user.name} className="w-6 h-6 rounded-full object-cover" />
                          <div>
                            <div className="text-xs font-bold text-white">{f.user.name}</div>
                            <div className="text-[10px] text-[#949ba4]">#{f.user.tag}</div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border ${
                            isChecked ? 'bg-[#5865F2] border-[#5865F2]' : 'border-[#4e5058]'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: INVITES ===================== */}
          {activeTab === 'invites' && (
            <div className="space-y-4">
              <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#3e4047] space-y-3">
                <div className="flex items-center gap-2">
                  <Link className="w-4 h-4 text-[#5865F2]" />
                  <span className="text-xs font-bold text-white uppercase">Link Direto do Canal</span>
                </div>
                <div className="flex items-center gap-2 bg-[#2b2d31] p-2.5 rounded-lg border border-[#3e4047]">
                  <span className="text-xs text-[#949ba4] font-mono truncate flex-1">
                    https://diskai.app/channels/{activeServer.id}/{channel.id}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`https://diskai.app/channels/${activeServer.id}/${channel.id}`);
                      alert('Link copiado para a área de transferência!');
                    }}
                    className="px-3 py-1 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold rounded transition-colors shadow"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: INTEGRATIONS ===================== */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#3e4047] space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Bot className="w-4 h-4 text-[#5865F2]" />
                  <span>Diskai AI Bot & Gravação Automática</span>
                </div>
                <p className="text-xs text-[#949ba4] leading-relaxed">
                  Este canal está conectado ao motor inteligente do DiskAI para geração de atas de reuniões, transcrições em tempo real e resumos automáticos com IA.
                </p>
                <div className="pt-2">
                  <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] font-bold px-2 py-0.5 rounded border border-[#23a55a]/40">
                    Ativo e Monitorando
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Floating "Save Changes" Bottom Banner (Discord Style) */}
        {isDirty && (
          <div className="absolute bottom-4 left-8 right-8 bg-[#111214] border border-[#3e4047] rounded-xl px-4 py-3 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
            <span className="text-xs font-medium text-white">
              Cuidado — você tem alterações não salvas!
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-semibold text-white hover:underline transition-colors"
              >
                Redefinir
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold rounded-lg transition-colors shadow"
              >
                Salvar alterações
              </button>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {saveToast && (
          <div className="absolute top-4 right-8 bg-[#23a55a] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4" />
            <span>Configurações do canal salvas com sucesso!</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal to Delete Channel */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#2b2d31] border border-[#f23f43]/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-[#dbdee1]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f23f43]/20 border border-[#f23f43]/30 flex items-center justify-center text-[#f23f43] flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir canal</h3>
                <p className="text-xs text-[#949ba4]">Tem certeza de que deseja excluir <strong>#{channel.name}</strong>?</p>
              </div>
            </div>

            <p className="text-xs text-[#dbdee1] leading-relaxed">
              Esta ação não pode ser desfeita. Todas as mensagens e mídias compartilhadas neste canal serão excluídas permanentemente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#3e4047]">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-[#1e1f22] hover:bg-[#35373c] text-white text-xs font-semibold rounded-lg transition-colors border border-[#3e4047]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-[#f23f43] hover:bg-[#da373c] text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-[#f23f43]/20 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Canal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
