// Supabase Edge Function: livekit-token
// Gera tokens JWT seguros do LiveKit para salas de áudio e vídeo
// Executa em ambiente Deno no Supabase Edge Runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk@^2.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Tratar requisições OPTIONS pré-voo (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { room_name, participant_name, participant_id } = await req.json();

    if (!room_name) {
      return new Response(
        JSON.stringify({ error: "O parâmetro 'room_name' (call_id) é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({
          error: "Credenciais do LiveKit (LIVEKIT_API_KEY ou LIVEKIT_API_SECRET) não configuradas no Supabase.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const identity = participant_id || `user-${Date.now()}`;
    const name = participant_name || identity;

    // Criar o Access Token com tempo de expiração de 6 horas
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: "6h",
    });

    // Conceder permissões para entrar na sala específica e publicar/receber áudio e vídeo
    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return new Response(
      JSON.stringify({
        token,
        room: room_name,
        identity,
        livekitUrl: Deno.env.get("LIVEKIT_URL") || Deno.env.get("VITE_LIVEKIT_URL"),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao gerar LiveKit token." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
