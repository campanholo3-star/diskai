/// <reference lib="es2022" />

// Supabase Edge Function v3: authGuard.ts
// Verificação Estrita de Autenticação Real do Usuário (rejeita anon_key pública e tokens inválidos)

export interface AuthVerificationResult {
  authenticated: boolean;
  userId?: string;
  statusCode?: number;
  error?: string;
}

export async function verifyUserAuthentication(
  authHeader: string | null | undefined,
  supabaseAuthClient: { getUser: (token: string) => Promise<{ data: { user?: { id?: string } } | null; error: any }> }
): Promise<AuthVerificationResult> {
  const raw = authHeader || "";
  const token = raw.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      authenticated: false,
      statusCode: 401,
      error: "Usuário não autenticado. Esta função exige login ativo com conta Supabase."
    };
  }

  try {
    const { data, error } = await supabaseAuthClient.getUser(token);
    if (error || !data?.user?.id) {
      return {
        authenticated: false,
        statusCode: 401,
        error: "Usuário não autenticado. Token inválido, expirado ou chave anônima pública sem sessão de usuário."
      };
    }

    return {
      authenticated: true,
      userId: data.user.id
    };
  } catch (err: any) {
    return {
      authenticated: false,
      statusCode: 401,
      error: `Falha na verificação do token de autenticação: ${err?.message || "erro desconhecido"}`
    };
  }
}

