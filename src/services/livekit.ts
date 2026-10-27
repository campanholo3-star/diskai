import { SignJWT } from 'jose';
import { getSupabaseClient } from './supabase';
import { Call, IncomingCallData, CallStatus, User } from '../types';

// ==============================================================================
// CONFIGURAÇÃO DO LIVEKIT WEBRTC
// ==============================================================================

export const getLiveKitUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_LIVEKIT_URL;
  if (envUrl && envUrl !== 'sua_url_aqui' && envUrl !== '') {
    return envUrl;
  }
  // Fallback para URL do projeto LiveKit Cloud
  return 'wss://diskai-i3mib7cl.livekit.cloud';
};

/**
 * Solicita um LiveKit Access Token gerado com segurança pela Supabase Edge Function
 * 'livekit-token' ou gera o JWT oficial diretamente usando as credenciais do .env.
 */
export const fetchLiveKitToken = async (
  roomName: string,
  participantName: string,
  participantId: string
): Promise<string> => {
  const client = getSupabaseClient();

  // 1. Tentar invocar a Supabase Edge Function 'livekit-token' (se implantada)
  try {
    const { data, error } = await client.functions.invoke('livekit-token', {
      body: {
        room_name: roomName,
        participant_name: participantName,
        participant_id: participantId
      }
    });

    if (!error && data?.token) {
      console.log('[Diskai LiveKit] Token obtido via Supabase Edge Function com sucesso.');
      return data.token;
    }
  } catch {
    // Edge function ainda não implantada, prosseguir para geração direta
  }

  // 2. Geração direta do LiveKit JWT oficial caso credenciais de dev tenham sido fornecidas via variáveis de ambiente
  const apiKey = (import.meta as any).env?.VITE_LIVEKIT_API_KEY;
  const apiSecret = (import.meta as any).env?.VITE_LIVEKIT_API_SECRET;

  if (apiKey && apiSecret) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const jwt = await new SignJWT({
        video: {
          room: roomName,
          roomJoin: true,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        },
        name: participantName
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(apiKey)
        .setSubject(participantId)
        .setNotBefore(now - 5)
        .setExpirationTime(now + 6 * 3600) // 6 horas
        .sign(new TextEncoder().encode(apiSecret));

      console.log('[Diskai LiveKit] Token oficial assinado com sucesso para sala:', roomName);
      return jwt;
    } catch (err) {
      console.warn('[Diskai LiveKit] Erro ao assinar JWT com jose:', err);
    }
  }

  // 3. Fallback mock estruturado
  console.info('[Diskai LiveKit] Usando token de desenvolvimento estruturado.');
  return generateDevToken(roomName, participantId, participantName);
};

/**
 * Cria token mock assinado estruturado para visualização em modo de desenvolvimento
 */
function generateDevToken(roomName: string, identity: string, name: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: identity,
      name,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true
      },
      iss: 'diskai-dev',
      nbf: Math.floor(Date.now() / 1000) - 10,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6
    })
  );
  const signature = btoa('mock-dev-signature');
  return `${header}.${payload}.${signature}`;
}

// ==============================================================================
// BANCO DE DADOS: TABELA public.calls
// ==============================================================================

/**
 * Cria o registro da chamada na tabela 'calls' do Supabase
 */
