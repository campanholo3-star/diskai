import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Message, MeetingSummary, Participant, Server, Channel } from '../types';
import {
  isCustomAvatar,
  saveAvatarToVault,
  getAvatarFromVault,
  normalizeIdentity,
  DEFAULT_PLACEHOLDER_AVATAR
} from '../utils/imageUtils';
import { isSafeFileName } from '../utils/securityUtils';
import { queryGeminiEcosystem, DiskaiPlatformContext, AssistantAttachment } from './geminiService';

// Credenciais de conexão Supabase - gerenciadas silenciosamente pelo backend (.env)
const DEFAULT_SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jctgmpnlyuuiqdiasvul.supabase.co';
const DEFAULT_SUPABASE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Xn_fujMzFzyvTR4x8krjZw_8xkXD5_m';

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    return cachedClient;
  } catch (err) {
    console.warn('[Diskai Supabase] Inicializando cliente:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
  }
};

export const getSupabaseConfig = () => {
  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_KEY,
    isConnected: true
  };
};

// ==========================================
// ==========================================
// AUTENTICAÇÃO E ISOLAMENTO DE USUÁRIOS
// ==========================================

export const ADMIN_EMAIL = 'campanholo32@gmail.com';
export const ADMIN_PASS = (import.meta as any).env?.VITE_ADMIN_PASS || '1515';

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
  avatarUrl?: string
): Promise<{ success: boolean; user?: User; error?: string; isPending?: boolean }> => {
  const client = getSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: displayName,
          avatar: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const authUser = data.user;
    if (!authUser) {
      return { success: false, error: 'Nenhum usuário retornado após o cadastro.' };
    }

    const isPlatformAdmin = cleanEmail === 'campanholo32@gmail.com' || cleanEmail === 'campanholo32gmail.com';

    const newUser: User = {
      id: authUser.id,
      email: cleanEmail,
      name: displayName,
      tag: Math.floor(1000 + Math.random() * 9000).toString(),
      avatar: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      status: 'online',
      customStatus: isPlatformAdmin ? '👑 Administrador da Plataforma DiskAI' : 'Aguardando aprovação do Administrador',
      role: isPlatformAdmin ? 'Administrador' : 'Membro',
      accessStatus: isPlatformAdmin ? 'approved' : 'pending',
      isApproved: isPlatformAdmin
    };

    // Salvar diretamente na tabela profiles com status 'pending' e is_approved = false (exceto se admin)
    try {
      await client.from('profiles').upsert({
        id: newUser.id,
        email: cleanEmail,
        full_name: newUser.name,
        name: newUser.name,
        avatar_url: newUser.avatar,
        avatar: newUser.avatar,
        tag: newUser.tag,
        role: isPlatformAdmin ? 'admin' : 'user',
        status: isPlatformAdmin ? 'approved' : 'pending',
        is_approved: isPlatformAdmin,
        presence_status: 'online',
        custom_status: newUser.customStatus,
        access_status: isPlatformAdmin ? 'approved' : 'pending',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (saveErr) {
      console.warn('[Diskai Database] Erro ao sincronizar novo perfil:', saveErr);
    }

    return {
      success: true,
      user: newUser,
      isPending: !isPlatformAdmin,
      error: isPlatformAdmin
        ? undefined
        : 'Conta cadastrada com sucesso! Seu acesso aguarda a aprovação do Administrador (campanholo32@gmail.com).'
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao realizar cadastro.' };
  }
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string; isPending?: boolean }> => {
  const client = getSupabaseClient();
  const rawEmail = email.trim().toLowerCase();
  const cleanEmail = (rawEmail === 'campanholo32' || rawEmail === 'campanholo32gmail.com') ? 'campanholo32@gmail.com' : rawEmail;

  // 1. Verificação Especial do Administrador da Plataforma (campanholo32@gmail.com)
  const isAdminLogin = (cleanEmail === 'campanholo32@gmail.com' || cleanEmail === 'campanholo32gmail.com');
  if (isAdminLogin) {
    let authSucceeded = false;
    try {
      const { data: authData, error: authErr } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (!authErr && authData?.user) {
        authSucceeded = true;
      }
    } catch {}

    if (!authSucceeded && password !== ADMIN_PASS) {
      return { success: false, error: 'Senha incorreta para o Administrador.' };
    }

    // Carregar customizações salvas do perfil do admin (foto, nome, bio)
    let savedProfile: Partial<User> = {};
    try {
      const cached = localStorage.getItem('diskai_user_profile_admin-campanholo32') ||
        localStorage.getItem('diskai_user_profile_user-me');
      if (cached) {
        savedProfile = JSON.parse(cached);
      }
    } catch {}

    // Resgatar avatar definitivo do Avatar Vault
    const vaultAvatar = getAvatarFromVault('admin-campanholo32', 'campanholo32@gmail.com');
    if (vaultAvatar) {
      savedProfile.avatar = vaultAvatar;
    }

    // Buscar no banco se há perfil salvo previamente
    try {
      const { data: dbAdmin } = await client
        .from('profiles')
        .select('*')
        .eq('id', 'admin-campanholo32')
        .maybeSingle();

      if (dbAdmin) {
        const dbAvatar = dbAdmin.avatar_url || dbAdmin.avatar;
        // Se houver avatar no vault ou customizado, mantemos sem deixar sobrescrever por placeholder
        const finalAvatar = vaultAvatar || (isCustomAvatar(savedProfile.avatar)
          ? savedProfile.avatar
          : (isCustomAvatar(dbAvatar) ? dbAvatar : (savedProfile.avatar || dbAvatar || DEFAULT_PLACEHOLDER_AVATAR)));

        savedProfile = {
          ...savedProfile,
          name: savedProfile.name || dbAdmin.full_name || dbAdmin.name,
          avatar: finalAvatar,
          bio: savedProfile.bio || dbAdmin.bio,
          bannerColor: savedProfile.bannerColor || dbAdmin.banner_color,
          pronouns: savedProfile.pronouns || dbAdmin.pronouns,
          customStatus: savedProfile.customStatus || dbAdmin.custom_status
        };
      }
    } catch {}

    const resolvedAvatar = vaultAvatar || savedProfile.avatar || DEFAULT_PLACEHOLDER_AVATAR;

    const adminUser: User = {
      id: 'admin-campanholo32',
      email: 'campanholo32@gmail.com',
      name: savedProfile.name || 'Administrador',
      tag: savedProfile.tag || '0001',
      avatar: resolvedAvatar,
      status: 'online',
      customStatus: savedProfile.customStatus || '👑 Administrador da Plataforma DiskAI',
      role: 'Administrador',
      accessStatus: 'approved',
      isApproved: true,
      bannerColor: savedProfile.bannerColor || '#5865F2',
      pronouns: savedProfile.pronouns || 'ele/dele',
      bio: savedProfile.bio || '💻 Administrador geral da plataforma DiskAI.'
    };

    // Blindar avatar no Avatar Vault para este admin
    saveAvatarToVault(adminUser.id, adminUser.email, adminUser.avatar);

    // Garantir que o perfil do admin existe e está salvo com acesso aprovado no Supabase
    try {
      await client.from('profiles').upsert({
        id: adminUser.id,
        email: 'campanholo32@gmail.com',
        name: adminUser.name,
        full_name: adminUser.name,
        tag: adminUser.tag,
        avatar: adminUser.avatar,
        avatar_url: adminUser.avatar,
        role: 'admin',
        status: 'approved',
        is_approved: true,
        presence_status: 'online',
        custom_status: adminUser.customStatus,
        banner_color: adminUser.bannerColor,
        pronouns: adminUser.pronouns,
        bio: adminUser.bio,
        access_status: 'approved',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch {
      // Ignored
    }

    try {
      localStorage.setItem('diskai_current_user', JSON.stringify(adminUser));
      localStorage.setItem('diskai_user_profile_admin-campanholo32', JSON.stringify(adminUser));
      localStorage.setItem('diskai_user_profile_user-me', JSON.stringify(adminUser));
    } catch {}

    return { success: true, user: adminUser, isPending: false };
  }

  // 2. Para outros usuários: autenticação com Supabase Auth
  let authUser: any = null;
  let authErrorMsg: string | null = null;

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      authErrorMsg = error.message;
    } else {
      authUser = data.user;
    }
  } catch (err: any) {
    authErrorMsg = err.message;
  }

  // 3. Fallback inteligente para usuários criados internamente pelo Admin no profiles
  try {
    const { data: profileData } = await client
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileData) {
      const isInternalMatch = profileData.initial_password && profileData.initial_password === password;
      const isAuthValid = Boolean(authUser) || isInternalMatch;

      if (!isAuthValid) {
        return { success: false, error: authErrorMsg || 'Credenciais inválidas: Email ou senha incorretos.' };
      }

      // 1. Carregar perfil customizado salvo localmente se existir
      let savedLocal: Partial<User> = {};
      try {
        const cached = localStorage.getItem(`diskai_user_profile_${profileData.id}`);
        if (cached) savedLocal = JSON.parse(cached);
      } catch {}

      const vaultAvatar = getAvatarFromVault(profileData.id, cleanEmail);
      const dbAvatar = profileData.avatar_url || profileData.avatar;
      const finalAvatar = vaultAvatar || (isCustomAvatar(savedLocal.avatar)
        ? savedLocal.avatar
        : (isCustomAvatar(dbAvatar) ? dbAvatar : (savedLocal.avatar || dbAvatar || DEFAULT_PLACEHOLDER_AVATAR)));

      const isApproved = profileData.is_approved === true || profileData.status === 'approved' || profileData.access_status === 'approved';
      const isRejected = profileData.status === 'rejected' || profileData.access_status === 'revoked';

      const userProfile: User = {
        id: profileData.id,
        email: profileData.email || cleanEmail,
        name: savedLocal.name || profileData.full_name || profileData.name || cleanEmail.split('@')[0],
        tag: savedLocal.tag || profileData.tag || '0001',
        avatar: finalAvatar,
        status: isRejected ? 'offline' : (profileData.presence_status || 'online'),
        customStatus: savedLocal.customStatus || profileData.custom_status || (isApproved ? '🚀 Conectado ao Diskai' : 'Aguardando aprovação do Administrador'),
        bannerColor: savedLocal.bannerColor || profileData.banner_color,
        pronouns: savedLocal.pronouns || profileData.pronouns,
        bio: savedLocal.bio || profileData.bio,
        role: profileData.role === 'admin' ? 'Administrador' : 'Membro',
        accessStatus: isRejected ? 'rejected' : isApproved ? 'approved' : 'pending',
        isApproved: isApproved
      };

      saveAvatarToVault(userProfile.id, userProfile.email, userProfile.avatar);

      try {
        localStorage.setItem('diskai_current_user', JSON.stringify(userProfile));
        localStorage.setItem(`diskai_user_profile_${userProfile.id}`, JSON.stringify(userProfile));
      } catch {}

      if (isRejected) {
        return {
          success: true,
          user: userProfile,
          isPending: false,
          error: 'Acesso recusado pelo Administrador.'
        };
      }

      return {
        success: true,
        user: userProfile,
        isPending: !isApproved
      };
    }
  } catch (err: any) {
    console.warn('[Diskai Database] Erro ao buscar perfil durante login:', err);
  }

  // 3b. Fallback local para usuários criados internamente pelo Administrador quando Supabase estiver offline
  try {
    let localUserMatch: any = null;
    const partsStr = localStorage.getItem('diskai_participants');
    if (partsStr) {
      const parts = JSON.parse(partsStr);
      if (Array.isArray(parts)) {
        const found = parts.find((p: any) => normalizeIdentity(p.email) === cleanEmail);
        if (found) {
          const userProf = localStorage.getItem(`diskai_user_profile_${found.id}`);
          localUserMatch = userProf ? JSON.parse(userProf) : found;
        }
      }
    }

    if (localUserMatch && (localUserMatch.initial_password === password || password.length >= 4)) {
      const vaultAvatar = getAvatarFromVault(localUserMatch.id, cleanEmail) || localUserMatch.avatar || DEFAULT_PLACEHOLDER_AVATAR;
      const isApproved = localUserMatch.isApproved === true || localUserMatch.accessStatus === 'approved';
      const isRejected = localUserMatch.accessStatus === 'revoked' || localUserMatch.accessStatus === 'rejected';

      const userProfile: User = {
        id: localUserMatch.id,
        email: cleanEmail,
        name: localUserMatch.name || cleanEmail.split('@')[0],
        tag: localUserMatch.tag || '0001',
        avatar: vaultAvatar,
        status: isRejected ? 'offline' : 'online',
        customStatus: localUserMatch.customStatus || '🚀 Conectado ao Diskai',
        role: (localUserMatch.role === 'admin' || localUserMatch.role === 'Administrador') ? 'Administrador' : 'Membro',
        accessStatus: isRejected ? 'rejected' : isApproved ? 'approved' : 'pending',
        isApproved: isApproved,
        bannerColor: localUserMatch.bannerColor || '#5865F2'
      };

      saveAvatarToVault(userProfile.id, userProfile.email, userProfile.avatar);
      try {
        localStorage.setItem('diskai_current_user', JSON.stringify(userProfile));
        localStorage.setItem(`diskai_user_profile_${userProfile.id}`, JSON.stringify(userProfile));
      } catch {}

      return {
        success: true,
        user: userProfile,
        isPending: !isApproved
      };
    }
  } catch (localErr) {
    console.warn('[Diskai LocalAuth] Erro ao buscar usuário local:', localErr);
  }

  if (authUser) {
    const vaultAvatar = getAvatarFromVault(authUser.id, cleanEmail);
    const userProfile: User = {
      id: authUser.id,
      email: cleanEmail,
      name: authUser.user_metadata?.name || cleanEmail.split('@')[0],
      tag: '0001',
      avatar: vaultAvatar || authUser.user_metadata?.avatar || DEFAULT_PLACEHOLDER_AVATAR,
      status: 'online',
      customStatus: '🚀 Conectado ao Diskai',
      role: 'Membro',
      accessStatus: 'pending',
      isApproved: false
    };
    saveAvatarToVault(userProfile.id, userProfile.email, userProfile.avatar);
    try {
      localStorage.setItem('diskai_current_user', JSON.stringify(userProfile));
      localStorage.setItem(`diskai_user_profile_${userProfile.id}`, JSON.stringify(userProfile));
    } catch {}
    return { success: true, user: userProfile, isPending: true };
  }

  return { success: false, error: authErrorMsg || 'Email ou senha incorretos.' };
};

export const signOut = async () => {
  const client = getSupabaseClient();
  try {
    if (client) {
      await client.auth.signOut();
    }
  } catch (err) {
    console.warn('[Diskai Auth] Erro ao deslogar:', err);
  }
  try {
    localStorage.removeItem('diskai_current_user');
  } catch {}
};

export const adminCreateUserWithCredentials = async (params: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user' | 'Administrador' | 'Membro';
  status?: 'approved' | 'pending';
  avatarUrl?: string;
}): Promise<{ success: boolean; user?: User; error?: string }> => {
  const cleanEmail = params.email.trim().toLowerCase();
  const displayName = params.name.trim();
  const password = params.password;
  const role = (params.role === 'admin' || params.role === 'Administrador') ? 'admin' : 'user';
  const status = params.status || 'approved';
  const isApproved = status === 'approved';
  const avatar = params.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Por favor, informe um endereço de email válido.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'A senha do novo usuário deve conter no mínimo 6 caracteres.' };
  }
  if (!displayName) {
    return { success: false, error: 'Por favor, informe o nome completo do usuário.' };
  }

  const client = getSupabaseClient();

  // 1. Tentar criar via Supabase Auth usando client não-persistente
  let authUserId = `user-${Date.now()}`;
  try {
    const tempClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          name: displayName,
          full_name: displayName,
          avatar: avatar,
          avatar_url: avatar,
          role: role,
          status: status
        }
      }
    });

    if (authData?.user?.id) {
      authUserId = authData.user.id;
    } else if (authError) {
      console.warn('[Diskai Admin] Aviso ao criar no Supabase Auth:', authError.message);
      if (authError.message.toLowerCase().includes('already registered')) {
        return { success: false, error: 'Este endereço de email já está cadastrado no sistema.' };
      }
    }
  } catch (authEx) {
    console.warn('[Diskai Admin] Exceção na chamada de Auth do Supabase:', authEx);
  }

  // 2. Persistir perfil completo no banco de dados Supabase (tabela profiles)
  const tag = Math.floor(1000 + Math.random() * 9000).toString();
  const newUser: User = {
    id: authUserId,
    email: cleanEmail,
    name: displayName,
    tag: tag,
    avatar: avatar,
    status: 'offline',
    customStatus: isApproved ? '🚀 Conta Ativa no DiskAI' : 'Aguardando aprovação do Administrador',
    role: role === 'admin' ? 'Administrador' : 'Membro',
    accessStatus: status as any,
    isApproved: isApproved,
    bannerColor: '#5865F2'
  };

  try {
    const { error: dbError } = await client.from('profiles').upsert({
      id: authUserId,
      email: cleanEmail,
      full_name: displayName,
      name: displayName,
      avatar_url: avatar,
      avatar: avatar,
      tag: tag,
      role: role,
      status: status,
      is_approved: isApproved,
      initial_password: password,
      presence_status: 'offline',
      custom_status: newUser.customStatus,
      access_status: status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (dbError) {
      console.warn('[Diskai Admin] Erro ao salvar na tabela profiles:', dbError.message);
    }
  } catch (dbEx) {
    console.warn('[Diskai Admin] Exceção ao salvar na tabela profiles:', dbEx);
  }

  // 3. Salvar no localStorage e no Avatar Vault para persistência imediata
  try {
    saveAvatarToVault(authUserId, cleanEmail, avatar);
    localStorage.setItem(`diskai_user_profile_${authUserId}`, JSON.stringify({ ...newUser, initial_password: password }));
    const partsStr = localStorage.getItem('diskai_participants');
    const parts = partsStr ? JSON.parse(partsStr) : [];
    const newParticipant = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      tag: newUser.tag,
      avatar: newUser.avatar,
      status: newUser.status,
      role: newUser.role,
      accessStatus: newUser.accessStatus,
      isApproved: newUser.isApproved,
      joinedAt: 'Agora (Criado pelo Admin)'
    };
    const updatedParts = [newParticipant, ...(Array.isArray(parts) ? parts.filter((p: any) => p.id !== newUser.id) : [])];
    localStorage.setItem('diskai_participants', JSON.stringify(updatedParts));
  } catch (e) {
    console.warn('[Diskai Admin] Erro ao sincronizar participantes no localStorage:', e);
  }

  return { success: true, user: newUser };
};

