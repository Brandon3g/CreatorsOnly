// services/appData.ts
// Centralized data helpers for AppContext. These utilities expose strongly-typed
// fetchers/mutators for the Supabase tables that back the legacy in-memory
// state slices (users, posts, notifications, etc.).

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  Collaboration,
  Conversation,
  ConversationFolder,
  Feedback,
  FriendRequest,
  FriendRequestStatus,
  Message,
  Notification,
  NotificationType,
  Post,
  PushSubscriptionObject,
  User,
} from '../types';

import type { Post as DbPost } from './posts';

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function rowToUser(row: any): User {
  return {
    id: row.id,
    name: row.name ?? '',
    username: row.username ?? '',
    avatar: row.avatar ?? '',
    banner: row.banner ?? '',
    bio: row.bio ?? '',
    email: row.email ?? undefined,
    isVerified: row.is_verified ?? row.isVerified ?? false,
    friendIds: row.friend_ids ?? row.friendIds ?? [],
    platformLinks: row.platform_links ?? row.platformLinks ?? [],
    tags: row.tags ?? undefined,
    county: row.county ?? undefined,
    state: row.state ?? undefined,
    customLink: row.custom_link ?? row.customLink ?? undefined,
    blockedUserIds: row.blocked_user_ids ?? row.blockedUserIds ?? [],
  } as User;
}

function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    actorId: row.actor_id ?? row.actorId,
    type: (row.type ?? NotificationType.FRIEND_REQUEST) as NotificationType,
    entityType: row.entity_type ?? row.entityType ?? undefined,
    entityId: row.entity_id ?? row.entityId ?? undefined,
    message: row.message ?? '',
    isRead: row.is_read ?? row.isRead ?? false,
    timestamp: row.created_at ?? row.timestamp ?? new Date().toISOString(),
  };
}

function dbPostToLegacy(post: DbPost): Post {
  return {
    id: post.id,
    authorId: post.user_id,
    content: post.content ?? '',
    image: post.media_url ?? undefined,
    timestamp: post.created_at ?? new Date().toISOString(),
    likes: (post as any).likes ?? 0,
    comments: (post as any).comments ?? 0,
    tags: (post as any).tags ?? [],
  };
}

function rowToCollaboration(row: any): Collaboration {
  return {
    id: row.id,
    authorId: row.author_id ?? row.authorId,
    title: row.title ?? '',
    description: row.description ?? '',
    image: row.image ?? undefined,
    timestamp: row.created_at ?? row.timestamp ?? new Date().toISOString(),
    status: row.status ?? 'open',
    interestedUserIds: row.interested_user_ids ?? row.interestedUserIds ?? [],
  };
}

function rowToMessage(row: any): Message {
  return {
    id: row.id,
    senderId: row.sender_id ?? row.senderId,
    receiverId: row.receiver_id ?? row.receiverId,
    text: row.text ?? '',
    timestamp: row.created_at ?? row.timestamp ?? new Date().toISOString(),
  };
}

function rowToConversation(row: any, messages: Message[]): Conversation {
  return {
    id: row.id,
    participantIds: row.participant_ids ?? row.participantIds ?? [],
    messages,
    folder: (row.folder ?? 'general') as ConversationFolder,
  };
}

function rowToFeedback(row: any): Feedback {
  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    type: row.type,
    content: row.content ?? '',
    timestamp: row.created_at ?? row.timestamp ?? new Date().toISOString(),
  };
}

function rowToFriendRequest(row: any): FriendRequest {
  return {
    id: row.id,
    fromUserId: row.sender_id ?? row.fromUserId,
    toUserId: row.receiver_id ?? row.toUserId,
    status: (row.status ?? FriendRequestStatus.PENDING) as FriendRequestStatus,
    timestamp: row.created_at ?? row.timestamp ?? new Date().toISOString(),
  };
}

function rowToPushSubscription(row: any): PushSubscriptionObject | null {
  if (!row) return null;
  if (row.subscription) return row.subscription as PushSubscriptionObject;
  if (row.endpoint && row.keys) {
    return {
      endpoint: row.endpoint,
      keys: row.keys,
    } as PushSubscriptionObject;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToUser);
}

export async function fetchNotifications(userId?: string | null): Promise<Notification[]> {
  let query = supabase.from('notifications').select('*');
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNotification);
}

export async function fetchCollaborations(): Promise<Collaboration[]> {
  const { data, error } = await supabase
    .from('collaborations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToCollaboration);
}

export async function fetchFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToFeedback);
}

export async function fetchFriendRequests(userId?: string | null): Promise<FriendRequest[]> {
  let query = supabase.from('friend_requests').select('*');
  if (userId) {
    query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToFriendRequest);
}

export async function fetchPushSubscriptions(): Promise<Record<string, PushSubscriptionObject>> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');
  if (error) throw error;
  const result: Record<string, PushSubscriptionObject> = {};
  (data ?? []).forEach((row: any) => {
    const parsed = rowToPushSubscription(row);
    if (parsed) {
      const owner = row.user_id ?? row.userId ?? row.id;
      if (owner) {
        result[owner] = parsed;
      }
    }
  });
  return result;
}

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, content, media_url, created_at, likes, comments, tags')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DbPost[] | null)?.map(dbPostToLegacy) ?? [];
}

export async function fetchConversations(): Promise<Conversation[]> {
  const { data: conversationRows, error: convError } = await supabase
    .from('conversations')
    .select('*');
  if (convError) throw convError;

  const { data: messageRows, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });
  if (msgError) throw msgError;

  const messagesByConversation = new Map<string, Message[]>();
  (messageRows ?? []).forEach((row: any) => {
    const message = rowToMessage(row);
    const list = messagesByConversation.get(row.conversation_id) ?? [];
    list.push(message);
    messagesByConversation.set(row.conversation_id, list);
  });

  return (conversationRows ?? []).map((row: any) =>
    rowToConversation(row, messagesByConversation.get(row.id) ?? [])
  );
}

