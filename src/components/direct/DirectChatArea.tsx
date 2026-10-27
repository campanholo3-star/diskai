import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Video,
  Pin,
  UserPlus,
  PlusCircle,
  Smile,
  Send,
  Sparkles,
  Bot,
  FileText,
  Sun,
  Moon,
  Bell,
  Trash2,
  Paperclip,
  X,
  Pencil,
  SmilePlus
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { MessageEmbed, MessageAttachment } from '../../types';
import { EmojiPickerModal } from '../common/EmojiPickerModal';
import { NotificationCenterModal } from '../modals/NotificationCenterModal';
import { PinnedMessagesModal } from '../modals/PinnedMessagesModal';
import { GroupMembersModal } from '../modals/GroupMembersModal';
import { PreCallDeviceModal } from '../call/PreCallDeviceModal';
import { MessageAttachmentsView, formatFileSize, compressFileAttachment } from '../chat/MessageAttachmentsView';
import { uploadStorageFile } from '../../services/supabase';

export const DirectChatArea: React.FC = () => {
  const {
    activeDmUserId,
    friends,
    directMessages,
    sendDirectMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    startDmCall,
    currentUser,
    setTutorialOpen,
    openSummaryModal,
    summaries,
    theme,
    toggleTheme,
    notifications,
    pinMessage,
    togglePinMessage,
    removeFriend,
    generateChatSummary,
    isGeneratingChatSummary,
    setServerManagementModalOpen,
    setServerManagementTab
  } = useDiskai();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [preCallModal, setPreCallModal] = useState<{ isOpen: boolean; isVideo: boolean } | null>(null);
  const [stagedAttachments, setStagedAttachments] = useState<MessageAttachment[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; content: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeFriend = friends.find(f => f.id === activeDmUserId);
  const friendUser = activeFriend?.user;
  const dmMessages = activeDmUserId ? directMessages[activeDmUserId] || [] : [];
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [dmMessages.length, activeDmUserId]);

  if (!friendUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#313338] text-[#949ba4]">
        Selecione uma conversa para começar.
      </div>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      try {
        const { url, size } = await compressFileAttachment(file);

        const newAtt: MessageAttachment = {
          id: `att-dm-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size,
          type: file.type || 'application/octet-stream',
          url
        };

        setStagedAttachments(prev => [...prev, newAtt]);

        // Upload para o Supabase Storage em segundo plano
        uploadStorageFile(file, 'attachments')
          .then(res => {
            if (res.success && res.url) {
              setStagedAttachments(prev =>
                prev.map(a => (a.id === newAtt.id ? { ...a, url: res.url! } : a))
              );
            }
          })
          .catch(() => {});
      } catch (err) {
        console.error('Erro ao processar anexo direto:', err);
      }
    }

    e.target.value = '';
  };

  const removeStagedAttachment = (id: string) => {
    setStagedAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && stagedAttachments.length === 0) || !activeDmUserId) return;
    sendDirectMessage(
      activeDmUserId,
      inputText,
      stagedAttachments.length > 0 ? stagedAttachments : undefined
    );
    setInputText('');
    setStagedAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickEmojis = ['👍', '❤️', '😂', '🎉', '🔥'];

  const handleStartEdit = (msgId: string, currentContent: string) => {
    setEditingMessageId(msgId);
    setEditingText(currentContent);
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editingText.trim() || !activeDmUserId) return;
    editMessage(msgId, editingText.trim(), activeDmUserId);
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleConfirmDelete = () => {
    if (deleteCandidate && activeDmUserId) {
      deleteMessage(deleteCandidate.id, activeDmUserId);
      setDeleteCandidate(null);
    }
  };

  const renderEmbed = (embed: MessageEmbed) => {
    const summary = embed.meetingSummaryId
      ? summaries.find(s => s.id === embed.meetingSummaryId)
      : null;

    return (
      <div className="mt-2 max-w-xl bg-[#2b2d31] border-l-4 border-[#5865F2] rounded-r-xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5865F2] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Diskai AI Intelligence
          </div>
          {summary && (
            <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] font-semibold px-2 py-0.5 rounded border border-[#23a55a]/30">
              {summary.sentiment}
            </span>
          )}
        </div>

        <div className="font-bold text-white text-base">{embed.title}</div>
        <p className="text-sm text-[#dbdee1] leading-relaxed">{embed.description}</p>

        {embed.fields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#35373c]">
            {embed.fields.map((f, i) => (
              <div key={i} className={f.inline ? 'col-span-1' : 'col-span-2'}>
                <div className="text-xs font-semibold text-[#949ba4]">{f.name}</div>
                <div className="text-xs text-[#dbdee1] font-medium whitespace-pre-line mt-0.5">{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {summary && (
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => openSummaryModal(summary)}
              className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow"
            >
              <FileText className="w-3.5 h-3.5" />
              Ver Ata da Reunião 1-on-1 & Áudio
            </button>
          </div>
        )}

        {embed.footer && (
          <div className="text-[11px] text-[#949ba4] pt-1 flex items-center gap-1 border-t border-[#35373c]/50">
            {embed.footer.text}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#313338] select-text relative">
      {/* Top DM Header */}
      <div className={`h-12 border-b px-4 flex items-center justify-between select-none shadow-sm flex-shrink-0 z-20 ${
        theme === 'light'
          ? 'bg-white border-black/20 text-black'
          : 'bg-[#313338] border-[#3e4047] text-white'
      }`}>
        <div className="flex items-center gap-3 truncate">
          <div className="relative flex-shrink-0">
            <img
              src={friendUser.avatar}
              alt={friendUser.name}
              className="w-7 h-7 rounded-full object-cover"
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#313338] ${
                friendUser.status === 'online'
                  ? 'bg-[#23a55a]'
                  : friendUser.status === 'idle'
                  ? 'bg-[#f0b232]'
                  : friendUser.status === 'dnd'
                  ? 'bg-[#f23f43]'
                  : 'bg-[#80848e]'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-white text-sm truncate">{friendUser.name}</span>
            <span className="text-xs text-[#949ba4]">#{friendUser.tag}</span>
            {friendUser.isBot && (
              <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 py-0.2 rounded uppercase flex items-center gap-0.5">
                <Bot className="w-2.5 h-2.5" /> BOT
              </span>
            )}
          </div>
        </div>

        {/* Action Header Icons (Theme, Notifications, Calls, Pin, Group) */}
        <div className="flex items-center gap-2 text-[#b5bac1]">
          {/* Quick Voice Call Button with Pre-Call Test Bridge */}
          <button
            onClick={() => setPreCallModal({ isOpen: true, isVideo: false })}
            title="Testar Câmera/Microfone & Iniciar Chamada de Voz"
            className="p-2 rounded-xl text-emerald-400 bg-white/[0.04] hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-500/30 transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Quick Video Call Button with Pre-Call Test Bridge */}
          <button
            onClick={() => setPreCallModal({ isOpen: true, isVideo: true })}
            title="Testar Câmera/Microfone & Iniciar Chamada de Vídeo"
            className="p-2 rounded-xl text-indigo-400 bg-white/[0.04] hover:bg-indigo-500/15 border border-white/[0.08] hover:border-indigo-500/30 transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* AI Chat Summarizer Button (Gemini Flash) */}
          <button
            onClick={() => generateChatSummary(friendUser.id, friendUser.name)}
            disabled={isGeneratingChatSummary}
            title="Resumir mensagens desta conversa com IA (Gemini Flash)"
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-purple-500/15 hover:from-cyan-500/25 hover:via-indigo-500/25 hover:to-purple-500/25 text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400/50 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:shadow-[0_0_18px_rgba(6,182,212,0.3)] active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${isGeneratingChatSummary ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isGeneratingChatSummary ? 'Resumindo...' : 'Resumir com IA'}
            </span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para Tema Claro (White)' : 'Mudar para Tema Escuro (Night)'}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-[#b5bac1] hover:text-white transition-all hover:scale-105 active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          {/* Notification Bell Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationCenter(!showNotificationCenter);
                setShowPinnedModal(false);
              }}
              title="Notificações"
              className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 relative ${
                showNotificationCenter
                  ? 'bg-indigo-500/20 text-white border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.15] text-[#b5bac1] hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#313338] shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              )}
            </button>

            {showNotificationCenter && (
              <div className="absolute right-0 top-12 z-50">
                <NotificationCenterModal onClose={() => setShowNotificationCenter(false)} />
              </div>
            )}
          </div>

          {/* Pinned Messages Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPinnedModal(!showPinnedModal);
                setShowNotificationCenter(false);
              }}
              title="Mensagens Fixadas nesta conversa"
              className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                showPinnedModal
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.15] text-[#b5bac1] hover:text-amber-300'
              }`}
            >
              <Pin className="w-4 h-4" />
            </button>

            {showPinnedModal && (
              <div className="absolute right-0 top-12 z-50">
                <PinnedMessagesModal onClose={() => setShowPinnedModal(false)} />
              </div>
            )}
          </div>

          {/* Add to Server / Manage Server Members Button */}
          <button
            onClick={() => {
              setServerManagementTab('members');
              setServerManagementModalOpen(true);
            }}
            title="Adicionar Pessoas ao Servidor"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-[#b5bac1] hover:text-white transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
          </button>

          {/* Tutorial Button */}
          <button
            onClick={() => setTutorialOpen(true)}
            title="Ver Tutorial do Iniciante"
            className="flex items-center gap-1.5 bg-gradient-to-br from-amber-500/10 to-yellow-600/20 hover:from-amber-500/20 hover:to-yellow-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:shadow-[0_0_18px_rgba(245,158,11,0.3)] ml-1 hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Tutorial</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 no-scrollbar">
        {/* Welcome greeting banner */}
        <div className="py-6 space-y-3 border-b border-[#35373c]/60">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl ring-4 ring-[#1e1f22]">
            <img src={friendUser.avatar} alt={friendUser.name} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold text-white">{friendUser.name}</h2>
          <p className="text-sm text-[#949ba4] max-w-xl">
            Este é o início da sua história de mensagem direta com <strong>{friendUser.name}</strong>.
            Você pode iniciar chamadas 1-on-1, gravar as conversas e receber resumos executivos por IA.
          </p>
        </div>

        {/* Message Items */}
        {dmMessages.map(msg => {
          const isMe = msg.userId === currentUser.id || msg.userId === 'user-me' || msg.userId === 'admin-campanholo32';
          const author = isMe ? currentUser : friendUser;

          return (
            <div
              key={msg.id}
              className={`flex gap-4 group hover:bg-[#2e3035] -mx-4 px-4 py-1.5 rounded transition-colors relative ${
                msg.pinned ? 'bg-[#f0b232]/5 border-l-2 border-[#f0b232]' : ''
              } ${
                editingMessageId === msg.id ? 'bg-[#2b2d31]/80 ring-1 ring-[#5865F2]/60' : ''
              }`}
            >
              <img
                src={author.avatar}
                alt={author.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-85"
              />
              <div className="flex-1 min-w-0 overflow-hidden">
                {/* Pinned Message Indicator */}
                {msg.pinned && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#f0b232] mb-1 select-none">
                    <Pin className="w-3 h-3 fill-[#f0b232]" />
                    <span>Mensagem Fixada</span>
                  </div>
                )}
                <div className="flex items-center gap-2 leading-none flex-wrap">
                  <span className={`font-semibold text-sm ${isMe ? 'text-[#f0b232]' : 'text-white'}`}>
                    {author.name}
                  </span>
                  {author.isBot && (
                    <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 py-0.2 rounded uppercase flex items-center gap-0.5">
                      BOT
                    </span>
                  )}
                  <span className="text-[11px] text-[#949ba4] font-medium">{msg.timestamp}</span>
                  {msg.isEdited && (
                    <span className="text-[10px] text-[#949ba4] italic select-none" title={msg.editedAt || 'Mensagem editada'}>
                      (editado)
                    </span>
                  )}
                </div>

                {/* Content or Inline Edit Mode */}
                {editingMessageId === msg.id ? (
                  <div className="mt-2 space-y-2 animate-in fade-in duration-100">
                    <div className={`rounded-lg p-2.5 shadow-inner transition-colors ${
                      theme === 'light'
                        ? 'bg-white border-2 border-black'
                        : 'bg-[#383a40] border-2 border-[#5865F2]'
                    }`}>
                      <textarea
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit(msg.id);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                        rows={2}
                        className={`w-full bg-transparent text-sm focus:outline-none resize-none leading-relaxed ${
                          theme === 'light' ? 'text-black placeholder-slate-500' : 'text-white'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#949ba4]">
                      <span>
                        escape para{' '}
                        <button type="button" onClick={handleCancelEdit} className="text-[#5865F2] hover:underline font-semibold">
                          cancelar
                        </button>{' '}
                        • enter para{' '}
                        <button type="button" onClick={() => handleSaveEdit(msg.id)} className="text-[#5865F2] hover:underline font-semibold">
                          salvar
                        </button>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 text-xs text-[#dbdee1] hover:underline"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(msg.id)}
                          className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-semibold px-3 py-1 rounded transition-colors shadow"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  msg.content && (
                    <div className="text-sm text-[#dbdee1] mt-1.5 leading-relaxed whitespace-pre-wrap select-text break-words">
                      {msg.content}
                    </div>
                  )
                )}

                {/* File Attachments (Images, Videos, PDFs, Docs, Audio) */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <MessageAttachmentsView attachments={msg.attachments} />
                )}

                {/* Rich Embed */}
                {msg.embed && renderEmbed(msg.embed)}

                {/* Reactions list */}
                {msg.reactions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {msg.reactions.map(r => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => toggleReaction(msg.id, r.emoji)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors border ${
                          r.users.includes(currentUser.id) || r.users.includes('user-me')
                            ? 'bg-[#5865F2]/20 border-[#5865F2]/50 text-white font-semibold'
                            : 'bg-[#2b2d31] hover:bg-[#35373c] border-transparent text-[#b5bac1]'
                        }`}
                        title={`${r.users.length} pessoa(s) reagiram com ${r.emoji}`}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.count}</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setReactingMessageId(reactingMessageId === msg.id ? null : msg.id)}
                      className="px-1.5 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08] hover:border-white/[0.16] rounded-md text-[#949ba4] hover:text-emerald-400 transition-all hover:scale-105 active:scale-95"
                      title="Adicionar Reação"
                    >
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Discord-style Hover Action Bar with Luxury Glassmorphism */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center bg-[#1e1f22]/90 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] px-1.5 py-1 transition-all duration-150 absolute right-4 -top-4 z-10 space-x-1">
                {/* Quick reaction emojis */}
                {quickEmojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => toggleReaction(msg.id, emoji)}
                    className="p-1 hover:bg-white/[0.1] hover:scale-125 active:scale-95 transition-all text-xs rounded-lg leading-none"
                    title={`Reagir com ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}

                <div className="w-[1px] h-4 bg-white/[0.12] mx-0.5" />

                {/* Emoji popover trigger for ANY emoji */}
                <button
                  type="button"
                  onClick={() => setReactingMessageId(reactingMessageId === msg.id ? null : msg.id)}
                  className="p-1.5 text-[#b5bac1] hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all hover:scale-110 active:scale-95 border border-transparent hover:border-emerald-500/20 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  title="Adicionar Reação com Emoji"
                >
                  <SmilePlus className="w-3.5 h-3.5" />
                </button>

                {/* Edit Button (author only) */}
                {isMe && (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(msg.id, msg.content)}
                    className="p-1.5 text-[#b5bac1] hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all hover:scale-110 active:scale-95 border border-transparent hover:border-sky-500/20 hover:shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                    title="Editar Mensagem"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Delete Button (author only) */}
                {isMe && (
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate({ id: msg.id, content: msg.content })}
                    className="p-1.5 text-[#b5bac1] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all hover:scale-110 active:scale-95 border border-transparent hover:border-rose-500/20 hover:shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                    title="Excluir Mensagem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Pin Button */}
                <button
                  type="button"
                  onClick={() => togglePinMessage(msg.id, activeDmUserId || 'dm')}
                  className={`p-1.5 rounded-lg border transition-all hover:scale-110 active:scale-95 ${
                    msg.pinned
                      ? 'text-amber-400 bg-amber-500/20 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'text-[#b5bac1] hover:text-amber-300 hover:bg-amber-500/10 border-transparent hover:border-amber-500/20'
                  }`}
                  title={msg.pinned ? 'Desfixar Mensagem' : 'Fixar Mensagem'}
                >
                  <Pin className={`w-3.5 h-3.5 ${msg.pinned ? 'fill-amber-400' : ''}`} />
                </button>
              </div>

              {/* Message-specific Emoji Picker Popover */}
              {reactingMessageId === msg.id && (
                <div className="absolute right-4 top-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <EmojiPickerModal
                    onSelectEmoji={emoji => {
                      toggleReaction(msg.id, emoji);
                      setReactingMessageId(null);
                    }}
                    onClose={() => setReactingMessageId(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box with File Attachments & Emoji Picker */}
      <div className="px-4 pb-6 pt-1 select-none flex-shrink-0 relative z-50">
        {/* Hidden File Input for Multiple Documents / Media */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.json,.csv"
          className="hidden"
        />

        {/* Staged Attachments Preview Bar */}
        {stagedAttachments.length > 0 && (
          <div className={`mb-2 p-2.5 rounded-xl flex flex-wrap gap-2 animate-in fade-in transition-colors ${
            theme === 'light'
              ? 'bg-white border-2 border-black text-black'
              : 'bg-[#2b2d31] border border-[#3e4047]'
          }`}>
            {stagedAttachments.map(att => (
              <div
                key={att.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                  theme === 'light'
                    ? 'bg-slate-50 border-black/30 text-black'
                    : 'bg-[#1e1f22] border-[#35373c] text-white'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5 text-[#5865F2]" />
                <span className="truncate max-w-[160px] font-medium" title={att.name}>
                  {att.name}
                </span>
                <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                  ({formatFileSize(att.size)})
                </span>
                <button
                  type="button"
                  onClick={() => removeStagedAttachment(att.id)}
                  title="Remover anexo"
                  className={`p-0.5 rounded ${
                    theme === 'light'
                      ? 'hover:bg-black/10 text-slate-700 hover:text-black'
                      : 'hover:bg-[#35373c] text-[#949ba4] hover:text-white'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input Bar (Claro no modo claro, com contorno preto) */}
        <div className={`chat-input-bar rounded-2xl px-4 py-2.5 flex items-center gap-3 transition-all relative z-50 ${
          theme === 'light'
            ? 'bg-white border-2 border-black shadow-[0_2px_12px_rgba(0,0,0,0.08)]'
            : 'bg-[#383a40]/90 backdrop-blur-xl shadow-inner border border-white/[0.08] focus-within:border-indigo-500/50 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
        }`}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Adicionar anexo do computador (Fotos, PDFs, Docs, Vídeos)"
            className={`p-1 rounded-xl transition-all hover:scale-110 active:scale-95 cursor-pointer relative z-50 ${
              theme === 'light'
                ? 'text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-black/30 hover:border-black'
                : 'text-[#b5bac1] hover:text-indigo-400 bg-white/[0.03] hover:bg-indigo-500/10 border border-white/[0.06] hover:border-indigo-500/30 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]'
            }`}
          >
            <PlusCircle className="w-5 h-5 text-indigo-500" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              stagedAttachments.length > 0
                ? `Adicionar legenda para os ${stagedAttachments.length} anexo(s)...`
                : `Conversar com @${friendUser.name}`
            }
            className={`bg-transparent text-sm focus:outline-none flex-1 leading-normal font-medium ${
              theme === 'light'
                ? 'text-black placeholder-[#64748b]'
                : 'text-white placeholder-[#80848e]'
            }`}
          />

          <div className="flex items-center gap-2 relative z-50">
            {/* Seletor de Emojis */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEmojiPicker(prev => !prev);
              }}
              title="Abrir Seletor de Emojis Completo"
              aria-label="Abrir Seletor de Emojis"
              className={`p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer relative z-50 ${
                showEmojiPicker
                  ? 'text-amber-500 bg-amber-500/20 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : theme === 'light'
                  ? 'text-slate-800 bg-slate-100 border-black/30 hover:border-black hover:text-amber-600'
                  : 'text-[#b5bac1] bg-white/[0.04] hover:bg-amber-500/10 border-white/[0.08] hover:border-amber-500/40 hover:text-amber-300'
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Botão de Envio de Mensagem */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (inputText.trim() || stagedAttachments.length > 0) {
                  handleSend();
                } else {
                  inputRef.current?.focus();
                }
              }}
              title="Enviar Mensagem e Anexos"
              aria-label="Enviar Mensagem"
              className={`p-2 rounded-xl border transition-all relative z-50 cursor-pointer ${
                inputText.trim() || stagedAttachments.length > 0
                  ? 'bg-gradient-to-r from-indigo-500 to-[#5865F2] text-white border-indigo-400/40 shadow-[0_0_15px_rgba(88,101,242,0.4)] hover:shadow-[0_0_22px_rgba(88,101,242,0.6)] hover:scale-105 active:scale-95'
                  : theme === 'light'
                  ? 'text-slate-500 hover:text-slate-800 bg-slate-100 border-black/20 hover:border-black/50'
                  : 'text-[#80848e] hover:text-white bg-white/[0.04] border-white/[0.08] hover:border-white/20'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Full Categorized Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="absolute right-2 sm:right-4 bottom-14 z-50 max-w-[calc(100vw-2rem)]">
              <EmojiPickerModal
                onSelectEmoji={emoji => {
                  setInputText(prev => prev + emoji);
                  setShowEmojiPicker(false);
                  inputRef.current?.focus();
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Group Members Modal */}
      {showGroupModal && <GroupMembersModal onClose={() => setShowGroupModal(false)} />}

      {/* Delete Message Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#3e4047] w-full max-w-md rounded-2xl shadow-2xl p-6 text-[#dbdee1] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#f23f43]/20 border border-[#f23f43]/40 flex items-center justify-center text-[#f23f43]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Mensagem</h3>
                <p className="text-xs text-[#949ba4]">Tem certeza que deseja excluir esta mensagem?</p>
              </div>
            </div>

            <div className="p-3 bg-[#2b2d31] rounded-xl border border-[#3e4047] mb-6 text-xs text-[#dbdee1] italic line-clamp-3">
              "{deleteCandidate.content}"
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-[#dbdee1] hover:underline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-[#f23f43] hover:bg-[#da373b] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Call Camera & Microphone Device Test Bridge */}
      {preCallModal && preCallModal.isOpen && (
        <PreCallDeviceModal
          callTargetName={friendUser.name}
          isVideoCall={preCallModal.isVideo}
          onClose={() => setPreCallModal(null)}
          onConfirm={({ videoEnabled }) => {
            setPreCallModal(null);
            startDmCall(friendUser.id, videoEnabled);
          }}
        />
      )}
    </div>
  );
};