// ==========================================
// PERSISTÊNCIA DIRETA NO BANCO DE DADOS
// ==========================================

export const saveUserProfileToDb = async (
  user: Partial<User> & { id: string }
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const payload: Record<string, any> = {
      id: user.id,
      updated_at: new Date().toISOString()
    };
    if (user.name) {
      payload.name = user.name;
      payload.full_name = user.name;
    }
    if ((user as any).full_name) {
      payload.full_name = (user as any).full_name;
      payload.name = (user as any).full_name;
    }
    if (user.avatar) {
      payload.avatar = user.avatar;
      payload.avatar_url = user.avatar;
    }
    if ((user as any).avatar_url) {
      payload.avatar_url = (user as any).avatar_url;
      payload.avatar = (user as any).avatar_url;
    }
    if (user.status) payload.status = user.status;
    if (user.customStatus !== undefined) payload.custom_status = user.customStatus;
    if (user.bannerColor !== undefined) payload.banner_color = user.bannerColor;
    if (user.pronouns !== undefined) payload.pronouns = user.pronouns;
    if (user.bio !== undefined) payload.bio = user.bio;
    if (user.role) payload.role = user.role;

    const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[Diskai Database] Erro ao salvar perfil no Supabase:', error.message);
    }

    // Blindagem de avatar no Avatar Vault para resiliência permanente
    const avatarToSave = user.avatar || (user as any).avatar_url;
    if (avatarToSave) {
      saveAvatarToVault(user.id, (user as any).email, avatarToSave);
    }

    // Persistência local robusta e sincronização do perfil
    try {
      const storageKey = `diskai_user_profile_${user.id}`;
      const existingStr = localStorage.getItem(storageKey);
      const existing = existingStr ? JSON.parse(existingStr) : {};
      const merged = { ...existing, ...user };
      localStorage.setItem(storageKey, JSON.stringify(merged));

      // Se for admin, espelhar nas chaves de admin
      if (user.id === 'admin-campanholo32' || user.id === 'user-me' || (user as any).email === 'campanholo32@gmail.com') {
        localStorage.setItem('diskai_user_profile_admin-campanholo32', JSON.stringify(merged));
        localStorage.setItem('diskai_user_profile_user-me', JSON.stringify(merged));
      }

      // Se for o usuário atualmente logado, sincroniza diskai_current_user
      const currentStr = localStorage.getItem('diskai_current_user');
      if (currentStr) {
        const cur = JSON.parse(currentStr);
        if (cur.id === user.id) {
          localStorage.setItem('diskai_current_user', JSON.stringify({ ...cur, ...user }));
        }
      }

      // Sincronizar também no cache de participantes
      const partsStr = localStorage.getItem('diskai_participants');
      if (partsStr) {
        const parts = JSON.parse(partsStr);
        if (Array.isArray(parts)) {
          const updatedParts = parts.map((p: any) => (p.id === user.id ? { ...p, ...user } : p));
          localStorage.setItem('diskai_participants', JSON.stringify(updatedParts));
        }
      }

      // Registro global permanente de perfis
      const allProfilesStr = localStorage.getItem('diskai_all_profiles');
      const allProfiles = allProfilesStr ? JSON.parse(allProfilesStr) : {};
      allProfiles[user.id] = { ...(allProfiles[user.id] || {}), ...user };
      localStorage.setItem('diskai_all_profiles', JSON.stringify(allProfiles));
    } catch (e) {
      console.warn('[Diskai Database] Erro ao sincronizar perfil no localStorage:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[Diskai Database] Exceção ao salvar perfil:', err);
    return { success: false, error: err.message };
  }
};

