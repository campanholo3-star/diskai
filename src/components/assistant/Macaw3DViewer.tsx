import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AraraGesture =
  | 'ARARA_IDLE_LOOP'
  | 'ARARA_WAVE_WING'
  | 'ARARA_OPEN_WINGS'
  | 'ARARA_NOD_YES'
  | 'ARARA_SHAKE_NO'
  | 'ARARA_THINKING'
  | 'ARARA_ALERT_REMINDER'
  | 'ARARA_MEETING_REMINDER'
  | 'ARARA_SUMMARY_READY'
  | 'ARARA_PRESENT_MESSAGE'
  | 'ARARA_PRESENT_LEFT'
  | 'ARARA_PRESENT_RIGHT'
  | 'ARARA_UPLOAD_READY'
  | 'ARARA_SUCCESS'
  | 'ARARA_RETURN_NEUTRAL';

const ARARA_LOOPING_GESTURES: Set<string> = new Set(['ARARA_IDLE_LOOP']);

interface Macaw3DViewerProps {
  gesture?: AraraGesture | string;
  gestureKey?: number;
  gestureQueue?: Array<AraraGesture | string>;
  className?: string;
  width?: number | string;
  height?: number | string;
  interactive?: boolean;
  autonomousBehaviors?: boolean;
  cameraDistance?: number;
  cameraHeight?: number;
  targetY?: number;
  initialRotationY?: number;
  onClick?: () => void;
  onGestureEnd?: (completedGesture: string) => void;
}

