import { ReactNode } from 'react';

export enum Platform {
  Instagram = 'Instagram',
  TikTok = 'TikTok',
  OnlyFans = 'OnlyFans',
  YouTube = 'YouTube',
  Twitch = 'Twitch',
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  banner: string;
  bio: string;
  email?: string;
  isVerified: boolean;
  friendIds: string[];
  friendRequestIds?: string[]; // This will be deprecated in favor of the new system
  platformLinks: { platform: Platform; url:string }[];
  tags?: string[];
  county?: string;
  state?: string;
  customLink?: string;
  blockedUserIds?: string[];
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: number;
  tags: Platform[];
}

export interface Collaboration {
  id: string;
  authorId: string;
  title: string;
  description: string;
  image?: string;
  timestamp: string;
  status: 'open' | 'closed';
  interestedUserIds: string[];
}

export enum NotificationType {
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_REQUEST_ACCEPTED = 'FRIEND_REQUEST_ACCEPTED',
  FRIEND_REQUEST_DECLINED = 'FRIEND_REQUEST_DECLINED',
  COLLAB_REQUEST = 'COLLAB_REQUEST',
  POST_LIKE = 'POST_LIKE',
  NEW_MESSAGE = 'NEW_MESSAGE',
}

export interface Notification {
  id: string;
  userId: string; // The user who *receives* the notification
  actorId: string; // The user who *performed* the action
  type: NotificationType;
  entityType?: 'friend_request' | 'post' | 'collaboration' | 'user';
  entityId?: string;
  message: string;
  isRead: boolean;
  timestamp: string;
}

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  timestamp: string;
}

export interface PushSubscriptionObject {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
}

export type ConversationFolder = 'contact_list' | 'general' | 'hidden';

export interface Conversation {
    id: string;
    participantIds: string[];
    messages: Message[];
    folder: ConversationFolder;
}

export interface Feedback {
  id: string;
  userId: string;
  type: 'Bug Report' | 'Suggestion';
  content: string;
  timestamp: string;
}

export interface IconCollection {
  [key: string]: ReactNode;
}

export type Page = 'feed' | 'explore' | 'notifications' | 'messages' | 'search' | 'profile' | 'collaborations' | 'admin' | 'interestedUsers';

export type PageContext = {
  viewingProfileId?: string | null;
  viewingCollaborationId?: string | null;
  adminTab?: 'dashboard' | 'feedback';
};

export type NavigationEntry = {
  page: Page;
  context: PageContext;
  scrollTop?: number;
};