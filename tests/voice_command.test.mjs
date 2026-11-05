import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { initVoiceCommand } from '../src/services/voiceCommandService.ts';

describe('Módulo de Comando de Voz Nativo (Web Speech API)', () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
    delete global.document;
  });

  test('1. Retorna isSupported: false quando a Web Speech API não existe no ambiente', () => {
    global.window = {};
    const controller = initVoiceCommand(() => {});
    assert.strictEqual(controller.isSupported, false);
    assert.strictEqual(controller.isListening(), false);
  });

  test('2. Inicializa com pt-BR e interimResults: false quando a API está disponível', () => {
    let instanceCreated = null;

    class MockSpeechRecognition {
      constructor() {
        this.lang = '';
        this.continuous = true;
        this.interimResults = true;
        instanceCreated = this;
      }
      start() {}
      stop() {}
      abort() {}
    }

    global.window = {
      webkitSpeechRecognition: MockSpeechRecognition,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    };
    global.document = {
      getElementById: () => null
    };

    const controller = initVoiceCommand(() => {});
    assert.strictEqual(controller.isSupported, true);
    assert.ok(instanceCreated !== null);
    assert.strictEqual(instanceCreated.lang, 'pt-BR');
    assert.strictEqual(instanceCreated.continuous, false);
    assert.strictEqual(instanceCreated.interimResults, false);

    controller.destroy();
  });

  test('3. Atualiza indicador visual (#status-mic) ao iniciar e finalizar gravação', () => {
    let mockInstance = null;
    let micClassList = new Set();
    let micAriaLabel = '';

    class MockSpeechRecognition {
      constructor() {
        mockInstance = this;
      }
      start() {}
      stop() {}
      abort() {}
    }

    const mockMicElement = {
      classList: {
        toggle: (className, active) => {
          if (active) micClassList.add(className);
          else micClassList.delete(className);
        }
      },
      setAttribute: (name, value) => {
        if (name === 'aria-label') micAriaLabel = value;
      }
    };

    global.window = {
      SpeechRecognition: MockSpeechRecognition,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    };
    global.document = {
      getElementById: (id) => id === 'status-mic' ? mockMicElement : null
    };

    const controller = initVoiceCommand(() => {});

    // Simula disparo de onstart
    mockInstance.onstart();
    assert.strictEqual(controller.isListening(), true);
    assert.ok(micClassList.has('gravando'));
    assert.strictEqual(micAriaLabel, 'Gravando áudio...');

    // Simula disparo de onend
    mockInstance.onend();
    assert.strictEqual(controller.isListening(), false);
    assert.ok(!micClassList.has('gravando'));
    assert.strictEqual(micAriaLabel, 'Microfone em espera');

    controller.destroy();
  });

  test('4. Captura transcrição final via onresult e chama callback', () => {
    let mockInstance = null;
    let receivedTranscript = null;

    class MockSpeechRecognition {
      constructor() {
        mockInstance = this;
      }
      start() {}
      stop() {}
      abort() {}
    }

    global.window = {
      SpeechRecognition: MockSpeechRecognition,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    };
    global.document = {
      getElementById: () => null
    };

    const controller = initVoiceCommand((transcript) => {
      receivedTranscript = transcript;
    });

    mockInstance.onresult({
      results: [
        [
          { transcript: ' criar tarefa para amanhã às 15 horas ' }
        ]
      ]
    });

    assert.strictEqual(receivedTranscript, 'criar tarefa para amanhã às 15 horas');
    controller.destroy();
  });

  test('5. Atalho Ctrl + Space previne scroll e alterna gravação', () => {
    let mockInstance = null;
    let registeredListeners = {};
    let startCalled = 0;
    let stopCalled = 0;

    class MockSpeechRecognition {
      constructor() {
        mockInstance = this;
      }
      start() {
        startCalled++;
        this.onstart?.();
      }
      stop() {
        stopCalled++;
        this.onend?.();
      }
      abort() {}
    }

    global.window = {
      SpeechRecognition: MockSpeechRecognition,
      addEventListener: (type, handler) => {
        registeredListeners[type] = handler;
      },
      removeEventListener: (type) => {
        delete registeredListeners[type];
      },
      dispatchEvent: () => true
    };
    global.document = {
      getElementById: () => null
    };

    const controller = initVoiceCommand(() => {});

    let defaultPrevented = false;
    const fakeEvent = {
      ctrlKey: true,
      metaKey: false,
      code: 'Space',
      preventDefault: () => {
        defaultPrevented = true;
      }
    };

    // 1º pressionamento: deve iniciar
    registeredListeners['keydown'](fakeEvent);
    assert.strictEqual(defaultPrevented, true);
    assert.strictEqual(startCalled, 1);
    assert.strictEqual(controller.isListening(), true);

    // 2º pressionamento: deve parar
    defaultPrevented = false;
    registeredListeners['keydown'](fakeEvent);
    assert.strictEqual(defaultPrevented, true);
    assert.strictEqual(stopCalled, 1);
    assert.strictEqual(controller.isListening(), false);

    controller.destroy();
  });
});

