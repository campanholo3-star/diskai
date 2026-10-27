/**
 * Utilitários para compressão e tratamento de avatares e mídias de perfil
 */

export const DEFAULT_AVATAR_URLS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
];

export const DEFAULT_PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

/**
 * Normaliza identificadores de usuário e email para busca consistente no Vault
 */
export const normalizeIdentity = (idOrEmail?: string | null): string => {
  if (!idOrEmail) return '';
  const clean = idOrEmail.trim().toLowerCase();
  if (clean === 'campanholo32' || clean === 'campanholo32gmail.com') {
    return 'campanholo32@gmail.com';
  }
  return clean;
};

/**
 * Salva a foto de perfil em múltiplas chaves permanentes e redundantes no LocalStorage (Avatar Vault).
 * Garante que mesmo após deslogar, fechar o navegador ou reiniciar a sessão,
 * a foto nunca se perca nem volte para a foto padrão.
 */
export const saveAvatarToVault = (userId?: string | null, email?: string | null, avatarUrl?: string | null): void => {
  if (!avatarUrl || typeof avatarUrl !== 'string' || !avatarUrl.trim()) return;
  const cleanAvatar = avatarUrl.trim();

  try {
    const cleanId = userId?.trim();
    const cleanEmail = email ? normalizeIdentity(email) : '';

    const isAdmin = cleanId === 'admin-campanholo32' ||
      cleanId === 'user-me' ||
      cleanEmail === 'campanholo32@gmail.com';

    // 1. Chaves pelo ID do usuário
    if (cleanId) {
      localStorage.setItem(`diskai_avatar_vault_id_${cleanId}`, cleanAvatar);
      localStorage.setItem(`diskai_avatar_vault_${cleanId}`, cleanAvatar);
    }

    // 2. Chaves pelo Email do usuário
    if (cleanEmail) {
      localStorage.setItem(`diskai_avatar_vault_email_${cleanEmail}`, cleanAvatar);
    }

    // 3. Chaves globais e espelhadas para Administrador da plataforma
    if (isAdmin) {
      localStorage.setItem('diskai_avatar_vault_admin', cleanAvatar);
      localStorage.setItem('diskai_avatar_vault_admin-campanholo32', cleanAvatar);
      localStorage.setItem('diskai_avatar_vault_user-me', cleanAvatar);
      localStorage.setItem('diskai_avatar_vault_email_campanholo32@gmail.com', cleanAvatar);
    }

    // 4. Último avatar salvo globalmente (backup de segurança)
    localStorage.setItem('diskai_last_saved_avatar', cleanAvatar);

    // 5. Atualizar no mapa consolidado
    const rawMap = localStorage.getItem('diskai_avatar_vault_map');
    const vaultMap = rawMap ? JSON.parse(rawMap) : {};
    if (cleanId) vaultMap[cleanId] = cleanAvatar;
    if (cleanEmail) vaultMap[cleanEmail] = cleanAvatar;
    if (isAdmin) {
      vaultMap['admin'] = cleanAvatar;
      vaultMap['admin-campanholo32'] = cleanAvatar;
      vaultMap['user-me'] = cleanAvatar;
      vaultMap['campanholo32@gmail.com'] = cleanAvatar;
    }
    localStorage.setItem('diskai_avatar_vault_map', JSON.stringify(vaultMap));
  } catch (err) {
    console.warn('[Diskai AvatarVault] Aviso ao salvar avatar:', err);
  }
};

/**
 * Recupera o avatar mais recente e confiável do usuário a partir do Vault resiliente.
 */
