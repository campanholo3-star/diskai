export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface User {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  status: UserStatus;
  customStatus?: string;
  role?: string;
  email?: string;
  accessStatus?: 'approved' | 'pending' | 'rejected' | 'revoked';
  isApproved?: boolean;
  isBot?: boolean;
  bannerColor?: string;
  pronouns?: string;
  bio?: string;
  full_name?: string;
  avatar_url?: string;
  activity?: {
    type: 'playing' | 'listening' | 'streaming' | 'meeting';
    name: string;
    details?: string;
  };
}

export interface Friend {
  id: string;
  user: User;
  relationshipStatus: 'friend' | 'pending_incoming' | 'pending_outgoing' | 'blocked';
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  mutualServersCount?: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  completed: boolean;
  priority?: 'alta' | 'média' | 'baixa';
}

export interface MeetingSummary {
  id: string;
  title: string;
  channelName: string;
  serverName: string;
  date: string;
  durationFormatted: string;
  durationSeconds: number;
  participants: string[];
  audioUrl?: string;
  recordedBlob?: Blob;
  executiveSummary: string;
  keyTopics: { topic: string; timestamp: string; details: string }[];
  actionItems: ActionItem[];
  decisions: string[];
  sentiment: 'Altamente Positivo' | 'Produtivo & Focado' | 'Descontraído' | 'Crítico';
  transcript: { speaker: string; time: string; text: string }[];
  postedToChannel?: boolean;
  creatorId?: string;
  creatorName?: string;
  titlePending?: boolean;
  meetingNotes?: string;
}

export interface MessageEmbed {
  title: string;
  description: string;
  color?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; iconUrl?: string };
  meetingSummaryId?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  type: string; // MIME type (e.g. image/png, application/pdf, video/mp4)
  url: string; // Base64 data URL or remote storage URL
}

export interface Message {
  id: string;
  userId: string;
  senderId?: string;
  conversationId?: string;
  channelId: string; // channel ID or recipient user ID (for DMs)
  content: string;
  timestamp: string;
  reactions: Reaction[];
  attachments?: MessageAttachment[];
  embed?: MessageEmbed;
  isSystem?: boolean;
  pinned?: boolean;
  isEdited?: boolean;
  editedAt?: string;
}

export type ChannelType = 'text' | 'voice' | 'forum';

export interface ChannelLink {
  id: string;
  label: string;
  url: string;
  isEmail?: boolean;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  topic?: string;
  isMeetingHub?: boolean; // specialized voice channel with recording emphasis
  unread?: boolean;
  isPrivate?: boolean;
  allowedMemberIds?: string[];
  slowMode?: number; // 0 = off, seconds
  isSpoiler?: boolean;
  categoryId?: string;
  creatorId?: string;
  coverUrl?: string;
  bibliography?: string;
  links?: ChannelLink[];
}

export interface ChannelCategory {
  id: string;
  name: string;
  channels: Channel[];
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
  acronym: string;
  ownerId?: string;
  categories: ChannelCategory[];
  members: User[];
  unreadCount?: number;
}

export type MainViewMode = 'server' | 'direct';
export type DmSubTab = 'online' | 'all' | 'pending' | 'blocked' | 'add';
export type ThemeMode = 'dark' | 'light' | 'emerald' | 'crimson' | 'sakura';

export interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  tip: string;
  actionText?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'meeting' | 'friend' | 'mention';
  summaryId?: string;
}

export interface PinnedMessageItem {
  id: string;
  channelId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export interface AuthUserAccount {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  name: string;
  full_name?: string;
  email?: string;
  tag: string;
  avatar: string;
  avatar_url?: string;
  status: UserStatus;
  customStatus?: string;
  role: 'Administrador' | 'Membro' | 'Convidado' | 'admin' | 'user';
  accessStatus: 'approved' | 'pending' | 'rejected' | 'revoked';
  isApproved?: boolean;
  joinedAt: string;
  isBot?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name?: string;
  serverId?: string;
  channelId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  lastReadAt?: string;
}

export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended';

export interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: CallStatus;
  room_name?: string;
  with_video?: boolean;
  created_at: string;
  ended_at?: string;
  caller?: Partial<User>;
  receiver?: Partial<User>;
}

export interface IncomingCallData {
  callId: string;
  caller: {
    id: string;
    name: string;
    avatar: string;
    tag?: string;
  };
  withVideo: boolean;
  roomName: string;
  createdAt: string;
}