// ---------------------------------------------------------------------------
// Mutation helpers
// ---------------------------------------------------------------------------

export async function upsertPushSubscription(
  userId: string,
  subscription: PushSubscriptionObject,
): Promise<void> {
  requireSupabase();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, subscription },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

export async function createNotification(
  payload: Omit<Notification, 'id' | 'timestamp' | 'isRead'> & { isRead?: boolean },
): Promise<Notification> {
  requireSupabase();
  const insertPayload = {
    user_id: payload.userId,
    actor_id: payload.actorId,
    type: payload.type,
    entity_type: payload.entityType ?? null,
    entity_id: payload.entityId ?? null,
    message: payload.message,
    is_read: payload.isRead ?? false,
  };
  const { data, error } = await supabase
    .from('notifications')
    .insert(insertPayload)
    .select('*')
    .single();
  if (error) throw error;
  return rowToNotification(data);
}

export async function markNotificationsRead(ids: string[]): Promise<Notification[]> {
  requireSupabase();
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids)
    .select('*');
  if (error) throw error;
  return (data ?? []).map(rowToNotification);
}

export async function createCollaboration(
  payload: Omit<Collaboration, 'id' | 'timestamp' | 'interestedUserIds'> & {
    interestedUserIds?: string[];
  },
): Promise<Collaboration> {
  requireSupabase();
  const { data, error } = await supabase
    .from('collaborations')
    .insert({
      author_id: payload.authorId,
      title: payload.title,
      description: payload.description,
      image: payload.image ?? null,
      status: payload.status,
      interested_user_ids: payload.interestedUserIds ?? [],
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToCollaboration(data);
}

export async function updateCollaborationRow(
  collabId: string,
  patch: Partial<Collaboration>,
): Promise<Collaboration> {
  requireSupabase();
  const { data, error } = await supabase
    .from('collaborations')
    .update({
      title: patch.title,
      description: patch.description,
      image: patch.image ?? null,
      status: patch.status,
      interested_user_ids: patch.interestedUserIds,
    })
    .eq('id', collabId)
    .select('*')
    .single();
  if (error) throw error;
  return rowToCollaboration(data);
}

export async function deleteCollaborationRow(collabId: string): Promise<void> {
  requireSupabase();
  const { error } = await supabase
    .from('collaborations')
    .delete()
    .eq('id', collabId);
  if (error) throw error;
}

export async function upsertCollaborationInterest(
  collabId: string,
  interestedUserIds: string[],
): Promise<Collaboration> {
  requireSupabase();
  const { data, error } = await supabase
    .from('collaborations')
    .update({ interested_user_ids: interestedUserIds })
    .eq('id', collabId)
    .select('*')
    .single();
  if (error) throw error;
  return rowToCollaboration(data);
}

export async function createMessage(
  conversationId: string,
  message: Omit<Message, 'id' | 'timestamp'>,
): Promise<Message> {
  requireSupabase();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: message.senderId,
      receiver_id: message.receiverId,
      text: message.text,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToMessage(data);
}

export async function ensureConversation(
  participantIds: string[],
): Promise<Conversation> {
  requireSupabase();
  const sorted = [...participantIds].sort();
  const filter = sorted.map((id, idx) => `participant_ids->>${idx}=eq.${id}`).join(',');
  let query = supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: true });
  if (filter) {
    query = query.contains('participant_ids', sorted);
  }
  const { data: existing, error: fetchError } = await query;
  if (fetchError) throw fetchError;
  const conversation = existing?.find((row: any) => {
    const participants = row.participant_ids ?? [];
    return participants.length === sorted.length && participants.every((p: string, idx: number) => p === sorted[idx]);
  });
  if (conversation) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    const mapped = (messages ?? []).map(rowToMessage);
    return rowToConversation(conversation, mapped);
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ participant_ids: sorted, folder: 'general' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToConversation(data, []);
}

export async function submitFeedback(
  payload: Omit<Feedback, 'id' | 'timestamp'>,
): Promise<Feedback> {
  requireSupabase();
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: payload.userId,
      type: payload.type,
      content: payload.content,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToFeedback(data);
}

export async function updateConversationFolder(
  conversationId: string,
  folder: ConversationFolder,
): Promise<Conversation> {
  requireSupabase();
  const { data, error } = await supabase
    .from('conversations')
    .update({ folder })
    .eq('id', conversationId)
    .select('*')
    .single();
  if (error) throw error;

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return rowToConversation(data, (messages ?? []).map(rowToMessage));
}

export async function updateUserFriends(
  userId: string,
  friendIds: string[],
): Promise<User> {
  requireSupabase();
  const { data, error } = await supabase
    .from('users')
    .update({ friend_ids: friendIds })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return rowToUser(data);
}

export async function updateUserBlocked(
  userId: string,
  blockedIds: string[],
): Promise<User> {
  requireSupabase();
  const { data, error } = await supabase
    .from('users')
    .update({ blocked_user_ids: blockedIds })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return rowToUser(data);
}

// ---------------------------------------------------------------------------
// Exposed mapping helpers (for realtime payloads)
// ---------------------------------------------------------------------------

export const mapRowToUser = rowToUser;
export const mapRowToNotification = rowToNotification;
export const mapRowToCollaboration = rowToCollaboration;
export const mapRowToMessage = rowToMessage;
export const mapRowToConversation = rowToConversation;
export const mapRowToFeedback = rowToFeedback;
export const mapRowToFriendRequest = rowToFriendRequest;
export const mapDbPostToLegacy = dbPostToLegacy;
