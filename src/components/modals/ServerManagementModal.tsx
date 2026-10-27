import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Settings,
  UserPlus,
  Users,
  Camera,
  Trash2,
  FolderOpen,
  RotateCcw,
  Check,
  AlertTriangle,
  Shield,
  Search,
  UserMinus
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { User } from '../../types';
import { uploadStorageFile } from '../../services/supabase';

export const ServerManagementModal: React.FC = () => {
  const {
    activeServer,
    servers,
    editServer,
    deleteServer,
    addServerMembers,
    removeServerMember,
    serverManagementModalOpen,
    setServerManagementModalOpen,
    serverManagementTab,
    setServerManagementTab,
    friends,
    participants,
    currentUser
  } = useDiskai();

  const [name, setName] = useState(activeServer?.name || '');
  const [acronym, setAcronym] = useState(activeServer?.acronym || '');
  const [icon, setIcon] = useState<string | undefined>(activeServer?.icon);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeServer) {
      setName(activeServer.name);
      setAcronym(activeServer.acronym);
      setIcon(activeServer.icon);
      setConfirmDelete(false);
      setSelectedUserIds([]);
      setMemberToRemove(null);
    }
  }, [activeServer, serverManagementModalOpen]);

  if (!serverManagementModalOpen || !activeServer) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalFileName(file.name);

    // 1. Upload para o Supabase Storage em segundo plano para persistência permanente
    uploadStorageFile(file, 'attachments')
      .then(res => {
        if (res.success && res.url) {
          setIcon(res.url);
        }
      })
      .catch(() => {});

    // 2. Pré-visualização rápida comprimida via Canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const rawBase64 = event.target.result;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 256;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setIcon(prev => (prev?.startsWith('http') ? prev : compressed));
          } else {
            setIcon(prev => (prev?.startsWith('http') ? prev : rawBase64));
          }
        };
        img.onerror = () => {
          setIcon(prev => (prev?.startsWith('http') ? prev : rawBase64));
        };
        img.src = rawBase64;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    editServer(activeServer.id, name.trim(), acronym.trim(), icon);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      setServerManagementModalOpen(false);
    }, 1200);
  };

  const handleDeleteServer = () => {
    deleteServer(activeServer.id);
    setServerManagementModalOpen(false);
  };

  const handleAddMembersSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;
    addServerMembers(activeServer.id, selectedUserIds);
    setSelectedUserIds([]);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      setServerManagementModalOpen(false);
    }, 1200);
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedUserIds(prev => [...prev, id]);
    }
  };

  // Deduplicate current server members
  const currentMembersMap = new Map<string, User>();
  (activeServer.members || []).forEach(m => {
    if (m && m.id && !currentMembersMap.has(m.id)) {
      currentMembersMap.set(m.id, m);
    }
  });
  const currentMembers = Array.from(currentMembersMap.values());
  const currentMemberIds = new Set(currentMembers.map(m => m.id));

  // Candidates to add (friends & participants not yet in server members)
  const allPotentialUsers = [
    ...friends.map(f => f.user),
    ...participants.map(p => ({
      id: p.id,
      name: p.name,
      tag: p.tag,
      avatar: p.avatar,
      status: p.status,
      role: p.role
    }))
  ];

  // Deduplicate candidates
  const uniqueUsers = Array.from(
    new Map(allPotentialUsers.map(u => [u.id, u])).values()
  );

  const nonMemberCandidates = uniqueUsers.filter(
    u => !currentMemberIds.has(u.id) && u.id !== currentUser.id
  );

  const filteredCandidates = nonMemberCandidates.filter(u =>
    u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.tag.includes(memberSearch)
  );

  const presetServerIcons = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150'
  ];

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1] max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2]">
              {serverManagementTab === 'edit' ? <Settings className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Configurações do Servidor</span>
                <span className="text-xs bg-[#5865F2]/20 text-[#5865F2] font-semibold px-2 py-0.5 rounded border border-[#5865F2]/30">
                  {activeServer.name}
                </span>
              </h2>
              <p className="text-xs text-[#949ba4]">
                Gerencie foto de perfil, dados cadastrais e membros do grupo.
              </p>
            </div>
          </div>

          <button
            onClick={() => setServerManagementModalOpen(false)}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-2.5 bg-[#2b2d31]/50 border-b border-[#1f2023] flex items-center gap-2">
          <button
            onClick={() => setServerManagementTab('edit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              serverManagementTab === 'edit'
                ? 'bg-[#5865F2] text-white shadow'
                : 'text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Perfil & Informações</span>
          </button>
          <button
            onClick={() => setServerManagementTab('members')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              serverManagementTab === 'members'
                ? 'bg-[#5865F2] text-white shadow'
                : 'text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membros do Servidor ({currentMembers.length})</span>
          </button>
        </div>

        {/* Success toast message */}
        {savedToast && (
          <div className="bg-[#23a55a] text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4" />
            <span>Alterações salvas com sucesso!</span>
          </div>
        )}

        {/* TAB 1: EDITAR PERFIL & FOTO DO SERVIDOR */}
        {serverManagementTab === 'edit' && (
          <form onSubmit={handleSaveEdit} className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Server Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">
                  Foto do Servidor
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group w-28 h-28 rounded-2xl bg-[#1e1f22] border-2 border-dashed border-[#4e5058] hover:border-[#5865F2] flex items-center justify-center cursor-pointer overflow-hidden transition-all shadow-md"
                >
                  {icon ? (
                    <img src={icon} alt="Server icon" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-2xl">
                      {acronym || name.slice(0, 2).toUpperCase() || 'DK'}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-semibold transition-opacity">
                    <Camera className="w-5 h-5 mb-1" />
                    <span>Mudar Foto</span>
                  </div>
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
                  className="w-full flex items-center justify-center gap-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-white px-3 py-1.5 rounded-lg border border-[#3e4047] text-xs font-bold transition-all shadow-sm"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>Escolher do PC</span>
                </button>

                {icon && (
                  <button
                    type="button"
                    onClick={() => {
                      setIcon(undefined);
                      setLocalFileName(null);
                    }}
                    className="text-[11px] text-[#f23f43] hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Remover imagem
                  </button>
                )}
              </div>

              {/* Right Column: Name & Acronym & Presets */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dbdee1] uppercase">Nome do Servidor</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Time de Produto Diskai"
                    className="w-full bg-[#1e1f22] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dbdee1] uppercase">Sigla / Acrônimo</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={acronym}
                    onChange={e => setAcronym(e.target.value.toUpperCase())}
                    placeholder="Ex: TPD"
                    className="w-full bg-[#1e1f22] text-sm text-white px-3.5 py-2 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2]"
                  />
                  <p className="text-[11px] text-[#949ba4]">Exibida quando nenhuma imagem de perfil for configurada.</p>
                </div>

                {/* Presets */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-[#949ba4] uppercase">Ou escolha um avatar temático:</label>
                  <div className="flex items-center gap-2">
                    {presetServerIcons.map((preset, idx) => (
                      <img
                        key={idx}
                        src={preset}
                        alt="preset"
                        onClick={() => setIcon(preset)}
                        className={`w-9 h-9 rounded-xl object-cover cursor-pointer border-2 transition-all hover:scale-105 ${
                          icon === preset ? 'border-[#5865F2] ring-2 ring-[#5865F2]' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#35373c] flex items-center justify-between">
              {servers.length > 1 ? (
                <div>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs font-bold text-[#f23f43] hover:bg-[#f23f43]/15 px-3 py-2 rounded-lg border border-[#f23f43]/30 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Servidor</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#f23f43] font-bold">Deseja excluir?</span>
                      <button
                        type="button"
                        onClick={handleDeleteServer}
                        className="bg-[#f23f43] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#da373c] transition-colors"
                      >
                        Sim, Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-[#949ba4] hover:text-white px-2 py-1"
                      >
                        Não, Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-[#949ba4]">
                  Servidor padrão (não pode ser excluído por ser o único)
                </div>
              )}

              <button
                type="submit"
                className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow"
              >
                <Check className="w-4 h-4" />
                Salvar Alterações
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ADICIONAR / GERENCIAR MEMBROS DO SERVIDOR */}
        {serverManagementTab === 'members' && (
          <div className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
            {/* Current members in server */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#dbdee1] uppercase flex items-center justify-between">
                <span>Membros Atuais no Servidor ({currentMembers.length})</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto no-scrollbar p-1">
                {currentMembers.map(member => (
                  <div
                    key={member.id}
                    className="p-2 bg-[#2b2d31] rounded-xl border border-[#3e4047] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <img src={member.avatar} alt={member.name} className="w-7 h-7 rounded-full object-cover" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{member.name}</div>
                        <div className="text-[10px] text-[#949ba4]">#{member.tag}</div>
                      </div>
                    </div>
                    {member.id !== currentUser.id && member.role !== 'Administrador' && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        title={`Remover ${member.name} do Servidor`}
                        className="p-1 hover:text-[#f23f43] text-[#949ba4] rounded hover:bg-[#1e1f22] transition-colors"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite / Add new members */}
            <form onSubmit={handleAddMembersSubmit} className="space-y-3 pt-3 border-t border-[#35373c]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#dbdee1] uppercase">
                  Adicionar Novos Membros ao Servidor
                </label>
                <span className="text-xs text-[#5865F2] font-semibold">
                  {selectedUserIds.length} selecionados
                </span>
              </div>

              {/* Search candidates */}
              <div className="relative">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Buscar amigos ou participantes para convidar..."
                  className="w-full bg-[#1e1f22] text-xs text-white px-3.5 py-2 rounded-lg border border-[#3e4047] focus:outline-none focus:border-[#5865F2] pr-8"
                />
                <Search className="w-3.5 h-3.5 text-[#949ba4] absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Candidate items */}
              <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1.5 pt-1">
                {filteredCandidates.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#949ba4]">
                    Nenhum novo participante disponível para adicionar. Todos já estão no servidor!
                  </div>
                ) : (
                  filteredCandidates.map(candidate => {
                    const isSelected = selectedUserIds.includes(candidate.id);
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => toggleSelectUser(candidate.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                            : 'bg-[#2b2d31] hover:bg-[#35373c] border-transparent text-[#dbdee1]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={candidate.avatar}
                            alt={candidate.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{candidate.name}</div>
                            <div className="text-[10px] text-[#949ba4]">#{candidate.tag}</div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#5865F2] border-[#5865F2] text-white'
                              : 'border-[#4e5058] bg-[#1e1f22]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={selectedUserIds.length === 0}
                  className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  Adicionar ao Servidor ({selectedUserIds.length})
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Confirmação de Remoção de Membro */}
        {memberToRemove && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#2b2d31] border border-[#f23f43]/40 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-[#dbdee1]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f23f43]/20 border border-[#f23f43]/30 flex items-center justify-center text-[#f23f43] flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Deseja remover membro?</h3>
                  <p className="text-xs text-[#949ba4]">Confirme para evitar remoções sem querer.</p>
                </div>
              </div>

              <div className="bg-[#1e1f22] p-2.5 rounded-xl border border-[#3e4047] flex items-center gap-3">
                <img
                  src={memberToRemove.avatar}
                  alt={memberToRemove.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">{memberToRemove.name}</div>
                  <div className="text-[11px] text-[#949ba4]">#{memberToRemove.tag}</div>
                </div>
              </div>

              <p className="text-xs text-[#dbdee1] leading-relaxed">
                Deseja realmente remover <strong>{memberToRemove.name}</strong> deste servidor?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3e4047]">
                <button
                  type="button"
                  onClick={() => setMemberToRemove(null)}
                  className="px-3 py-1.5 bg-[#1e1f22] hover:bg-[#35373c] text-white text-xs font-semibold rounded-lg transition-colors border border-[#3e4047]"
                >
                  Não, Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeServerMember(activeServer.id, memberToRemove.id);
                    setMemberToRemove(null);
                  }}
                  className="px-3 py-1.5 bg-[#f23f43] hover:bg-[#da373c] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Sim, Remover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
