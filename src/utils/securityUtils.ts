/**
 * Utilitários de Segurança e Sanitização - Plataforma DiskAI
 * Proteção contra XSS, injeção de esquemas maliciosos e validação de payloads.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Sanitiza links externos garantindo que apenas protocolos seguros (http, https, mailto) sejam navegáveis.
 * Bloqueia esquemas como javascript:, data:, vbscript: e caracteres de controle.
 */
export const sanitizeExternalUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();

  // Bloquear sequências de bypass e caracteres de controle
  if (/[\u0000-\u001F\u007F-\u009F]/.test(trimmed)) {
    return '#';
  }

  // Tratamento específico para e-mails (mailto:)
  if (trimmed.startsWith('mailto:')) {
    const emailPart = trimmed.slice(7).trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPart)) {
      return `mailto:${emailPart}`;
    }
    return '#';
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return '#';
    }
    return parsed.href;
  } catch {
    // Se não for uma URL completa válida, verificar se é caminho relativo seguro iniciado por /
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
      return trimmed;
    }
    return '#';
  }
};

/**
 * Sanitiza texto de entrada de mensagens e formulários
 * Remove caracteres nulos (\0) e aplica limite de tamanho defensivo.
 */
export const sanitizeInputText = (input: string | null | undefined, maxLength: number = 4000): string => {
  if (!input || typeof input !== 'string') return '';
  // Remover caracteres de controle nulos e normalizar quebras de linha
  const clean = input
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .trim();

  return clean.slice(0, maxLength);
};

/**
 * Valida se um nome de arquivo para upload é seguro (evita Directory Traversal e injeção de extensões perigosas)
 */
export const isSafeFileName = (fileName: string): boolean => {
  if (!fileName || typeof fileName !== 'string') return false;
  // Bloquear path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }
  // Bloquear executáveis ou scripts diretos
  const dangerousExtensions = /\.(exe|bat|cmd|sh|vbs|msi|dll|ps1|scr)$/i;
  return !dangerousExtensions.test(fileName);
};
