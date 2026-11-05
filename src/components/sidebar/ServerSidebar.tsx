import React, { useState } from 'react';
import { Plus, Compass, Volume2, Sparkles, MessageSquare, GraduationCap, Settings, Camera, UserPlus, Trash2, Flame } from 'lucide-react';
import { useDiskai } from '../../context/DiskaiContext';

export const ServerSidebar: React.FC = () => {
  const {
    servers,
    activeServer,
    setActiveServerId,
    setActiveChannelId,
    setCreateServerModalOpen,
    exploreModalOpen,
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
    currentUser,
    theme
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
    <div className={`w-[68px] flex flex-col items-center py-3.5 select-none flex-shrink-0 z-20 space-y-2.5 h-full border-r transition-colors shadow-sm ${
      theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#131519] border-[#22262E]'
    }`}>
      {/* Home / Direct Messages / Diskai Logo */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Active Indicator Bar */}
        <div
          className={`absolute left-0 w-[3px] bg-[#16B99A] rounded-r-full transition-all duration-200 ${
            mainView === 'direct' ? 'h-7' : 'h-0 group-hover:h-3.5'
          }`}
        />
        <button
          onClick={handleSelectHomeDirect}
          onMouseEnter={() => setHoveredServerId('home')}
          onMouseLeave={() => setHoveredServerId(null)}
          className={`w-11 h-11 rounded-xl transition-all duration-200 flex items-center justify-center relative ${
            mainView === 'direct'
              ? 'ring-2 ring-[#16B99A] ring-offset-2 ring-offset-slate-100 dark:ring-offset-[#131519] shadow-lg shadow-[#16B99A]/20'
              : 'border border-black/10 dark:border-white/10 hover:border-[#16B99A]/50 opacity-90 hover:opacity-100 hover:scale-[1.03]'
          }`}
        >
          {/* Inner Image Container (prevent clipping of notification badge) */}
          <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-[#1A1D23]">
            <img
              src="/app-icon.png"
              alt="Diskai"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>

          {isRecording && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#EF4444] rounded-full ring-2 ring-slate-100 dark:ring-[#131519] animate-ping z-20" />
          )}

          {/* Notificação no Ícone Superior */}
          {totalDmUnread > 0 && mainView !== 'direct' && (
            <div className="absolute -top-1.5 -right-1.5 z-30 pointer-events-none flex items-center justify-center">
              <span className="bg-[#16B99A] text-white dark:text-[#131519] text-[11px] font-black min-w-[20px] h-5 px-1.5 rounded-full ring-2 ring-slate-100 dark:ring-[#131519] flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                {totalDmUnread}
              </span>
            </div>
          )}
        </button>

        {/* Tooltip */}
        {hoveredServerId === 'home' && (
          <div className="absolute left-[76px] bg-white dark:bg-[#1A1D23] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#2C313C] text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none animate-in fade-in">
            Mensagens Diretas
          </div>
        )}
      </div>

      {/* Separator */}
      <div className={`w-7 h-[1px] my-0.5 ${theme === 'light' ? 'bg-slate-300' : 'bg-[#22262E]'}`} />

      {/* Server List */}
      <div className="flex-1 w-full space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col items-center">
        {servers.map(server => {
          const isActive = mainView === 'server' && activeServer.id === server.id;
          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Active Indicator Bar */}
              <div
                className={`absolute left-0 w-[3px] bg-[#16B99A] rounded-r-full transition-all duration-200 ${
                  isActive ? 'h-7' : 'h-0 group-hover:h-3.5'
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
                className={`w-11 h-11 rounded-xl transition-all duration-200 flex items-center justify-center font-bold text-xs tracking-wide ${
                  isActive
                    ? 'bg-[#22262E] text-white ring-2 ring-[#16B99A] ring-offset-2 ring-offset-[#131519] shadow-md shadow-[#16B99A]/20'
                    : 'bg-[#1A1D23] hover:bg-[#22262E] text-[#94A3B8] hover:text-white border border-[#2C313C]/60 hover:border-[#16B99A]/40'
                }`}
              >
                {server.icon ? (
                  <img
                    src={server.icon}
                    alt={server.name}
                    className="w-full h-full object-cover rounded-xl transition-all duration-200"
                  />
                ) : (
                  <span>{server.acronym}</span>
                )}
              </button>

              {/* Call indicator on server icon */}
              {isInCall && activeServer.id === server.id && mainView === 'server' && (
                <div className="absolute bottom-0 right-1.5 w-4 h-4 bg-[#10B981] rounded-full ring-2 ring-[#131519] flex items-center justify-center">
                  <Volume2 className="w-2.5 h-2.5 text-white animate-pulse" />
                </div>
              )}

              {/* Tooltip */}
              {hoveredServerId === server.id && (
                <div className="absolute left-[76px] bg-[#1A1D23] text-[#F8FAFC] border border-[#2C313C] text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none animate-in fade-in">
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
            className="w-11 h-11 rounded-xl bg-[#1A1D23] hover:bg-[#16B99A] text-[#16B99A] hover:text-white border border-[#2C313C] hover:border-[#16B99A] transition-all duration-200 flex items-center justify-center shadow-sm group active:scale-95"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 group-hover:rotate-90 transition-transform duration-200" />
          </button>
          {hoveredServerId === 'add' && (
            <div className="absolute left-[76px] bg-[#1A1D23] text-[#F8FAFC] border border-[#2C313C] text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none animate-in fade-in">
              Adicionar Servidor
            </div>
          )}
        </div>

        {/* Explore Servers Button */}
        <div className="relative group flex items-center justify-center w-full">
          <div
            className={`absolute left-0 w-[3px] bg-[#16B99A] rounded-r-full transition-all duration-200 ${
              exploreModalOpen ? 'h-7' : 'h-0 group-hover:h-3.5'
            }`}
          />
          <button
            type="button"
            onClick={() => setExploreModalOpen(true)}
            onMouseEnter={() => setHoveredServerId('explore')}
            onMouseLeave={() => setHoveredServerId(null)}
            aria-label="Explorar Comunidades"
            className={`w-11 h-11 rounded-xl transition-all duration-200 flex items-center justify-center shadow-sm group active:scale-95 cursor-pointer ${
              exploreModalOpen
                ? 'bg-[#22262E] text-[#16B99A] ring-2 ring-[#16B99A] ring-offset-2 ring-offset-[#131519]'
                : 'bg-[#1A1D23] hover:bg-[#22262E] text-[#94A3B8] hover:text-[#16B99A] border border-[#2C313C]/60 hover:border-[#16B99A]/40'
            }`}
          >
            <Compass
              className={`w-4 h-4 transition-transform duration-200 ${
                exploreModalOpen ? 'rotate-45 text-[#16B99A]' : 'group-hover:rotate-45'
              }`}
            />
          </button>
          {hoveredServerId === 'explore' && (
            <div className="absolute left-[76px] bg-[#1A1D23] text-[#F8FAFC] border border-[#2C313C] text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none animate-in fade-in">
              Explorar Comunidades
            </div>
          )}
        </div>

        {/* Radar de Virais & Pautas IA Button */}
        <div className="relative group flex items-center justify-center w-full">
          <button
            type="button"
            onClick={() => {
              (window as any).__openViraisTab = true;
              setExploreModalOpen(true);
            }}
            onMouseEnter={() => setHoveredServerId('virais')}
            onMouseLeave={() => setHoveredServerId(null)}
            aria-label="Vídeos Virais & Pautas IA"
            className="w-11 h-11 rounded-xl bg-[#1A1D23] hover:bg-[#22262E] text-amber-500 hover:text-amber-400 border border-[#2C313C]/60 hover:border-amber-500/40 transition-all duration-200 flex items-center justify-center shadow-sm group active:scale-95"
          >
            <Flame className="w-4 h-4 fill-amber-500/20 group-hover:scale-110 transition-transform duration-200" />
          </button>
          {hoveredServerId === 'virais' && (
            <div className="absolute left-[76px] bg-[#1A1D23] text-[#F8FAFC] border border-[#2C313C] text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none animate-in fade-in flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>Vídeos Virais & Pautas IA</span>
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
          className="w-11 h-11 rounded-xl bg-[#1A1D23] hover:bg-[#22262E] text-[#F59E0B] border border-[#2C313C]/60 hover:border-[#F59E0B]/40 transition-all duration-200 flex items-center justify-center shadow-sm group active:scale-95"
        >
          <GraduationCap className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
        </button>
        {hoveredServerId === 'tutorial' && (
          <div className="absolute left-[76px] bg-[#1A1D23] text-[#F8FAFC] border border-[#2C313C] text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none animate-in fade-in">
            Tutorial do Iniciante
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
            className="absolute bg-[#1A1D23] border border-[#2C313C] rounded-xl p-1.5 shadow-2xl min-w-[210px] z-50 text-xs font-medium space-y-1 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 160),
              left: Math.min(contextMenu.x, window.innerWidth - 230)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1.5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider border-b border-[#2C313C]">
              {servers.find(s => s.id === contextMenu.serverId)?.name || 'Servidor'}
            </div>
            <button
              onClick={() => {
                setActiveServerId(contextMenu.serverId);
                setServerManagementTab('edit');
                setServerManagementModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#F8FAFC] hover:bg-[#22262E] hover:text-[#16B99A] transition-colors text-left"
            >
              <Camera className="w-4 h-4 text-[#94A3B8]" />
              <span>Trocar Foto / Configurações</span>
            </button>
            <button
              onClick={() => {
                setActiveServerId(contextMenu.serverId);
                setServerManagementTab('members');
                setServerManagementModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#F8FAFC] hover:bg-[#22262E] hover:text-[#16B99A] transition-colors text-left"
            >
              <UserPlus className="w-4 h-4 text-[#94A3B8]" />
              <span>Convidar Pessoas</span>
            </button>
            {contextMenu.serverId !== 'server-diskai' && (
              <div className="pt-1 border-t border-[#2C313C]">
                <button
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja excluir ou sair deste servidor?')) {
                      deleteServer(contextMenu.serverId);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors text-left"
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
