import React, { useState } from 'react';
import { useDiskai } from './context/DiskaiContext';
import { ServerSidebar } from './components/sidebar/ServerSidebar';
import { ChannelSidebar } from './components/sidebar/ChannelSidebar';
import { DirectSidebar } from './components/direct/DirectSidebar';
import { FriendsView } from './components/direct/FriendsView';
import { DirectChatArea } from './components/direct/DirectChatArea';
import { ChatArea } from './components/chat/ChatArea';
import { MemberList } from './components/chat/MemberList';
import { VoiceCallView } from './components/call/VoiceCallView';
import { LiveKitVideoCall } from './components/call/LiveKitVideoCall';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { MeetingSummaryModal } from './components/summary/MeetingSummaryModal';
import { UserSettingsModal } from './components/modals/UserSettingsModal';
import { CreateServerModal } from './components/modals/CreateServerModal';
import { ExploreServersModal } from './components/modals/ExploreServersModal';
import { BeginnerTutorialModal } from './components/tutorial/BeginnerTutorialModal';
import { AuthModal } from './components/modals/AuthModal';
import { AdminPanelModal } from './components/modals/AdminPanelModal';
import { ServerManagementModal } from './components/modals/ServerManagementModal';
import { UnreadPopupToast } from './components/notifications/UnreadPopupToast';
import { PendingApprovalView } from './components/auth/PendingApprovalView';
import { AccountRejectedView } from './components/auth/AccountRejectedView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { CreateChannelModal } from './components/modals/CreateChannelModal';
import { ChannelSettingsModal } from './components/modals/ChannelSettingsModal';
import { ChannelInviteModal } from './components/modals/ChannelInviteModal';
import { AdminCreateUserModal } from './components/modals/AdminCreateUserModal';
import { LoginView } from './components/auth/LoginView';
import { MacawMascot } from './components/assistant/MacawMascot';
import { MessageSquare, Video, Sparkles, ShieldCheck } from 'lucide-react';

