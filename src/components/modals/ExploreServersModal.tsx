import React from 'react';
import { X, Compass, Users, Sparkles, Check } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';

export const ExploreServersModal: React.FC = () => {
  const { exploreModalOpen, setExploreModalOpen, addServer } = useDiskai();

  if (!exploreModalOpen) return null;

  const publicServers = [
    {
      name: 'Comunidade Global de IA & LLMs',
      acronym: 'IA',
      members: 14200,
      desc: 'Discussões sobre Gemini, Claude, OpenAI e agentes autônomos.',
      tag: 'Tecnologia'
    },
    {
      name: 'Startup Hub & Reuniões Ágeis',
      acronym: 'SH',
      members: 8950,
      desc: 'Salas de reuniões com ata automática por IA e alinhamento de OKRs.',
      tag: 'Negócios'
    },
    {
      name: 'Developers Brasil',
      acronym: 'BR',
      members: 32000,
      desc: 'TypeScript, React, Python, Rust e boas práticas de arquitetura.',
      tag: 'Programação'
    }
  ];

  const handleJoin = (srv: typeof publicServers[0]) => {
    addServer(srv.name, srv.acronym);
    setExploreModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#313338] border border-[#3e4047] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-[#dbdee1]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#5865F2]/20 to-[#23a55a]/10 border-b border-[#1f2023] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-lg">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Explorar Comunidades Públicas</h2>
              <p className="text-xs text-[#949ba4]">Descubra servidores com salas prontas para reuniões inteligentes.</p>
            </div>
          </div>
          <button
            onClick={() => setExploreModalOpen(false)}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Cards */}
        <div className="p-6 space-y-3 max-h-[420px] overflow-y-auto no-scrollbar">
          {publicServers.map((srv, i) => (
            <div
              key={i}
              className="bg-[#2b2d31] p-4 rounded-xl border border-[#383a40] hover:border-[#5865F2] flex items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#5865F2] font-bold text-white flex items-center justify-center text-base shadow">
                  {srv.acronym}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{srv.name}</h3>
                    <span className="text-[10px] bg-[#383a40] text-[#949ba4] px-2 py-0.5 rounded font-semibold">
                      {srv.tag}
                    </span>
                  </div>
                  <p className="text-xs text-[#949ba4] mt-0.5">{srv.desc}</p>
                  <div className="flex items-center gap-1 text-[11px] text-[#23a55a] font-semibold mt-1">
                    <Users className="w-3.5 h-3.5" />
                    {srv.members.toLocaleString('pt-BR')} membros
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleJoin(srv)}
                className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex-shrink-0 shadow"
              >
                Entrar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
