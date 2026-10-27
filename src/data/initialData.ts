import { Server, User, Message, MeetingSummary, Friend, TutorialStep } from '../types';

export const currentUser: User = {
  id: 'user-me',
  name: 'zeit-user',
  tag: '0001',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  status: 'online',
  customStatus: '🚀 Usando o Diskai - Discord com IA',
  role: 'Administrador'
};

export const sampleUsers: User[] = [
  currentUser,
  {
    id: 'user-ana',
    name: 'Ana Silva',
    tag: '1024',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    customStatus: '💡 Planejando próximos lançamentos',
    role: 'Product Lead',
    activity: {
      type: 'playing',
      name: 'Figma',
      details: 'Editando Design System do Diskai'
    }
  },
  {
    id: 'user-carlos',
    name: 'Carlos Mendes',
    tag: '2048',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    status: 'idle',
    customStatus: '⚡ Codando no Diskai',
    role: 'Tech Lead',
    activity: {
      type: 'playing',
      name: 'Visual Studio Code',
      details: 'diskai-voice-processor.ts'
    }
  },
  {
    id: 'user-bot',
    name: 'Diskai AI Bot',
    tag: 'BOT',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    customStatus: '🎙️ Gravando & Resumindo Reuniões',
    role: 'AI Assistant',
    isBot: true,
    activity: {
      type: 'meeting',
      name: 'IA Engine v1.0',
      details: 'Pronto para transcrever chamadas 1-on-1'
    }
  },
  {
    id: 'user-mariana',
    name: 'Mariana Costa',
    tag: '4096',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    status: 'dnd',
    customStatus: '🎨 Criando componentes de UI',
    role: 'Designer UI/UX',
    activity: {
      type: 'listening',
      name: 'Spotify',
      details: 'Synthwave Lo-fi Beats'
    }
  },
  {
    id: 'user-lucas',
    name: 'Lucas Rocha',
    tag: '8192',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'offline',
    role: 'QA Engineer'
  },
  {
    id: 'user-gabriel',
    name: 'Gabriel Martins',
    tag: '3310',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'offline',
    role: 'Frontend Dev'
  }
];

export const initialFriends: Friend[] = [
  {
    id: 'user-ana',
    user: sampleUsers[1],
    relationshipStatus: 'friend',
    unreadCount: 1,
    lastMessage: 'A gravação da reunião de hoje ficou sensacional!',
    lastMessageTime: '10:15',
    mutualServersCount: 3
  },
  {
    id: 'user-carlos',
    user: sampleUsers[2],
    relationshipStatus: 'friend',
    lastMessage: 'Vou testar a chamada 1-on-1 com você agora.',
    lastMessageTime: '09:48',
    mutualServersCount: 3
  },
  {
    id: 'user-bot',
    user: sampleUsers[3],
    relationshipStatus: 'friend',
    lastMessage: 'Olá! Você pode iniciar uma chamada comigo e testar o resumo automático.',
    lastMessageTime: 'Ontem',
    mutualServersCount: 3
  },
  {
    id: 'user-mariana',
    user: sampleUsers[4],
    relationshipStatus: 'friend',
    lastMessage: 'As cores Blurple e Dark Slate ficaram perfeitas.',
    lastMessageTime: '18 out',
    mutualServersCount: 2
  },
  {
    id: 'user-lucas',
    user: sampleUsers[5],
    relationshipStatus: 'friend',
    lastMessage: 'Pode deixar que testo todos os botões de gravação.',
    lastMessageTime: '17 out',
    mutualServersCount: 1
  },
  {
    id: 'user-gabriel',
    user: sampleUsers[6],
    relationshipStatus: 'pending_incoming',
    mutualServersCount: 1
  }
];

