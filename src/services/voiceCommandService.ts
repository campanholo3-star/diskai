/**
 * Módulo de Comando de Voz Nativo - DiskAi
 * Utiliza a Web Speech API (webkitSpeechRecognition / SpeechRecognition) com idioma pt-BR
 * e atalho global Ctrl + Espaço (ou Cmd + Espaço no Mac).
 */

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export type TranscriptCallback = (transcript: string) => void | Promise<void>;

export interface VoiceCommandController {
  isSupported: boolean;
  isListening: () => boolean;
  start: () => void;
  stop: () => void;
  toggleRecording: () => void;
  destroy: () => void;
}

/**
 * Inicializa o reconhecimento de comando de voz nativo com atalho global.
 *
 * @param onTranscriptReady Callback assíncrono chamado quando a transcrição final é capturada
 * @param options Opções adicionais de customização (ex: idioma, feedback visual)
 */
export function initVoiceCommand(
  onTranscriptReady: TranscriptCallback,
  options?: {
    lang?: string;
    micElementId?: string;
    onStateChange?: (isRecording: boolean) => void;
  }
): VoiceCommandController {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      isListening: () => false,
      start: () => {},
      stop: () => {},
      toggleRecording: () => {},
      destroy: () => {}
    };
  }

  const SpeechRecognitionClass =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    console.warn("[DiskAi Voz] Web Speech API não é suportada neste navegador.");
    return {
      isSupported: false,
      isListening: () => false,
      start: () => {},
      stop: () => {},
      toggleRecording: () => {},
      destroy: () => {}
    };
  }

  const targetLang = options?.lang || 'pt-BR';
  const micElementId = options?.micElementId || 'status-mic';

  let recognition: any = null;
  try {
    recognition = new SpeechRecognitionClass();
    recognition.lang = targetLang;
    recognition.continuous = false;
    recognition.interimResults = false;
  } catch (initErr) {
    console.error("[DiskAi Voz] Falha ao instanciar SpeechRecognition:", initErr);
    return {
      isSupported: false,
      isListening: () => false,
      start: () => {},
      stop: () => {},
      toggleRecording: () => {},
      destroy: () => {}
    };
  }

  let isRecording = false;

  // Função interna para atualizar o indicador visual de forma segura
  function updateVisualIndicator(active: boolean) {
    const micIcon = document.getElementById(micElementId);
    if (micIcon) {
      micIcon.classList.toggle('gravando', active);
      micIcon.setAttribute('aria-label', active ? 'Gravando áudio...' : 'Microfone em espera');
    }

    // Dispara evento customizado para overlays ou componentes reativos
    try {
      window.dispatchEvent(
        new CustomEvent('diskai-voice-status', {
          detail: { isRecording: active }
        })
      );
    } catch (_) {}

    if (typeof options?.onStateChange === 'function') {
      try {
        options.onStateChange(active);
      } catch (_) {}
    }
  }

  function resetState() {
    isRecording = false;
    updateVisualIndicator(false);
  }

  // Trava de segurança contra estado de corrida (Race Condition)
  function toggleRecording() {
    try {
      if (!isRecording) {
        recognition.start();
      } else {
        recognition.stop();
      }
    } catch (error) {
      console.warn("[DiskAi Voz] Aviso de alternância de voz (já ativo/inativo):", error);
      resetState();
    }
  }

  function startRecording() {
    try {
      if (!isRecording) {
        recognition.start();
      }
    } catch (error) {
      console.warn("[DiskAi Voz] Erro ao iniciar reconhecimento:", error);
      resetState();
    }
  }

  function stopRecording() {
    try {
      if (isRecording) {
        recognition.stop();
      }
    } catch (error) {
      console.warn("[DiskAi Voz] Erro ao parar reconhecimento:", error);
      resetState();
    }
  }

  // Evento disparado quando o reconhecimento inicia com sucesso
  recognition.onstart = () => {
    isRecording = true;
    updateVisualIndicator(true);
    console.log("🎤 [DiskAi Voz] Escutando... Fale agora ou pressione Ctrl + Espaço para finalizar.");
  };

  // Atalho de Teclado Global (Ctrl + Espaço ou Cmd + Espaço no Mac)
  function handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
      // Evita conflito com elementos focados ou scroll da página
      event.preventDefault();
      toggleRecording();
    }
  }

  // Permite que botões de UI acionem o mesmo fluxo através de CustomEvent
  function handleToggleEvent() {
    toggleRecording();
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('diskai-toggle-voice', handleToggleEvent);

  // Captura o resultado da transcrição final
  recognition.onresult = (event: any) => {
    const transcript = event.results?.[0]?.[0]?.transcript;
    if (transcript && typeof onTranscriptReady === 'function') {
      console.log("✨ [DiskAi Voz] Texto reconhecido:", transcript);
      try {
        onTranscriptReady(transcript.trim());
      } catch (cbErr) {
        console.error("[DiskAi Voz] Erro no callback onTranscriptReady:", cbErr);
      }
    }
  };

  // Eventos de encerramento de fala
  recognition.onspeechend = () => {
    try {
      recognition.stop();
    } catch (_) {}
  };

  recognition.onerror = (event: any) => {
    console.error("❌ [DiskAi Voz] Erro no reconhecimento de voz:", event.error);

    if (event.error === 'not-allowed') {
      alert("A permissão do microfone foi negada. Verifique as configurações do seu navegador para usar o comando de voz.");
    }

    resetState();
  };

  recognition.onend = () => {
    resetState();
    console.log("⏹️ [DiskAi Voz] Gravação finalizada.");
  };

  // Retorna método de controle e limpeza (Cleanup) para desmontagem
  return {
    isSupported: true,
    isListening: () => isRecording,
    start: startRecording,
    stop: stopRecording,
    toggleRecording,
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('diskai-toggle-voice', handleToggleEvent);
      try {
        recognition.abort();
      } catch (_) {}
      resetState();
    }
  };
}