export const getAvatarFromVault = (userId?: string | null, email?: string | null): string | null => {
  try {
    const cleanId = userId?.trim();
    const cleanEmail = email ? normalizeIdentity(email) : '';

    const isAdmin = cleanId === 'admin-campanholo32' ||
      cleanId === 'user-me' ||
      cleanEmail === 'campanholo32@gmail.com' ||
      cleanEmail === 'campanholo32';

    // 1. Verificar Vault direto por ID
    if (cleanId) {
      const fromId = localStorage.getItem(`diskai_avatar_vault_id_${cleanId}`) ||
        localStorage.getItem(`diskai_avatar_vault_${cleanId}`);
      if (fromId && fromId.trim()) return fromId.trim();
    }

    // 2. Verificar Vault por Email
    if (cleanEmail) {
      const fromEmail = localStorage.getItem(`diskai_avatar_vault_email_${cleanEmail}`);
      if (fromEmail && fromEmail.trim()) return fromEmail.trim();
    }

    // 3. Se for Admin, checar as chaves do Administrador
    if (isAdmin) {
      const adminKeys = [
        'diskai_avatar_vault_admin',
        'diskai_avatar_vault_admin-campanholo32',
        'diskai_avatar_vault_user-me',
        'diskai_avatar_vault_email_campanholo32@gmail.com'
      ];
      for (const k of adminKeys) {
        const val = localStorage.getItem(k);
        if (val && val.trim()) return val.trim();
      }
    }

    // 4. Checar mapa consolidado do Vault
    const rawMap = localStorage.getItem('diskai_avatar_vault_map');
    if (rawMap) {
      try {
        const vaultMap = JSON.parse(rawMap);
        if (cleanId && vaultMap[cleanId]) return vaultMap[cleanId];
        if (cleanEmail && vaultMap[cleanEmail]) return vaultMap[cleanEmail];
        if (isAdmin) {
          if (vaultMap['admin-campanholo32']) return vaultMap['admin-campanholo32'];
          if (vaultMap['admin']) return vaultMap['admin'];
          if (vaultMap['user-me']) return vaultMap['user-me'];
          if (vaultMap['campanholo32@gmail.com']) return vaultMap['campanholo32@gmail.com'];
        }
      } catch {}
    }

    // 5. Checar perfil local armazenado por ID
    if (cleanId) {
      const profStr = localStorage.getItem(`diskai_user_profile_${cleanId}`);
      if (profStr) {
        try {
          const prof = JSON.parse(profStr);
          if (prof.avatar && typeof prof.avatar === 'string' && prof.avatar.trim()) {
            return prof.avatar.trim();
          }
        } catch {}
      }
    }

    // 6. Se for Admin, checar perfis alternativos locais
    if (isAdmin) {
      for (const k of ['diskai_user_profile_admin-campanholo32', 'diskai_user_profile_user-me']) {
        const profStr = localStorage.getItem(k);
        if (profStr) {
          try {
            const prof = JSON.parse(profStr);
            if (prof.avatar && typeof prof.avatar === 'string' && prof.avatar.trim()) {
              return prof.avatar.trim();
            }
          } catch {}
        }
      }
    }

    // 7. Checar participantes locais
    const partsStr = localStorage.getItem('diskai_participants');
    if (partsStr) {
      try {
        const parts = JSON.parse(partsStr);
        if (Array.isArray(parts)) {
          const match = parts.find((p: any) =>
            (cleanId && p.id === cleanId) ||
            (cleanEmail && normalizeIdentity(p.email) === cleanEmail) ||
            (isAdmin && (p.id === 'admin-campanholo32' || p.id === 'user-me' || p.email?.includes('campanholo32')))
          );
          if (match && match.avatar && typeof match.avatar === 'string' && match.avatar.trim()) {
            return match.avatar.trim();
          }
        }
      } catch {}
    }

    // 8. Se for Admin e nenhum avatar foi encontrado nas chaves acima, checar último avatar salvo
    if (isAdmin) {
      const lastSaved = localStorage.getItem('diskai_last_saved_avatar');
      if (lastSaved && lastSaved.trim()) return lastSaved.trim();
    }
  } catch (err) {
    console.warn('[Diskai AvatarVault] Aviso ao recuperar avatar:', err);
  }

  return null;
};

/**
 * Retorna true se a URL fornecida for uma foto customizada salva pelo usuário (e não uma das fotos padrão)
 */
export const isCustomAvatar = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  const clean = url.trim();
  // Se for Data URL (foto carregada do computador) é sempre customizada
  if (clean.startsWith('data:image/')) return true;
  // Se for link do Supabase Storage ou URL externa própria é customizada
  if (clean.includes('supabase.co') || clean.includes('supabase.in') || clean.includes('/storage/')) return true;
  // Verifica se coincide com alguma das fotos de demonstração do Unsplash padrão
  return !DEFAULT_AVATAR_URLS.some(def => clean.includes(def.split('?')[0]));
};

/**
 * Comprime uma foto de avatar para no máximo 256x256 e comprime em WebP/JPEG com qualidade balanceada,
 * gerando um arquivo minúsculo (~15KB a 25KB) que nunca estoura o localStorage ou o banco de dados.
 */
export const compressAvatarImage = (file: File, maxDim = 256, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('O arquivo selecionado não é uma imagem válida.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo da imagem.'));
    reader.onload = (e) => {
      const src = e.target?.result;
      if (typeof src !== 'string') {
        return reject(new Error('Falha ao processar arquivo.'));
      }

      const img = new window.Image();
      img.onerror = () => reject(new Error('Erro ao decodificar imagem.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Se a imagem for muito grande, redimensiona mantendo proporção
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(src);
          }

          // Qualidade de renderização alta
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Tentar WebP primeiro (melhor compressão)
          let output = canvas.toDataURL('image/webp', quality);
          if (!output.startsWith('data:image/webp')) {
            output = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(output);
        } catch {
          // Fallback seguro para o src original se o canvas falhar
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
};