export const initialDirectMessages: Record<string, Message[]> = {
  'user-ana': [
    {
      id: 'dm-ana-1',
      userId: 'user-ana',
      channelId: 'user-ana',
      content: 'Oi Zeit! Tudo bem? Vi que você subiu o novo Diskai!',
      timestamp: 'Hoje às 09:30',
      reactions: [{ emoji: '👋', count: 1, users: ['user-me'] }]
    },
    {
      id: 'dm-ana-2',
      userId: 'user-me',
      channelId: 'user-ana',
      content: 'Opa Ana! Sim, agora tem as mensagens diretas completas e suporte a chamadas 1-on-1 graváveis com resumo de IA!',
      timestamp: 'Hoje às 09:32',
      reactions: [{ emoji: '🚀', count: 1, users: ['user-ana'] }]
    },
    {
      id: 'dm-ana-3',
      userId: 'user-ana',
      channelId: 'user-ana',
      content: 'A gravação da reunião de hoje ficou sensacional! Testei o botão de exportar para Markdown e salvou minha ata em segundos.',
      timestamp: 'Hoje às 10:15',
      reactions: [{ emoji: '❤️', count: 1, users: ['user-me'] }]
    }
  ],
  'user-carlos': [
    {
      id: 'dm-carlos-1',
      userId: 'user-carlos',
      channelId: 'user-carlos',
      content: 'E aí! A pipeline de Web Audio e MediaRecorder está rodando perfeitamente nos testes.',
      timestamp: 'Hoje às 09:40',
      reactions: []
    },
    {
      id: 'dm-carlos-2',
      userId: 'user-carlos',
      channelId: 'user-carlos',
      content: 'Vou testar a chamada 1-on-1 com você agora.',
      timestamp: 'Hoje às 09:48',
      reactions: [{ emoji: '🔥', count: 1, users: ['user-me'] }]
    }
  ],
  'user-bot': [
    {
      id: 'dm-bot-1',
      userId: 'user-bot',
      channelId: 'user-bot',
      content: '🤖 **Assistente Pessoal Diskai AI**\n\nSou seu bot particular de reuniões. Você pode me chamar para:\n• Gravar e transcrever conversas\n• Extrair pendências e prazos\n• Resumir qualquer chamada de voz ou DM\n\nClique no ícone de telefone 📞 acima para iniciar uma chamada de teste comigo!',
      timestamp: 'Ontem às 14:00',
      reactions: [{ emoji: '⚡', count: 1, users: ['user-me'] }]
    }
  ],
  'user-mariana': [
    {
      id: 'dm-mariana-1',
      userId: 'user-mariana',
      channelId: 'user-mariana',
      content: 'Oi! O contraste e a tipografia do Discord ficaram impecáveis no Diskai.',
      timestamp: '18 out às 16:20',
      reactions: [{ emoji: '🎨', count: 1, users: ['user-me'] }]
    }
  ]
};

