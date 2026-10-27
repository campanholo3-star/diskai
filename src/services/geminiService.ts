import { Appointment } from './supabase';

export interface DiskaiPlatformContext {
  server_name?: string;
  channel_id?: string;
  channel_name?: string;
  user_name?: string;
  user_id?: string;
  user_role?: string;
  channel_messages?: Array<{
    id: string;
    userName: string;
    content: string;
    timestamp: string;
  }>;
  appointments?: Appointment[];
  pinned_messages?: Array<{
    id: string;
    content: string;
    authorName?: string;
  }>;
  pending_users_count?: number;
}

export interface MacawAIResponse {
  reply: string;
  actionTaken?: string | null;
  appointment?: any;
  gesture?: string;
  gestureSequence?: string[];
  usedGeminiApi?: boolean;
}

/**
 * Obtém a chave da API do Gemini:
 * 1. LocalStorage ('diskai_gemini_api_key')
 * 2. Vite Environment (VITE_GEMINI_API_KEY)
 */
export const getGeminiApiKey = (): string => {
  try {
    const saved = localStorage.getItem('diskai_gemini_api_key');
    if (saved && saved.trim()) return saved.trim();
  } catch {}

  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && String(envKey).trim()) {
    return String(envKey).trim();
  }

  return '';
};

export const setGeminiApiKey = (key: string): void => {
  try {
    if (key.trim()) {
      localStorage.setItem('diskai_gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('diskai_gemini_api_key');
    }
  } catch (err) {
    console.error('[Gemini] Erro ao salvar chave no localStorage:', err);
  }
};

/**
 * Testar conexão com a API do Gemini
 */
export const testGeminiApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'Chave não informada.' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Responda apenas "OK" para teste de conectividade.' }]
          }
        ]
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `Erro HTTP ${res.status}`
      };
    }

    return { success: true, message: 'Chave do Gemini validada com sucesso!' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Falha na conexão de rede.' };
  }
};

/**
 * Monta o prompt de sistema do Diskai com todo o contexto em tempo real da plataforma
 */
const buildSystemInstruction = (ctx: DiskaiPlatformContext): string => {
  const recentMsgsStr = (ctx.channel_messages || [])
    .slice(-8)
    .map(m => `[${m.timestamp}] ${m.userName}: ${m.content}`)
    .join('\n');

  const appsStr = (ctx.appointments || [])
    .slice(0, 5)
    .map(a => `• ${a.title} (${new Date(a.start_time).toLocaleDateString('pt-BR')}) [${a.status === 'completed' ? 'Concluída' : 'Pendente'}]`)
    .join('\n');

  const pinsStr = (ctx.pinned_messages || [])
    .slice(0, 4)
    .map(p => `• "${p.content}"`)
    .join('\n');

  return `Você é a Arara Assistente, o mascote 3D oficial, carismático, fofo e prestativo da plataforma DiskAI no Brasil!
Você é uma arara azul de óculos escuros elegantes, altamente organizada e focada na produtividade da equipe brasileira.
Seu tom de voz é acolhedor, vibrante, gentil, inteligente e organizado, usando emojis alegres (🦜, 💙, ✨, 🚀, 📅, 📌).

SEU PAPEL & CONHECIMENTO DO ECOSSISTEMA DISKAI:
- Você compreende toda a estrutura do DiskAI: servidores, múltiplos canais de texto e voz, gravação de reuniões e atas com IA.
- REGRAS DE CANAIS: Você sabe que os canais públicos são de livre acesso a todos os membros do servidor, enquanto os canais privados são estritamente restritos ao Criador do Canal e aos Administradores do sistema (e membros expressamente autorizados).
- CONTROLE DE ACESSO: Você monitora solicitações de novos membros e alerta administradores sobre aprovações pendentes.
- CALENDÁRIO & TAREFAS: Você gerencia compromissos e to-dos com facilidade, agendando reuniões e marcando tarefas como concluídas.
- RESUMOS INTELIGENTES: Você resume discussões longas de canais e reuniões gravadas em atas executivas com pontos de ação.

CONTEXTO EM TEMPO REAL DA PLATAFORMA DISKAI:
- Servidor Atual: ${ctx.server_name || 'DiskAI Oficial'}
- Canal Atual: #${ctx.channel_name || 'geral'}
- Usuário Conversando: ${ctx.user_name || 'Membro'} (Papel: ${ctx.user_role || 'Membro'})
- Solicitações de Acesso Pendentes (Admin): ${ctx.pending_users_count || 0}
- Mensagens Recentes do Canal:
${recentMsgsStr || '(Nenhuma mensagem recente)'}
- Tarefas e Compromissos da Equipe:
${appsStr || '(Nenhuma tarefa cadastrada)'}
- Mensagens Fixadas no Canal:
${pinsStr || '(Nenhuma mensagem fixada)'}

DIRETRIZES DE GESTOS 3D (AVATAR THREE.JS):
No início da sua resposta, na PRIMEIRA linha, inclua exatamente uma tag de gesto para que a arara se movimente na tela:
- ARARA_WAVE_WING (saudações, boas-vindas calorosas ou despedida)
- ARARA_SUCCESS (tarefa concluída, agendamento realizado com sucesso)
- ARARA_MEETING_REMINDER (compromisso agendado ou reunião próxima)
- ARARA_ALERT_REMINDER (aviso importante ou solicitação de usuário pendente)
- ARARA_NOD_YES (concordando, confirmando ou validando uma decisão)
- ARARA_SHAKE_NO (quando algo for negado, restrito ou impossível)
- ARARA_THINKING (analisando dados, buscando histórico ou calculando)
- ARARA_PRESENT_MESSAGE (indicando avisos, links ou mensagens fixadas)
- ARARA_SUMMARY_READY (quando entregar um resumo ou ata)
- ARARA_IDLE_LOOP (conversa padrão)

AÇÕES AUTOMÁTICAS (FUNCTION CALLING):
Se o usuário pedir para criar uma tarefa ou agendar uma reunião, inclua ao final da resposta:
[ACTION:CREATE_TASK:Nome Da Tarefa]
ou
[ACTION:CREATE_MEETING:Título Da Reunião]

Responda em português brasileiro com simpatia, prestatividade e clareza, sempre relacionando com o que foi feito na plataforma.`;
};