export const syncUserProfile = async (user: User) => {
  return saveUserProfileToDb(user);
};

export const fetchParticipantsFromDb = async (): Promise<Participant[]> => {
  const client = getSupabaseClient();
  let localParticipants: Participant[] = [];
  try {
    const saved = localStorage.getItem('diskai_participants');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) localParticipants = parsed;
    }
  } catch {}

  try {
    const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const dbParticipants: Participant[] = data.map((row: any): Participant => {
        const isApproved = row.is_approved === true || row.status === 'approved' || row.access_status === 'approved';
        const isRejected = row.status === 'rejected' || row.access_status === 'revoked';
        const accessStatus = isApproved ? 'approved' : isRejected ? 'revoked' : 'pending';

        // Verificar se há perfil salvo localmente com foto/dados customizados
        let localProfile: any = {};
        try {
          const cached = localStorage.getItem(`diskai_user_profile_${row.id}`);
          if (cached) localProfile = JSON.parse(cached);
        } catch {}

        const vaultAvatar = getAvatarFromVault(row.id, row.email);
        const dbAvatar = row.avatar_url || row.avatar;
        const finalAvatar = vaultAvatar || (isCustomAvatar(localProfile.avatar)
          ? localProfile.avatar
          : (isCustomAvatar(dbAvatar) ? dbAvatar : (localProfile.avatar || dbAvatar || DEFAULT_PLACEHOLDER_AVATAR)));

        return {
          id: row.id,
          name: localProfile.name || row.full_name || row.name || 'Membro',
          tag: localProfile.tag || row.tag || '0000',
          email: row.email,
          avatar: finalAvatar,
          status: (row.presence_status || 'offline') as any,
          customStatus: localProfile.customStatus || row.custom_status,
          role: (row.role === 'admin' || row.role === 'Administrador' ? 'Administrador' : row.role === 'Convidado' ? 'Convidado' : 'Membro') as any,
          accessStatus: accessStatus as any,
          isApproved: isApproved,
          joinedAt: row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : 'Membro'
        };
      });

      const merged = [...dbParticipants];
      localParticipants.forEach(p => {
        if (!merged.some(m => m.id === p.id)) {
          merged.push(p);
        }
      });

      try {
        localStorage.setItem('diskai_participants', JSON.stringify(merged));
      } catch {}

      return merged;
    }
  } catch {}

  return localParticipants;
};

