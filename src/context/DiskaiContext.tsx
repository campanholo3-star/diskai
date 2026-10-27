import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Server,
  Channel,
  ChannelType,
  Message,
  MessageAttachment,
  MeetingSummary,
  User,
  UserStatus,
  Friend,
  MainViewMode,
  DmSubTab,
  ThemeMode,
  NotificationItem,
  PinnedMessageItem,
  Participant,
  IncomingCallData
} from '../types';
import {
  initialServers,
  initialMessages,
  initialSummaries,
  initialFriends,
  initialDirectMessages,
  currentUser as defaultCurrentUser,
  sampleUsers
} from '../data/initialData';
import { soundFx } from '../utils/soundEffects';
import { generateMeetingSummary } from '../utils/aiSummarizer';
import {
  saveUserProfileToDb,
  fetchParticipantsFromDb,
  updateParticipantAccessInDb,
  saveServerToDb,
  deleteServerFromDb,
  fetchServersFromDb,
  saveChannelToDb,
  deleteChannelFromDb,
  saveMessageToDb,
  fetchChannelMessagesFromDb,
  editMessageInDb,
  deleteMessageFromDb,
  updateMessageReactionsInDb,
  saveDirectMessageToDb,
  getSupabaseClient,
  uploadStorageFile,
  requestChatSummaryFromEdgeFunction,
  requestCallSummaryFromEdgeFunction,
  signOut,
  Appointment,
  fetchAppointmentsFromDb,
  saveAppointmentToDb,
  deleteAppointmentFromDb
} from '../services/supabase';
import {
  createCallRecord,
  updateCallStatusInDb,
  broadcastIncomingCall,
  broadcastCallResponse,
  broadcastCallEnded,
  subscribeToSignaling
} from '../services/livekit';
import {
  isCustomAvatar,
  saveAvatarToVault,
  getAvatarFromVault,
  DEFAULT_PLACEHOLDER_AVATAR
} from '../utils/imageUtils';
import { sanitizeInputText } from '../utils/securityUtils';

interface DiskaiContextType {
  // Theme (Dark / Light / Emerald / Crimson / Sakura)
  theme: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;

  // Navigation & View Mode
  mainView: MainViewMode;
  setMainView: (mode: MainViewMode) => void;
  activeServer: Server;
  activeChannel: Channel;
  setActiveServerId: (id: string) => void;
  setActiveChannelId: (id: string) => void;
  servers: Server[];
  addServer: (name: string, acronym: string, icon?: string) => void;
  editServer: (serverId: string, name: string, acronym?: string, icon?: string) => void;
  deleteServer: (serverId: string) => void;
  addServerMembers: (serverId: string, userIds: string[]) => void;
  removeServerMember: (serverId: string, userId: string) => void;
  addChannel: (
    serverId: string,
    categoryId: string,
    name: string,
    type: ChannelType,
    isPrivate?: boolean,
    allowedMemberIds?: string[],
    topic?: string
  ) => void;
  updateChannel: (
    serverId: string,
    channelId: string,
    updates: Partial<Channel>
  ) => void;
  deleteChannel: (
    serverId: string,
    channelId: string
  ) => void;
  createChannelModalOpen: boolean;
  setCreateChannelModalOpen: (open: boolean) => void;
  createChannelTargetCategory: { id: string; name: string } | null;
  setCreateChannelTargetCategory: (cat: { id: string; name: string } | null) => void;
  channelSettingsModalOpen: boolean;
  setChannelSettingsModalOpen: (open: boolean) => void;
  channelSettingsTarget: Channel | null;
  setChannelSettingsTarget: (channel: Channel | null) => void;
  channelInviteModalOpen: boolean;
  setChannelInviteModalOpen: (open: boolean) => void;
  channelInviteTarget: Channel | null;
  setChannelInviteTarget: (channel: Channel | null) => void;
  serverManagementModalOpen: boolean;
  setServerManagementModalOpen: (open: boolean) => void;
  serverManagementTab: 'edit' | 'members';
  setServerManagementTab: (tab: 'edit' | 'members') => void;
  totalUnreadCount: number;
  unreadPopupEnabled: boolean;
  toggleUnreadPopup: () => void;

  // Direct Messages (DMs) & Friends
  friends: Friend[];
  activeDmUserId: string | null;
  setActiveDmUserId: (userId: string | null) => void;
  dmSubTab: DmSubTab;
  setDmSubTab: (tab: DmSubTab) => void;
  directMessages: Record<string, Message[]>;
  sendDirectMessage: (recipientId: string, content: string, attachments?: MessageAttachment[]) => void;
  addFriend: (query: string) => { success: boolean; message: string };
  removeFriend: (friendId: string) => void;
  closeDmConversation: (friendId: string) => void;
  acceptFriendRequest: (friendId: string) => void;
  startDmCall: (friendId: string, withVideo?: boolean) => Promise<void>;
  createGroupDm: (name: string, friendIds: string[]) => void;

  // Server Messages
  messages: Record<string, Message[]>;
  sendMessage: (content: string, channelId?: string, attachments?: MessageAttachment[]) => void;
  editMessage: (messageId: string, newContent: string, channelId?: string) => void;
  deleteMessage: (messageId: string, channelId?: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  postSummaryToChat: (summaryId: string, targetChannelId?: string) => void;

  // Notifications
  notifications: NotificationItem[];
  markAllNotificationsRead: () => void;
  clearNotification: (id: string) => void;
  notificationModalOpen: boolean;
  setNotificationModalOpen: (open: boolean) => void;

  // Pinned Messages
  pinnedMessages: Record<string, PinnedMessageItem[]>;
  pinMessage: (channelId: string, authorName: string, content: string) => void;
  togglePinMessage: (messageId: string, channelId: string) => void;
  unpinMessage: (channelId: string, pinId: string) => void;
  pinnedModalOpen: boolean;
  setPinnedModalOpen: (open: boolean) => void;

  // Group Management Modal
  groupMembersModalOpen: boolean;
  setGroupMembersModalOpen: (open: boolean) => void;

  // Voice & Video Call (Servers & DMs)
  activeVoiceChannel: Channel | null;
  activeDmCallUser: User | null;
  isInCall: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  recordingDuration: number;
  callDuration: number;
  liveTranscript: { speaker: string; time: string; text: string }[];
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isGeneratingSummary: boolean;

  joinVoiceChannel: (channel: Channel) => Promise<void>;
  leaveVoiceChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  endCallAndSummarize: () => Promise<void>;

  // LiveKit WebRTC Call Signaling
  incomingCall: IncomingCallData | null;
  liveKitRoomName: string | null;
  isLiveKitActive: boolean;
  acceptIncomingCall: (callData: IncomingCallData) => Promise<void>;
  rejectIncomingCall: (callData: IncomingCallData) => Promise<void>;
  endLiveKitCall: () => Promise<void>;

  // Summaries
  summaries: MeetingSummary[];
  activeSummaryModal: MeetingSummary | null;
  openSummaryModal: (summary: MeetingSummary) => void;
  closeSummaryModal: () => void;
  toggleActionItem: (summaryId: string, actionId: string) => void;
  generateChatSummary: (channelId?: string, channelName?: string) => Promise<void>;
  isGeneratingChatSummary: boolean;

  // User Profile & Settings
  currentUser: User;
  updateUserStatus: (status: UserStatus) => void;
  updateCustomStatus: (status: string) => void;
  updateUserProfile: (profile: Partial<User>) => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  membersListOpen: boolean;
  setMembersListOpen: (open: boolean) => void;
  createServerModalOpen: boolean;
  setCreateServerModalOpen: (open: boolean) => void;
  exploreModalOpen: boolean;
  setExploreModalOpen: (open: boolean) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  adminModalOpen: boolean;
  setAdminModalOpen: (open: boolean) => void;
  participants: Participant[];
  refreshParticipants: () => Promise<void>;
  approveParticipant: (id: string) => void;
  revokeParticipant: (id: string) => void;
  removeParticipant: (id: string) => void;
  inviteParticipant: (name: string, email?: string) => void;
  logout: () => Promise<void>;
  loginUser: (user: User) => void;
  adminCreateUserModalOpen: boolean;
  setAdminCreateUserModalOpen: (open: boolean) => void;

  // Arara Assistente & Calendário / Agendamentos
  appointments: Appointment[];
  refreshAppointments: () => Promise<void>;
  addAppointment: (app: Partial<Appointment>) => Promise<void>;
  removeAppointment: (id: string) => Promise<void>;
  macawModalOpen: boolean;
  setMacawModalOpen: (open: boolean) => void;

  // Beginner Tutorial
  tutorialOpen: boolean;
  setTutorialOpen: (open: boolean) => void;
  tutorialStep: number;
  setTutorialStep: (step: number) => void;
  nextTutorialStep: () => void;
  prevTutorialStep: () => void;
}

export const defaultAdminUser: User = {
  id: 'admin-campanholo32',
  name: 'Administrador',
  tag: '0001',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  status: 'online',
  role: 'Administrador',
  bannerColor: '#5865F2',
  pronouns: 'ele/dele',
  bio: '💻 Administrador da Plataforma DiskAI.',
  customStatus: '👑 Administrador da Plataforma'
};

export const emptyUnauthenticatedUser: User = {
  id: '',
  name: '',
  tag: '0000',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  status: 'offline',
  role: 'user',
  accessStatus: 'pending',
  isApproved: false
};

const getStoredCurrentUser = (): User => {
  try {
    const saved = localStorage.getItem('diskai_current_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id && parsed.name) {
        // Resgatar avatar definitivo do Avatar Vault
        const vaultAvatar = getAvatarFromVault(parsed.id, parsed.email);

        // Verificar se há perfil salvo individualmente com foto customizada mais recente
        try {
          const profileCached = localStorage.getItem(`diskai_user_profile_${parsed.id}`) ||
            (parsed.id === 'admin-campanholo32' ? localStorage.getItem('diskai_user_profile_user-me') : null);
          if (profileCached) {
            const prof = JSON.parse(profileCached);
            const avatar = vaultAvatar || (isCustomAvatar(prof.avatar)
              ? prof.avatar
              : (isCustomAvatar(parsed.avatar) ? parsed.avatar : (prof.avatar || parsed.avatar || DEFAULT_PLACEHOLDER_AVATAR)));

            return {
              ...parsed,
              ...prof,
              avatar
            };
          }
        } catch {}

        return {
          ...parsed,
          avatar: vaultAvatar || parsed.avatar || DEFAULT_PLACEHOLDER_AVATAR
        };
      }
    }
  } catch {
    // fallback
  }
  return emptyUnauthenticatedUser;
};

