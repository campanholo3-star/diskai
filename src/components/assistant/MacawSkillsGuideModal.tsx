import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  FileCode,
  Upload,
  Plus,
  Trash2,
  ChevronRight,
  X,
  CheckCircle2,
  Search,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Layers,
  Zap
} from 'lucide-react';

export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  content: string;
  fileName: string;
  category?: string;
  createdAt?: string;
  samplePrompts?: string[];
  isCustom?: boolean;
}

const DEFAULT_INITIAL_SKILLS: CustomSkill[] = [
  {
    id: 'skill-task-manager',
    name: 'Gerenciador de Tarefas e Agenda',
    description: 'Criação, acompanhamento de prazos, delegação de membros e agendamento sincronizado no servidor.',
    fileName: 'task-manager.skill.md',
    category: 'Produtividade',
    createdAt: 'Nativo',
    samplePrompts: [
      'Criar tarefa: Revisar relatórios da semana com a equipe',
      'Agendar reunião de alinhamento com Carlos e Sofia amanhã às 14h',
      'Listar todas as tarefas pendentes na minha agenda'
    ],
    content: `# Task Manager Skill (.skill.md)

## Descrição
Gerenciador autônomo de tarefas, to-dos e agendamentos de reuniões no DiskAI.

## O Que Esta Skill Executa:
1. **Criação de Tarefas e Reuniões:** Interpreta datas, horários e títulos em linguagem natural.
2. **Delegação e Notificações:** Permite atribuir tarefas a membros específicos e publicar avisos automáticos no canal de referência.
3. **Sincronização em Tempo Real:** Registra compromissos na tabela \`appointments\` e atualiza status para concluído/pendente.

## Regras de Execução:
- Se o usuário mencionar horários relativos ("amanhã às 15h"), calcular a data ISO correta.
- Ao concluir uma tarefa, emitir o feedback \`ARARA_SUCCESS\` e persistir a alteração.
`
  },
  {
    id: 'skill-meeting-synthesizer',
    name: 'Síntese e Atas Executivas (Gemini Flash)',
    description: 'Processa áudios e vídeos de reuniões, sintetiza canais e extrai decisões-chave e pontos de ação.',
    fileName: 'meeting-synthesizer.skill.md',
    category: 'Inteligência Artificial',
    createdAt: 'Nativo',
    samplePrompts: [
      'Gerar ata executiva da última reunião gravada',
      'Quais foram os principais pontos decididos sobre o lançamento?',
      'Extrair os planos de ação atribuídos à equipe'
    ],
    content: `# Meeting Synthesizer Skill (.skill.md)

## Descrição
Motor de síntese executiva alimentado pelo Gemini 1.5 Flash para atas de chamadas e condensação de canais.

## O Que Esta Skill Executa:
1. **Estruturação de Atas:** Divide a gravação em Tópicos Discutidos, Decisões Tomadas e Sentimento Geral da equipe.
2. **Action Items:** Identifica promessas de tarefas feitas durante a reunião e mapeia os responsáveis.
3. **Exportação & Compartilhamento:** Permite copiar em Markdown ou enviar diretamente para o canal.
`
  },
  {
    id: 'skill-security-gatekeeper',
    name: 'Auditor de Segurança e Permissões Granulares',
    description: 'Controle de acesso individual por canal, aprovação de participantes e isolamento de canais privados.',
    fileName: 'security-gatekeeper.skill.md',
    category: 'Segurança & RLS',
    createdAt: 'Nativo',
    samplePrompts: [
      'Quantos usuários estão aguardando aprovação de acesso?',
      'Quais membros possuem permissão no canal privado da diretoria?',
      'Verificar integridade e isolamento de permissões do servidor'
    ],
    content: `# Security Gatekeeper Skill (.skill.md)

## Descrição
Protocolo de gatekeeping e proteção de canais privados e perfis de usuários no DiskAI.

## O Que Esta Skill Executa:
1. **Controle de Acessos Individuais:** Gerencia cada solicitação de participante por canal alvo.
2. **Isolamento de Canais Privados:** Garante que apenas o criador e administradores visualizem mensagens restritas.
3. **Auditoria de Sessão:** Bloqueia participantes pendentes em modo de espera até autorização expressa.
`
  },
  {
    id: 'skill-channel-context-search',
    name: 'Pesquisa de Contexto e Documentos',
    description: 'Busca semântica em histórico de conversas, imagens e documentos anexados no DiskAI.',
    fileName: 'channel-context-search.skill.md',
    category: 'Pesquisa',
    createdAt: 'Nativo',
    samplePrompts: [
      'O que foi discutido sobre a arquitetura do projeto no canal?',
      'Analisar a planilha e documentos anexados recentemente',
      'Quais links importantes foram compartilhados neste canal?'
    ],
    content: `# Channel Context Search Skill (.skill.md)

## Descrição
Capacidade de leitura de mensagens, imagens e documentos compartilhados para responder dúvidas de contexto.

## O Que Esta Skill Executa:
1. **Varredura de Conversas:** Analisa as últimas mensagens e decisões sem sair da tela.
2. **Inspeção de Anexos:** Processa documentos (.txt, .md, .csv) e imagens com visão computacional.
3. **Respostas Precisas:** Cruza perguntas com o histórico real armazenado no canal.
`
  }
];

