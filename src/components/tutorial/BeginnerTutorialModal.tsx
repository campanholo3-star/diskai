import React from 'react';
import {
  X,
  Sparkles,
  Users,
  Phone,
  Radio,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Lightbulb,
  Compass,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useDiskai } from '../../context/DiskaiContext';
import { tutorialSteps } from '../../data/initialData';

export const BeginnerTutorialModal: React.FC = () => {
  const {
    tutorialOpen,
    setTutorialOpen,
    tutorialStep,
    setTutorialStep,
    nextTutorialStep,
    prevTutorialStep,
    setMainView,
    setActiveDmUserId,
    joinVoiceChannel,
    activeServer
  } = useDiskai();

  if (!tutorialOpen) return null;

  const currentStep = tutorialSteps.find(s => s.id === tutorialStep) || tutorialSteps[0];

  const handleFinish = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored
    }
    setTutorialOpen(false);
  };

  const handleTryAction = () => {
    if (tutorialStep === 2) {
      // Go to Direct / Friends
      setMainView('direct');
      setActiveDmUserId(null);
      setTutorialOpen(false);
    } else if (tutorialStep === 3 || tutorialStep === 4) {
      // Go to server voice call
      setMainView('server');
      const voiceChannel = activeServer.categories.flatMap(c => c.channels).find(c => c.type === 'voice');
      if (voiceChannel) {
        joinVoiceChannel(voiceChannel);
      }
      setTutorialOpen(false);
    } else {
      nextTutorialStep();
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users':
        return <Users className="w-8 h-8 text-[#5865F2]" />;
      case 'Phone':
        return <Phone className="w-8 h-8 text-[#23a55a]" />;
      case 'Radio':
        return <Radio className="w-8 h-8 text-[#f23f43]" />;
      case 'FileText':
        return <FileText className="w-8 h-8 text-[#f0b232]" />;
      default:
        return <Sparkles className="w-8 h-8 text-[#5865F2]" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-[#dbdee1] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center text-white shadow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Tutorial do Iniciante • Diskai
              </h2>
              <div className="text-[11px] text-[#949ba4]">Passo {tutorialStep} de {tutorialSteps.length}</div>
            </div>
          </div>

          <button
            onClick={() => setTutorialOpen(false)}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#1e1f22] h-1.5 flex">
          {tutorialSteps.map(s => (
            <div
              key={s.id}
              onClick={() => setTutorialStep(s.id)}
              className={`flex-1 cursor-pointer transition-all ${
                s.id <= tutorialStep ? 'bg-[#5865F2]' : 'bg-[#35373c]'
              }`}
            />
          ))}
        </div>

        {/* Main Body */}
        <div className="p-8 space-y-6 flex-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#2b2d31] border border-[#383a40] flex items-center justify-center shadow-lg flex-shrink-0">
              {renderIcon(currentStep.icon)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white leading-tight">{currentStep.title}</h3>
              <p className="text-xs text-[#949ba4] mt-1">Domine todas as funcionalidades em poucos cliques.</p>
            </div>
          </div>

          <p className="text-sm text-[#dbdee1] leading-relaxed bg-[#2b2d31] p-4 rounded-xl border border-[#383a40]">
            {currentStep.description}
          </p>

          {/* Practical Tip Box */}
          <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 p-4 rounded-xl flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-[#5865F2] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#dbdee1] leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Dica de Ouro:</span>
              {currentStep.tip}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-[#2b2d31] border-t border-[#1f2023] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {tutorialSteps.map(s => (
              <button
                key={s.id}
                onClick={() => setTutorialStep(s.id)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  s.id === tutorialStep
                    ? 'w-6 bg-[#5865F2]'
                    : 'bg-[#4e5058] hover:bg-[#80848e]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {tutorialStep > 1 && (
              <button
                onClick={prevTutorialStep}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#dbdee1] hover:bg-[#35373c] transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
            )}

            {tutorialStep < tutorialSteps.length ? (
              <>
                <button
                  onClick={handleTryAction}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#383a40] hover:bg-[#404249] text-white transition-colors"
                >
                  Experimentar Agora
                </button>
                <button
                  onClick={nextTutorialStep}
                  className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow"
                >
                  Próximo <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleFinish}
                className="bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold px-5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-lg hover:scale-105"
              >
                <CheckCircle2 className="w-4 h-4" /> Concluir e Começar!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
