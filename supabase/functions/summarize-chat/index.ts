// Supabase Edge Function: summarize-chat
// Resumo inteligente de mensagens de chat utilizando Google Gemini Flash
// Segurança: A chave GEMINI_API_KEY é lida exclusivamente via Deno.env.get('GEMINI_API_KEY')

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

interface SummarizeChatRequest {
  conversation_id?: string;
  channel_id?: string;
  channel_name?: string;
  server_name?: string;
  limit?: number;
}

serve(async (req: Request) => {
  // Tratar requisição OPTIONS pré-voo (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: "Chave GEMINI_API_KEY não configurada no Supabase Secrets. Execute: supabase secrets set GEMINI_API_KEY=sua_chave",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    });

    // 1. Validação de Autenticação / Permissão
    let authenticatedUserId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      authenticatedUserId = userData?.user?.id || null;
    }

    const payload: SummarizeChatRequest = await req.json().catch(() => ({}));
    const { conversation_id, channel_id, channel_name, server_name, limit = 60 } = payload;

    if (!conversation_id && !channel_id) {
      return new Response(
        JSON.stringify({ error: "É necessário fornecer 'conversation_id' ou 'channel_id'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Se for uma conversa privada (conversation_id), validar se o usuário é participante
    if (conversation_id && authenticatedUserId) {
      const { data: participantData } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", authenticatedUserId)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, is_approved")
        .eq("id", authenticatedUserId)
        .maybeSingle();

      const isAdmin = profileData?.role === "admin" || profileData?.role === "Administrador";

      if (!participantData && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Acesso negado: Você não participa desta conversa privada." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Buscar mensagens recentes da conversa/canal ordenadas cronologicamente
    let query = supabase
      .from("messages")
      .select("id, content, user_name, created_at, attachments, is_pinned")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (conversation_id) {
      query = query.eq("conversation_id", conversation_id);
    } else if (channel_id) {
      query = query.eq("channel_id", channel_id);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      return new Response(
        JSON.stringify({ error: `Erro ao buscar mensagens: ${messagesError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            title: `Resumo do Chat - #${channel_name || "geral"}`,
            executiveSummary: "Não há mensagens recentes suficientes nesta conversa para gerar um resumo com IA.",
            keyTopics: [],
            actionItems: [],
            decisions: [],
            sentiment: "Neutro",
            messagesAnalyzed: 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Formatar mensagens para o contexto do prompt
    const formattedTranscript = messages
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => {
        const time = m.created_at
          ? new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : "Horário";
        const author = m.user_name || "Membro";
        return `[${time}] ${author}: ${m.content}`;
      })
      .join("\n");

    const channelDisplayName = channel_name || channel_id || "Chat";
    const serverDisplayName = server_name || "Diskai";

    const systemPrompt = `Você é o Diskai AI, assistente especialista em síntese e governança de reuniões e canais de texto em equipes.
Analise a transcrição de chat a seguir do canal #${channelDisplayName} no servidor "${serverDisplayName}" e gere um resumo estruturado e profissional em Português do Brasil.

Siga rigorosamente a seguinte estrutura em formato JSON puro:
{
  "title": "Título conciso e profissional do resumo",
  "executiveSummary": "Resumo executivo de 2 a 4 frases sintetizando os pontos principais debatidos",
  "keyTopics": [
    {
      "topic": "Nome do tópico abordado",
      "timestamp": "Timestamp aproximado ou 'Recente'",
      "details": "Explicação clara do que foi discutido e acordado"
    }
  ],
  "actionItems": [
    {
      "id": "act-1",
      "task": "Descrição acionável da tarefa",
      "assignee": "Nome do responsável identificado ou 'Equipe'",
      "completed": false,
      "priority": "alta | média | baixa"
    }
  ],
  "decisions": [
    "Decisão clara e explícita tomada durante a conversa"
  ],
  "sentiment": "Produtivo & Focado | Animado & Colaborativo | Neutro | Crítico"
}

Importante: Responda APENAS com o JSON válido, sem cercas de markdown (\`\`\`json) e sem texto antes ou depois.`;

    // 5. Chamar a API do Google Gemini Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n--- TRANSCRIÇÃO DAS MENSAGENS (${messages.length} mensagens) ---\n${formattedTranscript}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: `Erro na API Gemini (${geminiResponse.status}): ${errBody}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsedSummary;
    try {
      parsedSummary = JSON.parse(rawText);
    } catch {
      // Extrair JSON caso venha encapsulado
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedSummary = JSON.parse(cleaned);
    }

    parsedSummary.id = `chat-summary-${Date.now()}`;
    parsedSummary.messagesAnalyzed = messages.length;
    parsedSummary.channelName = channelDisplayName;
    parsedSummary.serverName = serverDisplayName;
    parsedSummary.date = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary: parsedSummary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao processar resumo do chat." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