interface MacawSkillsGuideModalProps {
  onClose?: () => void;
  onSelectPrompt?: (prompt: string) => void;
  theme?: string;
  isEmbedded?: boolean;
}

export const MacawSkillsGuideModal: React.FC<MacawSkillsGuideModalProps> = ({
  onClose,
  onSelectPrompt,
  theme = 'dark',
  isEmbedded = false
}) => {
  const [skills, setSkills] = useState<CustomSkill[]>(() => {
    try {
      const saved = localStorage.getItem('diskai_custom_skills');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_INITIAL_SKILLS;
  });

  const [selectedSkill, setSelectedSkill] = useState<CustomSkill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveSkills = (newSkills: CustomSkill[]) => {
    setSkills(newSkills);
    try {
      localStorage.setItem('diskai_custom_skills', JSON.stringify(newSkills));
    } catch (e) {
      console.error('[Skills] Erro ao salvar habilidades no localStorage:', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content || !content.trim()) return;

        let name = file.name.replace(/\.skill\.md$/i, '').replace(/\.md$/i, '').replace(/[-_]/g, ' ');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        let description = 'Habilidade personalizada carregada em formato Markdown (.skill.md)';

        const nameMatch = content.match(/name:\s*([^\n\r]+)/i) || content.match(/^#\s+([^\n\r]+)/m);
        if (nameMatch && nameMatch[1]) {
          name = nameMatch[1].replace(/skill/i, '').replace(/[\(\)]/g, '').trim();
        }

        const descMatch = content.match(/description:\s*([^\n\r]+)/i) ||
          content.match(/##\s*Descrição\s*\n+([^\n\r#]+)/i) ||
          content.match(/##\s*Resumo\s*\n+([^\n\r#]+)/i);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim();
        }

        const samplePrompts: string[] = [];
        const promptMatches = content.match(/[-*]\s*["']([^"']+)["']/g);
        if (promptMatches) {
          promptMatches.slice(0, 3).forEach(p => {
            const clean = p.replace(/^[-*]\s*["']/, '').replace(/["']$/, '');
            if (clean) samplePrompts.push(clean);
          });
        }
        if (samplePrompts.length === 0) {
          samplePrompts.push(`Executar instrução de ${name}`);
        }

        const newSkill: CustomSkill = {
          id: `custom-skill-${Date.now()}`,
          name,
          description,
          content,
          fileName: file.name,
          category: 'Personalizada',
          createdAt: new Date().toLocaleDateString('pt-BR'),
          samplePrompts,
          isCustom: true
        };

        const updated = [newSkill, ...skills];
        saveSkills(updated);

        setImportStatus(`Habilidade "${name}" importada com sucesso!`);
        setTimeout(() => setImportStatus(null), 4000);
      } catch (err) {
        console.error('[Skills] Falha ao processar arquivo .skill.md:', err);
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteSkill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = skills.filter(s => s.id !== id);
    saveSkills(updated);
    if (selectedSkill?.id === id) {
      setSelectedSkill(null);
    }
  };

  const filteredSkills = skills.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.fileName.toLowerCase().includes(q);
  });

  // TELA DETALHADA DA HABILIDADE (Renderizada diretamente no container com botão X claro e visível)
  if (selectedSkill) {
    return (
      <div className="flex flex-col h-full overflow-hidden select-none bg-inherit animate-in fade-in">
        {/* Header Superior com Botão Voltar, Título e Botão Fechar X */}
        <div className={`p-3 border-b flex items-center justify-between gap-2 flex-shrink-0 ${
          theme === 'light' ? 'bg-sky-50 border-black/15' : 'bg-[#141517] border-white/[0.08]'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedSkill(null)}
              className="px-2.5 py-1 rounded-xl bg-white/[0.08] hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 text-[#38bdf8] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <div className="truncate min-w-0">
              <h4 className={`text-xs font-bold truncate ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                {selectedSkill.name}
              </h4>
              <span className="text-[10px] font-mono text-[#949ba4] truncate">{selectedSkill.fileName}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedSkill(null);
                if (onClose) onClose();
              }}
              title="Fechar janela de habilidades"
              className={`p-1.5 rounded-xl border transition-all ${
                theme === 'light'
                  ? 'hover:bg-black/10 text-slate-700 border-black/20'
                  : 'hover:bg-rose-500/20 text-[#949ba4] hover:text-rose-400 border-white/[0.08]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll da Habilidade */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 no-scrollbar">
          {/* O Que Esta Habilidade Executa */}
          <div className={`p-3 rounded-2xl border space-y-1.5 ${
            theme === 'light'
              ? 'bg-sky-50 border-sky-200 text-slate-800'
              : 'bg-[#0284c7]/10 border-[#0284c7]/30 text-[#dbdee1]'
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8]">
              <Zap className="w-3.5 h-3.5" />
              <span>O que esta habilidade executa:</span>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {selectedSkill.description}
            </p>
          </div>

          {/* Documento Markdown (.skill.md) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#949ba4]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Instruções Técnicas (.skill.md)
              </span>
              <span className="text-[10px] uppercase tracking-wider font-mono">Markdown</span>
            </div>

            <div className={`p-3 rounded-2xl border font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-56 no-scrollbar ${
              theme === 'light'
                ? 'bg-slate-50 border-black/15 text-slate-800'
                : 'bg-[#111214] border-white/[0.08] text-[#dbdee1]'
            }`}>
              {selectedSkill.content}
            </div>
          </div>

          {/* Exemplos de Prompts com Botão para Executar no Chat */}
          {selectedSkill.samplePrompts && selectedSkill.samplePrompts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Executar no Chat com o Assistente:</span>
              </div>
              <div className="space-y-1.5">
                {selectedSkill.samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (onSelectPrompt) onSelectPrompt(prompt);
                      setSelectedSkill(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group hover:scale-[1.01] ${
                      theme === 'light'
                        ? 'bg-slate-50 hover:bg-sky-50 border-black/15 hover:border-sky-500 text-black'
                        : 'bg-white/[0.04] hover:bg-[#0284c7]/20 border-white/[0.06] hover:border-[#0284c7]/40 text-white'
                    }`}
                  >
                    <span className="text-xs font-medium truncate pr-2">"{prompt}"</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#38bdf8] group-hover:translate-x-1 transition-transform flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className={`p-2.5 border-t flex items-center justify-between gap-2 flex-shrink-0 ${
          theme === 'light' ? 'bg-slate-100 border-black/15' : 'bg-[#141517] border-white/[0.06]'
        }`}>
          <button
            type="button"
            onClick={() => setSelectedSkill(null)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#949ba4] hover:text-white"
          >
            Voltar à Lista
          </button>
          <button
            type="button"
            onClick={() => {
              const promptToRun = selectedSkill.samplePrompts?.[0] || `Executar instrução da habilidade ${selectedSkill.name}`;
              if (onSelectPrompt) onSelectPrompt(promptToRun);
              setSelectedSkill(null);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Executar no Chat</span>
          </button>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL: LISTA DE HABILIDADES
  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".skill.md,.md,.txt"
        className="hidden"
      />

      {/* Header com Botão de Carregar .skill.md e Botão de Fechar X Claro e Funcional */}
      <div className={`p-3.5 border-b flex-shrink-0 flex flex-col gap-2.5 transition-colors ${
        theme === 'light'
          ? 'bg-gradient-to-r from-sky-50 via-indigo-50/50 to-white border-black/15'
          : 'bg-gradient-to-r from-[#0284c7]/20 via-[#1e1f22] to-[#141517] border-white/[0.08]'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0284c7]/20 border border-[#0284c7]/40 flex items-center justify-center text-[#38bdf8]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className={`text-xs font-black tracking-tight ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                Habilidades Cadastradas ({skills.length})
              </h4>
              <p className={`text-[10px] ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                Instruções ativas que expandem o assistente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Importar novo documento de instrução .skill.md"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#4f46e5] hover:from-[#0369a1] hover:to-[#4338ca] text-white text-[11px] font-bold shadow-md transition-all hover:scale-102 active:scale-98 flex-shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carregar (.skill.md)</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Fechar aba de habilidades"
                className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${
                  theme === 'light'
                    ? 'hover:bg-black/10 text-slate-700 border-black/20'
                    : 'hover:bg-rose-500/20 text-[#949ba4] hover:text-rose-400 border-white/[0.08]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Feedback de importação */}
        {importStatus && (
          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Campo de Busca Rápida */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#949ba4] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar habilidades por título ou palavra-chave..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none transition-colors ${
              theme === 'light'
                ? 'bg-white text-black border border-black/20 placeholder-slate-400 focus:border-[#0284c7]'
                : 'bg-[#18191c] border border-white/[0.08] text-white placeholder-[#80848e] focus:border-[#38bdf8]'
            }`}
          />
        </div>
      </div>

      {/* Lista Limpa e Estruturada de Habilidades */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
        {filteredSkills.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#949ba4] space-y-2">
            <FileCode className="w-8 h-8 mx-auto text-[#0284c7]/40" />
            <p className="font-medium">Nenhuma habilidade encontrada.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[#38bdf8] hover:underline font-bold text-[11px] inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Carregar arquivo .skill.md
            </button>
          </div>
        ) : (
          filteredSkills.map(skill => (
            <div
              key={skill.id}
              onClick={() => setSelectedSkill(skill)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer group flex items-start justify-between gap-2.5 ${
                theme === 'light'
                  ? 'bg-white hover:bg-sky-50/60 border-black/15 hover:border-[#0284c7]/40 shadow-xs'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] hover:border-[#0284c7]/40'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  skill.isCustom
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-[#0284c7]/20 text-[#38bdf8] border border-[#0284c7]/30'
                }`}>
                  <FileCode className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className={`text-xs font-bold truncate group-hover:text-[#38bdf8] transition-colors ${
                      theme === 'light' ? 'text-black' : 'text-white'
                    }`}>
                      {skill.name}
                    </h5>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-white/[0.06] text-[#949ba4] border border-white/[0.06] flex-shrink-0 truncate max-w-[120px]">
                      {skill.fileName}
                    </span>
                  </div>

                  <p className={`text-[11px] leading-relaxed line-clamp-2 ${
                    theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'
                  }`}>
                    {skill.description}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5 text-[10px] text-[#949ba4]">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ativa
                    </span>
                    <span>•</span>
                    <span>{skill.category || 'Sistema'}</span>
                    {skill.createdAt && (
                      <>
                        <span>•</span>
                        <span>{skill.createdAt}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 pt-1">
                {skill.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSkill(skill.id, e)}
                    title="Remover habilidade personalizada"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="p-1 rounded-lg text-[#949ba4] group-hover:text-[#38bdf8] group-hover:translate-x-0.5 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