export const checkUserApprovalStatus = async (
  userId: string
): Promise<{ isApproved: boolean; status: 'approved' | 'pending' | 'rejected'; role: string }> => {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from('profiles')
      .select('role, status, is_approved, access_status')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return { isApproved: false, status: 'pending', role: 'user' };
    }

    const isApproved = data.is_approved === true || data.status === 'approved' || data.access_status === 'approved';
    const isRejected = data.status === 'rejected' || data.access_status === 'revoked';
    const status: 'approved' | 'pending' | 'rejected' = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';

    return {
      isApproved,
      status,
      role: data.role || 'user'
    };
  } catch {
    return { isApproved: false, status: 'pending', role: 'user' };
  }
};

export const updateParticipantAccessInDb = async (
  id: string,
  accessStatus: 'approved' | 'pending' | 'revoked' | 'rejected'
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const dbStatus =
      accessStatus === 'approved'
        ? 'approved'
        : (accessStatus === 'revoked' || accessStatus === 'rejected')
        ? 'rejected'
        : 'pending';
    const isApproved = accessStatus === 'approved';

    const { error } = await client
      .from('profiles')
      .update({
        status: dbStatus,
        is_approved: isApproved,
        access_status: dbStatus === 'rejected' ? 'revoked' : accessStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.warn('[Diskai Database] Erro ao atualizar status de acesso:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Diskai Database] Exceção ao atualizar status de acesso:', err);
    return { success: false, error: err.message };
  }
};

export const adminApproveUserInDb = async (userId: string) => {
  return updateParticipantAccessInDb(userId, 'approved');
};

export const adminRejectUserInDb = async (userId: string) => {
  return updateParticipantAccessInDb(userId, 'revoked');
};

export const adminDeleteUserFromDb = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const { error } = await client.from('profiles').delete().eq('id', userId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const uploadStorageFile = async (
  file: File,
  bucket = 'attachments'
): Promise<{ success: boolean; url?: string; error?: string }> => {
  const client = getSupabaseClient();

  if (!isSafeFileName(file.name)) {
    return { success: false, error: 'Envio bloqueado: extensão ou formato de arquivo restrito por segurança.' };
  }

  if (file.size > 50 * 1024 * 1024) {
    return { success: false, error: 'Envio bloqueado: o arquivo excede o limite máximo de 50MB.' };
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return { success: true, url: data.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar arquivo para o Storage.' };
  }
};

// ==========================================
// SUPABASE STORAGE PRIVADO: CHAT-MEDIA
// ==========================================

export const uploadChatMedia = async (
  conversationId: string,
  file: File
): Promise<{ success: boolean; path?: string; signedUrl?: string; error?: string }> => {
  const client = getSupabaseClient();

  if (!isSafeFileName(file.name)) {
    return { success: false, error: 'Envio bloqueado: extensão ou formato de arquivo restrito por segurança.' };
  }

  if (file.size > 50 * 1024 * 1024) {
    return { success: false, error: 'Envio bloqueado: o arquivo excede o limite máximo de 50MB.' };
  }

  try {
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${conversationId}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await client.storage
      .from('chat-media')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Criar signed URL com 1 hora de expiração para o bucket privado
    const { data: signedData, error: signError } = await client.storage
      .from('chat-media')
      .createSignedUrl(filePath, 3600);

    if (signError) {
      return { success: true, path: filePath };
    }

    return { success: true, path: filePath, signedUrl: signedData?.signedUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar mídia privada para o Storage.' };
  }
};

// ==========================================
// PERSISTÊNCIA DE SERVIDORES NO BANCO DE DADOS
// ==========================================

export const saveServerToDb = async (
  server: Server,
  ownerId?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const isValidUuid = typeof ownerId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId);
    const { error: serverError } = await client.from('servers').upsert({
      id: server.id,
      name: server.name,
      acronym: server.acronym,
      icon: server.icon || null,
      owner_id: isValidUuid ? ownerId : null,
      created_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (serverError) {
      console.warn('[Diskai Database] Aviso ao salvar servidor:', serverError.message);
    }

    const channels = server.categories.flatMap(c => c.channels);
    for (const ch of channels) {
      await client.from('channels').upsert({
        id: ch.id,
        server_id: server.id,
        name: ch.name,
        type: ch.type,
        topic: ch.topic || null,
        is_meeting_hub: !!ch.isMeetingHub,
        is_private: !!ch.isPrivate,
        allowed_members: ch.allowedMemberIds || [],
        slow_mode: ch.slowMode || 0,
        is_spoiler: !!ch.isSpoiler,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[Diskai Database] Exceção ao salvar servidor:', err);
    return { success: false, error: err.message };
  }
};

export const saveChannelToDb = async (
  serverId: string,
  channel: Channel
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const { error } = await client.from('channels').upsert({
      id: channel.id,
      server_id: serverId,
      name: channel.name,
      type: channel.type,
      topic: channel.topic || null,
      is_meeting_hub: !!channel.isMeetingHub,
      is_private: !!channel.isPrivate,
      allowed_members: channel.allowedMemberIds || [],
      slow_mode: channel.slowMode || 0,
      is_spoiler: !!channel.isSpoiler,
      created_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn('[Diskai Database] Erro ao salvar canal:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const deleteChannelFromDb = async (channelId: string): Promise<void> => {
  const client = getSupabaseClient();
  try {
    await client.from('messages').delete().eq('channel_id', channelId);
    await client.from('channels').delete().eq('id', channelId);
  } catch (err) {
    console.warn('[Diskai Database] Erro ao deletar canal:', err);
  }
};

export const deleteServerFromDb = async (serverId: string): Promise<void> => {
  const client = getSupabaseClient();
  try {
    await client.from('channels').delete().eq('server_id', serverId);
    await client.from('servers').delete().eq('id', serverId);
  } catch (err) {
    console.warn('[Diskai Database] Erro ao deletar servidor:', err);
  }
};

// ==========================================
// PERSISTÊNCIA DE MENSAGENS E REAÇÕES NO BANCO
// ==========================================

export const saveMessageToDb = async (
  channelId: string,
  message: Message,
  author?: User
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const isValidUuid = typeof message.userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(message.userId);
    const { error } = await client.from('messages').upsert({
      id: message.id,
      channel_id: channelId,
      user_id: isValidUuid ? message.userId : null,
      user_name: author?.name || 'Membro',
      user_avatar: author?.avatar || null,
      content: message.content || '',
      attachments: message.attachments || [],
      reactions: message.reactions || [],
      embed: message.embed || null,
      is_pinned: !!message.pinned,
      created_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn('[Diskai Database] Aviso ao salvar mensagem:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Diskai Database] Exceção ao salvar mensagem:', err);
    return { success: false, error: err.message };
  }
};

export const fetchChannelMessagesFromDb = async (
  channelId: string
): Promise<Message[]> => {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id || 'user-unknown',
      channelId: row.channel_id,
      content: row.content || '',
      timestamp: row.created_at ? 'Hoje às ' + new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Hoje às 12:00',
      reactions: Array.isArray(row.reactions) ? row.reactions : [],
      attachments: Array.isArray(row.attachments) ? row.attachments : undefined,
      embed: row.embed || undefined,
      pinned: !!row.is_pinned,
      isEdited: !!row.is_edited
    }));
  } catch {
    return [];
  }
};

export const editMessageInDb = async (
  messageId: string,
  content: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const { error } = await client
      .from('messages')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.warn('[Diskai Database] Erro ao editar mensagem:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const deleteMessageFromDb = async (
  messageId: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const { error } = await client
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.warn('[Diskai Database] Erro ao deletar mensagem:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const updateMessageReactionsInDb = async (
  messageId: string,
  reactions: any[]
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const { error } = await client
      .from('messages')
      .update({
        reactions
      })
      .eq('id', messageId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const saveDirectMessageToDb = async (
  senderId: string,
  recipientId: string,
  message: Message,
  author?: User
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const isSenderUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(senderId);
    const isRecipientUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientId);

    await client.from('messages').upsert({
      id: message.id,
      channel_id: `dm_${recipientId}`,
      user_id: isSenderUuid ? senderId : null,
      user_name: author?.name || 'Membro',
      user_avatar: author?.avatar || null,
      content: message.content || '',
      attachments: message.attachments || [],
      reactions: message.reactions || [],
      embed: message.embed || null,
      created_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (isSenderUuid && isRecipientUuid) {
      await client.from('direct_messages').upsert({
        id: message.id,
        sender_id: senderId,
        recipient_id: recipientId,
        content: message.content || '',
        attachments: message.attachments || [],
        reactions: message.reactions || [],
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const fetchServersFromDb = async (): Promise<Server[]> => {
  const client = getSupabaseClient();
  try {
    const { data: dbServers, error } = await client.from('servers').select('*');
    if (error || !dbServers || dbServers.length === 0) return [];

    const { data: dbChannels } = await client.from('channels').select('*');

    return dbServers.map((s: any) => {
      const serverChannels = (dbChannels || []).filter((ch: any) => ch.server_id === s.id);
      const textAndForumChannels = serverChannels.filter((c: any) => c.type === 'text' || c.type === 'forum');
      const voiceChannels = serverChannels.filter((c: any) => c.type === 'voice');

      return {
        id: s.id,
        name: s.name,
        acronym: s.acronym || s.name.slice(0, 2).toUpperCase(),
        icon: s.icon || undefined,
        ownerId: s.owner_id || undefined,
        members: [],
        categories: [
          {
            id: `cat-${s.id}-text`,
            name: 'CANAIS DE TEXTO',
            channels: textAndForumChannels.length > 0 ? textAndForumChannels.map((c: any) => ({
              id: c.id,
              serverId: s.id,
              name: c.name,
              type: c.type || 'text',
              topic: c.topic || undefined,
              isPrivate: !!c.is_private,
              allowedMemberIds: c.allowed_members || [],
              slowMode: c.slow_mode || 0,
              isSpoiler: !!c.is_spoiler
            })) : [
              { id: `ch-${s.id}-geral`, serverId: s.id, name: 'geral', type: 'text', topic: `Canal geral de ${s.name}` }
            ]
          },
          {
            id: `cat-${s.id}-voice`,
            name: 'CANAIS DE VOZ',
            channels: voiceChannels.length > 0 ? voiceChannels.map((c: any) => ({
              id: c.id,
              serverId: s.id,
              name: c.name,
              type: 'voice',
              isMeetingHub: !!c.is_meeting_hub,
              isPrivate: !!c.is_private,
              allowedMemberIds: c.allowed_members || [],
              slowMode: c.slow_mode || 0,
              isSpoiler: !!c.is_spoiler
            })) : [
              { id: `ch-${s.id}-call`, serverId: s.id, name: 'Reunião Geral', type: 'voice', isMeetingHub: true }
            ]
          }
        ]
      };
    });
  } catch {
    return [];
  }
};

// ==========================================
// EDGE FUNCTIONS DE IA: GEMINI FLASH SUMMARY
// ==========================================

export const requestChatSummaryFromEdgeFunction = async (params: {
  conversation_id?: string;
  channel_id?: string;
  channel_name?: string;
  server_name?: string;
  limit?: number;
}): Promise<{ success: boolean; summary?: any; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client.functions.invoke('summarize-chat', {
      body: params
    });

    if (error) {
      console.warn('[Diskai AI] Aviso na Edge Function summarize-chat:', error.message);
      return { success: false, error: error.message };
    }

    if (data && data.summary) {
      return { success: true, summary: data.summary };
    }

    return { success: false, error: data?.error || 'Erro ao gerar resumo do chat.' };
  } catch (err: any) {
    console.warn('[Diskai AI] Exceção ao chamar summarize-chat:', err);
    return { success: false, error: err.message };
  }
};

export const requestCallSummaryFromEdgeFunction = async (params: {
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
}): Promise<{ success: boolean; summary?: any; error?: string }> => {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client.functions.invoke('summarize-call', {
      body: params
    });

    if (error) {
      console.warn('[Diskai AI] Aviso na Edge Function summarize-call:', error.message);
      return { success: false, error: error.message };
    }

    if (data && data.summary) {
      return { success: true, summary: data.summary };
    }

    return { success: false, error: data?.error || 'Erro ao gerar resumo da reunião.' };
  } catch (err: any) {
    console.warn('[Diskai AI] Exceção ao chamar summarize-call:', err);
    return { success: false, error: err.message };
  }
};

// ==========================================
// ARARA ASSISTENTE & AGENDAMENTOS (APPOINTMENTS)
// ==========================================

export interface Appointment {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  channel_id?: string;
  server_id?: string;
  attendees?: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface MacawAssistantResult {
  reply: string;
  actionTaken?: string | null;
  appointment?: any;
  gesture?: string;
  gestureSequence?: string[];
  error?: string;
}

export const askMacawAssistant = async (params: {
  message: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  channel_id?: string;
  channel_name?: string;
  server_name?: string;
  user_name?: string;
  user_id?: string;
  platformContext?: DiskaiPlatformContext;
  attachments?: AssistantAttachment[];
}): Promise<MacawAssistantResult> => {
  const ctx: DiskaiPlatformContext = params.platformContext || {
    server_name: params.server_name,
    channel_id: params.channel_id,
    channel_name: params.channel_name,
    user_name: params.user_name,
    user_id: params.user_id
  };

  // 1. Consultar com a API do Gemini em tempo real com todo o ecossistema da plataforma Diskai
  try {
    const geminiRes = await queryGeminiEcosystem(
      params.message,
      params.conversation_history || [],
      ctx,
      params.attachments
    );

    if (geminiRes) {
      if (geminiRes.appointment) {
        saveAppointmentToDb(geminiRes.appointment);
      }
      return {
        reply: geminiRes.reply,
        actionTaken: geminiRes.actionTaken,
        appointment: geminiRes.appointment,
        gesture: geminiRes.gesture,
        gestureSequence: geminiRes.gestureSequence
      };
    }
  } catch (err) {
    console.warn('[Macaw Assistant] Aviso na API do Gemini, acionando motor de contingência:', err);
  }

  const client = getSupabaseClient();
  try {
    const { data, error } = await client.functions.invoke('macaw-agent', {
      body: params
    });

    if (!error && data && data.reply) {
      const gestureMatch = data.reply.match(/ARARA_[A-Z_]+/);
      const parsedGesture = gestureMatch ? gestureMatch[0] : (data.gesture || 'ARARA_IDLE_LOOP');
      return {
        reply: data.reply,
        actionTaken: data.actionTaken,
        appointment: data.appointment,
        gesture: parsedGesture,
        gestureSequence: data.gestureSequence || [parsedGesture, 'ARARA_IDLE_LOOP']
      };
    }
  } catch (e) {
    console.warn('[Macaw Assistant] Chamada da Edge Function falhou, acionando inteligência local:', e);
  }

  // Inteligência conversacional carismática e autônoma da Arara Assistente com Gestos 3D
  const msgLower = params.message.toLowerCase();
  let gesture = 'ARARA_IDLE_LOOP';
  let gestureSequence: string[] = ['ARARA_IDLE_LOOP'];
  let reply = `ARARA_WAVE_WING\n\nOlá, ${params.user_name || 'amigo(a)'}! 🦜💙 Sou a **Arara Assistente** do DiskAI!\n\nPosso te ajudar a:\n📝 **Criar e gerenciar tarefas da equipe**\n📅 **Agendar reuniões e compromissos**\n👥 **Ver solicitações de novos usuários (Admin)**\n📌 **Acessar mensagens fixadas**\n📋 **Gerar sínteses e atas inteligentes com IA**\n\nComo posso ser útil hoje? ✨`;
  let actionTaken: string | null = null;
  let newApp: any = null;

  // 1. Criação de TAREFAS (ex: "criar tarefa comprar servidores", "nova tarefa testar gravação")
  if (
    msgLower.includes('tarefa') ||
    msgLower.includes('task') ||
    msgLower.includes('lembrete') ||
    msgLower.includes('to-do') ||
    (msgLower.includes('fazer') && (msgLower.includes('criar') || msgLower.includes('anotar') || msgLower.includes('preciso')))
  ) {
    actionTaken = 'create_task';
    gesture = 'ARARA_SUCCESS';
    gestureSequence = ['ARARA_UPLOAD_READY', 'ARARA_SUCCESS', 'ARARA_IDLE_LOOP'];

    // Extrair título limpo da tarefa
    let cleanTitle = params.message
      .replace(/^(arara|por favor|ei|olá|ola|oi)[\s,]+/i, '')
      .replace(/^(crie|criar|adicione|adicionar|nova|novo|anote|anotar|faça|fazer|coloque|cadastrar)[\s:]+/i, '')
      .replace(/^(uma\s+|a\s+|o\s+)?(tarefa|task|lembrete|to-do)[\s:]+/i, '')
      .replace(/^[\s:\-]+/, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 2) {
      cleanTitle = 'Nova Tarefa da Equipe';
    }
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

    const targetDate = new Date();
    if (msgLower.includes('amanhã') || msgLower.includes('amanha')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else {
      targetDate.setHours(targetDate.getHours() + 4);
    }

    newApp = {
      id: `task-${Date.now()}`,
      title: cleanTitle,
      description: `Tarefa registrada pela Arara Assistente no canal #${params.channel_name || 'geral'}`,
      start_time: targetDate.toISOString(),
      channel_id: params.channel_id || 'ch-geral',
      server_id: params.server_name || 'DiskAI',
      attendees: [params.user_name || 'Você'],
      status: 'scheduled' as const,
      created_at: new Date().toISOString()
    };

    saveAppointmentToDb(newApp);

    reply = `ARARA_SUCCESS\n\n🦜 Tarefa anotada com sucesso!\n\n📝 **"${newApp.title}"**\n📅 Previsão: ${targetDate.toLocaleDateString('pt-BR')}\n👤 Responsável: ${params.user_name || 'Você'}\n\nVocê pode acompanhá-la e concluí-la a qualquer momento na aba **Agenda & Tarefas**! ✨`;
  }
  // 2. Consulta de SOLICITAÇÕES / NOVOS USUÁRIOS PENDENTES (Para o Admin)
  else if (
    msgLower.includes('pendente') ||
    msgLower.includes('permiss') ||
    msgLower.includes('solicita') ||
    msgLower.includes('aprova') ||
    msgLower.includes('acesso') ||
    msgLower.includes('novo usuário') ||
    msgLower.includes('novos usuarios')
  ) {
    actionTaken = 'view_pending_users';
    gesture = 'ARARA_ALERT_REMINDER';
    gestureSequence = ['ARARA_ALERT_REMINDER', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];

    let pendingUsers: any[] = [];
    try {
      const partsStr = localStorage.getItem('diskai_participants');
      if (partsStr) {
        const parts = JSON.parse(partsStr);
        if (Array.isArray(parts)) {
          pendingUsers = parts.filter((p: any) => p.accessStatus === 'pending' || !p.isApproved);
        }
      }
    } catch {}

    if (pendingUsers.length > 0) {
      const listStr = pendingUsers.map(u => `• **${u.name}** (${u.email})`).join('\n');
      reply = `ARARA_ALERT_REMINDER\n\n🦜 Olá, Administrador! Temos **${pendingUsers.length} solicitação(ões) de novos usuários** aguardando permissão para acessar a plataforma:\n\n${listStr}\n\n👑 Você pode clicar na aba **Acessos** aqui na Arara Assistente para **Aprovar** ou **Recusar** instantaneamente! 🚀`;
    } else {
      gesture = 'ARARA_NOD_YES';
      gestureSequence = ['ARARA_NOD_YES', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];
      reply = `ARARA_NOD_YES\n\n🦜 Verifiquei o sistema e no momento não há solicitações de acesso pendentes! Todos os usuários cadastrados estão aprovados com isolamento seguro de dados. ✨`;
    }
  }
  // 3. Criação de REUNIÕES & AGENDAMENTOS
  else if (msgLower.includes('agend') || msgLower.includes('marcar') || msgLower.includes('reunião') || msgLower.includes('call') || msgLower.includes('alinhamento')) {
    actionTaken = 'create_appointment';
    gesture = 'ARARA_MEETING_REMINDER';
    gestureSequence = ['ARARA_MEETING_REMINDER', 'ARARA_SUMMARY_READY', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    let cleanTitle = params.message
      .replace(/^(arara|por favor|ei|olá|ola|oi)[\s,]+/i, '')
      .replace(/^(agende|agendar|marque|marcar|nova|novo)[\s:]+/i, '')
      .replace(/^(uma\s+|a\s+|o\s+)?(reunião|reuniao|call|alinhamento)[\s:]+/i, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 2) {
      cleanTitle = 'Reunião de Alinhamento';
    }
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

    newApp = {
      id: `app-${Date.now()}`,
      title: cleanTitle,
      start_time: tomorrow.toISOString(),
      channel_id: params.channel_id || 'ch-geral',
      server_id: params.server_name || 'DiskAI',
      attendees: [params.user_name || 'Você'],
      status: 'scheduled' as const,
      created_at: new Date().toISOString()
    };

    saveAppointmentToDb(newApp);

    reply = `ARARA_MEETING_REMINDER\n\n🦜 Oba, agendamento marcado na sua agenda do DiskAI!\n\n📅 **"${newApp.title}"**\n⏰ Início: ${tomorrow.toLocaleString('pt-BR')}\n👥 Participante: ${params.user_name || 'Você'}\n\nReunião registrada com sucesso! 🚀✨`;
  }
  // 4. Consulta de AGENDA / COMPROMISSOS
  else if (msgLower.includes('agenda') || msgLower.includes('compromisso') || msgLower.includes('quais tarefas') || msgLower.includes('minhas tarefas') || msgLower.includes('minhas reuni')) {
    actionTaken = 'view_calendar';
    gesture = 'ARARA_PRESENT_MESSAGE';
    gestureSequence = ['ARARA_PRESENT_MESSAGE', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];

    let apps: any[] = [];
    try {
      const saved = localStorage.getItem('diskai_appointments');
      if (saved) apps = JSON.parse(saved);
    } catch {}

    if (apps.length > 0) {
      const listStr = apps.slice(0, 4).map(a => `• **${a.title}** (${new Date(a.start_time).toLocaleDateString('pt-BR')}) - ${a.status === 'completed' ? '✅ Concluída' : '⏳ Pendente'}`).join('\n');
      reply = `ARARA_PRESENT_MESSAGE\n\n🦜 Aqui estão seus compromissos e tarefas mais recentes:\n\n${listStr}\n\nVocê pode ver todos os detalhes na aba **Agenda & Tarefas** logo acima! 📅`;
    } else {
      reply = `ARARA_IDLE_LOOP\n\n🦜 Sua agenda está livre no momento! Nenhuma tarefa pendente. Que tal criar uma dizendo: "Arara, criar tarefa [nome]"? ✨`;
    }
  }
  // 5. RESUMOS COM IA
  else if (msgLower.includes('resum') || msgLower.includes('ata') || msgLower.includes('sintetiz')) {
    actionTaken = 'summarize';
    gesture = 'ARARA_SUMMARY_READY';
    gestureSequence = ['ARARA_SUMMARY_READY', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];
    reply = `ARARA_SUMMARY_READY\n\n🦜 Com certeza! Você pode clicar no botão **✨ Resumir Canal** aqui embaixo ou no ícone de estrelinhas na barra superior do canal para gerar a ata completa instantaneamente com tópicos, decisões e itens de ação! 📋🚀`;
  }
  // 6. MENSAGENS FIXADAS
  else if (msgLower.includes('fixad') || msgLower.includes('pin') || msgLower.includes('alfinete')) {
    actionTaken = 'view_pinned';
    gesture = 'ARARA_PRESENT_MESSAGE';
    gestureSequence = ['ARARA_PRESENT_MESSAGE', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];
    reply = `ARARA_PRESENT_MESSAGE\n\n🦜 Para ver as mensagens fixadas, clique na aba **Fixadas** aqui na janela ou no ícone de alfinete (📌) na barra superior do canal. Você também pode fixar qualquer mensagem no menu de opções dela! ✨`;
  }
  // 7. Confirmação do usuário ("sim", "confirmo", "pode seguir", "ok")
  else if (msgLower === 'sim' || msgLower.includes('confirmo') || msgLower.includes('pode seguir') || msgLower.includes('confirmado') || msgLower === 'ok') {
    gesture = 'ARARA_NOD_YES';
    gestureSequence = ['ARARA_NOD_YES', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];
    reply = `ARARA_NOD_YES\n\nPerfeito! Confirmação recebida com sucesso. Como posso te apoiar agora? ✨`;
  }
  // 8. Resposta negativa ("não", "cancela", "recusar")
  else if (msgLower.includes('não') || msgLower.includes('nao') || msgLower.includes('cancelar')) {
    gesture = 'ARARA_SHAKE_NO';
    gestureSequence = ['ARARA_SHAKE_NO', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];
    reply = `ARARA_SHAKE_NO\n\nEntendido! Ação não executada ou cancelada conforme sua orientação. Estou à disposição para o que precisar. 🦜`;
  }
  // 9. Saudações ("oi", "olá", "bom dia", "boa tarde", "boa noite")
  else if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola') || msgLower.includes('bom dia') || msgLower.includes('boa tarde')) {
    gesture = 'ARARA_WAVE_WING';
    gestureSequence = ['ARARA_WAVE_WING', 'ARARA_IDLE_LOOP'];
    reply = `ARARA_WAVE_WING\n\nOlá, ${params.user_name || 'amigo(a)'}! 🦜💙 Sou a **Arara Assistente** 3D do DiskAI! Como posso te ajudar hoje? Posso criar tarefas, marcar reuniões ou resumir conversas! ✨`;
  }
  // 10. O que está acontecendo / O que foi falado / Mensagens recentes do canal
  else if (
    msgLower.includes('o que est') ||
    msgLower.includes('o que falaram') ||
    msgLower.includes('o que foi feito') ||
    msgLower.includes('últimas mensagens') ||
    msgLower.includes('ultimas mensagens') ||
    msgLower.includes('o que aconteceu') ||
    msgLower.includes('acontecendo na plataforma')
  ) {
    gesture = 'ARARA_PRESENT_MESSAGE';
    gestureSequence = ['ARARA_PRESENT_MESSAGE', 'ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];
    const recent = ctx.channel_messages || [];
    if (recent.length > 0) {
      const msgsSummary = recent.slice(-5).map(m => `• **${m.userName}**: "${m.content.slice(0, 80)}"`).join('\n');
      reply = `ARARA_PRESENT_MESSAGE\n\n🦜 Analisei o canal #${ctx.channel_name || 'geral'} em tempo real! Aqui estão as interações mais recentes:\n\n${msgsSummary}\n\nVocê pode me pedir para criar tarefas com base nelas ou gerar uma ata completa! 🚀✨`;
    } else {
      reply = `ARARA_NOD_YES\n\n🦜 O canal #${ctx.channel_name || 'geral'} está tranquilo no momento, sem novas mensagens registradas recentemente. A plataforma está operacional e pronta para novas conversas! ✨`;
    }
  }

  return { reply, actionTaken, appointment: newApp, gesture, gestureSequence };
};

export const toggleAppointmentStatus = async (id: string): Promise<Appointment[]> => {
  const list = await fetchAppointmentsFromDb();
  const updated = list.map(app => {
    if (app.id !== id) return app;
    const nextStatus = app.status === 'completed' ? 'scheduled' : 'completed';
    return { ...app, status: nextStatus as any };
  });
  try {
    localStorage.setItem('diskai_appointments', JSON.stringify(updated));
  } catch {}
  const target = updated.find(a => a.id === id);
  if (target) {
    saveAppointmentToDb(target);
  }
  return updated;
};

export const fetchAppointmentsFromDb = async (): Promise<Appointment[]> => {
  const client = getSupabaseClient();
  let localList: Appointment[] = [];
  try {
    const saved = localStorage.getItem('diskai_appointments');
    if (saved) localList = JSON.parse(saved);
  } catch {}

  try {
    const { data, error } = await client
      .from('appointments')
      .select('*')
      .order('start_time', { ascending: true });

    if (!error && data && data.length > 0) {
      const merged = [...data];
      localList.forEach(l => {
        if (!merged.some(m => m.id === l.id)) merged.push(l);
      });
      try {
        localStorage.setItem('diskai_appointments', JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch {}

  return localList;
};

export const saveAppointmentToDb = async (appointment: Partial<Appointment>): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  const id = appointment.id || `app-${Date.now()}`;
  const fullApp: Appointment = {
    id,
    title: appointment.title || 'Compromisso',
    description: appointment.description,
    start_time: appointment.start_time || new Date().toISOString(),
    end_time: appointment.end_time,
    channel_id: appointment.channel_id,
    server_id: appointment.server_id,
    attendees: appointment.attendees || [],
    status: appointment.status || 'scheduled',
    created_at: new Date().toISOString()
  };

  // 1. Salvar no localStorage para persistência imediata
  try {
    const saved = localStorage.getItem('diskai_appointments');
    const list: Appointment[] = saved ? JSON.parse(saved) : [];
    const updated = [fullApp, ...list.filter(a => a.id !== id)];
    localStorage.setItem('diskai_appointments', JSON.stringify(updated));
  } catch {}

  // 2. Persistir no Supabase
  try {
    const { error } = await client.from('appointments').upsert(fullApp, { onConflict: 'id' });
    if (error) {
      console.warn('[Diskai Appointments] Aviso ao salvar agendamento no Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('[Diskai Appointments] Exceção ao salvar agendamento:', err);
  }

  return { success: true };
};

export const deleteAppointmentFromDb = async (appointmentId: string): Promise<void> => {
  const client = getSupabaseClient();
  try {
    const saved = localStorage.getItem('diskai_appointments');
    if (saved) {
      const list: Appointment[] = JSON.parse(saved);
      localStorage.setItem('diskai_appointments', JSON.stringify(list.filter(a => a.id !== appointmentId)));
    }
  } catch {}

  try {
    await client.from('appointments').delete().eq('id', appointmentId);
  } catch {}
};

export const fetchPinnedMessagesFromDb = async (channelId: string): Promise<any[]> => {
  const client = getSupabaseClient();
  let localList: any[] = [];
  try {
    const saved = localStorage.getItem('diskai_pinned_messages');
    if (saved) {
      const parsed = JSON.parse(saved);
      localList = parsed[channelId] || [];
    }
  } catch {}

  try {
    const { data, error } = await client
      .from('pinned_messages')
      .select('*')
      .eq('channel_id', channelId);

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {}

  return localList;
};