export const initialServers: Server[] = [
  {
    id: 'server-diskai',
    name: 'Diskai Oficial',
    acronym: 'DK',
    icon: '/app-icon.png',
    members: sampleUsers,
    categories: [
      {
        id: 'cat-text',
        name: 'CANAIS DE TEXTO',
        channels: [
          { id: 'ch-geral', serverId: 'server-diskai', name: 'geral', type: 'text', topic: 'Bate-papo principal da comunidade Diskai' },
          { id: 'ch-anuncios', serverId: 'server-diskai', name: 'anuncios', type: 'text', topic: 'Novidades e atualizações oficiais' },
          { id: 'ch-resumos', serverId: 'server-diskai', name: 'resumos-de-reunioes', type: 'text', topic: '📌 Resumos automáticos gerados pela IA após chamadas' },
          { id: 'ch-desenvolvimento', serverId: 'server-diskai', name: 'desenvolvimento', type: 'text', topic: 'Discussões técnicas de código e arquitetura' }
        ]
      },
      {
        id: 'cat-voice',
        name: 'CANAIS DE VOZ & REUNIÃO',
        channels: [
          { id: 'ch-call-geral', serverId: 'server-diskai', name: 'Reunião Geral (Gravável)', type: 'voice', topic: 'Sala com gravação em alta definição e transcrição em tempo real', isMeetingHub: true },
          { id: 'ch-call-standup', serverId: 'server-diskai', name: 'Standup Diário', type: 'voice', topic: 'Alinhamento rápido da equipe', isMeetingHub: true },
          { id: 'ch-call-brainstorm', serverId: 'server-diskai', name: 'Brainstorming IA', type: 'voice', topic: 'Sessão aberta de ideação e novas funcionalidades' },
          { id: 'ch-call-lounge', serverId: 'server-diskai', name: 'Lounge / Café', type: 'voice', topic: 'Bate papo informal' }
        ]
      }
    ]
  },
  {
    id: 'server-dev',
    name: 'AI & Engineering Hub',
    acronym: 'AI',
    members: [currentUser, sampleUsers[1], sampleUsers[2], sampleUsers[3]],
    categories: [
      {
        id: 'cat-dev-text',
        name: 'CANAIS DE TEXTO',
        channels: [
          { id: 'ch-dev-chat', serverId: 'server-dev', name: 'dev-chat', type: 'text', topic: 'Engenharia de software e modelos de linguagem' },
          { id: 'ch-dev-resumos', serverId: 'server-dev', name: 'resumos-sprint', type: 'text', topic: 'Resumos executivos de reuniões de sprint' }
        ]
      },
      {
        id: 'cat-dev-voice',
        name: 'SALAS DE REUNIÃO',
        channels: [
          { id: 'ch-dev-sprint', serverId: 'server-dev', name: 'Sprint Review & Demo', type: 'voice', isMeetingHub: true },
          { id: 'ch-dev-pair', serverId: 'server-dev', name: 'Pair Programming', type: 'voice' }
        ]
      }
    ]
  },
  {
    id: 'server-zeit',
    name: 'Projeto Zeit K',
    acronym: 'ZK',
    members: [currentUser, sampleUsers[2], sampleUsers[3]],
    categories: [
      {
        id: 'cat-zk-text',
        name: 'CANAIS DE TEXTO',
        channels: [
          { id: 'ch-zk-geral', serverId: 'server-zeit', name: 'geral-zeit', type: 'text', topic: 'Acompanhamento do projeto Zeit' },
          { id: 'ch-zk-calib', serverId: 'server-zeit', name: 'calibracoes-e-sensores', type: 'text', topic: 'Leituras de sensores e análises' }
        ]
      },
      {
        id: 'cat-zk-voice',
        name: 'SALAS',
        channels: [
          { id: 'ch-zk-reuniao', serverId: 'server-zeit', name: 'Alinhamento Zeit', type: 'voice', isMeetingHub: true }
        ]
      }
    ]
  }
];

export const initialSummaries: MeetingSummary[] = [
  {
    id: 'sum-1',
    title: 'Resumo da Reunião - Reunião Geral (Gravável)',
    channelName: 'Reunião Geral (Gravável)',
    serverName: 'Diskai Oficial',
    date: '19 out 2026, 09:15',
    durationFormatted: '01:45',
    durationSeconds: 105,
    participants: ['zeit-user (Host)', 'Ana Silva (Product)', 'Carlos Mendes (Tech Lead)'],
    executiveSummary: 'Reunião de validação das funcionalidades revolucionárias do Diskai: gravação com um clique em canais de voz, transcrição ao vivo e geração automática de resumo executivo com lista de tarefas acionáveis.',
    keyTopics: [
      {
        topic: 'Lançamento do Diskai com Gravação Integrada',
        timestamp: '00:03',
        details: 'Apresentação do botão "Gravar Reunião" nos canais de voz, com waveform dinâmico e aviso visual de gravação.'
      },
      {
        topic: 'Mecanismo de Resumo Automatizado',
        timestamp: '00:35',
        details: 'Configuração do motor de IA para extrair sumário, tópicos, lista de tarefas com responsáveis e publicação direta no canal #resumos-de-reunioes.'
      },
      {
        topic: 'Alinhamento dos Próximos Passos',
        timestamp: '01:12',
        details: 'Definição de entrega das melhorias de UI no padrão Discord moderno e validação de acessibilidade.'
      }
    ],
    actionItems: [
      { id: 'act-init-1', task: 'Habilitar gravação de microfone e tela para todos os usuários', assignee: 'Carlos Mendes', completed: true, priority: 'alta' },
      { id: 'act-init-2', task: 'Criar modelo de embed para os resumos postados no chat', assignee: 'Ana Silva', completed: true, priority: 'média' },
      { id: 'act-init-3', task: 'Testar botão de download de áudio e cópia em Markdown', assignee: 'zeit-user', completed: false, priority: 'baixa' }
    ],
    decisions: [
      'O resumo é disponibilizado instantaneamente ao clicar em "Encerrar e Resumir".',
      'Todo resumo pode ser exportado para Markdown ou compartilhado no canal do Discord com apenas 1 clique.'
    ],
    sentiment: 'Produtivo & Focado',
    transcript: [
      { speaker: 'zeit-user (Host)', time: '00:03', text: 'Bom dia pessoal! Iniciando a gravação de teste do Diskai. Como está a latência da gravação?' },
      { speaker: 'Carlos Mendes', time: '00:18', text: 'Perfeita, o MediaRecorder local está capturando em áudio puro e o processamento de IA gera o relatório em poucos segundos.' },
      { speaker: 'Ana Silva', time: '00:42', text: 'Sensacional. O botão de postar resumo direto no canal de texto vai poupar horas de trabalho de anotação de ata.' },
      { speaker: 'zeit-user (Host)', time: '01:20', text: 'Excelente! Vamos encerrar e liberar para todos utilizarem.' }
    ],
    postedToChannel: true
  }
];