export const createCallRecord = async (
  callerId: string,
  receiverId: string,
  withVideo: boolean = false,
  roomName?: string
): Promise<Call> => {
  const client = getSupabaseClient();
  const callRoom = roomName || `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    const { data, error } = await client
      .from('calls')
      .insert({
        caller_id: callerId,
        receiver_id: receiverId,
        status: 'ringing',
        room_name: callRoom,
        with_video: withVideo
      })
      .select()
      .single();

    if (error) {
      console.warn('[Diskai Calls] Erro ao salvar chamada no banco (usando registro local):', error.message);
      return {
        id: callRoom,
        caller_id: callerId,
        receiver_id: receiverId,
        status: 'ringing',
        room_name: callRoom,
        with_video: withVideo,
        created_at: new Date().toISOString()
      };
    }

    return data as Call;
  } catch (err) {
    console.warn('[Diskai Calls] Exceção ao gravar chamada:', err);
    return {
      id: callRoom,
      caller_id: callerId,
      receiver_id: receiverId,
      status: 'ringing',
      room_name: callRoom,
      with_video: withVideo,
      created_at: new Date().toISOString()
    };
  }
};

/**
 * Atualiza o status da chamada no banco de dados (accepted, rejected, ended)
 */
export const updateCallStatusInDb = async (callId: string, status: CallStatus): Promise<void> => {
  const client = getSupabaseClient();
  try {
    const updates: any = { status };
    if (status === 'ended') {
      updates.ended_at = new Date().toISOString();
    }

    await client
      .from('calls')
      .update(updates)
      .eq('id', callId);
  } catch (err) {
    console.warn('[Diskai Calls] Erro ao atualizar status da chamada:', err);
  }
};

// ==============================================================================
// FLUXO DE SINALIZAÇÃO WEBRTC VIA SUPABASE BROADCAST
// ==============================================================================

/**
 * Dispara evento via Supabase Broadcast para o Usuário B informando chamada recebida
 */
export const broadcastIncomingCall = async (
  callerUser: User,
  receiverId: string,
  callId: string,
  withVideo: boolean,
  roomName: string
): Promise<void> => {
  const client = getSupabaseClient();
  const channelName = `user-signaling:${receiverId}`;
  const signalingChannel = client.channel(channelName);

  signalingChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await signalingChannel.send({
        type: 'broadcast',
        event: 'call:incoming',
        payload: {
          callId,
          caller: {
            id: callerUser.id,
            name: callerUser.name,
            avatar: callerUser.avatar,
            tag: callerUser.tag
          },
          withVideo,
          roomName,
          createdAt: new Date().toISOString()
        } as IncomingCallData
      });
      // Desconectar o canal temporário do remetente
      setTimeout(() => signalingChannel.unsubscribe(), 2000);
    }
  });
};

/**
 * Usuário B responde à chamada (atender ou recusar)
 */
export const broadcastCallResponse = async (
  callerId: string,
  callId: string,
  accepted: boolean,
  roomName: string
): Promise<void> => {
  const client = getSupabaseClient();
  const channelName = `user-signaling:${callerId}`;
  const signalingChannel = client.channel(channelName);

  signalingChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await signalingChannel.send({
        type: 'broadcast',
        event: accepted ? 'call:accepted' : 'call:rejected',
        payload: { callId, roomName }
      });
      setTimeout(() => signalingChannel.unsubscribe(), 2000);
    }
  });
};

/**
 * Encerra a chamada para a outra parte
 */
export const broadcastCallEnded = async (otherUserId: string, callId: string): Promise<void> => {
  const client = getSupabaseClient();
  const channelName = `user-signaling:${otherUserId}`;
  const signalingChannel = client.channel(channelName);

  signalingChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await signalingChannel.send({
        type: 'broadcast',
        event: 'call:ended',
        payload: { callId }
      });
      setTimeout(() => signalingChannel.unsubscribe(), 2000);
    }
  });
};

/**
 * Inscreve o usuário logado para escutar sinais de chamada em tempo real
 */
export const subscribeToSignaling = (
  currentUserId: string,
  callbacks: {
    onIncomingCall: (data: IncomingCallData) => void;
    onCallAccepted: (callId: string, roomName: string) => void;
    onCallRejected: (callId: string) => void;
    onCallEnded: (callId: string) => void;
  }
) => {
  const client = getSupabaseClient();
  const channelName = `user-signaling:${currentUserId}`;
  const channel = client.channel(channelName);

  channel
    .on('broadcast', { event: 'call:incoming' }, ({ payload }) => {
      console.log('[Diskai Signaling] Chamada recebida:', payload);
      callbacks.onIncomingCall(payload);
    })
    .on('broadcast', { event: 'call:accepted' }, ({ payload }) => {
      console.log('[Diskai Signaling] Chamada aceita pelo destinatário:', payload);
      callbacks.onCallAccepted(payload.callId, payload.roomName);
    })
    .on('broadcast', { event: 'call:rejected' }, ({ payload }) => {
      console.log('[Diskai Signaling] Chamada recusada:', payload);
      callbacks.onCallRejected(payload.callId);
    })
    .on('broadcast', { event: 'call:ended' }, ({ payload }) => {
      console.log('[Diskai Signaling] Chamada finalizada:', payload);
      callbacks.onCallEnded(payload.callId);
    })
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};
