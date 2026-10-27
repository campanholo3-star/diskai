import React, { useState, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  FileText,
  Upload
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { Channel, ChannelLink } from '../../types';
import { compressFileAttachment } from '../chat/MessageAttachmentsView';

interface ChannelHeaderEditModalProps {
  channel: Channel;
  onClose: () => void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80'
];

export const ChannelHeaderEditModal: React.FC<ChannelHeaderEditModalProps> = ({
  channel,
  onClose
}) => {
  const { activeServer, updateChannel, theme } = useDiskai();

  const [coverUrl, setCoverUrl] = useState(channel.coverUrl || '');
  const [bibliography, setBibliography] = useState(channel.bibliography || channel.topic || '');
  const [links, setLinks] = useState<ChannelLink[]>(channel.links || []);

  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isEmailType, setIsEmailType] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;

    let formattedUrl = newUrl.trim();
    const isEmail = isEmailType || formattedUrl.includes('@') && !formattedUrl.startsWith('http');

    if (isEmail && !formattedUrl.startsWith('mailto:')) {
      formattedUrl = `mailto:${formattedUrl}`;
    } else if (!isEmail && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newLinkItem: ChannelLink = {
      id: `link-${Date.now()}`,
      label: newLabel.trim(),
      url: formattedUrl,
      isEmail
    };

    setLinks(prev => [...prev, newLinkItem]);
    setNewLabel('');
    setNewUrl('');
    setIsEmailType(false);
  };

  const handleRemoveLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { url } = await compressFileAttachment(file);
      setCoverUrl(url);
    } catch (err) {
      console.error('[ChannelHeader] Erro ao carregar imagem de capa:', err);
    }
  };

  const handleSave = () => {
    updateChannel(activeServer.id, channel.id, {
      coverUrl: coverUrl.trim() || undefined,
      bibliography: bibliography.trim() || undefined,
      links: links.length > 0 ? links : undefined
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className={`w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-colors ${
        theme === 'light'
          ? 'bg-white border-2 border-black text-black'
          : 'bg-[#313338] border border-[#3e4047] text-[#dbdee1]'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          theme === 'light' ? 'bg-slate-50 border-black/20' : 'bg-[#2b2d31] border-[#1f2023]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                Editar Cabeçalho do Canal #{channel.name}
              </h3>
              <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                Configure a capa, descrição/bibliografia e links seguros de contato
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'light' ? 'hover:bg-slate-200 text-black' : 'hover:bg-[#35373c] text-[#949ba4] hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto no-scrollbar">
          {/* Capa do Canal */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider block ${
              theme === 'light' ? 'text-black' : 'text-[#dbdee1]'
            }`}>
              Capa de Exibição do Canal (Banner)
            </label>
            <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
              A imagem se adequará dinamicamente à largura da janela de bate-papo.
            </p>

            {coverUrl && (
              <div className="w-full h-28 rounded-xl overflow-hidden border border-black/20 relative group">
                <img src={coverUrl} alt="Prévia da Capa" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors"
                  title="Remover capa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                placeholder="Cole o link da imagem de capa (URL)..."
                className={`flex-1 text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-50 border-2 border-black text-black placeholder:text-slate-500'
                    : 'bg-[#1e1f22] border-[#3e4047] text-white focus:border-[#5865F2]'
                }`}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 border-2 border-black text-black'
                    : 'bg-[#2b2d31] hover:bg-[#35373c] text-white border border-[#3e4047]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Presets */}
            <div className="pt-1">
              <span className={`text-[10px] font-semibold block mb-1.5 ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                Sugestões de capas prontas:
              </span>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COVERS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCoverUrl(preset)}
                    className="h-10 rounded-lg overflow-hidden border border-black/20 hover:scale-105 active:scale-95 transition-transform"
                  >
                    <img src={preset} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bibliografia / Descrição do Canal */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-wider block ${
              theme === 'light' ? 'text-black' : 'text-[#dbdee1]'
            }`}>
              Bibliografia & Descrição do Canal
            </label>
            <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
              Ficará visível no início do canal para orientar e contextualizar todos os membros.
            </p>
            <textarea
              rows={3}
              value={bibliography}
              onChange={e => setBibliography(e.target.value)}
              placeholder="Descreva o propósito deste canal, regras essenciais, equipe responsável..."
              className={`w-full text-xs p-3 rounded-xl border focus:outline-none transition-colors leading-relaxed ${
                theme === 'light'
                  ? 'bg-slate-50 border-2 border-black text-black placeholder:text-slate-500'
                  : 'bg-[#1e1f22] border-[#3e4047] text-white focus:border-[#5865F2]'
              }`}
            />
          </div>

          {/* Links e E-mails Seguros (Ocultos sob o botão '+ Mais') */}
          <div className="space-y-3 pt-2 border-t border-black/10">
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#23a55a]" />
                <label className={`text-xs font-bold uppercase tracking-wider ${
                  theme === 'light' ? 'text-black' : 'text-[#dbdee1]'
                }`}>
                  Links & Contatos Oficiais (Verificados & Seguros)
                </label>
              </div>
              <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                Ficarão ocultos por padrão para manter a tela limpa, aparecendo somente quando o usuário clicar no botão <strong>+ Mais</strong>.
              </p>
            </div>

            {/* Existing Links List */}
            {links.length > 0 && (
              <div className="space-y-1.5">
                {links.map(link => (
                  <div
                    key={link.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      theme === 'light'
                        ? 'bg-slate-50 border border-black/30 text-black'
                        : 'bg-[#1e1f22] border-[#3e4047] text-[#dbdee1]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {link.isEmail ? (
                        <Mail className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      )}
                      <span className="font-bold text-xs truncate">{link.label}</span>
                      <span className="text-[11px] opacity-70 truncate">({link.url})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(link.id)}
                      className="p-1 text-[#949ba4] hover:text-rose-500 transition-colors ml-2"
                      title="Remover link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Link Form */}
            <form onSubmit={handleAddLink} className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Nome do link (ex: E-mail Suporte)"
                  className={`text-xs px-3 py-2 rounded-xl border focus:outline-none ${
                    theme === 'light'
                      ? 'bg-slate-50 border-2 border-black text-black placeholder:text-slate-500'
                      : 'bg-[#1e1f22] border-[#3e4047] text-white focus:border-[#5865F2]'
                  }`}
                />
                <input
                  type="text"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="Endereço (ex: contato@empresa.com ou https://...)"
                  className={`text-xs px-3 py-2 rounded-xl border focus:outline-none ${
                    theme === 'light'
                      ? 'bg-slate-50 border-2 border-black text-black placeholder:text-slate-500'
                      : 'bg-[#1e1f22] border-[#3e4047] text-white focus:border-[#5865F2]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEmailType}
                    onChange={e => setIsEmailType(e.target.checked)}
                    className="rounded text-[#5865F2]"
                  />
                  <span className={theme === 'light' ? 'text-slate-700 font-medium' : 'text-[#949ba4]'}>
                    É um endereço de e-mail seguro (sem vírus)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!newLabel.trim() || !newUrl.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition-colors shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-end gap-2.5 ${
          theme === 'light' ? 'bg-slate-50 border-black/20' : 'bg-[#2b2d31] border-[#1f2023]'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              theme === 'light' ? 'hover:bg-slate-200 text-black' : 'hover:bg-[#35373c] text-[#dbdee1]'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
              savedSuccess
                ? 'bg-[#23a55a] text-white'
                : theme === 'light'
                ? 'bg-black text-white hover:bg-slate-800'
                : 'bg-[#5865F2] hover:bg-[#4752c4] text-white'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <span>Salvar Cabeçalho</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