export const initialMessages: Record<string, Message[]> = {
  'ch-geral': [
    {
      id: 'msg-1',
      userId: 'user-carlos',
      channelId: 'ch-geral',
      content: 'Boas-vindas ao **Diskai**! 🎉 O novo Discord totalmente recriado com suporte a reuniões graváveis e resumos com IA!',
      timestamp: 'Hoje às 08:30',
      reactions: [{ emoji: '🚀', count: 4, users: ['user-me', 'user-ana', 'user-carlos', 'user-mariana'] }, { emoji: '🔥', count: 3, users: ['user-me', 'user-ana', 'user-carlos'] }]
    },
    {
      id: 'msg-2',
      userId: 'user-ana',
      channelId: 'ch-geral',
      content: 'Testei a opção de gravar reunião no canal `🔊 Reunião Geral`. Assim que a call termina, ela já cria o resumo executivo e a lista de tarefas certinha! Ficou incrível! 👏',
      timestamp: 'Hoje às 08:35',
      reactions: [{ emoji: '❤️', count: 2, users: ['user-me', 'user-carlos'] }]
    },
    {
      id: 'msg-3',
      userId: 'user-bot',
      channelId: 'ch-geral',
      content: '🤖 Olá a todos! Eu sou o **Diskai AI Bot**. Posso transcrever suas chamadas, gerar atas executivas, destacar decisões e exportar em Markdown.',
      timestamp: 'Hoje às 08:40',
      reactions: [{ emoji: '🤖', count: 5, users: ['user-me', 'user-ana', 'user-carlos', 'user-mariana', 'user-lucas'] }]
    }
  ],
  'ch-resumos': [
    {
      id: 'msg-sum-1',
      userId: 'user-bot',
      channelId: 'ch-resumos',
      content: '📋 **Novo Resumo de Reunião Gerado pelo Diskai AI**',
      timestamp: 'Hoje às 09:15',
      reactions: [{ emoji: '📌', count: 3, users: ['user-me', 'user-ana', 'user-carlos'] }],
      embed: {
        title: '🎙️ Resumo da Reunião - Reunião Geral (Gravável)',
        description: 'Reunião de validação das funcionalidades revolucionárias do Diskai: gravação com um clique em canais de voz, transcrição ao vivo e geração automática de resumo executivo com lista de tarefas acionáveis.',
        color: '#5865F2',
        fields: [
          { name: '⏱️ Duração', value: '01:45', inline: true },
          { name: '👥 Participantes', value: 'zeit-user, Ana Silva, Carlos Mendes', inline: true },
          { name: '📊 Sentimento', value: 'Produtivo & Focado', inline: true },
          { name: '🎯 Tarefas Extraídas', value: '• Habilitar gravação de tela e áudio\n• Modelo de embed para resumos\n• Testar download de Markdown', inline: false },
          { name: '✅ Decisão Chave', value: 'Resumo com 1 clique compartilhado em #resumos-de-reunioes', inline: false }
        ],
        footer: { text: 'Diskai AI Intelligence • Clique no botão abaixo para abrir a ata completa' },
        meetingSummaryId: 'sum-1'
      }
    }
  ],
  'ch-anuncios': [
    {
      id: 'msg-anun-1',
      userId: 'user-me',
      channelId: 'ch-anuncios',
      content: '📢 **Diskai v1.0 Oficialmente Disponível**\n\nAgora você pode:\n1. Entrar em qualquer canal de voz\n2. Clicar em **"Gravar Reunião"**\n3. Ver a transcrição em tempo real\n4. Ao encerrar a chamada, receber o **Resumo Completo com IA**\n5. Publicar o resumo com 1 clique no chat ou exportar em Markdown!',
      timestamp: 'Hoje às 09:00',
      reactions: [{ emoji: '🎉', count: 6, users: ['user-me', 'user-ana', 'user-carlos', 'user-mariana', 'user-lucas', 'user-bot'] }]
    }
  ],
  'ch-desenvolvimento': [
    {
      id: 'msg-dev-1',
      userId: 'user-carlos',
      channelId: 'ch-desenvolvimento',
      content: '```typescript\n// Hook de gravação do Diskai\nconst { startRecording, stopAndSummarize, liveWaveform } = useDiskaiRecorder();\n```\nA API está limpa e modular!',
      timestamp: 'Hoje às 09:10',
      reactions: [{ emoji: '💻', count: 2, users: ['user-me', 'user-carlos'] }]
    }
  ]
};

