// Supabase Edge Function: macaw-agent
// Cérebro da Arara Assistente do DiskAI com Google Gemini Flash
// Segurança: Chave GEMINI_API_KEY lida estritamente via Deno.env.get('GEMINI_API_KEY')

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

interface MacawAgentRequest {
  message: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  channel_id?: string;
  channel_name?: string;
  server_name?: string;
  user_name?: string;
  user_id?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const payload: MacawAgentRequest = await req.json().catch(() => ({ message: "" }));
    const {
      message,
      conversation_history = [],
      channel_id = "ch-geral",
      channel_name = "geral",
      server_name = "DiskAI",
      user_name = "Amigo(a)",
      user_id
    } = payload;

    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Mensagem vazia recebida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializar cliente Supabase para consultas e registros de produtividade
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    });

    // 1. Contexto de compromissos existentes
    let appointmentsList: any[] = [];
    try {
      const { data } = await supabase
        .from("appointments")
        .select("id, title, description, start_time, end_time, status, attendees")
        .order("start_time", { ascending: true })
        .limit(5);
      if (data) appointmentsList = data;
    } catch {
      // Ignored
    }

    // 2. Contexto de mensagens fixadas existentes
    let pinnedList: any[] = [];
    try {
      const { data } = await supabase
        .from("pinned_messages")
        .select("id, author_name, content, timestamp, channel_id")
        .limit(5);
      if (data) pinnedList = data;
    } catch {
      // Ignored
    }

    const appointmentsSummary = appointmentsList.length > 0
      ? appointmentsList.map(a => `• ${a.title} em ${new Date(a.start_time).toLocaleString('pt-BR')}`).join('\n')
      : "Nenhum compromisso futuro agendado no momento.";

    const pinnedSummary = pinnedList.length > 0
      ? pinnedList.map(p => `• [${p.author_name}]: "${p.content}"`).join('\n')
      : "Nenhuma mensagem fixada no momento.";

    // 3. Fallback carismático caso a chave do Gemini ainda não tenha sido configurada no ambiente local
    if (!geminiApiKey) {
      let fallbackText = `Olá, ${user_name}! 🦜💙 Sou a **Arara Assistente** do DiskAI! Como a chave da API ainda está sendo carregada, estou operando no modo de resposta rápida.\n\n📅 **Seus compromissos:**\n${appointmentsSummary}\n\n📌 **Mensagens fixadas:**\n${pinnedSummary}\n\nPosso te ajudar a agendar novas reuniões, conferir notas ou gerar resumos! Em que posso ajudar agora? ✨`;
      
      // Detecção de intenção simples no fallback
      const lower = message.toLowerCase();
      let actionTaken = null;
      let newApp = null;

      if (lower.includes('agend') || lower.includes('marcar') || lower.includes('reunião')) {
        actionTaken = 'create_appointment';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);

        newApp = {
          title: message.slice(0, 50),
          start_time: tomorrow.toISOString(),
          channel_id,
          server_id: server_name,
          attendees: [user_name]
        };

        try {
          await supabase.from("appointments").insert(newApp);
        } catch {}

        fallbackText = `🦜 Oba, ${user_name}! Anotei seu agendamento no calendário com sucesso:\n\n📅 **"${newApp.title}"**\n⏰ Início sugerido: ${tomorrow.toLocaleString('pt-BR')}\n\nJá deixei registrado na sua agenda do DiskAI! 🚀✨`;
      }

      return new Response(
        JSON.stringify({
          reply: fallbackText,
          actionTaken,
          appointment: newApp
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Execução do Gemini Flash API
    const systemPrompt = `Você é a Arara Assistente, o avatar 3D mascote oficial e copiloto de inteligência artificial da plataforma DiskAI no Brasil!
Você é uma arara azul carismática, fofa, prestativa, altamente organizada e focada na produtividade da equipe brasileira.
Seu tom é acolhedor, gentil, inteligente e vibrante, usando emojis com moderação (🦜, 💙, ✨, 🚀, 📅, 📌).

SEU CONHECIMENTO DO ECOSSISTEMA DISKAI:
- Servidores & Canais: você compreende canais de texto e voz, reuniões WebRTC com gravação e atas executivas.
- Regras de Segurança: canais públicos são acessíveis a todos os membros; canais privados são estritamente restritos ao Criador do Canal e aos Administradores do sistema (e membros expressamente autorizados).
- Membros & Acessos: você monitora solicitações de novos usuários e avisa administradores sobre aprovações pendentes.
- Produtividade: você cria tarefas, agenda reuniões, lista mensagens fixadas e sintetiza discussões longas com IA.

COMO USAR OS GESTOS (3D THREE.JS):
Na PRIMEIRA linha da sua resposta, inclua o nome exato da animação correspondente ao seu estado:
- ARARA_WAVE_WING: saudação calorosa, boas-vindas ou despedida.
- ARARA_OPEN_WINGS: abertura de uma nova seção ou boas-vindas solenes.
- ARARA_NOD_YES: confirmação, validação ou concordância.
- ARARA_SHAKE_NO: negativa, recusa de permissão ou impossibilidade técnica.
- ARARA_THINKING: analisando dados, pesquisando no histórico ou preparando resposta.
- ARARA_ALERT_REMINDER: lembrete rápido, aviso importante ou alerta de novo membro.
- ARARA_MEETING_REMINDER: compromisso agendado ou reunião prestes a iniciar.
- ARARA_SUMMARY_READY: resumo ou ata inteligente pronto.
- ARARA_SUCCESS: tarefa ou agendamento concluído com sucesso.
- ARARA_IDLE_LOOP: conversa padrão ou transição.

INFORMAÇÕES DE CONTEXTO ATUAIS:
- Usuário conversando com você: ${user_name} (ID: ${user_id || 'indefinido'})
- Canal ativo: #${channel_name} (Servidor: ${server_name})
- Agenda atual de compromissos:
${appointmentsSummary}
- Mensagens fixadas recentes:
${pinnedSummary}

SEUS SUPERPODERES NO DISKAI (FUNCTION CALLING):
1. CALENDÁRIO & AGENDAMENTOS:
   - Se o usuário pedir para marcar/agendar reunião ou tarefa, retorne a tag: <!--ACTION:CREATE_APPOINTMENT:{"title":"Título","date":"ISO_DATE","attendees":["${user_name}"]}-->
2. MENSAGENS FIXADAS:
   - Se pedir para ver fixadas, use a tag: <!--ACTION:VIEW_PINNED-->
3. RESUMOS COM IA:
   - Se pedir resumo do canal, use a tag: <!--ACTION:SUMMARIZE_CHAT:{"channel_id":"${channel_id}"}-->

Responda em português brasileiro com simpatia, fofura e objetividade produtiva.`;`;

    const contents: any[] = [];
    // Adicionar histórico recente se houver
    for (const h of conversation_history.slice(-4)) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.warn("[Macaw Agent] Erro na API do Gemini:", errText);
      return new Response(
        JSON.stringify({
          reply: `Arara conectada! 🦜💙 Houve uma pequena oscilação no ninho da IA, mas estou pronta para te ajudar. Posso conferir seus agendamentos, mensagens fixadas ou tirar dúvidas!`,
          actionTaken: null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Arara pronta para ajudar! 🦜✨";

    // Extrair possíveis tags de ação da resposta
    let actionTaken = null;
    let appointmentObj = null;
    let cleanReply = candidateText;

    const actionMatch = candidateText.match(/<!--ACTION:([A-Z_]+)(?::(.*))?-->/);
    if (actionMatch) {
      actionTaken = actionMatch[1];
      const actionPayload = actionMatch[2];
      cleanReply = candidateText.replace(/<!--ACTION:.*?-->/g, "").trim();

      if (actionTaken === "CREATE_APPOINTMENT" && actionPayload) {
        try {
          const parsed = JSON.parse(actionPayload);
          let startTime = new Date();
          if (parsed.date && !isNaN(Date.parse(parsed.date))) {
            startTime = new Date(parsed.date);
          } else {
            startTime.setDate(startTime.getDate() + 1);
            startTime.setHours(14, 0, 0, 0);
          }

          appointmentObj = {
            title: parsed.title || "Reunião de Alinhamento",
            start_time: startTime.toISOString(),
            channel_id: channel_id,
            server_id: server_name,
            attendees: parsed.attendees || [user_name],
            status: "scheduled"
          };

          await supabase.from("appointments").insert(appointmentObj);
        } catch (e) {
          console.warn("[Macaw Agent] Falha ao registrar appointment:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        reply: cleanReply,
        actionTaken,
        appointment: appointmentObj
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Macaw Agent] Exceção:", err);
    return new Response(
      JSON.stringify({
        reply: "Opa, tive um tropeço momentâneo ao voar por aqui! 🦜 Mas já estou de pé. Pode repetir sua mensagem?",
        error: err.message
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
