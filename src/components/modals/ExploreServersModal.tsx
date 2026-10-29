import React, { useState, useMemo } from 'react';
import {
  X,
  Compass,
  Users,
  Search,
  Gamepad2,
  Music,
  Tv,
  Atom,
  GraduationCap,
  School,
  Sparkles,
  Check,
  Hash,
  Volume2,
  ExternalLink,
  Flame
} from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';
import { ViralTrendsView } from '../viral/ViralTrendsView';

type CommunityCategory =
  | 'Início'
  | 'Gamer'
  | 'Música'
  | 'Entretenimento'
  | 'Ciência e Tecnologia'
  | 'Educação'
  | 'Centrais de Estudantes';

interface CommunityServer {
  id: string;
  name: string;
  acronym: string;
  members: number;
  desc: string;
  category: CommunityCategory;
  tag: string;
  icon?: string;
  channelsSample?: string[];
}

const COMMUNITY_CATALOG: CommunityServer[] = [
    // Gamer
    {
      id: 'cat-gamer-1',
      name: 'Comunidade Gamer & Esports Brasil',
      acronym: 'GE',
      members: 48900,
      desc: 'Salas de voz para Valorant, CS2, League of Legends e torneios amadores com gravação de call.',
      category: 'Gamer',
      tag: 'Jogos & Campeonatos',
      channelsSample: ['geral-games', 'campeonatos-amadores', 'call-competitiva']
    },
    {
      id: 'cat-gamer-2',
      name: 'Minecraft Brasil & Modpacks',
      acronym: 'MC',
      members: 31200,
      desc: 'Servidores de sobrevivência, criação de mods, builders e canais de áudio com IA.',
      category: 'Gamer',
      tag: 'Sandbox & Mods',
      channelsSample: ['sobrevivencia', 'duvidas-mods', 'construcoes']
    },
    {
      id: 'cat-gamer-3',
      name: 'RPG de Mesa & D&D Aventuras',
      acronym: 'RPG',
      members: 12400,
      desc: 'Sessões de RPG com gravação e ata automática de campanha gerada por inteligência artificial.',
      category: 'Gamer',
      tag: 'Mesa & Lore',
      channelsSample: ['mesas-abertas', 'fichas-e-regras', 'lore-e-historias']
    },

    // Música
    {
      id: 'cat-musica-1',
      name: 'Produtores Musicais & Beatmakers',
      acronym: 'BM',
      members: 21500,
      desc: 'Compartilhamento de beats, mixagem, masterização e feedback de faixas em tempo real.',
      category: 'Música',
      tag: 'Produção Musical',
      channelsSample: ['compartilhe-beats', 'dicas-de-mixagem', 'feedback-ao-vivo']
    },
    {
      id: 'cat-musica-2',
      name: 'Música, Acústico & Jam Sessions',
      acronym: 'JAM',
      members: 14700,
      desc: 'Canais de voz com áudio de alta fidelidade para ensaios, violão, teclado e canto.',
      category: 'Música',
      tag: 'Instrumentos & Canto',
      channelsSample: ['sala-acustica', 'teoria-musical', 'letras-e-cifras']
    },
    {
      id: 'cat-musica-3',
      name: 'Lofi & Estudo Concentrado',
      acronym: 'LF',
      members: 38000,
      desc: 'Música lo-fi contínua e salas de coworking em silêncio com foco produtivo.',
      category: 'Música',
      tag: 'Foco & Relax',
      channelsSample: ['radio-lofi-24-7', 'coworking-silencioso', 'pomodoro-estudos']
    },

    // Entretenimento
    {
      id: 'cat-ent-1',
      name: 'Cinema, Séries & Animes Hub',
      acronym: 'CINE',
      members: 27800,
      desc: 'Discussões sobre lançamentos de cinema, temporadas de anime e watch parties semanais.',
      category: 'Entretenimento',
      tag: 'Cultura Pop',
      channelsSample: ['filmes-e-series', 'animes-da-temporada', 'sem-spoilers']
    },
    {
      id: 'cat-ent-2',
      name: 'Comédia & Memes Diários',
      acronym: 'LOL',
      members: 54100,
      desc: 'O maior hub de memes, vídeos engraçados e canais de descompressão diária.',
      category: 'Entretenimento',
      tag: 'Humor & Memes',
      channelsSample: ['memes-do-dia', 'videos-curtos', 'off-topic']
    },
    {
      id: 'cat-ent-3',
      name: 'Criação de Conteúdo & Streamers',
      acronym: 'LIVE',
      members: 19600,
      desc: 'Dicas de OBS Studio, iluminação, parcerias e estratégias para criadores no Twitch e YouTube.',
      category: 'Entretenimento',
      tag: 'Streaming & Vídeo',
      channelsSample: ['dicas-obs', 'divulgacao-de-lives', 'colaboracoes']
    },

    // Ciência e Tecnologia
    {
      id: 'cat-tech-1',
      name: 'Comunidade Global de IA & LLMs',
      acronym: 'IA',
      members: 64200,
      desc: 'Pesquisa avançada em modelos generativos, Gemini, Claude, agentes autônomos e automações.',
      category: 'Ciência e Tecnologia',
      tag: 'Inteligência Artificial',
      channelsSample: ['gemini-e-llms', 'agentes-autonomos', 'papers-de-ia']
    },
    {
      id: 'cat-tech-2',
      name: 'Developers Brasil & Open Source',
      acronym: 'DEV',
      members: 78500,
      desc: 'TypeScript, React, Python, Rust, Cloud computing e revisões colaborativas de código.',
      category: 'Ciência e Tecnologia',
      tag: 'Programação',
      channelsSample: ['frontend-react', 'backend-nodejs', 'carreira-tech']
    },
    {
      id: 'cat-tech-3',
      name: 'Startup Hub & Reuniões Ágeis',
      acronym: 'SH',
      members: 23400,
      desc: 'Salas de reuniões estratégicas com atas instantâneas e relatórios de OKR via IA.',
      category: 'Ciência e Tecnologia',
      tag: 'Empreendedorismo',
      channelsSample: ['pitch-e-feedback', 'atas-com-ia', 'growth-marketing']
    },
    {
      id: 'cat-tech-4',
      name: 'Cibersegurança & Ethical Hacking',
      acronym: 'SEC',
      members: 31900,
      desc: 'Análise de vulnerabilidades, CTFs, segurança defensiva e práticas modernas de DevSecOps.',
      category: 'Ciência e Tecnologia',
      tag: 'Segurança da Informação',
      channelsSample: ['laboratorio-ctf', 'seguranca-defensiva', 'certificacoes']
    },

    // Educação
    {
      id: 'cat-edu-1',
      name: 'Idiomas & Prática de Conversação',
      acronym: 'LANG',
      members: 42300,
      desc: 'Salas de conversação em Inglês, Espanhol, Francês e Alemão com feedback em tempo real.',
      category: 'Educação',
      tag: 'Idiomas & Fala',
      channelsSample: ['english-speaking', 'espanol-practica', 'gramatica-e-dicas']
    },
    {
      id: 'cat-edu-2',
      name: 'Matemática, Física & Exatas',
      acronym: 'MATH',
      members: 16800,
      desc: 'Resolução de problemas, olimpíadas acadêmicas e grupos de estudo diários.',
      category: 'Educação',
      tag: 'Ciências Exatas',
      channelsSample: ['calculo-e-algebra', 'fisica-geral', 'duvidas-exercicios']
    },
    {
      id: 'cat-edu-3',
      name: 'Educação Tech & Carreira Dev',
      acronym: 'EDU',
      members: 29500,
      desc: 'Roteiros de estudo para iniciantes, preparação para entrevistas técnicas e portfólio.',
      category: 'Educação',
      tag: 'Mentoria & Estudos',
      channelsSample: ['iniciantes-em-ti', 'revisao-curriculo', 'mock-interviews']
    },

    // Centrais de Estudantes
    {
      id: 'cat-est-1',
      name: 'Central Universitária & TCC Brasil',
      acronym: 'TCC',
      members: 35100,
      desc: 'Apoio a monografias, normas ABNT, bolsas de pesquisa e grupos por curso acadêmico.',
      category: 'Centrais de Estudantes',
      tag: 'Vida Universitária',
      channelsSample: ['apoio-tcc-e-abnt', 'bolsas-e-estagios', 'grupos-por-curso']
    },
    {
      id: 'cat-est-2',
      name: 'Grêmio Estudantil & Diretórios',
      acronym: 'GEA',
      members: 18400,
      desc: 'Organização de eventos acadêmicos, atléticas universitárias e debates de representação.',
      category: 'Centrais de Estudantes',
      tag: 'Movimento Estudantil',
      channelsSample: ['eventos-academicos', 'atleticas-e-jogos', 'debates-estudantis']
    },
    {
      id: 'cat-est-3',
      name: 'Vestibulares, ENEM & Concursos',
      acronym: 'ENEM',
      members: 52000,
      desc: 'Cronogramas de simulados, redação nota 1000 e plantão de dúvidas com professores.',
      category: 'Centrais de Estudantes',
      tag: 'Vestibulares & ENEM',
      channelsSample: ['simulados-enem', 'redacao-nota-mil', 'cronograma-estudos']
    }
  ];