export const defaultParticipants: Participant[] = [
  {
    id: 'admin-campanholo32',
    name: 'Administrador',
    email: 'campanholo32@gmail.com',
    tag: '0001',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    status: 'online',
    role: 'Administrador',
    accessStatus: 'approved',
    joinedAt: 'Criador & Administrador'
  },
  {
    id: 'user-ana',
    name: 'Ana Silva',
    email: 'ana.silva@diskai.app',
    tag: '1024',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'online',
    role: 'Membro',
    accessStatus: 'approved',
    joinedAt: 'Ontem às 14:20'
  },
  {
    id: 'user-carlos',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@diskai.app',
    tag: '2048',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    status: 'idle',
    role: 'Membro',
    accessStatus: 'approved',
    joinedAt: 'Ontem às 15:45'
  },
  {
    id: 'user-lucas',
    name: 'Lucas Rocha',
    email: 'lucas.rocha@dev.io',
    tag: '8192',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'offline',
    role: 'Convidado',
    accessStatus: 'approved',
    joinedAt: 'Hoje às 09:10'
  },
  {
    id: 'user-gabriel',
    name: 'Gabriel Martins',
    email: 'gabriel.martins@design.com',
    tag: '3310',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'offline',
    role: 'Convidado',
    accessStatus: 'pending',
    joinedAt: 'Hoje às 11:30'
  }
];

const getInitialParticipants = (): Participant[] => {
  try {
    const saved = localStorage.getItem('diskai_participants');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = [...parsed];
        defaultParticipants.forEach(d => {
          if (!merged.some(m => m.id === d.id)) {
            merged.push(d);
          }
        });
        return merged;
      }
    }
  } catch {}
  return defaultParticipants;
};

const sanitizeServer = (s: Server): Server => {
  const seen = new Set<string>();
  const cleanMembers: User[] = [];
  (s.members || []).forEach(m => {
    if (m && m.id && !seen.has(m.id)) {
      seen.add(m.id);
      cleanMembers.push(m);
    }
  });

  let icon = s.icon;
  if (s.id === 'server-diskai' || (s.icon && s.icon.includes('1618005182384-a83a8bd57fbe'))) {
    icon = '/app-icon.png';
  }

  return { ...s, icon, members: cleanMembers };
};

const DiskaiContext = createContext<DiskaiContextType | undefined>(undefined);

