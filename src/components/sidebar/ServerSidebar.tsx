import React, { useState } from 'react';
import { Plus, Compass, Volume2, Sparkles, MessageSquare, GraduationCap, Settings, Camera, UserPlus, Trash2 } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';

export const ServerSidebar: React.FC = () => {
  const {
    servers,
    activeServer,
    setActiveServerId,
    setActiveChannelId,
    setCreateServerModalOpen,
    setExploreModalOpen,
    mainView,
    setMainView,
    activeDmUserId,
    isInCall,
    isRecording,
    setTutorialOpen,
    friends,
    setServerManagementModalOpen,
    setServerManagementTab,
    deleteServer,
    currentUser
  } = useDiskai();

  const [hoveredServerId, setHoveredServerId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; serverId: string } | null>(null);

  const handleSelectHomeDirect = () => {
    setMainView('direct');
  };

  const handleSelectServer = (serverId: string) => {
    setMainView('server');
    setActiveServerId(serverId);
    const targetServer = servers.find(s => s.id === serverId);
    if (targetServer) {
      const firstChannel = targetServer.categories[0]?.channels[0];
      if (firstChannel) {
        setActiveChannelId(firstChannel.id);
      }
    }
  };

  const totalDmUnread = friends.reduce((acc, f) => acc + (f.unreadCount || 0), 0);

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 select-none flex-shrink-0 z-20 space-y-2 h-full border-r border-[#3e4047] shadow-sm">
      {/* Home / Direct Messages / Diskai Logo */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Active Pill Indicator */}
        <div
          className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
            mainView === 'direct' ? 'h-10' : 'h-0 group-hover:h-5'
          }`}
        />
        <button
          onClick={handleSelectHomeDirect}
          onMouseEnter={() => setHoveredServerId('home')}
          onMouseLeave={() => setHoveredServerId(null)}
          className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center relative ${
            mainView === 'direct'
              ? 'rounded-[16px] shadow-lg shadow-[#00b4d8]/40 ring-2 ring-[#00b4d8]'
              : 'hover:rounded-[16px] opacity-90 hover:opacity-100'
          }`}
        >
          {/* Inner Image Container (prevent clipping of notification badge) */}
          <div className="w-full h-full rounded-[inherit] overflow-hidden flex items-center justify-center">
            <img
              src="/app-icon.png"
              alt="Diskai"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>

          {isRecording && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#f23f43] rounded-full ring-2 ring-[#1e1f22] animate-ping z-20" />
          )}

          {/* Visualmente Perfeita Notificação no Ícone Superior */}
          {totalDmUnread > 0 && mainView !== 'direct' && (
            <div className="absolute -top-1.5 -right-1.5 z-30 pointer-events-none flex items-center justify-center">
              <span className="bg-[#f23f43] text-white text-[11px] font-black min-w-[20px] h-5 px-1.5 rounded-full ring-4 ring-[#1e1f22] flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-110">
                {totalDmUnread}
              </span>
            </div>
          )}
        </button>

        {/* Tooltip */}
        {hoveredServerId === 'home' && (
          <div className="absolute left-[80px] bg-[#111214] text-[#dbdee1] text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap shadow-xl z-50 pointer-events-none">
            Mensagens Diretas (Direct)
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-8 h-[2px] bg-[#35363c] rounded my-1" />

      {/* Server List */}
      <div className="flex-1 w-full space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col items-center">
        {servers.map(server => {
          const isActive = mainView === 'server' && activeServer.id === server.id;
          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Active Pill Indicator */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-0 group-hover:h-5'
                }`}
              />

              <button
                onClick={() => handleSelectServer(server.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleSelectServer(server.id);
                  setContextMenu({ x: e.clientX, y: e.clientY, serverId: server.id });
                }}
                onMouseEnter={() => setHoveredServerId(server.id)}
                onMouseLeave={() => setHoveredServerId(null)}
                className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center font-bold text-sm tracking-wide ${
                  isActive
                    ? 'bg-[#5865F2] rounded-[16px] text-white shadow-md shadow-[#5865F2]/20'
                    : 'bg-[#313338] hover:bg-[#5865F2] text-[#dbdee1] hover:text-white'
                }`}
              >
                {server.icon ? (
                  <img
                    src={server.icon}
                    alt={server.name}
                    className={`w-full h-full object-cover transition-all duration-200 ${
                      isActive ? 'rounded-[16px]' : 'rounded-[24px] group-hover:rounded-[16px]'
                    }`}
                  />
                ) : (
                  <span>{server.acronym}</span>
                )}
              </button>

              {/* Call indicator on server icon */}
              {isInCall && activeServer.id === server.id && mainView === 'server' && (
                <div className="absolute bottom-0 right-2 w-4 h-4 bg-[#23a55a] rounded-full ring-2 ring-[#1e1f22] flex items-center justify-center">
                  <Volume2 className="w-2.5 h-2.5 text-white animate-pulse" />
                </div>
              )}

              {/* Tooltip */}
              {hoveredServerId === server.id && (
                <div className="absolute left-[80px] bg-[#111214] text-[#dbdee1] text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap shadow-xl z-50 pointer-events-none">
                  {server.name}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Server Button */}
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={() => setCreateServerModalOpen(true)}
            onMouseEnter={() => setHoveredServerId('add')}
            onMouseLeave={() => setHoveredServerId(null)}
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-gradient-to-br from-emerald-500/10 to-[#23a55a]/20 hover:from-[#23a55a] hover:to-emerald-400 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-400/80 backdrop-blur-md transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-emerald-500/30 group active:scale-95"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 group-hover:rotate-90 transition-transform duration-300" />
          </button>
          {hoveredServerId === 'add' && (
            <div className="absolute left-[80px] bg-[#111214]/95 backdrop-blur-md border border-white/[0.08] text-[#dbdee1] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl z-50 pointer-events-none animate-in fade-in">
              Adicionar um Servidor
            </div>
          )}
        </div>

        {/* Explore Servers Button */}
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={() => setExploreModalOpen(true)}
            onMouseEnter={() => setHoveredServerId('explore')}
            onMouseLeave={() => setHoveredServerId(null)}
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-gradient-to-br from-[#5865F2]/10 to-indigo-600/20 hover:from-[#5865F2] hover:to-indigo-500 text-indigo-400 hover:text-white border border-[#5865F2]/30 hover:border-[#5865F2]/80 backdrop-blur-md transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-[#5865F2]/30 group active:scale-95"
          >
            <Compass className="w-5 h-5 text-indigo-400 group-hover:text-white group-hover:rotate-45 transition-transform duration-300" />
          </button>
          {hoveredServerId === 'explore' && (
            <div className="absolute left-[80px] bg-[#111214]/95 backdrop-blur-md border border-white/[0.08] text-[#dbdee1] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl z-50 pointer-events-none animate-in fade-in">
              Explorar Servidores Públicos
            </div>
          )}
        </div>
      </div>

      {/* Tutorial Button at bottom of sidebar */}
      <div className="relative group flex items-center justify-center w-full pt-1">
        <button
          onClick={() => setTutorialOpen(true)}
          onMouseEnter={() => setHoveredServerId('tutorial')}
          onMouseLeave={() => setHoveredServerId(null)}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-gradient-to-br from-amber-500/10 to-yellow-600/20 hover:from-amber-400 hover:to-yellow-500 text-amber-400 hover:text-black border border-amber-500/30 hover:border-amber-400/80 backdrop-blur-md transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-amber-500/30 group active:scale-95"
        >
          <GraduationCap className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
        </button>
        {hoveredServerId === 'tutorial' && (
          <div className="absolute left-[80px] bg-[#111214]/95 backdrop-blur-md border border-white/[0.08] text-[#dbdee1] text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl z-50 pointer-events-none animate-in fade-in">
            🎓 Tutorial do Iniciante
          </div>
        )}
      </div>

      {/* Server Context Menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            className="absolute bg-[#111214] border border-[#2b2d31] rounded-lg p-1.5 shadow-2xl min-w-[210px] z-50 text-xs font-medium space-y-1 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 160),
              left: Math.min(contextMenu.x, window.innerWidth - 230)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 text-[11px] font-bold text-[#949ba4] uppercase tracking-wider border-b border-[#2b2d31]">
              {servers.find(s => s.id === contextMenu.serverId)?.name || 'Servidor'}
            </div>
            <button
              onClick={() => {
                setActiveServerId(contextMenu.serverId);
                setServerManagementTab('edit');
                setServerManagementModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-[#dbdee1] hover:text-white hover:bg-[#5865F2] transition-colors text-left"
            >
              <Camera className="w-4 h-4 text-[#949ba4]" />
              <span>Trocar Foto / Configurações</span>
            </button>
            <button
              onClick={() => {
                setActiveServerId(contextMenu.serverId);
                setServerManagementTab('members');
                setServerManagementModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-[#dbdee1] hover:text-white hover:bg-[#5865F2] transition-colors text-left"
            >
              <UserPlus className="w-4 h-4 text-[#949ba4]" />
              <span>Convidar Pessoas</span>
            </button>
            {contextMenu.serverId !== 'server-diskai' && (
              <div className="pt-1 border-t border-[#2b2d31]">
                <button
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja excluir ou sair deste servidor?')) {
                      deleteServer(contextMenu.serverId);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-[#f23f43] hover:text-white hover:bg-[#da373c] transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Servidor</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