export const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: 'Bem-vindo ao Diskai!',
    description: 'O Diskai é uma recriação completa do Discord com superpoderes de Inteligência Artificial para gravar e resumir suas reuniões automaticamente.',
    icon: 'Sparkles',
    tip: 'Navegue pelos servidores na barra preta à esquerda ou clique no topo para ir às Mensagens Diretas (Direct).'
  },
  {
    id: 2,
    title: 'Mensagens Diretas (Direct) & Amigos',
    description: 'No botão Direct (topo esquerdo), você conversa no privado com amigos, vê quem está online e confere o que estão jogando ou fazendo na barra "Ativo Agora".',
    icon: 'Users',
    tip: 'Você também pode adicionar novos amigos digitando o nome ou tag na aba verde "Adicionar Amigo".'
  },
  {
    id: 3,
    title: 'Chamadas de Voz & Vídeo (Servidor e 1-on-1)',
    description: 'Entre em qualquer canal de voz (ex: 🔊 Reunião Geral) ou clique no ícone de telefone 📞 no Direct de qualquer amigo para abrir uma chamada direta privada com câmera e tela.',
    icon: 'Phone',
    tip: 'O microfone possui cancelamento de ruído e detecção visual de voz (borda verde quando você fala).'
  },
  {
    id: 4,
    title: 'Gravação da Reunião com 1 Clique',
    description: 'Durante qualquer chamada, clique no botão "Gravar Reunião". Um contador em tempo real (REC) será ativado junto com o visualizador de onda e a transcrição ao vivo das falas.',
    icon: 'Radio',
    tip: 'A gravação funciona tanto em grandes reuniões de servidores quanto em alinhamentos 1-on-1 no Direct!'
  },
  {
    id: 5,
    title: 'Resumo com IA (Diskai AI Studio)',
    description: 'Ao terminar, clique em "Encerrar & Resumir Reunião". A IA sintetiza a chamada instantaneamente gerando: Resumo Executivo, Lista de Tarefas com responsáveis, Tópicos com timestamps e ata para download.',
    icon: 'FileText',
    tip: 'Você pode postar a ata no canal #resumos-de-reunioes com 1 clique ou baixar o relatório em Markdown (.md)!'
  }
];