export const DiskaiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('diskai_theme_mode') as ThemeMode;
      if (saved && ['dark', 'light', 'emerald', 'crimson', 'sakura'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'dark';
  });

  const setThemeMode = (mode: ThemeMode) => {
    setTheme(mode);
    try {
      localStorage.setItem('diskai_theme_mode', mode);
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('diskai_theme_mode', next);
      } catch {}
      return next;
    });
  };

  // User Profile
  const [currentUser, setCurrentUser] = useState<User>(getStoredCurrentUser);

  // Navigation & Custom Servers with Local & Database Persistence
  const [mainView, setMainView] = useState<MainViewMode>('server');

  const getInitialServers = (): Server[] => {
    try {
      const savedOverrides = localStorage.getItem('diskai_server_customizations');
      const overrides: Record<string, Partial<Server>> = savedOverrides ? JSON.parse(savedOverrides) : {};

      const savedAll = localStorage.getItem('diskai_servers');
      if (savedAll) {
        const parsed: Server[] = JSON.parse(savedAll);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(s => {
            const ov = overrides[s.id];
            return sanitizeServer(ov ? { ...s, ...ov } : s);
          });
        }
      }
      const savedCustom = localStorage.getItem('diskai_custom_servers');
      if (savedCustom) {
        const parsed: Server[] = JSON.parse(savedCustom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...initialServers.map(sanitizeServer)];
          parsed.forEach(p => {
            if (!merged.some(m => m.id === p.id)) {
              merged.push(sanitizeServer(p));
            }
          });
          return merged.map(s => {
            const ov = overrides[s.id];
            return sanitizeServer(ov ? { ...s, ...ov } : s);
          });
        }
      }
      return initialServers.map(s => {
        const ov = overrides[s.id];
        return sanitizeServer(ov ? { ...s, ...ov } : s);
      });
    } catch {
      // Ignored
    }
    return initialServers.map(sanitizeServer);
  };

  const [servers, setServers] = useState<Server[]>(getInitialServers);
  const [activeServerId, setActiveServerId] = useState<string>('server-diskai');
  const [activeChannelId, setActiveChannelId] = useState<string>('ch-geral');

  // Popup de Notificações Unread configurável pelo usuário
  const [unreadPopupEnabled, setUnreadPopupEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('diskai_unread_popup_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleUnreadPopup = () => {
    setUnreadPopupEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('diskai_unread_popup_enabled', String(next));
      } catch {
        // Ignored
      }
      return next;
    });
  };

  // Direct Messages & Friends com persistência no LocalStorage
  const getInitialFriends = (): Friend[] => {
    try {
      const saved = localStorage.getItem('diskai_friends');
      if (saved) {
        const parsed: Friend[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignored
    }
    return initialFriends;
  };

  const getInitialDirectMessages = (): Record<string, Message[]> => {
    try {
      const stored = getStoredCurrentUser();
      const userKey = stored && stored.id ? `diskai_direct_messages_${stored.id}` : 'diskai_direct_messages';
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...initialDirectMessages, ...parsed };
        }
      }
    } catch {
      // Ignored
    }
    return initialDirectMessages;
  };

  const [friends, setFriends] = useState<Friend[]>(getInitialFriends);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [dmSubTab, setDmSubTab] = useState<DmSubTab>('online');
  const [directMessages, setDirectMessages] = useState<Record<string, Message[]>>(getInitialDirectMessages);
  const [activeDmCallUser, setActiveDmCallUser] = useState<User | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [liveKitRoomName, setLiveKitRoomName] = useState<string | null>(null);
  const [isLiveKitActive, setIsLiveKitActive] = useState<boolean>(false);

  // Isolamento seguro de conversas particulares por usuário logado
  useEffect(() => {
    if (!currentUser.id) {
      setDirectMessages({});
      setActiveDmUserId(null);
      return;
    }
    try {
      const userKey = `diskai_direct_messages_${currentUser.id}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setDirectMessages({ ...initialDirectMessages, ...parsed });
          return;
        }
      }
      setDirectMessages(initialDirectMessages);
    } catch {}
  }, [currentUser.id]);

  // Server Messages com cache local e persistência em banco
  const getInitialChannelMessages = (): Record<string, Message[]> => {
    try {
      const saved = localStorage.getItem('diskai_channel_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...initialMessages, ...parsed };
        }
      }
    } catch {
      // Ignored
    }
    return initialMessages;
  };

  const [messages, setMessages] = useState<Record<string, Message[]>>(getInitialChannelMessages);

  // Notifications com persistência local no localStorage
  const getInitialNotifications = (): NotificationItem[] => {
    try {
      const saved = localStorage.getItem('diskai_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'notif-1',
        title: 'Resumo de Reunião com IA',
        message: 'A ata da Reunião Geral com itens de ação já está disponível.',
        time: '09:15',
        read: false,
        type: 'meeting',
        summaryId: 'sum-1'
      },
      {
        id: 'notif-2',
        title: 'Pedido de Amizade',
        message: 'Gabriel Martins enviou uma solicitação de amizade.',
        time: '08:45',
        read: false,
        type: 'friend'
      },
      {
        id: 'notif-3',
        title: 'Menção em #geral',
        message: 'Ana Silva: "Testei a opção de gravar reunião e ficou incrível!"',
        time: '08:35',
        read: true,
        type: 'mention'
      }
    ];
  };

  const [notifications, setNotifications] = useState<NotificationItem[]>(getInitialNotifications);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('diskai_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Pinned Messages com persistência local
  const getInitialPinnedMessages = (): Record<string, PinnedMessageItem[]> => {
    try {
      const saved = localStorage.getItem('diskai_pinned_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}
    return {
      'ch-geral': [
        {
          id: 'pin-1',
          channelId: 'ch-geral',
          authorName: 'Carlos Mendes',
          content: 'Boas-vindas ao Diskai! O novo Discord com suporte a reuniões graváveis e resumos por IA.',
          timestamp: 'Hoje às 08:30'
        }
      ],
      'ch-resumos': [
        {
          id: 'pin-2',
          channelId: 'ch-resumos',
          authorName: 'Diskai Bot',
          content: '📌 Todos os resumos de reuniões finalizadas serão publicados neste canal automaticamente.',
          timestamp: 'Hoje às 09:15'
        }
      ],
      'user-ana': [
        {
          id: 'pin-3',
          channelId: 'user-ana',
          authorName: 'Ana Silva',
          content: 'A gravação da reunião de hoje ficou sensacional! Salvou minha ata em segundos.',
          timestamp: 'Hoje às 10:15'
        }
      ]
    };
  };

  const [pinnedMessages, setPinnedMessages] = useState<Record<string, PinnedMessageItem[]>>(getInitialPinnedMessages);
  const [pinnedModalOpen, setPinnedModalOpen] = useState(false);
  const [groupMembersModalOpen, setGroupMembersModalOpen] = useState(false);

  // Summaries
  const [summaries, setSummaries] = useState<MeetingSummary[]>(initialSummaries);
  const [activeSummaryModal, setActiveSummaryModal] = useState<MeetingSummary | null>(null);
  const [isGeneratingChatSummary, setIsGeneratingChatSummary] = useState(false);

  // Settings Modals
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [membersListOpen, setMembersListOpen] = useState(true);
  const [createServerModalOpen, setCreateServerModalOpen] = useState(false);
  const [serverManagementModalOpen, setServerManagementModalOpen] = useState(false);
  const [serverManagementTab, setServerManagementTab] = useState<'edit' | 'members'>('edit');
  const [exploreModalOpen, setExploreModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminCreateUserModalOpen, setAdminCreateUserModalOpen] = useState(false);
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [createChannelTargetCategory, setCreateChannelTargetCategory] = useState<{ id: string; name: string } | null>(null);
  const [channelSettingsModalOpen, setChannelSettingsModalOpen] = useState(false);
  const [channelSettingsTarget, setChannelSettingsTarget] = useState<Channel | null>(null);
  const [channelInviteModalOpen, setChannelInviteModalOpen] = useState(false);
  const [channelInviteTarget, setChannelInviteTarget] = useState<Channel | null>(null);

  // Participants & Access Control (Exclusive Admin Authority)
  const [participants, setParticipants] = useState<Participant[]>(getInitialParticipants);

  // Arara Assistente & Compromissos / Agenda
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('diskai_appointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'app-sample-1',
        title: 'Reunião de Alinhamento Semanal',
        description: 'Pauta geral de desenvolvimento e entregas',
        start_time: new Date(Date.now() + 86400000).toISOString(),
        channel_id: 'ch-geral',
        server_id: 'DiskAI',
        attendees: ['Administrador', 'Ana Silva'],
        status: 'scheduled',
        created_at: new Date().toISOString()
      }
    ];
  });
  const [macawModalOpen, setMacawModalOpen] = useState(false);

  const refreshAppointments = async () => {
    try {
      const list = await fetchAppointmentsFromDb();
      if (list && list.length > 0) {
        setAppointments(list);
      }
    } catch (e) {
      console.warn('Erro ao atualizar compromissos:', e);
    }
  };

  const addAppointment = async (app: Partial<Appointment>) => {
    const id = app.id || `app-${Date.now()}`;
    const newApp: Appointment = {
      id,
      title: app.title || 'Compromisso',
      description: app.description,
      start_time: app.start_time || new Date().toISOString(),
      end_time: app.end_time,
      channel_id: app.channel_id || activeChannelId,
      server_id: app.server_id || activeServer.name,
      attendees: app.attendees || [currentUser.name],
      status: app.status || 'scheduled',
      created_at: new Date().toISOString()
    };

    setAppointments(prev => {
      const updated = [newApp, ...prev.filter(a => a.id !== id)];
      try { localStorage.setItem('diskai_appointments', JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('diskai:activity', { detail: { type: 'appointment-added' } }));
    }

    await saveAppointmentToDb(newApp);
  };

  const removeAppointment = async (id: string) => {
    setAppointments(prev => {
      const updated = prev.filter(a => a.id !== id);
      try { localStorage.setItem('diskai_appointments', JSON.stringify(updated)); } catch {}
      return updated;
    });
    await deleteAppointmentFromDb(id);
  };

  useEffect(() => {
    refreshAppointments();
  }, []);

  // Initial load of participants from Supabase Database
  useEffect(() => {
    fetchParticipantsFromDb().then(dbList => {
      if (dbList && dbList.length > 0) {
        setParticipants(prev => {
          const merged = [...dbList];
          prev.forEach(p => {
            if (!merged.some(m => m.id === p.id)) {
              merged.push(p);
            }
          });
          try { localStorage.setItem('diskai_participants', JSON.stringify(merged)); } catch {}
          return merged;
        });
      }
    });

    // Initial load of custom servers from Supabase Database
    fetchServersFromDb().then(dbServers => {
      if (dbServers && dbServers.length > 0) {
        setServers(prev => {
          const savedOverrides = localStorage.getItem('diskai_server_customizations');
          const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};

          const merged = prev.map(s => {
            const dbMatch = dbServers.find(d => d.id === s.id);
            const ov = overrides[s.id];
            if (ov) {
              return { ...s, ...(dbMatch || {}), ...ov };
            }
            return dbMatch ? { ...s, ...dbMatch } : s;
          });

          dbServers.forEach(s => {
            if (!merged.some(m => m.id === s.id)) {
              const ov = overrides[s.id];
              merged.push(ov ? { ...s, ...ov } : s);
            }
          });
          return merged;
        });
      }
    });
  }, []);

  // Fetch messages from Supabase whenever active channel changes
  useEffect(() => {
    if (activeChannelId) {
      fetchChannelMessagesFromDb(activeChannelId).then(dbMsgs => {
        if (dbMsgs && dbMsgs.length > 0) {
          setMessages(prev => {
            const current = prev[activeChannelId] || [];
            const merged = [...current];
            dbMsgs.forEach(dbMsg => {
              const existingIdx = merged.findIndex(m => m.id === dbMsg.id);
              if (existingIdx >= 0) {
                const existing = merged[existingIdx];
                merged[existingIdx] = {
                  ...existing,
                  ...dbMsg,
                  attachments: (dbMsg.attachments && dbMsg.attachments.length > 0) ? dbMsg.attachments : existing.attachments,
                  reactions: (dbMsg.reactions && dbMsg.reactions.length > 0) ? dbMsg.reactions : existing.reactions,
                  pinned: dbMsg.pinned !== undefined ? dbMsg.pinned : existing.pinned
                };
              } else {
                merged.push(dbMsg);
              }
            });
            const updated = { ...prev, [activeChannelId]: merged };
            try {
              localStorage.setItem('diskai_channel_messages', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      });
    }
  }, [activeChannelId]);

  // Fetch direct messages from Supabase whenever active DM user changes
  useEffect(() => {
    if (activeDmUserId) {
      const client = getSupabaseClient();
      client
        .from('messages')
        .select('*')
        .or(`channel_id.eq.dm_${activeDmUserId},channel_id.eq.dm_${currentUser.id}`)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setDirectMessages(prev => {
              const current = prev[activeDmUserId] || [];
              const merged = [...current];
              data.forEach((row: any) => {
                const dbMsg: Message = {
                  id: row.id,
                  userId: row.user_id || 'user-unknown',
                  channelId: activeDmUserId,
                  content: row.content || '',
                  timestamp: row.created_at
                    ? 'Hoje às ' + new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : 'Hoje às 12:00',
                  reactions: Array.isArray(row.reactions) ? row.reactions : [],
                  attachments: Array.isArray(row.attachments) && row.attachments.length > 0 ? row.attachments : undefined,
                  embed: row.embed || undefined,
                  pinned: !!row.is_pinned
                };
                const existingIdx = merged.findIndex(m => m.id === dbMsg.id);
                if (existingIdx >= 0) {
                  const existing = merged[existingIdx];
                  merged[existingIdx] = {
                    ...existing,
                    ...dbMsg,
                    attachments: dbMsg.attachments || existing.attachments
                  };
                } else {
                  merged.push(dbMsg);
                }
              });
              const updated = { ...prev, [activeDmUserId]: merged };
              try {
                localStorage.setItem('diskai_direct_messages', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        });
    }
  }, [activeDmUserId, currentUser.id]);

  const refreshParticipants = async () => {
    try {
      const dbList = await fetchParticipantsFromDb();
      if (dbList && dbList.length > 0) {
        setParticipants(prev => {
          const merged = [...dbList];
          prev.forEach(p => {
            if (!merged.some(m => m.id === p.id)) {
              merged.push(p);
            }
          });
          return merged;
        });
      }
    } catch (err) {
      console.warn('Erro ao atualizar participantes:', err);
    }
  };

  const approveParticipant = (id: string) => {
    setParticipants(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, accessStatus: 'approved' as const, isApproved: true } : p));
      try { localStorage.setItem('diskai_participants', JSON.stringify(updated)); } catch {}
      return updated;
    });
    soundFx.playJoin();
    updateParticipantAccessInDb(id, 'approved');
  };

  const revokeParticipant = (id: string) => {
    setParticipants(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, accessStatus: 'revoked' as const, isApproved: false } : p));
      try { localStorage.setItem('diskai_participants', JSON.stringify(updated)); } catch {}
      return updated;
    });
    updateParticipantAccessInDb(id, 'revoked');
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => {
      const updated = prev.filter(p => p.id !== id);
      try { localStorage.setItem('diskai_participants', JSON.stringify(updated)); } catch {}
      return updated;
    });
    updateParticipantAccessInDb(id, 'revoked');
  };

  const inviteParticipant = (name: string, email?: string) => {
    const newParticipant: Participant = {
      id: `participant-${Date.now()}`,
      name,
      email,
      tag: Math.floor(1000 + Math.random() * 9000).toString(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'offline',
      role: 'Membro',
      accessStatus: 'approved',
      joinedAt: 'Agora (Pré-autorizado)'
    };
    setParticipants(prev => {
      const updated = [newParticipant, ...prev];
      try { localStorage.setItem('diskai_participants', JSON.stringify(updated)); } catch {}
      return updated;
    });
    saveUserProfileToDb({
      id: newParticipant.id,
      name: newParticipant.name,
      tag: newParticipant.tag,
      avatar: newParticipant.avatar,
      status: newParticipant.status,
      role: newParticipant.role
    });
  };

  // Beginner Tutorial
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  // Voice & Call state
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<Channel | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<{ speaker: string; time: string; text: string }[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const callTimerRef = useRef<number | null>(null);
  const transcriptSimTimerRef = useRef<number | null>(null);

  const rawActiveServer = servers.find(s => s.id === activeServerId) || servers[0];
  const activeServer = useMemo(() => sanitizeServer(rawActiveServer), [rawActiveServer]);
  const allChannels = activeServer.categories.flatMap(c => c.channels);
  const activeChannel = allChannels.find(c => c.id === activeChannelId) || allChannels[0];

  const isInCall = activeVoiceChannel !== null || activeDmCallUser !== null || isLiveKitActive;

  // Sync theme with document element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light-theme', 'theme-emerald', 'theme-crimson', 'theme-sakura', 'dark-theme');
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else if (theme === 'emerald') {
      root.classList.add('theme-emerald');
    } else if (theme === 'crimson') {
      root.classList.add('theme-crimson');
    } else if (theme === 'sakura') {
      root.classList.add('theme-sakura');
    } else {
      root.classList.add('dark-theme');
    }
  }, [theme]);

  // Call duration counter
  useEffect(() => {
    if (isInCall) {
      callTimerRef.current = window.setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isInCall]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Real-time transcript generator simulation during call recording
  useEffect(() => {
    if (isRecording) {
      const partnerName = activeDmCallUser ? activeDmCallUser.name : 'Carlos Mendes';
      const candidateLines = [
        { speaker: 'Você (Host)', text: 'Iniciamos a gravação da chamada. O áudio está sendo capturado em alta definição.' },
        { speaker: partnerName, text: 'Confirmado. O microfone e a latência de transcrição estão excelentes.' },
        { speaker: 'Diskai Bot', text: 'Indexando pauta da conversa e separando tópicos prioritários.' },
        { speaker: partnerName, text: 'Vamos alinhar as entregas da sprint e gerar o resumo executivo ao final.' },
        { speaker: 'Você (Host)', text: 'Perfeito! Todas as pendências serão extraídas automaticamente com responsáveis.' }
      ];

      let step = 0;
      transcriptSimTimerRef.current = window.setInterval(() => {
        if (step < candidateLines.length) {
          const item = candidateLines[step];
          const mins = Math.floor((step * 12 + 8) / 60).toString().padStart(2, '0');
          const secs = ((step * 12 + 8) % 60).toString().padStart(2, '0');
          setLiveTranscript(prev => [...prev, { speaker: item.speaker, time: `${mins}:${secs}`, text: item.text }]);
          step++;
        }
      }, 6000);
    } else {
      if (transcriptSimTimerRef.current) clearInterval(transcriptSimTimerRef.current);
    }
    return () => {
      if (transcriptSimTimerRef.current) clearInterval(transcriptSimTimerRef.current);
    };
  }, [isRecording, activeDmCallUser]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.enabled = next;
  };

  const updateUserStatus = (status: UserStatus) => {
    setCurrentUser(prev => ({ ...prev, status }));
  };

  const updateCustomStatus = (customStatus: string) => {
    setCurrentUser(prev => ({ ...prev, customStatus }));
  };

  const updateUserProfile = (profile: Partial<User>) => {
    setCurrentUser(prev => {
      const nextUser = { ...prev, ...profile };
      if (profile.avatar) {
        saveAvatarToVault(nextUser.id, nextUser.email, profile.avatar);
      }
      try {
        if (nextUser.id) {
          localStorage.setItem('diskai_current_user', JSON.stringify(nextUser));
          localStorage.setItem(`diskai_user_profile_${nextUser.id}`, JSON.stringify(nextUser));
          if (nextUser.id === 'admin-campanholo32' || nextUser.id === 'user-me' || nextUser.email === 'campanholo32@gmail.com') {
            localStorage.setItem('diskai_user_profile_admin-campanholo32', JSON.stringify(nextUser));
            localStorage.setItem('diskai_user_profile_user-me', JSON.stringify(nextUser));
          }
        }
      } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e);
      }
      if (nextUser.id) {
        saveUserProfileToDb(nextUser);
      }
      return nextUser;
    });
    setParticipants(prev => {
      const targetId = currentUser.id || 'admin-campanholo32';
      const updated = prev.map(p => {
        if (p.id !== targetId && p.id !== 'admin-campanholo32' && p.id !== 'user-me' && p.id !== (profile as any)?.id) return p;
        return {
          ...p,
          ...(profile.name ? { name: profile.name } : {}),
          ...(profile.tag ? { tag: profile.tag } : {}),
          ...(profile.avatar ? { avatar: profile.avatar } : {}),
          ...(profile.status ? { status: profile.status } : {}),
          ...(profile.customStatus !== undefined ? { customStatus: profile.customStatus } : {})
        };
      });
      try {
        localStorage.setItem('diskai_participants', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const logout = async () => {
    try {
      await signOut();
    } catch {}
    try {
      localStorage.removeItem('diskai_current_user');
    } catch {}
    setCurrentUser(emptyUnauthenticatedUser);
    setActiveVoiceChannel(null);
    setActiveDmCallUser(null);
    setIsLiveKitActive(false);
  };

  const loginUser = (user: User) => {
    let finalUser = { ...user };
    try {
      const cached = localStorage.getItem(`diskai_user_profile_${user.id}`) ||
        (user.id === 'admin-campanholo32' ? localStorage.getItem('diskai_user_profile_user-me') : null);
      if (cached) {
        const prof = JSON.parse(cached);
        finalUser = {
          ...finalUser,
          ...prof
        };
      }
    } catch {}

    // Resgatar foto definitiva do Avatar Vault
    const vaultAvatar = getAvatarFromVault(user.id, user.email);
    if (vaultAvatar) {
      finalUser.avatar = vaultAvatar;
    } else if (finalUser.avatar) {
      saveAvatarToVault(finalUser.id, finalUser.email, finalUser.avatar);
    }

    try {
      localStorage.setItem('diskai_current_user', JSON.stringify(finalUser));
      localStorage.setItem(`diskai_user_profile_${finalUser.id}`, JSON.stringify(finalUser));
      if (finalUser.id === 'admin-campanholo32' || finalUser.id === 'user-me' || finalUser.email === 'campanholo32@gmail.com') {
        localStorage.setItem('diskai_user_profile_admin-campanholo32', JSON.stringify(finalUser));
        localStorage.setItem('diskai_user_profile_user-me', JSON.stringify(finalUser));
      }
    } catch {}

    // Sincronizar na lista de participantes para refletir na interface
    setParticipants(prev => {
      const updated: Participant[] = prev.map((p): Participant => {
        if (p.id !== finalUser.id) return p;
        const normalizedRole = (finalUser.role === 'Administrador' || finalUser.role === 'admin')
          ? 'Administrador'
          : (finalUser.role === 'Convidado' ? 'Convidado' : 'Membro');

        return {
          ...p,
          name: finalUser.name || p.name,
          tag: finalUser.tag || p.tag,
          avatar: finalUser.avatar || p.avatar,
          status: finalUser.status || p.status,
          customStatus: finalUser.customStatus !== undefined ? finalUser.customStatus : p.customStatus,
          role: normalizedRole as any,
          accessStatus: (finalUser.accessStatus || p.accessStatus) as any
        };
      });
      try { localStorage.setItem('diskai_participants', JSON.stringify(updated)); } catch {}
      return updated;
    });

    setCurrentUser(finalUser);
  };

  // Notification management
  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Pin & Unpin message
  const togglePinMessage = (messageId: string, channelId: string) => {
    let nextPinned = false;
    let targetMsg: Message | undefined;

    // 1. Procurar e alternar nas mensagens do canal
    setMessages(prev => {
      const list = prev[channelId] || [];
      const idx = list.findIndex(m => m.id === messageId);
      if (idx === -1) return prev;

      targetMsg = list[idx];
      nextPinned = !targetMsg.pinned;
      const updatedList = [...list];
      updatedList[idx] = { ...targetMsg, pinned: nextPinned };
      const updated = { ...prev, [channelId]: updatedList };
      try {
        localStorage.setItem('diskai_channel_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Procurar e alternar nas mensagens diretas (DMs)
    setDirectMessages(prev => {
      const list = prev[channelId] || [];
      const idx = list.findIndex(m => m.id === messageId);
      if (idx === -1) return prev;

      targetMsg = list[idx];
      nextPinned = !targetMsg.pinned;
      const updatedList = [...list];
      updatedList[idx] = { ...targetMsg, pinned: nextPinned };
      const updated = { ...prev, [channelId]: updatedList };
      try {
        localStorage.setItem('diskai_direct_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Atualizar a lista agregada pinnedMessages
    setPinnedMessages(prev => {
      const currentPins = prev[channelId] || [];
      let updatedPins: PinnedMessageItem[];

      if (nextPinned && targetMsg) {
        const author =
          targetMsg.userId === currentUser.id
            ? currentUser.name
            : sampleUsers.find(u => u.id === targetMsg?.userId)?.name || 'Membro';

        const contentText =
          targetMsg.content ||
          (targetMsg.attachments && targetMsg.attachments.length > 0
            ? `📎 ${targetMsg.attachments[0].name}`
            : 'Mensagem fixada');

        const newPinItem: PinnedMessageItem = {
          id: `pin-${targetMsg.id}`,
          channelId,
          authorName: author,
          content: contentText,
          timestamp: targetMsg.timestamp || 'Hoje'
        };
        updatedPins = [newPinItem, ...currentPins.filter(p => p.id !== `pin-${targetMsg!.id}`)];
      } else {
        updatedPins = currentPins.filter(
          p => p.id !== `pin-${messageId}` && p.id !== messageId
        );
      }

      const updated = { ...prev, [channelId]: updatedPins };
      try {
        localStorage.setItem('diskai_pinned_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 4. Salvar estado no banco Supabase
    try {
      const client = getSupabaseClient();
      client
        .from('messages')
        .update({ is_pinned: nextPinned })
        .eq('id', messageId)
        .then(() => {});
    } catch {}
  };

  const unpinMessage = (channelId: string, pinId: string) => {
    // 1. Desmarcar na lista de mensagens se existir
    const rawId = pinId.replace(/^pin-/, '');
    togglePinMessage(rawId, channelId);

    // 2. Garantir remoção direta de pinnedMessages e persistir
    setPinnedMessages(prev => {
      const current = prev[channelId] || [];
      const filtered = current.filter(p => p.id !== pinId && p.id !== rawId && p.id !== `pin-${rawId}`);
      const updated = {
        ...prev,
        [channelId]: filtered
      };
      try {
        localStorage.setItem('diskai_pinned_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const pinMessage = (channelId: string, authorName: string, content: string) => {
    const allMsgs = messages[channelId] || directMessages[channelId] || [];
    const matched = allMsgs.find(m => m.content === content);
    if (matched) {
      togglePinMessage(matched.id, channelId);
    } else {
      const newPin: PinnedMessageItem = {
        id: `pin-${Date.now()}`,
        channelId,
        authorName,
        content,
        timestamp: 'Hoje'
      };
      setPinnedMessages(prev => {
        const updated = {
          ...prev,
          [channelId]: [newPin, ...(prev[channelId] || [])]
        };
        try {
          localStorage.setItem('diskai_pinned_messages', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  // Create Group DM
  const createGroupDm = (name: string, friendIds: string[]) => {
    const groupUsers = friends.filter(f => friendIds.includes(f.id)).map(f => f.user);
    const newGroupId = `group-${Date.now()}`;
    const newGroupUser: User = {
      id: newGroupId,
      name,
      tag: 'GRUPO',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
      status: 'online',
      customStatus: `${friendIds.length + 1} membros no grupo`
    };

    const newFriend: Friend = {
      id: newGroupId,
      user: newGroupUser,
      relationshipStatus: 'friend',
      lastMessage: 'Grupo criado com sucesso!',
      lastMessageTime: 'Agora'
    };

    setFriends(prev => [newFriend, ...prev]);
    setDirectMessages(prev => ({
      ...prev,
      [newGroupId]: [
        {
          id: `msg-group-${Date.now()}`,
          userId: currentUser.id,
          channelId: newGroupId,
          content: `🎉 Grupo **${name}** criado com ${groupUsers.map(u => u.name).join(', ')} e você!`,
          timestamp: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          reactions: [{ emoji: '🚀', count: 1, users: ['user-me'] }]
        }
      ]
    }));

    setActiveDmUserId(newGroupId);
    soundFx.playJoin();
  };

  // Join a voice channel in a server
  const joinVoiceChannel = async (channel: Channel) => {
    if (activeVoiceChannel?.id === channel.id) return;

    soundFx.playJoin();
    setActiveDmCallUser(null);
    setActiveVoiceChannel(channel);
    setLiveTranscript([]);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
      }
    } catch {
      // Permission denied or simulated environment
    }
  };

  // Start a private 1-on-1 DM Call
  const startDmCall = async (friendId: string, withVideo = false) => {
    const friendObj = friends.find(f => f.id === friendId)?.user || sampleUsers.find(u => u.id === friendId);
    if (!friendObj) return;

    soundFx.playJoin();
    setActiveVoiceChannel(null);
    setActiveDmCallUser(friendObj);
    if (withVideo) setIsVideoOn(true);

    const generatedRoomName = `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setLiveKitRoomName(generatedRoomName);
    setIsLiveKitActive(true);

    // 1. Criar registro na tabela calls do Supabase
    try {
      const callRecord = await createCallRecord(currentUser.id, friendId, withVideo, generatedRoomName);
      // 2. Disparar sinalização via Supabase Broadcast para o Usuário B
      await broadcastIncomingCall(currentUser, friendId, callRecord.id, withVideo, generatedRoomName);
    } catch (err) {
      console.warn('[Diskai] Erro ao sincronizar sinalização de chamada:', err);
    }

    setLiveTranscript([
      { speaker: 'Diskai Bot', time: '00:00', text: `📞 Chamada ${withVideo ? 'de vídeo' : 'de voz'} privada 1-on-1 iniciada com ${friendObj.name}. Conectando via LiveKit WebRTC.` }
    ]);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
        setLocalStream(stream);
      }
    } catch {
      // Permission denied or simulated environment
    }
  };

  const acceptIncomingCall = async (callData: IncomingCallData) => {
    soundFx.playJoin();
    setIncomingCall(null);
    setActiveVoiceChannel(null);

    const friendObj = friends.find(f => f.id === callData.caller.id)?.user || {
      id: callData.caller.id,
      name: callData.caller.name,
      tag: callData.caller.tag || '0000',
      avatar: callData.caller.avatar,
      status: 'online' as UserStatus
    };
    setActiveDmCallUser(friendObj as User);
    if (callData.withVideo) setIsVideoOn(true);
    setLiveKitRoomName(callData.roomName);
    setIsLiveKitActive(true);

    try {
      await updateCallStatusInDb(callData.callId, 'accepted');
      await broadcastCallResponse(callData.caller.id, callData.callId, true, callData.roomName);
    } catch (err) {
      console.warn('[Diskai] Erro ao responder aceite de chamada:', err);
    }
  };

  const rejectIncomingCall = async (callData: IncomingCallData) => {
    soundFx.playLeave();
    setIncomingCall(null);
    try {
      await updateCallStatusInDb(callData.callId, 'rejected');
      await broadcastCallResponse(callData.caller.id, callData.callId, false, callData.roomName);
    } catch (err) {
      console.warn('[Diskai] Erro ao responder recusa de chamada:', err);
    }
  };

  const endLiveKitCall = async () => {
    if (activeDmCallUser && liveKitRoomName) {
      try {
        await broadcastCallEnded(activeDmCallUser.id, liveKitRoomName);
        await updateCallStatusInDb(liveKitRoomName, 'ended');
      } catch (err) {
        console.warn('[Diskai] Erro ao finalizar chamada:', err);
      }
    }
    setIsLiveKitActive(false);
    setLiveKitRoomName(null);
    leaveVoiceChannel();
  };

  // Escuta sinalização de chamadas via Supabase Broadcast em tempo real
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToSignaling(currentUser.id, {
      onIncomingCall: (callData) => {
        setIncomingCall(callData);
      },
      onCallAccepted: (_callId, roomName) => {
        console.log('[Diskai] Chamada aceita pelo parceiro!');
        setIsLiveKitActive(true);
        if (roomName) setLiveKitRoomName(roomName);
      },
      onCallRejected: (_callId) => {
        console.log('[Diskai] Chamada recusada pelo destinatário.');
        setIsLiveKitActive(false);
        setLiveKitRoomName(null);
        leaveVoiceChannel();
      },
      onCallEnded: (_callId) => {
        console.log('[Diskai] Chamada encerrada pelo parceiro.');
        setIsLiveKitActive(false);
        setLiveKitRoomName(null);
        leaveVoiceChannel();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  // Leave voice channel / hang up call
  const leaveVoiceChannel = () => {
    if (isRecording) {
      stopRecording();
    }
    soundFx.playLeave();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setActiveVoiceChannel(null);
    setActiveDmCallUser(null);
    setIsLiveKitActive(false);
    setLiveKitRoomName(null);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setLiveTranscript([]);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (next) soundFx.playMute();
    else soundFx.playUnmute();

    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !next;
      });
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(prev => !prev);
    soundFx.playMute();
  };

  const toggleVideo = async () => {
    if (isVideoOn) {
      if (localStream) {
        localStream.getVideoTracks().forEach(track => track.stop());
      }
      setIsVideoOn(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (localStream) {
            videoStream.getVideoTracks().forEach(track => localStream.addTrack(track));
          } else {
            setLocalStream(videoStream);
          }
          setIsVideoOn(true);
        } else {
          setIsVideoOn(true);
        }
      } catch {
        setIsVideoOn(true);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setScreenStream(stream);
          setIsScreenSharing(true);
          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            setScreenStream(null);
          };
        } else {
          setIsScreenSharing(true);
        }
      } catch {
        // Ignored
      }
    }
  };

  // Start Meeting Recording
  const startRecording = async () => {
    if (isRecording) return;

    soundFx.playRecordStart();
    setIsRecording(true);
    setRecordingDuration(0);
    recordedChunksRef.current = [];

    const callName = activeDmCallUser ? `Chamada com ${activeDmCallUser.name}` : (activeVoiceChannel?.name || 'Reunião');

    setLiveTranscript([
      { speaker: 'Diskai Bot', time: '00:00', text: `🔴 Gravação iniciada (${callName}). Áudio sendo capturado para resumo com IA.` }
    ]);

    try {
      let recordingStream = localStream;
      if (!recordingStream && navigator.mediaDevices?.getUserMedia) {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(recordingStream);
      }

      if (recordingStream && window.MediaRecorder) {
        const recorder = new MediaRecorder(recordingStream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.start(1000);
      }
    } catch {
      // Ignored
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // End Call & Generate AI Summary (Multimodal com Gemini Flash & Supabase Edge Function)
  const endCallAndSummarize = async () => {
    if (!isInCall) return;

    setIsGeneratingSummary(true);
    const isDm = activeDmCallUser !== null;
    const channelName = isDm ? `Call 1-on-1 (${activeDmCallUser.name})` : (activeVoiceChannel?.name || 'Reunião Geral');
    const serverName = isDm ? 'Mensagem Direta' : activeServer.name;
    const duration = recordingDuration > 0 ? recordingDuration : (callDuration > 0 ? callDuration : 75);
    const transcriptSnap = [...liveTranscript];
    const participantsList = isDm
      ? ['zeit-user (Host)', activeDmCallUser.name, 'Diskai Bot']
      : ['zeit-user (Host)', 'Ana Silva (Product)', 'Carlos Mendes (Tech Lead)', 'Diskai Bot'];

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    let audioBlob: Blob | undefined = undefined;
    if (recordedChunksRef.current.length > 0) {
      audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
    }

    leaveVoiceChannel();

    let summary: MeetingSummary | null = null;

    // 1. Tentar processamento multimodal via Edge Function do Gemini Flash
    if (audioBlob) {
      try {
        const audioFile = new File([audioBlob], `call_${Date.now()}.webm`, { type: 'audio/webm' });
        const uploadRes = await uploadStorageFile(audioFile, 'chat-media');

        const edgeRes = await requestCallSummaryFromEdgeFunction({
          channel_id: activeVoiceChannel?.id || (isDm ? `dm_${activeDmCallUser?.id}` : 'ch-resumos'),
          channel_name: channelName,
          server_name: serverName,
          audio_url: uploadRes.success ? uploadRes.url : undefined,
          participants: participantsList,
          duration_seconds: duration
        });

        if (edgeRes.success && edgeRes.summary) {
          const s = edgeRes.summary;
          summary = {
            id: s.id || `summary-${Date.now()}`,
            title: s.title || `Ata da Reunião - ${channelName}`,
            channelName,
            serverName,
            date: s.date || new Date().toLocaleDateString('pt-BR'),
            durationFormatted: s.durationFormatted || `${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`,
            durationSeconds: duration,
            participants: s.participants || participantsList,
            audioUrl: s.audioUrl || (audioBlob ? URL.createObjectURL(audioBlob) : undefined),
            recordedBlob: audioBlob,
            executiveSummary: s.executiveSummary || '',
            keyTopics: s.keyTopics || [],
            actionItems: (s.actionItems || []).map((a: any, idx: number) => ({
              id: a.id || `act-${idx + 1}`,
              task: a.task,
              assignee: a.assignee || 'Equipe',
              completed: !!a.completed,
              priority: a.priority || 'alta'
            })),
            decisions: s.decisions || [],
            sentiment: s.sentiment || 'Produtivo & Focado',
            transcript: s.transcript || transcriptSnap,
            postedToChannel: true
          };
        }
      } catch (edgeErr) {
        console.warn('[Diskai AI] Falha na Edge Function summarize-call:', edgeErr);
      }
    }

    // 2. Se a Edge Function não retornou por estar offline, usar fallback robusto do client
    if (!summary) {
      summary = await generateMeetingSummary({
        channelName,
        serverName,
        durationSeconds: duration,
        participants: participantsList,
        audioBlob,
        liveTranscript: transcriptSnap
      });
    }

    setSummaries(prev => [summary!, ...prev]);
    setIsGeneratingSummary(false);
    setActiveSummaryModal(summary);

    // Adicionar notificação sobre a ata gerada
    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'Nova Ata com IA (Gemini Flash) Gerada',
        message: `Resumo de ${channelName} pronto para leitura e download.`,
        time: 'Agora',
        read: false,
        type: 'meeting',
        summaryId: summary!.id
      },
      ...prev
    ]);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}
  };

  // Gerar resumo inteligente de mensagens de chat via Edge Function Gemini Flash
  const generateChatSummary = async (targetChannelId?: string, targetChannelName?: string) => {
    setIsGeneratingChatSummary(true);
    const chId = targetChannelId || activeChannelId;
    const isDm = mainView === 'direct';
    const activeFriendUser = friends.find(f => f.id === activeDmUserId)?.user;
    const chName = targetChannelName || (isDm ? (activeFriendUser?.name || 'Conversa Particular') : activeChannel.name);
    const sName = isDm ? 'Mensagem Direta' : activeServer.name;

    try {
      // 1. Invocar Supabase Edge Function summarize-chat
      const res = await requestChatSummaryFromEdgeFunction({
        conversation_id: isDm ? (activeDmUserId || undefined) : undefined,
        channel_id: isDm ? undefined : chId,
        channel_name: chName,
        server_name: sName,
        limit: 80
      });

      if (res.success && res.summary) {
        const edgeSum = res.summary;
        const newSummary: MeetingSummary = {
          id: edgeSum.id || `chat-sum-${Date.now()}`,
          title: edgeSum.title || `Resumo do Chat #${chName}`,
          channelName: chName,
          serverName: sName,
          date: edgeSum.date || new Date().toLocaleDateString('pt-BR'),
          durationFormatted: 'Texto do Chat',
          durationSeconds: 0,
          participants: [currentUser.name, 'Diskai Bot', 'Equipe'],
          executiveSummary: edgeSum.executiveSummary || 'Síntese das mensagens concluída.',
          keyTopics: edgeSum.keyTopics || [],
          actionItems: (edgeSum.actionItems || []).map((a: any, i: number) => ({
            id: a.id || `act-${i + 1}`,
            task: a.task,
            assignee: a.assignee || 'Equipe',
            completed: !!a.completed,
            priority: a.priority || 'alta'
          })),
          decisions: edgeSum.decisions || [],
          sentiment: edgeSum.sentiment || 'Produtivo & Focado',
          transcript: [],
          postedToChannel: false
        };

        setSummaries(prev => [newSummary, ...prev]);
        setActiveSummaryModal(newSummary);

        setNotifications(prev => [
          {
            id: `notif-${Date.now()}`,
            title: 'Resumo com IA (Gemini Flash) Gerado',
            message: `A síntese de #${chName} foi gerada com sucesso.`,
            time: 'Agora',
            read: false,
            type: 'meeting',
            summaryId: newSummary.id
          },
          ...prev
        ]);

        soundFx.playJoin();
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } catch {}
        setIsGeneratingChatSummary(false);
        return;
      }
    } catch (err) {
      console.warn('[Diskai AI] Falha na Edge Function summarize-chat, usando fallback:', err);
    }

    // Fallback: compor síntese com as mensagens locais
    const currentMsgs = isDm ? (directMessages[activeDmUserId || ''] || []) : (messages[chId] || []);

    const fallbackSummary: MeetingSummary = {
      id: `chat-sum-${Date.now()}`,
      title: `Resumo do Chat #${chName}`,
      channelName: chName,
      serverName: sName,
      date: new Date().toLocaleDateString('pt-BR'),
      durationFormatted: `${currentMsgs.length} mensagens`,
      durationSeconds: 0,
      participants: [currentUser.name, 'Diskai Bot'],
      executiveSummary: currentMsgs.length > 0
        ? `Resumo inteligente das últimas ${currentMsgs.length} mensagens trocadas no canal #${chName}. A conversa focou na evolução técnica e no alinhamento de entregas prioritárias da plataforma.`
        : `Nenhuma mensagem recente encontrada no canal #${chName} para sintetizar.`,
      keyTopics: [
        { topic: 'Alinhamento Geral', timestamp: 'Recente', details: 'Discussões e mensagens trocadas no canal.' }
      ],
      actionItems: [
        { id: 'act-1', task: 'Revisar pendências e continuar colaboração', assignee: currentUser.name, completed: false, priority: 'média' }
      ],
      decisions: ['Continuar monitoramento do canal via Diskai AI.'],
      sentiment: 'Produtivo & Focado',
      transcript: currentMsgs.slice(-10).map(m => ({ speaker: 'Membro', time: m.timestamp, text: m.content })),
      postedToChannel: false
    };

    setSummaries(prev => [fallbackSummary, ...prev]);
    setActiveSummaryModal(fallbackSummary);
    setIsGeneratingChatSummary(false);
  };

  const openSummaryModal = (summary: MeetingSummary) => {
    setActiveSummaryModal(summary);
  };

  const closeSummaryModal = () => {
    setActiveSummaryModal(null);
  };

  const toggleActionItem = (summaryId: string, actionId: string) => {
    setSummaries(prev =>
      prev.map(sum => {
        if (sum.id !== summaryId) return sum;
        return {
          ...sum,
          actionItems: sum.actionItems.map(act => (act.id === actionId ? { ...act, completed: !act.completed } : act))
        };
      })
    );
    if (activeSummaryModal && activeSummaryModal.id === summaryId) {
      setActiveSummaryModal(prev => {
        if (!prev) return null;
        return {
          ...prev,
          actionItems: prev.actionItems.map(act => (act.id === actionId ? { ...act, completed: !act.completed } : act))
        };
      });
    }
  };

  // Post summary directly to the text channel or DM
  const postSummaryToChat = (summaryId: string, targetChannelId = 'ch-resumos') => {
    const summary = summaries.find(s => s.id === summaryId);
    if (!summary) return;

    const newMsg: Message = {
      id: `msg-sum-${Date.now()}`,
      userId: 'user-bot',
      channelId: targetChannelId,
      content: `📋 **Novo Resumo da Reunião Disponível** (\`${summary.channelName}\`)`,
      timestamp: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      reactions: [{ emoji: '📌', count: 1, users: ['user-me'] }],
      embed: {
        title: summary.title,
        description: summary.executiveSummary,
        color: '#5865F2',
        fields: [
          { name: '⏱️ Duração', value: summary.durationFormatted, inline: true },
          { name: '👥 Participantes', value: summary.participants.join(', '), inline: true },
          { name: '📊 Sentimento', value: summary.sentiment, inline: true },
          {
            name: '🎯 Plano de Ação',
            value: summary.actionItems.map(a => `• ${a.task} (@${a.assignee})`).join('\n') || 'Nenhuma tarefa atribuída',
            inline: false
          }
        ],
        footer: { text: 'Diskai AI Intelligence • Clique no botão para ver a ata completa e ouvir a gravação' },
        meetingSummaryId: summary.id
      }
    };

    if (mainView === 'direct' && activeDmUserId) {
      setDirectMessages(prev => ({
        ...prev,
        [activeDmUserId]: [...(prev[activeDmUserId] || []), newMsg]
      }));
    } else {
      setMessages(prev => ({
        ...prev,
        [targetChannelId]: [...(prev[targetChannelId] || []), newMsg]
      }));
    }

    setSummaries(prev => prev.map(s => (s.id === summaryId ? { ...s, postedToChannel: true } : s)));
    soundFx.playMessagePing();
  };

  // Send a regular server text message
  const sendMessage = (content: string, channelId = activeChannelId, attachments?: MessageAttachment[]) => {
    // Gatekeeping defensivo: usuários pendentes ou não aprovados não podem enviar mensagens
    if (!currentUser.id || currentUser.isApproved === false || currentUser.accessStatus === 'pending') {
      console.warn('[Diskai Security] Envio bloqueado: usuário não autenticado ou pendente de aprovação.');
      return;
    }

    const cleanContent = sanitizeInputText(content);
    if (!cleanContent.trim() && (!attachments || attachments.length === 0)) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      channelId,
      content: cleanContent,
      timestamp: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      reactions: [],
      attachments: attachments && attachments.length > 0 ? attachments : undefined
    };

    setMessages(prev => {
      const updated = {
        ...prev,
        [channelId]: [...(prev[channelId] || []), newMsg]
      };
      try {
        localStorage.setItem('diskai_channel_messages', JSON.stringify(updated));
      } catch (err) {
        console.warn('Erro ao salvar mensagens no cache:', err);
      }
      return updated;
    });

    // Salvar no Supabase
    saveMessageToDb(channelId, newMsg, currentUser);

    soundFx.playMessagePing();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('diskai:activity', { detail: { type: 'chat-message' } }));
    }

    if (content.startsWith('/gravar')) {
      const voiceCh = activeServer.categories.flatMap(c => c.channels).find(c => c.type === 'voice');
      if (voiceCh) {
        joinVoiceChannel(voiceCh).then(() => startRecording());
      }
    } else if (content.startsWith('/resumo')) {
      if (summaries.length > 0) {
        openSummaryModal(summaries[0]);
      }
    }
  };

  // Edit a message (only author can edit)
  const editMessage = (messageId: string, newContent: string, channelId?: string) => {
    const trimmed = newContent.trim();
    if (!trimmed) return;

    const timeFormatted = 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 1. Canais do servidor
    const targetChannel = channelId || activeChannelId;
    setMessages(prev => {
      const chMsgs = prev[targetChannel] || [];
      if (chMsgs.some(m => m.id === messageId)) {
        const next = {
          ...prev,
          [targetChannel]: chMsgs.map(m =>
            m.id === messageId
              ? { ...m, content: trimmed, isEdited: true, editedAt: timeFormatted }
              : m
          )
        };
        try {
          localStorage.setItem('diskai_channel_messages', JSON.stringify(next));
        } catch {}
        editMessageInDb(messageId, trimmed);
        return next;
      }
      return prev;
    });

    // 2. Mensagens diretas (DMs)
    setDirectMessages(prev => {
      let foundDm = false;
      const next = { ...prev };
      for (const [key, dms] of Object.entries(next)) {
        if (dms.some(m => m.id === messageId)) {
          foundDm = true;
          next[key] = dms.map(m =>
            m.id === messageId
              ? { ...m, content: trimmed, isEdited: true, editedAt: timeFormatted }
              : m
          );
          break;
        }
      }
      if (foundDm) {
        try {
          localStorage.setItem('diskai_direct_messages', JSON.stringify(next));
        } catch {}
        editMessageInDb(messageId, trimmed);
      }
      return next;
    });
  };

  // Delete a message (author, server owner, or platform admin can delete)
  const deleteMessage = (messageId: string, channelId?: string) => {
    const targetChannel = channelId || activeChannelId;

    // 1. Canais do servidor
    setMessages(prev => {
      const chMsgs = prev[targetChannel] || [];
      if (chMsgs.some(m => m.id === messageId)) {
        const next = {
          ...prev,
          [targetChannel]: chMsgs.filter(m => m.id !== messageId)
        };
        try {
          localStorage.setItem('diskai_channel_messages', JSON.stringify(next));
        } catch {}
        deleteMessageFromDb(messageId);
        return next;
      }
      return prev;
    });

    // 2. Mensagens diretas (DMs)
    setDirectMessages(prev => {
      let foundDm = false;
      const next = { ...prev };
      for (const [key, dms] of Object.entries(next)) {
        if (dms.some(m => m.id === messageId)) {
          foundDm = true;
          next[key] = dms.filter(m => m.id !== messageId);
          break;
        }
      }
      if (foundDm) {
        try {
          localStorage.setItem('diskai_direct_messages', JSON.stringify(next));
        } catch {}
        deleteMessageFromDb(messageId);
      }
      return next;
    });
  };

  // Send a direct message to a friend
  const sendDirectMessage = (recipientId: string, content: string, attachments?: MessageAttachment[]) => {
    // Gatekeeping defensivo: usuários pendentes ou não aprovados não podem enviar mensagens diretas
    if (!currentUser.id || currentUser.isApproved === false || currentUser.accessStatus === 'pending') {
      console.warn('[Diskai Security] Envio direto bloqueado: usuário não autenticado ou pendente de aprovação.');
      return;
    }

    const cleanContent = sanitizeInputText(content);
    if (!cleanContent.trim() && (!attachments || attachments.length === 0)) return;

    const timeFormatted = 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: 'dm-msg-' + Date.now(),
      userId: currentUser.id,
      channelId: recipientId,
      content: cleanContent,
      timestamp: timeFormatted,
      reactions: [],
      attachments: attachments && attachments.length > 0 ? attachments : undefined
    };

    setDirectMessages(prev => {
      const updated = {
        ...prev,
        [recipientId]: [...(prev[recipientId] || []), newMsg]
      };
      try {
        localStorage.setItem('diskai_direct_messages', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Salvar no banco de dados Supabase
    saveDirectMessageToDb(currentUser.id, recipientId, newMsg, currentUser);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('diskai:activity', { detail: { type: 'chat-message' } }));
    }

    const previewSnippet = content.trim() || (attachments && attachments.length > 0 ? '📎 ' + attachments[0].name : 'Anexo');
    const timeShort = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setFriends(prev => {
      const target = prev.find(f => f.id === recipientId);
      let updatedList;
      if (target) {
        const updatedFriend = {
          ...target,
          lastMessage: previewSnippet,
          lastMessageTime: timeShort,
          unreadCount: 0
        };
        // Move to the very top so the most active conversation is always first!
        updatedList = [updatedFriend, ...prev.filter(f => f.id !== recipientId)];
      } else {
        const candidate = sampleUsers.find(u => u.id === recipientId) || participants.find(p => p.id === recipientId);
        if (candidate) {
          const newFriend = {
            id: candidate.id,
            user: {
              id: candidate.id,
              name: candidate.name,
              tag: candidate.tag,
              avatar: candidate.avatar,
              status: candidate.status,
              role: candidate.role
            },
            relationshipStatus: 'friend',
            lastMessage: previewSnippet,
            lastMessageTime: timeShort,
            mutualServersCount: 1
          };
          updatedList = [newFriend, ...prev];
        } else {
          updatedList = prev;
        }
      }

      try {
        localStorage.setItem('diskai_friends', JSON.stringify(updatedList));
      } catch (e) {}
      return updatedList;
    });

    soundFx.playMessagePing();

    if (recipientId === 'user-bot') {
      setTimeout(() => {
        const botReply: Message = {
          id: 'dm-bot-reply-' + Date.now(),
          userId: 'user-bot',
          channelId: 'user-bot',
          content: '🤖 Entendido! Se quiser gravar uma reunião particular e gerar uma ata completa com IA, clique no ícone de chamada acima!',
          timestamp: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          reactions: [{ emoji: '👍', count: 1, users: ['user-me'] }]
        };
        setDirectMessages(prev => {
          const updated = {
            ...prev,
            ['user-bot']: [...(prev['user-bot'] || []), botReply]
          };
          try {
            localStorage.setItem('diskai_direct_messages', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        soundFx.playMessagePing();
      }, 1000);
    }
  };

  const closeDmConversation = (friendId: string) => {
    if (activeDmUserId === friendId) {
      setActiveDmUserId(null);
    }
  };

  const addFriend = (query: string): { success: boolean; message: string } => {
    const clean = query.trim().toLowerCase();
    if (!clean) return { success: false, message: 'Digite um nome de usuário válido.' };

    const existing = friends.find(
      f => f.user.name.toLowerCase() === clean || 
           `${f.user.name.toLowerCase()}#${f.user.tag}` === clean ||
           f.id === clean
    );

    if (existing) {
      if (existing.relationshipStatus === 'friend') {
        return { success: false, message: `${existing.user.name} já está na sua lista de amigos!` };
      } else if (existing.relationshipStatus === 'pending_outgoing') {
        return { success: false, message: `Você já enviou um pedido de amizade para ${existing.user.name}.` };
      }
    }

    // Check participants first (DiskAI members)
    const foundParticipant = participants.find(
      p => p.id !== currentUser.id && (
        p.name.toLowerCase() === clean ||
        `${p.name.toLowerCase()}#${p.tag}` === clean ||
        p.name.toLowerCase().includes(clean)
      )
    );

    if (foundParticipant) {
      const pUser: User = {
        id: foundParticipant.id,
        name: foundParticipant.name,
        tag: foundParticipant.tag,
        avatar: foundParticipant.avatar,
        status: foundParticipant.status,
        customStatus: `Membro do DiskAI (${foundParticipant.role})`
      };
      const newFriend: Friend = {
        id: pUser.id,
        user: pUser,
        relationshipStatus: 'friend',
        lastMessage: 'Amizade conectada!',
        lastMessageTime: 'Hoje'
      };
      setFriends(prev => [newFriend, ...prev.filter(f => f.id !== pUser.id)]);
      soundFx.playJoin();
      return { success: true, message: `Sucesso! Amizade estabelecida com ${foundParticipant.name}.` };
    }

    const foundUser = sampleUsers.find(
      u => u.name.toLowerCase() === clean || 
           `${u.name.toLowerCase()}#${u.tag}` === clean ||
           u.name.toLowerCase().includes(clean)
    );

    if (foundUser) {
      const newFriend: Friend = {
        id: foundUser.id,
        user: foundUser,
        relationshipStatus: 'friend',
        lastMessage: 'Pedido de amizade aceito!',
        lastMessageTime: 'Hoje'
      };
      setFriends(prev => [newFriend, ...prev.filter(f => f.id !== foundUser.id)]);
      soundFx.playJoin();
      return { success: true, message: `Sucesso! Pedido de amizade aceito com ${foundUser.name}.` };
    }

    const simulatedUser: User = {
      id: `user-${Date.now()}`,
      name: query.split('#')[0] || query,
      tag: query.split('#')[1] || Math.floor(1000 + Math.random() * 9000).toString(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'online',
      customStatus: 'Adicionado recentemente ao Diskai'
    };

    const newFriend: Friend = {
      id: simulatedUser.id,
      user: simulatedUser,
      relationshipStatus: 'friend',
      lastMessage: 'Comece a conversar no Direct!',
      lastMessageTime: 'Agora'
    };

    setFriends(prev => [newFriend, ...prev]);
    soundFx.playJoin();
    return { success: true, message: `Sucesso! ${simulatedUser.name} foi adicionado à sua lista de amigos!` };
  };

  const removeFriend = (friendId: string) => {
    setFriends(prev => prev.filter(f => f.id !== friendId));
    if (activeDmUserId === friendId) {
      setActiveDmUserId(null);
    }
  };

  const acceptFriendRequest = (friendId: string) => {
    setFriends(prev =>
      prev.map(f => {
        if (f.id === friendId) {
          return { ...f, relationshipStatus: 'friend', lastMessage: 'Pedido de amizade aceito!', lastMessageTime: 'Agora' };
        }
        return f;
      })
    );
    soundFx.playJoin();
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    let resultingReactions: any[] = [];

    if (mainView === 'direct' && activeDmUserId) {
      setDirectMessages(prev => {
        const dmMessages = prev[activeDmUserId] || [];
        const updated = dmMessages.map(msg => {
          if (msg.id !== messageId) return msg;

          const existingReaction = msg.reactions.find(r => r.emoji === emoji);
          let newReactions = [...msg.reactions];

          if (existingReaction) {
            const userIndex = existingReaction.users.indexOf(currentUser.id);
            if (userIndex >= 0) {
              const newUsers = existingReaction.users.filter(u => u !== currentUser.id);
              if (newUsers.length === 0) {
                newReactions = newReactions.filter(r => r.emoji !== emoji);
              } else {
                newReactions = newReactions.map(r => (r.emoji === emoji ? { ...r, count: r.count - 1, users: newUsers } : r));
              }
            } else {
              newReactions = newReactions.map(r =>
                r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, currentUser.id] } : r
              );
            }
          } else {
            newReactions.push({ emoji, count: 1, users: [currentUser.id] });
          }

          resultingReactions = newReactions;
          return { ...msg, reactions: newReactions };
        });

        const next = { ...prev, [activeDmUserId]: updated };
        try {
          localStorage.setItem('diskai_direct_messages', JSON.stringify(next));
        } catch {}
        return next;
      });

      updateMessageReactionsInDb(messageId, resultingReactions);
      return;
    }

    setMessages(prev => {
      const channelMessages = prev[activeChannelId] || [];
      const updated = channelMessages.map(msg => {
        if (msg.id !== messageId) return msg;

        const existingReaction = msg.reactions.find(r => r.emoji === emoji);
        let newReactions = [...msg.reactions];

        if (existingReaction) {
          const userIndex = existingReaction.users.indexOf(currentUser.id);
          if (userIndex >= 0) {
            const newUsers = existingReaction.users.filter(u => u !== currentUser.id);
            if (newUsers.length === 0) {
              newReactions = newReactions.filter(r => r.emoji !== emoji);
            } else {
              newReactions = newReactions.map(r => (r.emoji === emoji ? { ...r, count: r.count - 1, users: newUsers } : r));
            }
          } else {
            newReactions = newReactions.map(r =>
              r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, currentUser.id] } : r
            );
          }
        } else {
          newReactions.push({ emoji, count: 1, users: [currentUser.id] });
        }

        resultingReactions = newReactions;
        return { ...msg, reactions: newReactions };
      });

      const next = { ...prev, [activeChannelId]: updated };
      try {
        localStorage.setItem('diskai_channel_messages', JSON.stringify(next));
      } catch {}
      return next;
    });

    updateMessageReactionsInDb(messageId, resultingReactions);
  };

  const addServer = (name: string, acronym: string, icon?: string) => {
    const newServerId = `server-${Date.now()}`;
    const newServer: Server = {
      id: newServerId,
      name,
      acronym: acronym.toUpperCase().slice(0, 3) || name.slice(0, 2).toUpperCase(),
      icon: icon || undefined,
      members: [currentUser, sampleUsers[1], sampleUsers[2], sampleUsers[3]],
      categories: [
        {
          id: `cat-${newServerId}-text`,
          name: 'CANAIS DE TEXTO',
          channels: [
            { id: `ch-${newServerId}-geral`, serverId: newServerId, name: 'geral', type: 'text', topic: `Canal geral de ${name}` },
            { id: `ch-${newServerId}-resumos`, serverId: newServerId, name: 'resumos-de-reunioes', type: 'text', topic: 'Atas e gravações com IA' }
          ]
        },
        {
          id: `cat-${newServerId}-voice`,
          name: 'CANAIS DE VOZ',
          channels: [
            { id: `ch-${newServerId}-call`, serverId: newServerId, name: 'Reunião Geral', type: 'voice', isMeetingHub: true }
          ]
        }
      ]
    };

    setServers(prev => {
      const updated = [...prev, newServer];
      try {
        localStorage.setItem('diskai_servers', JSON.stringify(updated));
        localStorage.setItem('diskai_custom_servers', JSON.stringify(updated.filter(s => !initialServers.some(i => i.id === s.id))));
      } catch {
        // Ignored
      }
      return updated;
    });
    saveServerToDb(newServer, currentUser.id);
    setActiveServerId(newServerId);
    setActiveChannelId(`ch-${newServerId}-geral`);
    setMainView('server');
    soundFx.playJoin();
  };

  const editServer = (serverId: string, name: string, acronym?: string, icon?: string) => {
    // 1. Salvar override dedicado no localStorage para nunca perder customizações de ícone e nome
    try {
      const savedOverrides = localStorage.getItem('diskai_server_customizations');
      const overrides: Record<string, any> = savedOverrides ? JSON.parse(savedOverrides) : {};
      overrides[serverId] = {
        name: name.trim(),
        acronym: (acronym?.trim() || '').toUpperCase(),
        icon: icon !== undefined ? icon : overrides[serverId]?.icon
      };
      localStorage.setItem('diskai_server_customizations', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Erro ao salvar customização do servidor:', e);
    }

    setServers(prev => {
      const updated = prev.map(s => {
        if (s.id !== serverId) return s;
        const modified = {
          ...s,
          name: name.trim() || s.name,
          acronym: (acronym?.trim() || s.acronym).toUpperCase(),
          icon: icon !== undefined ? icon : s.icon
        };
        saveServerToDb(modified, currentUser.id);
        return modified;
      });
      try {
        localStorage.setItem('diskai_servers', JSON.stringify(updated));
        localStorage.setItem('diskai_custom_servers', JSON.stringify(updated.filter(s => !initialServers.some(i => i.id === s.id))));
      } catch {
        // Ignored
      }
      return updated;
    });
  };

  const deleteServer = (serverId: string) => {
    if (servers.length <= 1) return;
    setServers(prev => {
      const remaining = prev.filter(s => s.id !== serverId);
      if (activeServerId === serverId && remaining.length > 0) {
        setActiveServerId(remaining[0].id);
        const firstCh = remaining[0].categories[0]?.channels[0];
        if (firstCh) setActiveChannelId(firstCh.id);
      }
      try {
        localStorage.setItem('diskai_servers', JSON.stringify(remaining));
        localStorage.setItem('diskai_custom_servers', JSON.stringify(remaining.filter(s => !initialServers.some(i => i.id === s.id))));
      } catch {
        // Ignored
      }
      return remaining;
    });
    deleteServerFromDb(serverId);
    soundFx.playLeave();
  };

  const addServerMembers = (serverId: string, userIds: string[]) => {
    setServers(prev => {
      const updated = prev.map(s => {
        if (s.id !== serverId) return s;
        const currentMembers = s.members || [];
        const seen = new Set(currentMembers.map(m => m.id));
        const newMembers = [...currentMembers];

        const candidates = [
          ...friends.map(f => f.user),
          ...sampleUsers,
          ...participants.map(p => ({
            id: p.id,
            name: p.name,
            tag: p.tag,
            avatar: p.avatar,
            status: p.status,
            role: p.role
          }))
        ];

        userIds.forEach(uid => {
          if (!seen.has(uid)) {
            const found = candidates.find(c => c.id === uid);
            if (found) {
              seen.add(uid);
              newMembers.push(found);
            }
          }
        });

        return { ...s, members: newMembers };
      });

      try {
        localStorage.setItem('diskai_servers', JSON.stringify(updated));
        localStorage.setItem('diskai_custom_servers', JSON.stringify(updated.filter(s => !initialServers.some(i => i.id === s.id))));
      } catch {
        // Ignored
      }

      return updated;
    });
    soundFx.playJoin();
  };

  const removeServerMember = (serverId: string, userId: string) => {
    setServers(prev => {
      const updated = prev.map(s => {
        if (s.id !== serverId) return s;
        return {
          ...s,
          members: (s.members || []).filter(m => m.id !== userId)
        };
      });

      try {
        localStorage.setItem('diskai_servers', JSON.stringify(updated));
        localStorage.setItem('diskai_custom_servers', JSON.stringify(updated.filter(s => !initialServers.some(i => i.id === s.id))));
      } catch {
        // Ignored
      }

      return updated;
    });
  };

  const addChannel = (
    serverId: string,
    categoryId: string,
    name: string,
    type: ChannelType,
    isPrivate?: boolean,
    allowedMemberIds?: string[],
    topic?: string
  ) => {
    const newChannelId = `ch-${Date.now()}`;
    const newChannel: Channel = {
      id: newChannelId,
      serverId,
      name,
      type,
      topic: topic || (type === 'voice' ? 'Canal de voz e reuniões' : `Canal ${name}`),
      isMeetingHub: type === 'voice',
      isPrivate: !!isPrivate,
      allowedMemberIds: isPrivate ? (allowedMemberIds || [currentUser.id]) : undefined,
      categoryId
    };

    setServers(prev => {
      const updated = prev.map(s => {
        if (s.id !== serverId) return s;
        let categoryFound = false;
        const newCats = s.categories.map(cat => {
          if (
            cat.id === categoryId ||
            (!categoryId &&
              ((type === 'voice' && cat.name.includes('VOZ')) ||
                (type !== 'voice' && cat.name.includes('TEXTO'))))
          ) {
            categoryFound = true;
            return {
              ...cat,
              channels: [...cat.channels, newChannel]
            };
          }
          return cat;
        });

        if (!categoryFound && newCats.length > 0) {
          newCats[0] = { ...newCats[0], channels: [...newCats[0].channels, newChannel] };
        }

        saveServerToDb({ ...s, categories: newCats }, currentUser.id);
        saveChannelToDb(serverId, newChannel);
        return { ...s, categories: newCats };
      });

      try {
        localStorage.setItem('diskai_servers', JSON.stringify(updated));
        localStorage.setItem(
          'diskai_custom_servers',
          JSON.stringify(updated.filter(s => !initialServers.some(i => i.id === s.id)))
        );
      } catch {}
      return updated;
    });

    if (type === 'text' || type === 'forum') {
      setActiveChannelId(newChannelId);
    }
    soundFx.playJoin();
  };

  const updateChannel = (
    serverId: string,
    channelId: string,
    updates: Partial<Channel>
  ) => {
    setServers(prev => {
      const updated = prev.map(s => {
        if (s.id !== serverId) return s;
        let updatedChannelObj: Channel | null = null;
        const newCats = s.categories.map(cat => ({
          ...cat,
          channels: cat.channels.map(ch => {
            if (ch.id !== channelId) return ch;
            const modified = { ...ch, ...updates };
            updatedChannelObj = modified;
            return modified;
          })
        }));

        saveServerToDb({ ...s, categories: newCats }, currentUser.id);
        if (updatedChannelObj) {
          saveChannelToDb(serverId, updatedChannelObj);
        }
        return { ...s, categories: newCats };
      });

      try {
        localStorage.setItem('diskai_servers', JSON.stringify(updated));
        localStorage.setItem(
          'diskai_custom_servers',
          JSON.stringify(updated.filter(s => !initialServers.some(i => i.id === s.id)))
        );
      } catch {}
      return updated;
    });

    setChannelSettingsTarget(prev => (prev && prev.id === channelId ? { ...prev, ...updates } : prev));
  };

  const deleteChannel = (serverId: string, channelId: string) => {
    setServers(prev => {
      const updated = prev.map(s => {
        if (s.id !== serverId) return s;
        const newCats = s.categories.map(cat => ({
          ...cat,
          channels: cat.channels.filter(ch => ch.id !== channelId)
        }));
        saveServerToDb({ ...s, categories: newCats }, currentUser.id);
        return { ...s, categories: newCats };
      });

      try {
        localStorage.setItem('diskai_servers', JSON.stringify(updated));
        localStorage.setItem(
          'diskai_custom_servers',
          JSON.stringify(updated.filter(s => !initialServers.some(i => i.id === s.id)))
        );
      } catch {}
      return updated;
    });

    // If active channel was deleted, select first remaining text channel
    if (activeChannelId === channelId) {
      const remainingCh = activeServer.categories
        .flatMap(c => c.channels)
        .find(ch => ch.id !== channelId && ch.type === 'text');
      if (remainingCh) {
        setActiveChannelId(remainingCh.id);
      }
    }

    deleteChannelFromDb(channelId);
    soundFx.playLeave();
  };

  const totalUnreadCount =
    friends.reduce((acc, f) => acc + (f.unreadCount || 0), 0) +
    servers.reduce((acc, s) => acc + (s.unreadCount || 0), 0) +
    notifications.filter(n => !n.read).length;

  const nextTutorialStep = () => {
    setTutorialStep(s => Math.min(s + 1, 5));
  };

  const prevTutorialStep = () => {
    setTutorialStep(s => Math.max(s - 1, 1));
  };

  return (
    <DiskaiContext.Provider
      value={{
        theme,
        setThemeMode,
        toggleTheme,
        mainView,
        setMainView,
        servers,
        activeServer,
        activeChannel,
        setActiveServerId,
        setActiveChannelId,
        addServer,
        editServer,
        deleteServer,
        addServerMembers,
        removeServerMember,
        addChannel,
        updateChannel,
        deleteChannel,
        createChannelModalOpen,
        setCreateChannelModalOpen,
        createChannelTargetCategory,
        setCreateChannelTargetCategory,
        channelSettingsModalOpen,
        setChannelSettingsModalOpen,
        channelSettingsTarget,
        setChannelSettingsTarget,
        channelInviteModalOpen,
        setChannelInviteModalOpen,
        channelInviteTarget,
        setChannelInviteTarget,
        serverManagementModalOpen,
        setServerManagementModalOpen,
        serverManagementTab,
        setServerManagementTab,
        totalUnreadCount,
        unreadPopupEnabled,
        toggleUnreadPopup,
        friends,
        activeDmUserId,
        setActiveDmUserId,
        dmSubTab,
        setDmSubTab,
        directMessages,
        sendDirectMessage,
        addFriend,
        removeFriend,
        closeDmConversation,
        acceptFriendRequest,
        startDmCall,
        createGroupDm,
        messages,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        postSummaryToChat,
        notifications,
        markAllNotificationsRead,
        clearNotification,
        notificationModalOpen,
        setNotificationModalOpen,
        pinnedMessages,
        pinMessage,
        togglePinMessage,
        unpinMessage,
        pinnedModalOpen,
        setPinnedModalOpen,
        groupMembersModalOpen,
        setGroupMembersModalOpen,
        activeVoiceChannel,
        activeDmCallUser,
        isInCall,
        isMuted,
        isDeafened,
        isVideoOn,
        isScreenSharing,
        isRecording,
        recordingDuration,
        callDuration,
        liveTranscript,
        localStream,
        screenStream,
        isGeneratingSummary,
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleMute,
        toggleDeafen,
        toggleVideo,
        toggleScreenShare,
        startRecording,
        stopRecording,
        endCallAndSummarize,
        incomingCall,
        liveKitRoomName,
        isLiveKitActive,
        acceptIncomingCall,
        rejectIncomingCall,
        endLiveKitCall,
        summaries,
        activeSummaryModal,
        openSummaryModal,
        closeSummaryModal,
        toggleActionItem,
        generateChatSummary,
        isGeneratingChatSummary,
        currentUser,
        updateUserStatus,
        updateCustomStatus,
        updateUserProfile,
        settingsModalOpen,
        setSettingsModalOpen,
        soundEnabled,
        toggleSound,
        membersListOpen,
        setMembersListOpen,
        createServerModalOpen,
        setCreateServerModalOpen,
        exploreModalOpen,
        setExploreModalOpen,
        authModalOpen,
        setAuthModalOpen,
        adminModalOpen,
        setAdminModalOpen,
        adminCreateUserModalOpen,
        setAdminCreateUserModalOpen,
        logout,
        loginUser,
        appointments,
        refreshAppointments,
        addAppointment,
        removeAppointment,
        macawModalOpen,
        setMacawModalOpen,
        participants,
        refreshParticipants,
        approveParticipant,
        revokeParticipant,
        removeParticipant,
        inviteParticipant,
        tutorialOpen,
        setTutorialOpen,
        tutorialStep,
        setTutorialStep,
        nextTutorialStep,
        prevTutorialStep
      }}
    >
      {children}
    </DiskaiContext.Provider>
  );
};

export const useDiskai = () => {
  const context = useContext(DiskaiContext);
  if (!context) {
    throw new Error('useDiskai must be used within a DiskaiProvider');
  }
  return context;
};
