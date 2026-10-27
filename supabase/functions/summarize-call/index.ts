// Supabase Edge Function: summarize-call
// Resumo inteligente de áudio de reuniões e chamadas utilizando Google Gemini Flash (Multimodal Audio)
// Salva a ata na tabela call_summaries e injeta uma mensagem com embed na tabela messages

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

interface SummarizeCallRequest {
  call_id?: string;
  channel_id?: string;
  channel_name?: string;
  server_name?: string;
  conversation_id?: string;
  audio_url?: string;
  audio_path?: string;
  storage_bucket?: string;
  participants?: string[];
  duration_seconds?: number;
}

// Helper para converter Uint8Array em base64 no runtime Deno
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: "Chave GEMINI_API_KEY não configurada no Supabase Secrets. Execute: supabase secrets set GEMINI_API_KEY=sua_chave",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let currentUserId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      currentUserId = userData?.user?.id || null;
    }

    const payload: SummarizeCallRequest = await req.json().catch(() => ({}));
    const {
      call_id,
      channel_id,
      channel_name = "Reunião de Áudio",
      server_name = "Diskai",
      conversation_id,
      audio_url,
      audio_path,
      storage_bucket = "chat-media",
      participants = ["Você (Host)", "Membro da Chamada"],
      duration_seconds = 60,
    } = payload;

    // 1. Obter os bytes do áudio (via Storage do Supabase ou URL direta)
    let audioBytes: Uint8Array | null = null;
    let mimeType = "audio/webm";
    let finalAudioUrl = audio_url || "";

    if (audio_path) {
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(storage_bucket)
        .download(audio_path);

      if (!downloadError && downloadData) {
        const buffer = await downloadData.arrayBuffer();
        audioBytes = new Uint8Array(buffer);
        mimeType = downloadData.type || "audio/webm";

        const { data: publicUrlData } = supabase.storage
          .from(storage_bucket)
          .getPublicUrl(audio_path);
        finalAudioUrl = publicUrlData.publicUrl;
      }
    } else if (audio_url && audio_url.startsWith("http")) {
      const audioRes = await fetch(audio_url);
      if (audioRes.ok) {
        const buffer = await audioRes.arrayBuffer();
        audioBytes = new Uint8Array(buffer);
        const ct = audioRes.headers.get("content-type");
        if (ct) mimeType = ct;
      }
    }

    // Normalizar MIME types para o Gemini Flash
    if (mimeType.includes("webm")) mimeType = "audio/webm";
    else if (mimeType.includes("mp4") || mimeType.includes("m4a")) mimeType = "audio/mp4";
    else if (mimeType.includes("wav")) mimeType = "audio/wav";
    else if (mimeType.includes("ogg")) mimeType = "audio/ogg";
    else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) mimeType = "audio/mp3";

    // 2. Montar partes do Gemini (Multimodal com áudio e texto)
    const systemPrompt = `Você é o Diskai AI, especialista em transcrição, síntese executiva e governança de reuniões.
Analise a gravação de áudio da chamada "${channel_name}" realizada no servidor "${server_name}".
Participantes conhecidos: ${participants.join(", ")}.

Gere uma ata completa, profissional e fidedigna em Português do Brasil no formato JSON estrito:
{
  "title": "Ata da Reunião - ${channel_name}",
  "executiveSummary": "Resumo executivo de alto nível com os principais pontos discutidos",
  "keyTopics": [
    {
      "topic": "Nome do tópico debatido",
      "timestamp": "Timestamp aproximado (ex: '00:15')",
      "details": "Detalhamento e conclusões do tópico"
    }
  ],
  "actionItems": [
    {
      "id": "act-1",
      "task": "Ação clara e objetiva a ser realizada",
      "assignee": "Nome do participante responsável",
      "completed": false,
      "priority": "alta | média | baixa"
    }
  ],
  "decisions": [
    "Decisão de produto, técnica ou operacional formalizada na call"
  ],
  "sentiment": "Produtivo & Focado | Estratégico | Alinhado & Positivo | Intenso",
  "transcript": [
    {
      "speaker": "Nome de quem falou",
      "time": "Timestamp aproximado (ex: '00:05')",
      "text": "Fala transcrita com fidelidade"
    }
  ]
}

Responda APENAS com o JSON puro, sem comentários adicionais e sem blocos de markdown.`;

    const geminiParts: any[] = [];

    // Se o áudio foi obtido com sucesso, envia como inlineData para o Gemini Flash processar o áudio diretamente
    if (audioBytes && audioBytes.length > 0) {
      const base64Audio = uint8ArrayToBase64(audioBytes);
      geminiParts.push({
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      });
    }

    geminiParts.push({
      text: systemPrompt,
    });

    // 3. Executar chamada à API Gemini Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: geminiParts,
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 3072,
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

    let parsedSummary: any;
    try {
      parsedSummary = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedSummary = JSON.parse(cleaned);
    }

    const summaryId = `call-summary-${Date.now()}`;
    parsedSummary.id = summaryId;
    parsedSummary.call_id = call_id || null;
    parsedSummary.channelName = channel_name;
    parsedSummary.serverName = server_name;
    parsedSummary.durationFormatted = `${Math.floor(duration_seconds / 60)
      .toString()
      .padStart(2, "0")}:${(duration_seconds % 60).toString().padStart(2, "0")}`;
    parsedSummary.durationSeconds = duration_seconds;
    parsedSummary.participants = participants;
    parsedSummary.audioUrl = finalAudioUrl;
    parsedSummary.date = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 4. Salvar na tabela public.call_summaries
    try {
      await supabase.from("call_summaries").insert({
        id: crypto.randomUUID(),
        call_id: call_id || null,
        channel_id: channel_id || null,
        conversation_id: conversation_id || null,
        title: parsedSummary.title || `Ata da Reunião - ${channel_name}`,
        executive_summary: parsedSummary.executiveSummary || "",
        key_topics: parsedSummary.keyTopics || [],
        action_items: parsedSummary.actionItems || [],
        decisions: parsedSummary.decisions || [],
        sentiment: parsedSummary.sentiment || "Produtivo & Focado",
        audio_url: finalAudioUrl || null,
        participants: participants,
        created_by: currentUserId,
      });
    } catch (saveErr) {
      console.warn("Aviso ao salvar em call_summaries:", saveErr);
    }

    // 5. Injetar automaticamente uma mensagem formatada de resumo na tabela public.messages
    const targetChannelId = channel_id || "ch-resumos";
    const embedFields = [
      {
        name: "⏱️ Duração & Participantes",
        value: `${parsedSummary.durationFormatted} • ${participants.join(", ")}`,
        inline: false,
      },
    ];

    if (parsedSummary.actionItems && parsedSummary.actionItems.length > 0) {
      embedFields.push({
        name: "🎯 Plano de Ação",
        value: parsedSummary.actionItems
          .slice(0, 3)
          .map((a: any) => `• ${a.task} (@${a.assignee})`)
          .join("\n"),
        inline: false,
      });
    }

    if (parsedSummary.decisions && parsedSummary.decisions.length > 0) {
      embedFields.push({
        name: "✅ Decisões Chave",
        value: parsedSummary.decisions.slice(0, 2).map((d: string) => `• ${d}`).join("\n"),
        inline: false,
      });
    }

    try {
      await supabase.from("messages").insert({
        id: `msg-summary-${Date.now()}`,
        channel_id: targetChannelId,
        conversation_id: conversation_id || null,
        user_name: "Diskai AI",
        user_avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
        content: `🎙️ **Ata da Reunião Finalizada com Sucesso!**\nO áudio foi processado pelo Gemini Flash e o relatório completo está disponível abaixo.`,
        embed: {
          title: parsedSummary.title || `Ata da Reunião - ${channel_name}`,
          description: parsedSummary.executiveSummary,
          color: "#5865F2",
          fields: embedFields,
          footer: {
            text: `Diskai AI Intelligence • Gemini Flash • ${parsedSummary.date}`,
          },
        },
        attachments: finalAudioUrl
          ? [
              {
                id: `att-call-${Date.now()}`,
                name: `Gravacao_${channel_name.replace(/\s+/g, "_")}.webm`,
                size: audioBytes?.length || 250000,
                type: mimeType,
                url: finalAudioUrl,
              },
            ]
          : [],
      });
    } catch (msgErr) {
      console.warn("Aviso ao injetar mensagem de resumo:", msgErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: parsedSummary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao processar áudio da chamada." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