export const ExploreServersModal: React.FC = () => {
  const { exploreModalOpen } = useDiskai();
  if (!exploreModalOpen) return null;
  return <ExploreServersDialog />;
};

const ExploreServersDialog: React.FC = () => {
  const {
    setExploreModalOpen,
    addServer,
    servers,
    setActiveServerId,
    theme
  } = useDiskai();

  const isLight = theme === 'light';
  const [activeDiscoverTab, setActiveDiscoverTab] = useState<'servers' | 'virais'>(() => {
    if (typeof window !== 'undefined' && (window as any).__openViraisTab) {
      delete (window as any).__openViraisTab;
      return 'virais';
    }
    return 'servers';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__openViraisTab) {
      delete (window as any).__openViraisTab;
      setActiveDiscoverTab('virais');
    }
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory>('Início');
  const [searchTerm, setSearchTerm] = useState('');

  const categories: { label: CommunityCategory; icon: React.ReactNode }[] = [
    { label: 'Início', icon: <Compass className="w-4 h-4" /> },
    { label: 'Gamer', icon: <Gamepad2 className="w-4 h-4" /> },
    { label: 'Música', icon: <Music className="w-4 h-4" /> },
    { label: 'Entretenimento', icon: <Tv className="w-4 h-4" /> },
    { label: 'Ciência e Tecnologia', icon: <Atom className="w-4 h-4" /> },
    { label: 'Educação', icon: <GraduationCap className="w-4 h-4" /> },
    { label: 'Centrais de Estudantes', icon: <School className="w-4 h-4" /> }
  ];

  // Servidores já cadastrados no sistema (do context) com tratamento seguro
  const registeredPublicServers = useMemo(() => {
    return (servers || []).map(s => {
      const allChannels = (s?.categories || []).flatMap(c =>
        (c?.channels || []).map(ch => ch?.name || '')
      );
      return {
        id: s.id,
        name: s.name,
        acronym: s.acronym || s.name?.slice(0, 2).toUpperCase() || 'SV',
        members: 15400,
        desc: `Servidor oficial com suporte a salas de voz, gravação e geração de atas automáticas via IA.`,
        category: 'Ciência e Tecnologia' as CommunityCategory,
        tag: 'Servidor Oficial',
        icon: s.icon,
        channelsSample: allChannels.slice(0, 3),
        isRegistered: true
      };
    });
  }, [servers]);

  // Lista unificada
  const allCommunities = useMemo(() => {
    const combined = [...registeredPublicServers, ...COMMUNITY_CATALOG];
    // Remove duplicatas por nome
    return combined.filter((item, index, self) =>
      index === self.findIndex(t => t.name.toLowerCase() === item.name.toLowerCase())
    );
  }, [registeredPublicServers]);

  // Filtragem por Categoria e Barra de Pesquisa
  const filteredCommunities = useMemo(() => {
    return allCommunities.filter(community => {
      // Filtro por Categoria
      const matchesCategory =
        selectedCategory === 'Início' || community.category === selectedCategory;

      if (!matchesCategory) return false;

      // Filtro por Barra de Pesquisa (Nome do servidor, descrição, tags e canais)
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const matchesName = community.name.toLowerCase().includes(q);
      const matchesDesc = community.desc.toLowerCase().includes(q);
      const matchesTag = community.tag.toLowerCase().includes(q);
      const matchesChannels = community.channelsSample?.some(ch =>
        ch.toLowerCase().includes(q)
      );

      return matchesName || matchesDesc || matchesTag || matchesChannels;
    });
  }, [allCommunities, selectedCategory, searchTerm]);

  const handleJoinOrAccess = (community: CommunityServer) => {
    // Se o servidor já existir nos cadastrados do usuário
    const existing = (servers || []).find(
      s => s.name.toLowerCase() === community.name.toLowerCase()
    );

    if (existing) {
      setActiveServerId(existing.id);
      setExploreModalOpen(false);
      return;
    }

    // Adiciona o novo servidor ao contexto
    addServer(community.name, community.acronym, community.icon);
    setExploreModalOpen(false);
  };

  const isAlreadyJoined = (communityName: string) => {
    return (servers || []).some(s => s.name.toLowerCase() === communityName.toLowerCase());
  };

  return (
    <div
      onClick={() => setExploreModalOpen(false)}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-6xl h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex transition-colors border ${
          isLight
            ? 'bg-[#f8f9fa] border-slate-300 text-slate-800'
            : 'bg-[#1e1f22] border-[#383a40] text-[#dbdee1]'
        }`}
      >
        {/* ===================================================================== */}
        {/* BARRA LATERAL DA TELA DESCUBRA (ESTILO DISCORD)                       */}
        {/* ===================================================================== */}
        <aside
          className={`w-48 sm:w-56 flex-shrink-0 border-r flex flex-col justify-between p-3.5 transition-colors ${
            isLight
              ? 'bg-[#f2f3f5] border-slate-200 text-slate-800'
              : 'bg-[#2b2d31] border-[#1f2023] text-[#dbdee1]'
          }`}
        >
          <div className="space-y-4">
            {/* Título Descubra */}
            <div className="px-2 pt-1 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-sm">
                <Compass className="w-4 h-4" />
              </div>
              <span
                className={`font-black text-base tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Descubra
              </span>
            </div>

            {/* Menu de Navegação da Barra Lateral */}
            <nav className="space-y-1">
              {/* Item 1: Servidores / Canais */}
              <button
                type="button"
                onClick={() => setActiveDiscoverTab('servers')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeDiscoverTab === 'servers'
                    ? isLight
                      ? 'bg-white text-slate-950 shadow-sm border border-slate-200/80 font-black'
                      : 'bg-[#404249] text-white shadow-sm font-black'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                    : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Compass className="w-4 h-4 text-[#5865F2]" />
                <span>Servidores</span>
              </button>

              {/* Item 2: Virais (Posicionado exatamente abaixo de Servidores/Canais) */}
              <button
                type="button"
                onClick={() => setActiveDiscoverTab('virais')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeDiscoverTab === 'virais'
                    ? isLight
                      ? 'bg-white text-slate-950 shadow-sm border border-slate-200/80 font-black'
                      : 'bg-[#404249] text-white shadow-sm font-black'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                    : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-500 fill-current" />
                <span className="flex-1">Virais</span>
              </button>
            </nav>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/5 px-2 text-[11px] text-slate-400">
            <span>Diskai Hub</span>
          </div>
        </aside>

        {/* ===================================================================== */}
        {/* ÁREA DE CONTEÚDO PRINCIPAL (SERVIDORES OU VIRAIS)                     */}
        {/* ===================================================================== */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {activeDiscoverTab === 'virais' ? (
            <ViralTrendsView
              onBackToServers={() => setActiveDiscoverTab('servers')}
              onClose={() => setExploreModalOpen(false)}
            />
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* ===================================================================== */}
              {/* LINHA SUPERIOR: TÍTULO, FILTRO DE CATEGORIAS E FECHAR                  */}
              {/* ===================================================================== */}
              <header
                className={`px-5 py-3 border-b flex items-center justify-between gap-4 flex-shrink-0 transition-colors ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900 shadow-xs'
                    : 'bg-[#232428] border-[#1f2023] text-white'
                }`}
              >
                {/* Lado Esquerdo: Identificador "Descubra" */}
                <div className="flex items-center gap-2 flex-shrink-0 pr-2 border-r border-slate-200 dark:border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-sm">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-base tracking-tight hidden sm:inline">
                    Descubra
                  </span>
                </div>

                {/* Centro: Barra de Categorias Horizontal (Espaço Amplo sem Barra Duplicada) */}
                <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                  {categories.map(cat => {
                    const isSelected = selectedCategory === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setSelectedCategory(cat.label)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 relative cursor-pointer ${
                          isSelected
                            ? isLight
                              ? 'text-slate-950 font-bold bg-slate-100 after:content-[""] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-slate-900'
                              : 'text-white font-bold bg-white/10 after:content-[""] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-white'
                            : isLight
                            ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70'
                            : 'text-[#949ba4] hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className={isSelected ? 'text-[#5865F2]' : 'opacity-70'}>
                          {cat.icon}
                        </span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Lado Direito: Apenas o Botão Fechar Modal (Zero Colisão) */}
                <div className="flex items-center flex-shrink-0 pl-2 border-l border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setExploreModalOpen(false)}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      isLight
                        ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'
                    }`}
                    title="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* ===================================================================== */}
              {/* CORPO PRINCIPAL COM HERO BANNER E GRID DE COMUNIDADES                 */}
              {/* ===================================================================== */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* HERO BANNER LIMPO E GEOMÉTRICO (SEM LEGENDA POLUÍDA) */}
                <section
                  className={`px-6 py-6 sm:py-8 text-center relative overflow-hidden transition-colors border-b ${
                    isLight
                      ? 'bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white border-slate-200'
                      : 'bg-gradient-to-b from-[#2b2d31] via-[#232428] to-[#1e1f22] border-white/5'
                  }`}
                >
                  <div className="max-w-xl mx-auto space-y-4 relative z-10">
                    <h1
                      className={`text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      ENCONTRE SUA COMUNIDADE NO DISKAI
                    </h1>

                    {/* Barra de Pesquisa Única Centralizada */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Explorar servidores comunitários e canais..."
                        className={`w-full text-xs sm:text-sm pl-11 pr-10 py-3 rounded-2xl border shadow-sm transition-all focus:outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/20'
                            : 'bg-[#18191c] border-[#383a40] text-white placeholder-[#80848e] focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/20'
                        }`}
                      />
                      <Search
                        className={`w-4 h-4 sm:w-5 sm:h-5 absolute left-3.5 top-3.5 pointer-events-none ${
                          isLight ? 'text-slate-400' : 'text-[#80848e]'
                        }`}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                </section>

          {/* GRID DE SERVIDORES E COMUNIDADES */}
          <main className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {selectedCategory === 'Início'
                    ? 'Comunidades em Destaque'
                    : `Comunidades: ${selectedCategory}`}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-[#dbdee1]'
                }`}>
                  {filteredCommunities.length} {filteredCommunities.length === 1 ? 'comunidade' : 'comunidades'}
                </span>
              </div>

              {searchTerm && (
                <span className={isLight ? 'text-slate-500 text-[11px]' : 'text-[#949ba4] text-[11px]'}>
                  Filtrando por: <strong className={isLight ? 'text-slate-800' : 'text-white'}>"{searchTerm}"</strong>
                </span>
              )}
            </div>

            {filteredCommunities.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#5865F2]/10 text-[#5865F2] flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Nenhuma comunidade encontrada
                </h3>
                <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-[#949ba4]'}`}>
                  Não encontramos servidores correspondentes a "{searchTerm}" na categoria {selectedCategory}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('Início');
                  }}
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold rounded-xl transition-colors shadow"
                >
                  Ver Todas as Comunidades
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredCommunities.map(community => {
                  const alreadyJoined = isAlreadyJoined(community.name);

                  return (
                    <div
                      key={community.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-3.5 group ${
                        isLight
                          ? 'bg-white border-slate-200/90 hover:border-[#5865F2]/60 hover:shadow-md'
                          : 'bg-[#2b2d31] border-[#383a40] hover:border-[#5865F2]/80 hover:bg-[#313338]'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header do Card com Ícone e Badges */}
                        <div className="flex items-start gap-3">
                          {community.icon ? (
                            <img
                              src={community.icon}
                              alt={community.name}
                              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-black/5 dark:ring-white/10 flex-shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#4752c4] text-white font-extrabold flex items-center justify-center text-sm shadow flex-shrink-0">
                              {community.acronym}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h3
                              className={`font-bold text-sm tracking-tight leading-snug line-clamp-1 group-hover:text-[#5865F2] transition-colors ${
                                isLight ? 'text-slate-900' : 'text-white'
                              }`}
                            >
                              {community.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                  isLight
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-[#1e1f22] text-[#949ba4]'
                                }`}
                              >
                                {community.tag}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Descrição com Altura Harmoniosa */}
                        <p
                          className={`text-xs leading-relaxed line-clamp-2 min-h-[34px] ${
                            isLight ? 'text-slate-600' : 'text-[#949ba4]'
                          }`}
                        >
                          {community.desc}
                        </p>

                        {/* Amostra de Canais Cadastrados */}
                        {community.channelsSample && community.channelsSample.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {community.channelsSample.map(ch => (
                              <span
                                key={ch}
                                className={`text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                                  isLight
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-[#1e1f22] text-[#949ba4] border border-[#383a40]'
                                }`}
                              >
                                <Hash className="w-2.5 h-2.5 opacity-60" />
                                {ch}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer do Card com Membros e Botão de Ação */}
                      <div
                        className={`pt-3 border-t flex items-center justify-between gap-2 mt-0.5 ${
                          isLight ? 'border-slate-100' : 'border-[#383a40]/60'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#23a55a]">
                          <Users className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{community.members.toLocaleString('pt-BR')} membros</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleJoinOrAccess(community)}
                          className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer ${
                            alreadyJoined
                              ? isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                              : 'bg-[#5865F2] hover:bg-[#4752c4] text-white'
                          }`}
                        >
                          {alreadyJoined ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#23a55a]" />
                              <span>Acessar</span>
                            </>
                          ) : (
                            <span>Entrar</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    )}
  </div>
</div>
</div>
);
};
