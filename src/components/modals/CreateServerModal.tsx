import React, { useState, useRef } from 'react';
import { X, Plus, Sparkles, FolderOpen, Camera, RotateCcw } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';

export const CreateServerModal: React.FC = () => {
  const { createServerModalOpen, setCreateServerModalOpen, addServer } = useDiskai();
  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('');
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!createServerModalOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setIcon(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const computedAcronym = acronym.trim() || name.slice(0, 2).toUpperCase();
    addServer(name.trim(), computedAcronym, icon);
    setName('');
    setAcronym('');
    setIcon(undefined);
    setFileName(null);
    setCreateServerModalOpen(false);
  };

  const presetIcons = [
    '/app-icon.png',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150'
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-[#dbdee1]">
        {/* Header */}
        <div className="p-6 text-center space-y-2 relative">
          <button
            onClick={() => setCreateServerModalOpen(false)}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors absolute top-4 right-4"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Criar seu Servidor</h2>
          <p className="text-xs text-[#949ba4]">
            O seu servidor é onde você e sua equipe se reúnem, conversam, gravam reuniões e geram atas com IA.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Server Icon Picker */}
          <div className="flex flex-col items-center space-y-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl bg-[#1e1f22] border-2 border-dashed border-[#5865F2] flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group hover:border-white transition-all shadow-md"
              title="Carregar imagem do computador"
            >
              {icon ? (
                <img src={icon} alt="Server Icon Preview" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#5865F2] group-hover:text-white transition-colors">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">FOTO</span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-[#5865F2] hover:text-white flex items-center gap-1 font-semibold"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{fileName ? `Foto: ${fileName}` : 'Escolher foto do PC'}</span>
            </button>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1">
              {presetIcons.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="Preset"
                  onClick={() => setIcon(url)}
                  className={`w-7 h-7 rounded-lg object-cover cursor-pointer hover:scale-110 transition-all ${
                    icon === url ? 'ring-2 ring-[#5865F2] scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
              {icon && (
                <button
                  type="button"
                  onClick={() => {
                    setIcon(undefined);
                    setFileName(null);
                  }}
                  title="Remover foto"
                  className="p-1 hover:text-[#f23f43] text-[#949ba4] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
              Nome do Servidor
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Time de Engenharia Diskai"
              className="w-full bg-[#1e1f22] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
              Sigla / Abreviação
            </label>
            <input
              type="text"
              maxLength={4}
              value={acronym}
              onChange={e => setAcronym(e.target.value.toUpperCase())}
              placeholder="Ex: TED"
              className="w-full bg-[#1e1f22] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
            />
          </div>

          <div className="bg-[#2b2d31] p-3 rounded-lg text-xs text-[#949ba4] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5865F2] flex-shrink-0" />
            Todos os canais de voz deste servidor virão prontos com o gravador e resumidor por IA!
          </div>

          <div className="pt-2 flex justify-between items-center bg-[#2b2d31] -mx-6 -mb-6 p-4">
            <button
              type="button"
              onClick={() => setCreateServerModalOpen(false)}
              className="text-xs font-semibold text-[#dbdee1] hover:underline"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-colors shadow disabled:opacity-50"
            >
              Criar Servidor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