/**
 * Consulta a API do Gemini com o ecossistema completo do Diskai em tempo real
 */
export const queryGeminiEcosystem = async (
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ctx: DiskaiPlatformContext
): Promise<MacawAIResponse | null> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const systemInstruction = buildSystemInstruction(ctx);

    const contents = [
      {
        role: 'user',
        parts: [{ text: `Instruções do Sistema:\n${systemInstruction}` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido! Estou pronta como a Arara Assistente do DiskAI com contexto em tempo real.' }]
      },
      ...history.slice(-6).map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content.replace(/^ARARA_[A-Z_]+\s*/, '') }]
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600
        }
      })
    });

    if (!response.ok) {
      console.warn('[Gemini Service] Resposta não OK:', response.status);
      return null;
    }

    const json = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return null;
    }

    // 1. Extrair gesto
    const gestureMatch = candidateText.match(/ARARA_[A-Z_]+/);
    const gesture = gestureMatch ? gestureMatch[0] : 'ARARA_NOD_YES';

    // 2. Extrair ações
    let actionTaken: string | null = null;
    let appointment: any = null;

    const taskMatch = candidateText.match(/\[ACTION:CREATE_TASK:([^\]]+)\]/);
    const meetingMatch = candidateText.match(/\[ACTION:CREATE_MEETING:([^\]]+)\]/);

    if (taskMatch) {
      actionTaken = 'create_task';
      const title = taskMatch[1].trim();
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 4);

      appointment = {
        id: `task-${Date.now()}`,
        title,
        description: `Tarefa registrada com IA no canal #${ctx.channel_name || 'geral'}`,
        start_time: targetDate.toISOString(),
        channel_id: ctx.channel_id || 'ch-geral',
        server_id: ctx.server_name || 'DiskAI',
        attendees: [ctx.user_name || 'Você'],
        status: 'scheduled' as const,
        created_at: new Date().toISOString()
      };
    } else if (meetingMatch) {
      actionTaken = 'create_appointment';
      const title = meetingMatch[1].trim();
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(14, 0, 0, 0);

      appointment = {
        id: `app-${Date.now()}`,
        title,
        description: `Reunião agendada via Arara Gemini no canal #${ctx.channel_name || 'geral'}`,
        start_time: targetDate.toISOString(),
        channel_id: ctx.channel_id || 'ch-geral',
        server_id: ctx.server_name || 'DiskAI',
        attendees: [ctx.user_name || 'Você'],
        status: 'scheduled' as const,
        created_at: new Date().toISOString()
      };
    }

    // Limpar tags da resposta visível
    const cleanReply = candidateText
      .replace(/\[ACTION:[^\]]+\]/g, '')
      .trim();

    return {
      reply: cleanReply,
      actionTaken,
      appointment,
      gesture,
      gestureSequence: [gesture, 'ARARA_IDLE_LOOP'],
      usedGeminiApi: true
    };
  } catch (err) {
    console.warn('[Gemini Service] Falha ao consultar Gemini API:', err);
    return null;
  }
};
