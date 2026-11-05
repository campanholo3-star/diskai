/**
 * Flags de Ativação do Sistema de Vídeos Virais v3
 *
 * Controla a ativação estrita da v3 sem afetar a estabilidade do fluxo legado v2.
 * Ativação via variável de ambiente: VITE_VIRAL_V3="true"
 */

export function isViralV3Enabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 1. Variável de build/ambiente Vite
  const envVal = (import.meta as any)?.env?.VITE_VIRAL_V3;
  if (envVal === 'true' || envVal === '1' || envVal === true) {
    return true;
  }

  // 2. Opção de override via sessionStorage para homologação segura
  try {
    const sessionVal = sessionStorage.getItem('diskai_viral_v3_override');
    if (sessionVal === 'true') return true;
    if (sessionVal === 'false') return false;
  } catch {}

  return false;
}

export function setViralV3SessionOverride(enabled: boolean | null): void {
  try {
    if (enabled === null) {
      sessionStorage.removeItem('diskai_viral_v3_override');
    } else {
      sessionStorage.setItem('diskai_viral_v3_override', String(enabled));
    }
  } catch {}
}