export const AppContent: React.FC = () => {
  const {
    mainView,
    isInCall,
    activeVoiceChannel,
    activeDmCallUser,
    activeDmUserId,
    authModalOpen,
    setAuthModalOpen,
    adminModalOpen,
    setAdminModalOpen,
    adminCreateUserModalOpen,
    setAdminCreateUserModalOpen,
    currentUser,
    createChannelModalOpen,
    setCreateChannelModalOpen,
    createChannelTargetCategory,
    channelSettingsModalOpen,
    setChannelSettingsModalOpen,
    channelSettingsTarget,
    channelInviteModalOpen,
    setChannelInviteModalOpen,
    channelInviteTarget,
    incomingCall,
    liveKitRoomName,
    isLiveKitActive,
    acceptIncomingCall,
    rejectIncomingCall,
    endLiveKitCall,
    isVideoOn
  } = useDiskai();

  const [activeCallViewMode, setActiveCallViewMode] = useState<'call' | 'chat'>('call');
  const [adminViewActive, setAdminViewActive] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      (window.location.pathname === '/admin' || window.location.hash === '#admin')
    );
  });

  React.useEffect(() => {
    const handlePopState = () => {
      setAdminViewActive(
        window.location.pathname === '/admin' || window.location.hash === '#admin'
      );
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Guard de autenticação: se o usuário estiver deslogado, exibe a tela de login
  if (!currentUser || !currentUser.id) {
    return <LoginView />;
  }

  const isPlatformAdmin =
    currentUser.id === 'admin-campanholo32' ||
    currentUser.role === 'Administrador' ||
    currentUser.role === 'admin' ||
    currentUser.email === 'campanholo32@gmail.com' ||
    currentUser.email === 'campanholo32gmail.com';

  const isRejected =
    !isPlatformAdmin &&
    (currentUser.accessStatus === 'rejected' ||
      currentUser.accessStatus === 'revoked' ||
      (currentUser as any).status === 'rejected');

  const isPendingApproval =
    !isPlatformAdmin &&
    !isRejected &&
    (currentUser.accessStatus === 'pending' || currentUser.isApproved === false);

  if (isRejected) {
    return (
      <>
        <AccountRejectedView />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  if (isPendingApproval) {
    return (
      <>
        <PendingApprovalView />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  if (adminViewActive && isPlatformAdmin) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#141517] text-[#dbdee1] font-sans">
        <ServerSidebar />
        <AdminDashboardView
          onBackToApp={() => {
            setAdminViewActive(false);
            if (window.history.pushState) {
              window.history.pushState(null, '', '/');
            }
          }}
        />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        <AdminCreateUserModal
          isOpen={adminCreateUserModalOpen}
          onClose={() => setAdminCreateUserModalOpen(false)}
        />
        <MacawMascot />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f22] text-[#dbdee1] font-sans">
      {/* 1. Server List Sidebar (Far Left) */}
      <ServerSidebar />

      {/* 2. Middle Sidebar (Channel Sidebar OR Direct Sidebar) */}
      {mainView === 'server' ? <ChannelSidebar /> : <DirectSidebar />}

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {isInCall ? (
          <>
            {/* View Mode Switcher Header when in call */}
            <div className="h-9 bg-[#232428] px-4 flex items-center justify-between text-xs border-b border-[#1f2023] flex-shrink-0 z-30">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />
                <span className="font-semibold text-white">
                  Conectado à chamada:{' '}
                  {activeDmCallUser ? `1-on-1 com ${activeDmCallUser.name}` : activeVoiceChannel?.name}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-[#1e1f22] p-0.5 rounded-lg border border-[#35373c]">
                <button
                  onClick={() => setActiveCallViewMode('call')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-[11px] transition-all ${
                    activeCallViewMode === 'call'
                      ? 'bg-[#5865F2] text-white shadow'
                      : 'text-[#949ba4] hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Tela da Reunião
                </button>
                <button
                  onClick={() => setActiveCallViewMode('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-[11px] transition-all ${
                    activeCallViewMode === 'chat'
                      ? 'bg-[#5865F2] text-white shadow'
                      : 'text-[#949ba4] hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </button>
              </div>
            </div>

            {/* In-Call View (Call Video Screen vs Chat) */}
            <div className="flex-1 flex overflow-hidden">
              {activeCallViewMode === 'call' ? (
                isLiveKitActive && liveKitRoomName ? (
                  <LiveKitVideoCall
                    roomName={liveKitRoomName}
                    participantName={currentUser.name}
                    participantId={currentUser.id}
                    partnerUser={activeDmCallUser}
                    initialVideo={isVideoOn}
                    onDisconnect={endLiveKitCall}
                  />
                ) : (
                  <VoiceCallView />
                )
              ) : mainView === 'direct' ? (
                activeDmUserId ? <DirectChatArea /> : <FriendsView />
              ) : (
                <>
                  <ChatArea />
                  <MemberList />
                </>
              )}
            </div>
          </>
        ) : (
          /* Normal Not-in-Call View */
          <div className="flex-1 flex overflow-hidden">
            {mainView === 'direct' ? (
              activeDmUserId ? <DirectChatArea /> : <FriendsView />
            ) : (
              <>
                <ChatArea />
                <MemberList />
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals & Popups */}
      <MeetingSummaryModal />
      <UserSettingsModal />
      <CreateServerModal />
      <ServerManagementModal />
      <ExploreServersModal />
      <BeginnerTutorialModal />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <AdminPanelModal isOpen={adminModalOpen} onClose={() => setAdminModalOpen(false)} />
      <AdminCreateUserModal
        isOpen={adminCreateUserModalOpen}
        onClose={() => setAdminCreateUserModalOpen(false)}
      />
      <CreateChannelModal
        isOpen={createChannelModalOpen}
        onClose={() => setCreateChannelModalOpen(false)}
        category={createChannelTargetCategory}
      />
      <ChannelSettingsModal
        isOpen={channelSettingsModalOpen}
        onClose={() => setChannelSettingsModalOpen(false)}
        channel={channelSettingsTarget}
      />
      <ChannelInviteModal
        isOpen={channelInviteModalOpen}
        onClose={() => setChannelInviteModalOpen(false)}
        channel={channelInviteTarget}
      />
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
      <MacawMascot />
      <UnreadPopupToast />
    </div>
  );
};