export const Macaw3DViewer: React.FC<Macaw3DViewerProps> = ({
  gesture = 'ARARA_IDLE_LOOP',
  gestureKey = 0,
  gestureQueue,
  className = '',
  width = '100%',
  height = '100%',
  interactive = false, // Não acompanha cursor - Arara autônoma e interativa
  autonomousBehaviors = true,
  cameraDistance = 7.4,
  cameraHeight = 0.85,
  targetY = 0.85,
  initialRotationY = -0.2,
  onClick,
  onGestureEnd
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsMapRef = useRef<Record<string, THREE.AnimationAction>>({});
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const currentGestureRef = useRef<string>(gesture);
  const queueRef = useRef<string[]>([]);
  const modelRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Armazena referências mutáveis para evitar re-render/descarte do Three.js (elimina piscadas/sumiço)
  const onGestureEndRef = useRef(onGestureEnd);
  useEffect(() => {
    onGestureEndRef.current = onGestureEnd;
  }, [onGestureEnd]);

  const autonomousBehaviorsRef = useRef(autonomousBehaviors);
  useEffect(() => {
    autonomousBehaviorsRef.current = autonomousBehaviors;
  }, [autonomousBehaviors]);

  // Referências para ossos de controle anatômico da Arara
  const headBoneRef = useRef<THREE.Bone | null>(null);
  const neckBoneRef = useRef<THREE.Bone | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const watchdogTimeoutRef = useRef<any>(null);
  const lastGestureTimeRef = useRef<number>(Date.now());

  // Helper para executar gestos com transições suaves e watchdog anti-congelamento
  const playGesture = useCallback((gestureName: string) => {
    const action = actionsMapRef.current[gestureName];
    if (!action) {
      currentGestureRef.current = gestureName;
      return;
    }

    // Limpar watchdog anterior
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = null;
    }

    const prevAction = currentActionRef.current;
    const isLoop = ARARA_LOOPING_GESTURES.has(gestureName);

    // Suave transição entre gestos sem congelamento
    action.stopFading();
    action.reset();
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);

    if (prevAction && prevAction !== action) {
      prevAction.crossFadeTo(action, 0.25, true);
    } else {
      action.fadeIn(0.2);
    }

    if (isLoop) {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    } else {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
    }

    action.play();
    currentActionRef.current = action;
    currentGestureRef.current = gestureName;
    lastGestureTimeRef.current = Date.now();

    // Watchdog de segurança: garante 100% que gestos com asas abertas retornam à postura neutra fechada
    if (!isLoop) {
      const clipDuration = action.getClip()?.duration || 1.8;
      const watchdogDelay = Math.max(clipDuration * 1000 + 100, 800);
      watchdogTimeoutRef.current = setTimeout(() => {
        if (currentGestureRef.current === gestureName) {
          if (onGestureEndRef.current) {
            onGestureEndRef.current(gestureName);
          }
          if (queueRef.current.length > 0) {
            const nextGesture = queueRef.current.shift()!;
            playGesture(nextGesture);
          } else if (gestureName !== 'ARARA_IDLE_LOOP' && gestureName !== 'ARARA_RETURN_NEUTRAL') {
            queueRef.current = ['ARARA_IDLE_LOOP'];
            playGesture('ARARA_RETURN_NEUTRAL');
          } else {
            playGesture('ARARA_IDLE_LOOP');
          }
        }
      }, watchdogDelay);
    }
  }, []);

  // Atualizar fila interna e executar quando o gesto ou o contador mudar
  useEffect(() => {
    if (gestureQueue && gestureQueue.length > 0) {
      queueRef.current = [...gestureQueue];
      const next = queueRef.current.shift();
      if (next) {
        playGesture(next);
      }
    } else if (gesture && (gesture !== 'ARARA_IDLE_LOOP' || currentGestureRef.current !== 'ARARA_IDLE_LOOP')) {
      playGesture(gesture);
    }
  }, [gesture, gestureKey, gestureQueue, playGesture]);

  // Rotina autônoma viva de gestos dinâmicos contínuos (arara sempre em movimento)
  useEffect(() => {
    if (!autonomousBehaviors) return;

    let timeoutId: any;

    const scheduleNext = () => {
      // Intervalo vivo e frequente entre 2.5s e 4.5s
      const delay = 2500 + Math.random() * 2000;
      timeoutId = setTimeout(() => {
        const now = Date.now();
        const isIdle = currentGestureRef.current === 'ARARA_IDLE_LOOP';
        const isStuck = !isIdle && (now - lastGestureTimeRef.current > 2500);

        if (isStuck) {
          // Auto-cura: se passou mais de 2.5s sem fechar asas, força retorno ao neutro
          queueRef.current = ['ARARA_IDLE_LOOP'];
          playGesture('ARARA_RETURN_NEUTRAL');
        } else if (isIdle && queueRef.current.length === 0) {
          const idleRepertoire: AraraGesture[] = [
            'ARARA_WAVE_WING',
            'ARARA_OPEN_WINGS',
            'ARARA_NOD_YES',
            'ARARA_THINKING',
            'ARARA_ALERT_REMINDER'
          ];
          const nextG = idleRepertoire[Math.floor(Math.random() * idleRepertoire.length)];
          // Sempre encadeia o fechamento de asas após abrir ou gesticular
          queueRef.current = ['ARARA_RETURN_NEUTRAL', 'ARARA_IDLE_LOOP'];
          playGesture(nextG);
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      clearTimeout(timeoutId);
      if (watchdogTimeoutRef.current) {
        clearTimeout(watchdogTimeoutRef.current);
      }
    };
  }, [autonomousBehaviors, playGesture]);

  // Atualizações dinâmicas de câmera sem remontar a cena WebGL
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, cameraHeight, cameraDistance);
      cameraRef.current.lookAt(0, targetY, 0);
    }
  }, [cameraDistance, cameraHeight, targetY]);

  // Atualizações dinâmicas de rotação sem remontar a cena WebGL
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.rotation.set(0, initialRotationY, 0);
    }
  }, [initialRotationY]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;

    // 1. Scene, Camera, Renderer (100% transparente)
    const scene = new THREE.Scene();

    const initialWidth = container.clientWidth || 170;
    const initialHeight = container.clientHeight || 170;

    const camera = new THREE.PerspectiveCamera(36, initialWidth / initialHeight, 0.1, 50);
    camera.position.set(0, cameraHeight, cameraDistance);
    camera.lookAt(0, targetY, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.background = 'transparent';
    renderer.domElement.style.outline = 'none';

    container.appendChild(renderer.domElement);

    // 2. Iluminação de estúdio para destacar as penas e óculos
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    scene.add(ambientLight);

    // Luz principal frontal/direita (Key Light)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.6);
    keyLight.position.set(2, 3, 2.8);
    scene.add(keyLight);

    // Luz de preenchimento azulada (Fill Light)
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 1.7);
    fillLight.position.set(-2.5, 1.8, 2);
    scene.add(fillLight);

    // Luz de recorte dourada (Rim Light - destaca contornos 3D)
    const rimLight = new THREE.DirectionalLight(0xfacc15, 2.5);
    rimLight.position.set(0, 3.5, -2.5);
    scene.add(rimLight);

    // 3. Carregar modelo otimizado com todas as 15 ações
    const loader = new GLTFLoader();

    loader.load(
      '/arara_3d.glb',
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;

        // Posição base e leve rotação em direção ao usuário
        model.position.set(0, 0, 0);
        model.rotation.set(0, initialRotationY, 0);

        // Mapear ossos para movimentos anatômicos realistas
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.roughness = Math.min(mat.roughness || 0.45, 0.6);
              mat.metalness = Math.max(mat.metalness || 0, 0.12);
              mat.needsUpdate = true;
            }
          }
          if ((child as THREE.Bone).isBone) {
            const bone = child as THREE.Bone;
            if (bone.name === 'Bone_022') headBoneRef.current = bone;
            if (bone.name === 'Bone_023') neckBoneRef.current = bone;
          }
        });

        // Configurar Mixer de Animação
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;

        const map: Record<string, THREE.AnimationAction> = {};
        gltf.animations.forEach((clip) => {
          map[clip.name] = mixer.clipAction(clip);
        });
        actionsMapRef.current = map;

        // Listener para encadeamento de gestos e retorno ao idle ativo
        mixer.addEventListener('finished', (e: any) => {
          const finishedAction = e.action;
          const finishedName = finishedAction.getClip().name;

          if (watchdogTimeoutRef.current) {
            clearTimeout(watchdogTimeoutRef.current);
            watchdogTimeoutRef.current = null;
          }

          if (onGestureEndRef.current) {
            onGestureEndRef.current(finishedName);
          }

          if (queueRef.current.length > 0) {
            const nextGesture = queueRef.current.shift()!;
            playGesture(nextGesture);
          } else if (finishedName !== 'ARARA_IDLE_LOOP' && finishedName !== 'ARARA_RETURN_NEUTRAL') {
            queueRef.current = ['ARARA_IDLE_LOOP'];
            playGesture('ARARA_RETURN_NEUTRAL');
          } else {
            playGesture('ARARA_IDLE_LOOP');
          }
        });

        scene.add(model);
        setIsLoading(false);

        // Iniciar no gesto solicitado ou no idle
        const startGesture = currentGestureRef.current || 'ARARA_IDLE_LOOP';
        playGesture(startGesture);
      },
      undefined,
      (err) => {
        console.error('[Arara 3D] Erro ao carregar /arara_3d.glb:', err);
        setIsLoading(false);
      }
    );

    // 4. Resize handling com ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Variáveis para olhar para os lados organicamente
    let nextHeadShiftTime = 1.2;
    let targetHeadY = 0;
    let targetHeadZ = 0;
    let targetHeadX = 0;
    let lastTime = performance.now();
    let elapsedTime = 0;

    // 5. Loop de Renderização e Animação Autônoma
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsedTime += delta;

      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      // Comportamentos autônomos contínuos (olha para os lados, caminha, respira)
      if (modelRef.current && autonomousBehaviorsRef.current) {
        // A) "Caminha" e respira - Rítmico balanceio de passos/apoio de pata e leve inclinação de corpo
        const walkSpeed = 2.8;
        const walkPhase = elapsedTime * walkSpeed;
        const bodySwayX = Math.sin(walkPhase) * 0.035;
        const bodyBobY = Math.abs(Math.sin(walkPhase)) * 0.042;
        const bodyRollZ = Math.sin(walkPhase) * 0.035;
        const subtleYaw = initialRotationY + Math.sin(walkPhase * 0.5) * 0.06;

        modelRef.current.position.x = bodySwayX;
        modelRef.current.position.y = bodyBobY;
        modelRef.current.rotation.z = bodyRollZ;
        modelRef.current.rotation.y = subtleYaw;

        // B) "Olha para os lados" - Movimento craniano curioso
        if (elapsedTime > nextHeadShiftTime) {
          nextHeadShiftTime = elapsedTime + 1.2 + Math.random() * 1.6;
          const gazeType = Math.floor(Math.random() * 4);
          if (gazeType === 0) {
            targetHeadY = -0.38;
            targetHeadZ = 0.08;
            targetHeadX = -0.05;
          } else if (gazeType === 1) {
            targetHeadY = 0.35;
            targetHeadZ = -0.06;
            targetHeadX = -0.02;
          } else if (gazeType === 2) {
            targetHeadY = -0.05;
            targetHeadZ = 0.02;
            targetHeadX = 0.12;
          } else {
            targetHeadY = 0;
            targetHeadZ = 0;
            targetHeadX = 0;
          }
        }

        if (headBoneRef.current) {
          headBoneRef.current.rotation.y += (targetHeadY - headBoneRef.current.rotation.y) * 0.14;
          headBoneRef.current.rotation.z += (targetHeadZ - headBoneRef.current.rotation.z) * 0.14;
          headBoneRef.current.rotation.x += (targetHeadX - headBoneRef.current.rotation.x) * 0.14;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }

      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [playGesture]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{ width, height }}
      className={`relative select-none pointer-events-auto ${className}`}
    >
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-opacity">
          <div className="w-6 h-6 rounded-full border-2 border-[#38bdf8] border-t-transparent animate-spin" />
        </div>
      )}

      {/* Sombra de contato no chão para aterrar o objeto 3D flutuante */}
      <div className="absolute bottom-[48px] sm:bottom-[52px] left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-black/35 blur-[2px] pointer-events-none -z-10" />
    </div>
  );
};
