import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Pin,
  FileText,
  Shield,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Bot,
  Zap,
  Lock,
  Users,
  MessageSquare,
  X
} from 'lucide-react';

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
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const skills = [
    {
      id: 'calendar',
      category: 'calendar',
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      title: 'Calendário e Agendamentos',
      summary: 'Criação, listagem e gestão autônoma de reuniões e tarefas.',
      details: [
        'Cria compromissos automaticamente a partir de linguagem natural com data e horário.',
        'Sincroniza eventos na tabela appointments do Supabase em tempo real.',
        'Permite marcar tarefas como concluídas ou excluí-las com um único toque.'
      ],
      samplePrompts: [
        'Agendar reunião de alinhamento com a equipe amanhã às 14h',
        'Criar tarefa testar a gravação de chamadas',
        'Quais são os meus próximos compromissos?'
      ]
    },
    {
      id: 'pinned',
      category: 'pinned',
      icon: Pin,
      color: 'from-amber-500 to-orange-500',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      title: 'Mensagens Fixadas',
      summary: 'Centralização e busca de avisos prioritários do servidor.',
      details: [
        'Lista imediatamente todos os comunicados destacados no canal ativo.',
        'Permite fixar e desfixar mensagens importantes com feedback visual da arara.',
        'Filtra decisões e marcos históricos para que ninguém perca alinhamentos.'
      ],
      samplePrompts: [
        'Mostrar mensagens fixadas deste canal',
        'Quais foram os últimos avisos importantes postados?'
      ]
    },
    {
      id: 'summaries',
      category: 'summaries',
      icon: FileText,
      color: 'from-purple-500 to-indigo-500',
      badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      title: 'Resumos Inteligentes (Gemini Flash)',
      summary: 'Atas executivas de reuniões em áudio e sínteses de canais de chat.',
      details: [
        'Processa áudios e vídeos de chamadas via Edge Function summarize-call gerando tópicos, decisões e sentimento.',
        'Condensa centenas de mensagens não lidas de chat com summarize-chat em segundos.',
        'Formata pontos de ação (action items) atribuídos aos membros presentes.'
      ],
      samplePrompts: [
        'Resumir as conversas recentes deste canal',
        'Gerar ata completa da reunião gravada'
      ]
    },
    {
      id: 'security',
      category: 'security',
      icon: Shield,
      color: 'from-emerald-500 to-teal-500',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      title: 'Gestão e Segurança da Plataforma',
      summary: 'Controle de canais privados e aprovação de novos membros.',
      details: [
        'Protege canais privados garantindo acesso e inclusão apenas ao Criador do Canal ou Administradores.',
        'Garante acesso livre de todos os membros aos canais públicos do servidor.',
        'Alerta administradores instantaneamente sobre novas solicitações de usuários pendentes no Supabase.'
      ],
      samplePrompts: [
        'Quantos usuários estão aguardando aprovação?',
        'Quem tem permissão para acessar este canal privado?'
      ]
    },
    {
      id: 'search',
      category: 'search',
      icon: Search,
      color: 'from-rose-500 to-pink-500',
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      title: 'Pesquisa de Projetos e Decisões',
      summary: 'Varredura de histórico para respostas rápidas de contexto.',
      details: [
        'Analisa o contexto do canal ativo, anexos compartilhados e membros participantes.',
        'Responde dúvidas contextuais sobre projetos em andamento sem sair do fluxo de trabalho.',
        'Comportamento nativo com 15 gestos 3D realistas integrados ao Three.js.'
      ],
      samplePrompts: [
        'O que a equipe discutiu sobre as permissões de canais?',
        'Quais links úteis estão registrados no canal?'
      ]
    }
  ];

  const filteredSkills = activeCategory === 'all'
    ? skills
    : skills.filter(s => s.category === activeCategory);

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Welcome Hero Banner */}
      <div className={`p-4 sm:p-5 flex-shrink-0 border-b ${
        theme === 'light'
          ? 'bg-gradient-to-r from-sky-50 via-indigo-50 to-amber-50/50 border-black/15'
          : 'bg-gradient-to-r from-[#0284c7]/20 via-[#4f46e5]/15 to-[#0ea5e9]/10 border-white/[0.08]'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0284c7]/20 border border-[#0284c7]/40 flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#0284c7]/20 overflow-hidden">
              <img src="/arara-mascote.png" alt="Arara Assistente" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base sm:text-lg font-black tracking-tight ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                  Guia de Habilidades da Arara
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Gemini Flash
                </span>
              </div>
              <p className={`text-xs mt-0.5 leading-snug ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                Conheça tudo o que a mascote 3D oficial do DiskAI pode fazer por você e sua equipe! 🦜✨
              </p>
            </div>
          </div>

          {!isEmbedded && onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-all ${
                theme === 'light'
                  ? 'hover:bg-black/10 text-slate-700'
                  : 'hover:bg-white/[0.08] text-[#949ba4] hover:text-white'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto no-scrollbar pt-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-[#0284c7] text-white shadow-sm'
                : theme === 'light'
                ? 'bg-black/5 hover:bg-black/10 text-slate-700'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#949ba4] hover:text-white'
            }`}
          >
            Todas ({skills.length})
          </button>
          <button
            onClick={() => setActiveCategory('calendar')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeCategory === 'calendar'
                ? 'bg-blue-600 text-white shadow-sm'
                : theme === 'light'
                ? 'bg-black/5 hover:bg-black/10 text-slate-700'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#949ba4] hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Calendário</span>
          </button>
          <button
            onClick={() => setActiveCategory('pinned')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeCategory === 'pinned'
                ? 'bg-amber-600 text-white shadow-sm'
                : theme === 'light'
                ? 'bg-black/5 hover:bg-black/10 text-slate-700'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#949ba4] hover:text-white'
            }`}
          >
            <Pin className="w-3 h-3" />
            <span>Fixadas</span>
          </button>
          <button
            onClick={() => setActiveCategory('summaries')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeCategory === 'summaries'
                ? 'bg-purple-600 text-white shadow-sm'
                : theme === 'light'
                ? 'bg-black/5 hover:bg-black/10 text-slate-700'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#949ba4] hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Resumos</span>
          </button>
          <button
            onClick={() => setActiveCategory('security')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeCategory === 'security'
                ? 'bg-emerald-600 text-white shadow-sm'
                : theme === 'light'
                ? 'bg-black/5 hover:bg-black/10 text-slate-700'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#949ba4] hover:text-white'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>Segurança</span>
          </button>
        </div>
      </div>

      {/* Skills Cards Grid / Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 no-scrollbar">
        {filteredSkills.map(skill => {
          const Icon = skill.icon;
          return (
            <div
              key={skill.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                theme === 'light'
                  ? 'bg-white border-black/15 shadow-sm hover:border-black/30'
                  : 'bg-[#18191c] border-white/[0.08] hover:border-white/[0.16] shadow-md'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${skill.color} text-white shadow-md flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs sm:text-sm font-black tracking-tight ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                      {skill.title}
                    </h4>
                    <p className={`text-[11px] leading-snug mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-[#949ba4]'}`}>
                      {skill.summary}
                    </p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border flex-shrink-0 ${skill.badgeColor}`}>
                  Ativo
                </span>
              </div>

              {/* Bullet Details */}
              <div className={`space-y-1 pl-1 text-[11px] leading-relaxed mb-3 ${
                theme === 'light' ? 'text-slate-700' : 'text-[#dbdee1]'
              }`}>
                {skill.details.map((d, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>

              {/* Sample Prompts / Quick Try Buttons */}
              <div className="pt-2.5 border-t border-black/10 dark:border-white/[0.06] space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-500 dark:text-sky-400 flex items-center gap-1 select-none">
                  <Zap className="w-3 h-3" />
                  <span>Exemplos de Comandos (clique para enviar):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skill.samplePrompts.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => onSelectPrompt && onSelectPrompt(prompt)}
                      title={`Pedir para a arara: "${prompt}"`}
                      className={`text-left text-[11px] px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1.5 group hover:scale-[1.02] active:scale-95 ${
                        theme === 'light'
                          ? 'bg-slate-50 hover:bg-sky-50 border-black/15 hover:border-sky-500 text-slate-800'
                          : 'bg-white/[0.03] hover:bg-[#0284c7]/20 border-white/[0.06] hover:border-[#0284c7]/50 text-[#dbdee1] hover:text-white'
                      }`}
                    >
                      <ArrowRight className="w-3 h-3 text-sky-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                      <span className="truncate max-w-[260px] sm:max-w-[320px] font-medium">"{prompt}"</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className={`p-3 border-t text-[11px] flex items-center justify-between flex-shrink-0 ${
        theme === 'light' ? 'bg-slate-100 border-black/15 text-slate-600' : 'bg-[#111214] border-white/[0.06] text-[#949ba4]'
      }`}>
        <div className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-sky-400" />
          <span>Arara Assistente v2.5 • Motor Gemini 1.5 Flash</span>
        </div>
        <span className="font-semibold text-emerald-400">100% Operacional</span>
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div className={`w-full max-w-xl h-[620px] max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border ${
        theme === 'light'
          ? 'bg-white border-black/20 text-black'
          : 'bg-[#1a1b1e] border-white/[0.12] text-[#dbdee1]'
      }`}>
        {content}
      </div>
    </div>
  );
};
