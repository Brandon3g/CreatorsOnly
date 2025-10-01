// context/AppContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  User,
  Post,
  Notification,
  Conversation,
  Collaboration,
  Message,
  ConversationFolder,
  NotificationType,
  Feedback,
  Page,
  PageContext,
  NavigationEntry,
  FriendRequest,
  FriendRequestStatus,
  PushSubscriptionObject,
} from '../types';

import { MASTER_USER_ID } from '../constants';

import { trackEvent } from '../services/analytics';
import { supabase } from '../lib/supabaseClient';

/* ---------------------------------------------------------------------------
 * Recovery helpers
 * -------------------------------------------------------------------------*/
const RECOVERY_FLAG = 'co-recovery-active';

function getRecoveryFlag(): boolean {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG) === '1';
  } catch {
    return false;
  }
}
function setRecoveryFlag(on: boolean) {
  try {
    if (on) sessionStorage.setItem(RECOVERY_FLAG, '1');
    else sessionStorage.removeItem(RECOVERY_FLAG);
  } catch {}
}

function urlLooksLikeRecovery(): boolean {
  try {
    const href = window.location.href || '';
    const hash = window.location.hash || '';

    if (/#\/NewPassword/i.test(hash)) return true;

    const fragments = href.split('#').slice(1);
    for (const frag of fragments) {
      const qs = new URLSearchParams(frag);
      const type = (qs.get('type') || '').toLowerCase();
      if (qs.has('access_token') || qs.has('refresh_token') || type === 'recovery') {
        return true;
      }
    }
  } catch {}
  return false;
}

function isRecoveryActive(): boolean {
  return urlLooksLikeRecovery() || getRecoveryFlag();
}

/* ---------------------------------------------------------------------------
 * Lightweight socket-style event emitter (simulated)
 * -------------------------------------------------------------------------*/
const emitSocketEvent = (userId: string, eventName: string, payload: any) => {
  window.dispatchEvent(
    new CustomEvent('socket-event', { detail: { userId, eventName, payload } }),
  );
};

/* ---------------------------------------------------------------------------
 * Simulated Web Push (uses SW message to show notification)
 * -------------------------------------------------------------------------*/
const PUSH_SUBSCRIPTIONS_STORAGE_KEY = 'creatorsOnlyPushSubscriptions';

const sendWebPush = (
  subscriptions: Record<string, PushSubscriptionObject>,
  userId: string,
  title: string,
  body: string,
  url: string,
) => {
  console.log(`[PUSH_SIM] Sending push to user ${userId}: ${title}`);
  if (subscriptions[userId]) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'show-notification',
        payload: {
          title,
          options: { body, data: { url } },
        },
      });
    }
  } else {
    console.warn(`[PUSH_SIM] No push subscription found for user ${userId}`);
  }
};

/* ---------------------------------------------------------------------------
 * Storage keys
 * -------------------------------------------------------------------------*/
const THEME_STORAGE_KEY = 'creatorsOnlyTheme';
const HISTORY_STORAGE_KEY = 'creatorsOnlyHistory';

const defaultHistory = (): NavigationEntry[] => [{ page: 'feed', context: {} }];

/* ---------------------------------------------------------------------------
 * Supabase list helper
 * -------------------------------------------------------------------------*/
function useSupabaseList<T extends { id?: string }>(
  table: string,
  {
    select = '*',
    where = {} as Record<string, string | number | boolean | null>,
    or, // <- NEW: pass a PostgREST OR filter string
    order = { column: 'created_at', ascending: false } as {
      column?: string;
      ascending?: boolean;
    },
    channelKey,
  }: {
    select?: string;
    where?: Record<string, string | number | boolean | null>;
    or?: string; // e.g. `recipient_id.eq.${uid},requester_id.eq.${uid}`
    order?: { column?: string; ascending?: boolean };
    channelKey?: string;
  } = {},
) {
  const [rows, setRows] = React.useState<T[]>([]);
  const whereJSON = React.useMemo(() => JSON.stringify(where ?? {}), [where]);
  const chanRef = React.useRef(channelKey || table);

  const refresh = React.useCallback(async () => {
    let q = supabase.from(table).select(select);

    // apply equality filters
    const filters = JSON.parse(whereJSON) as Record<string, any>;
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) q = q.eq(k, v as any);
    }

    // apply OR (PostgREST syntax: "a.eq.x,b.eq.x")
    if (or && or.trim()) q = q.or(or);

    if (order?.column) q = q.order(order.column, { ascending: !!order.ascending });

    const { data, error } = await q;
    if (!error && Array.isArray(data)) setRows(data as T[]);
    else if (error) console.warn(`[useSupabaseList] load ${table} failed`, error);
  }, [table, select, whereJSON, or, order?.column, order?.ascending]);

  React.useEffect(() => { refresh(); }, [refresh]);

  React.useEffect(() => {
    const ch = supabase
      .channel(`realtime:${chanRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => refresh())
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [table, refresh]);

  const upsert = React.useCallback(
    async (payload: T) => {
      const { data, error } = await supabase.from(table).upsert(payload).select();
      if (!error) refresh();
      return { data, error };
    },
    [table, refresh],
  );

  const remove = React.useCallback(
    async (id: string) => {
      const { data, error } = await supabase.from(table).delete().eq('id', id).select();
      if (!error) refresh();
      return { data, error };
    },
    [table, refresh],
  );

  return { rows, setRows, refresh, upsert, remove } as const;
}

/* ---------------------------------------------------------------------------
 * Context type
 * -------------------------------------------------------------------------*/
interface AppContextType {
  users: User[];
  posts: Post[];
  notifications: Notification[];
  conversations: Conversation[];
  collaborations: Collaboration[];
  feedback: Feedback[];
  friendRequests: FriendRequest[];

  currentUser: User | null;
  isAuthenticated: boolean;
  isRegistering: boolean;
  isMasterUser: boolean;

  currentPage: Page;
  viewingProfileId: string | null;
  viewingCollaborationId: string | null;
  history: NavigationEntry[];

  selectedConversationId: string | null;
  editingCollaborationId: string | null;

  theme: 'light' | 'dark';

  login: (username: string, password: string) => boolean;
  logout: () => void;

  startRegistration: () => void;
  cancelRegistration: () => void;
  registerAndSetup: (
    data: Omit<
      User,
      | 'id'
      | 'avatar'
      | 'banner'
      | 'isVerified'
      | 'friendIds'
      | 'platformLinks'
      | 'blockedUserIds'
    > & { password?: string }
  ) => boolean;

  updateUserProfile: (patch: Partial<User> & Record<string, any>) => void;

  sendFriendRequest: (toUserId: string) => void;
  cancelFriendRequest: (toUserId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  removeFriend: (friendId: string) => void;
  toggleBlockUser: (userId: string) => void;

  getFriendRequest: (userId1: string, userId2: string) => FriendRequest | undefined;
  getFriendRequestById: (id: string) => FriendRequest | undefined;

  addPost: (content: string, image?: string) => void;
  deletePost: (postId: string) => void;

  addCollaboration: (
    collab: Omit<Collaboration, 'id' | 'authorId' | 'timestamp' | 'interestedUserIds'>,
  ) => void;
  updateCollaboration: (updatedCollab: Collaboration) => void;
  deleteCollaboration: (collabId: string) => void;
  toggleCollaborationInterest: (collabId: string) => void;

  sendMessage: (conversationId: string, text: string) => void;
  viewConversation: (participantId: string) => void;
  setSelectedConversationId: (id: string | null) => void;

  setEditingCollaborationId: (id: string | null) => void;
  moveConversationToFolder: (conversationId: string, folder: ConversationFolder) => void;

  markNotificationsAsRead: (ids: string[]) => void;
  sendFeedback: (content: string, type: 'Bug Report' | 'Suggestion') => void;

  navigate: (page: Page, context?: PageContext) => void;
  goBack: () => void;
  viewProfile: (userId: string) => void;
  updateCurrentContext: (newContext: Partial<PageContext>) => void;

  getUserById: (id: string) => User | undefined;
  getUserByUsername: (username: string) => User | undefined;

  registerScrollableNode: (node: HTMLDivElement) => void;

  sendPasswordResetLink: (email: string) => void;

  subscribeToPushNotifications: (subscription: PushSubscriptionObject) => void;

  setTheme: (theme: 'light' | 'dark') => void;

  refreshData: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/* ---------------------------------------------------------------------------
 * Provider
 * -------------------------------------------------------------------------*/
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  function useLocalStorage<T>(
    key: string,
    initialValue: T,
  ): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch {
        return initialValue;
      }
    });
    const setValue = (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {}
    };
    return [storedValue, setValue];
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const recovering = isRecoveryActive();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        if (recovering && !/#\/NewPassword/i.test(window.location.hash)) {
          window.location.hash = '#/NewPassword';
        } else {
          setHistory([{ page: 'feed', context: {} }]);
        }
        trackEvent('login_success', { userId: session.user.id, via: 'supabase' });
      } else {
        setCurrentUserId(null);
        setHistory([{ page: 'feed', context: {} }]);
        setRecoveryFlag(false);
        trackEvent('logout', { via: 'supabase' });
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const notificationWhere = useMemo(
    () => (currentUserId ? { userId: currentUserId } : {}),
    [currentUserId],
  );
  const feedbackWhere = useMemo(
    () => (currentUserId ? { userId: currentUserId } : {}),
    [currentUserId],
  );
  const friendRequestWhere = useMemo(
    () =>
      currentUserId
        ? { toUserId: currentUserId }
        : {},
    [currentUserId],
  );

  // 1) Users (public)
const { rows: users, setRows: setUsers, upsert: upsertUser, refresh: refreshUsers } =
  useSupabaseList<User>('profiles');

// 2) Posts (public feed)
const { rows: posts, setRows: setPosts, upsert: upsertPost, remove: removePost, refresh: refreshPosts } =
  useSupabaseList<Post>('posts', { order: { column: 'created_at', ascending: false } });

// 3) Notifications (private to recipient)  ✅ user_id
const { rows: notifications, setRows: setNotifications, upsert: upsertNotification, refresh: refreshNotifications } =
  useSupabaseList<Notification>('notifications', {
    where: currentUserId ? { user_id: currentUserId } : {},
    channelKey: currentUserId ? `notifications:${currentUserId}` : 'notifications',
  });

// 4) Friend requests (sender OR recipient)  ✅ requester_id / recipient_id
// Enhance the hook once to support an 'or' filter:
const { rows: friendRequests, setRows: setFriendRequests, upsert: upsertFriendRequest, remove: removeFriendRequest, refresh: refreshFriendRequests } =
  useSupabaseList<FriendRequest>('friend_requests', {
    or: currentUserId ? `requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}` : undefined,
    channelKey: currentUserId ? `friend_requests:${currentUserId}` : 'friend_requests',
  });

// 5) Collaborations (public read; author writes)  ✅ author_id
const { rows: collaborations, setRows: setCollaborations, upsert: upsertCollab, remove: removeCollab, refresh: refreshCollabs } =
  useSupabaseList<Collaboration>('collaborations', { /* no where for public list */ });

// 6) Feedback (private to author)  ✅ user_id
const { rows: feedback, setRows: setFeedback, upsert: upsertFeedback, refresh: refreshFeedback } =
  useSupabaseList<Feedback>('feedback', {
    where: currentUserId ? { user_id: currentUserId } : {},
    channelKey: currentUserId ? `feedback:${currentUserId}` : 'feedback',
  });

// 7) Conversations (membership-based via join)  ✅ conversation_members
const [conversations, setConversations] = useState<Conversation[]>([]);
useEffect(() => {
  if (!currentUserId) { setConversations([]); return; }
  supabase
    .from('conversations')
    .select('*, members:conversation_members!inner(user_id)')
    .eq('members.user_id', currentUserId)
    .then(({ data }) => setConversations((data as any) ?? []));
  const ch = supabase
    .channel(`realtime:conversations:${currentUserId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${currentUserId}` }, () => {
      supabase
        .from('conversations')
        .select('*, members:conversation_members!inner(user_id)')
        .eq('members.user_id', currentUserId)
        .then(({ data }) => setConversations((data as any) ?? []));
    })
    .subscribe();
  return () => supabase.removeChannel(ch);
}, [currentUserId]);

// 8) Messages – load per conversation when opened  ✅ conversation_id
function useMessages(conversationId?: string) {
  return useSupabaseList<Message>('messages', {
    where: conversationId ? { conversation_id: conversationId } : {},
    order: { column: 'created_at', ascending: true },
    channelKey: conversationId ? `messages:${conversationId}` : 'messages',
  });
}

  const authData = { userId: currentUserId };
  const setAuthData = (next: { userId: string | null }) => setCurrentUserId(next.userId);

  const [pushSubscriptions, setPushSubscriptions] =
    useLocalStorage<Record<string, PushSubscriptionObject>>(PUSH_SUBSCRIPTIONS_STORAGE_KEY, {});
  const [theme, setThemeState] = useLocalStorage<'light' | 'dark'>(THEME_STORAGE_KEY, 'dark');

  const [isRegistering, setIsRegistering] = useState(false);

  const historyKey = useMemo(
    () => `${HISTORY_STORAGE_KEY}:${authData.userId ?? 'guest'}`,
    [authData.userId],
  );
  const [history, setHistory] = useLocalStorage<NavigationEntry[]>(historyKey, defaultHistory());

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const [editingCollaborationId, setEditingCollaborationId] =
    useState<string | null>(null);

  const scrollableNodeRef = useRef<HTMLDivElement | null>(null);

  const currentUser = users.find((u) => u.id === authData.userId) || null;
  const isAuthenticated = !!currentUser;
  const isMasterUser = currentUser?.id === MASTER_USER_ID;

  const currentEntry = history[history.length - 1] || { page: 'feed', context: {} };
  const currentPage = currentEntry.page;
  const viewingProfileId = (currentEntry.context as PageContext).viewingProfileId ?? null;
  const viewingCollaborationId =
    (currentEntry.context as PageContext).viewingCollaborationId ?? null;

  const refreshData = useCallback(async () => {
    await Promise.all([
      refreshUsers(),
      refreshPosts(),
      refreshNotifications(),
      refreshConversations(),
      refreshCollaborations(),
      refreshFeedback(),
      refreshFriendRequests(),
    ]);
    trackEvent('data_refreshed');
  }, [
    refreshUsers,
    refreshPosts,
    refreshNotifications,
    refreshConversations,
    refreshCollaborations,
    refreshFeedback,
    refreshFriendRequests,
  ]);

  useEffect(() => {
    if (theme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: 'light' | 'dark') => {
      setThemeState(newTheme);
      trackEvent('theme_changed', { theme: newTheme });
    },
    [setThemeState],
  );

  const registerScrollableNode = useCallback((node: HTMLDivElement) => {
    scrollableNodeRef.current = node;
  }, []);

  const navigate = useCallback(
    (page: Page, context: PageContext = {}) => {
      const last = history[history.length - 1];
      if (scrollableNodeRef.current && last) {
        last.scrollTop = scrollableNodeRef.current.scrollTop;
      }
      if (last && last.page === page && JSON.stringify(last.context) === JSON.stringify(context)) {
        return;
      }
      setHistory((prev) => [...prev, { page, context, scrollTop: 0 }]);
      if (scrollableNodeRef.current) scrollableNodeRef.current.scrollTop = 0;
    },
    [history, setHistory],
  );

  const updateCurrentContext = useCallback(
    (newContext: Partial<PageContext>) => {
      setHistory((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) {
          next[next.length - 1] = {
            ...last,
            context: { ...(last.context || {}), ...newContext },
          };
        }
        return next;
      });
    },
    [setHistory],
  );

  const goBack = useCallback(() => {
    if (history.length > 1) setHistory((p) => p.slice(0, -1));
  }, [history.length, setHistory]);

  const viewProfile = (userId: string) => navigate('profile', { viewingProfileId: userId });

  const login = useCallback(
    (username: string, _password: string) => {
      const user = users.find((u) => u.username?.toLowerCase() === username.toLowerCase());
      if (user) {
        setAuthData({ userId: user.id });
        setIsRegistering(false);
        setHistory([{ page: 'feed', context: {} }]);
        trackEvent('login_success', { userId: user.id, via: 'demo' });
        return true;
      }
      trackEvent('login_failed', { username });
      return false;
    },
    [users, setAuthData, setHistory],
  );

  const logout = useCallback(() => {
    try {
      supabase.auth.signOut().catch((error) => console.warn('[logout] supabase signOut error', error));
    } finally {
      setAuthData({ userId: null });
      setHistory([{ page: 'feed', context: {} }]);
      setRecoveryFlag(false);
      trackEvent('logout', { userId: currentUser?.id, via: 'app_context' });
    }
  }, [setAuthData, setHistory, currentUser]);

  const sendPasswordResetLink = useCallback((email: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://creatorzonly.com';
    const redirectTo = `${base}/#/NewPassword`;
    supabase.auth
      .resetPasswordForEmail(email, { redirectTo })
      .then(({ error }) => {
        if (error) {
          console.error('Password reset email error:', error.message);
          trackEvent('password_reset_failed', { email, message: error.message });
        } else {
          trackEvent('password_reset_requested', { email, redirectTo });
        }
      });
  }, []);

  const startRegistration = () => setIsRegistering(true);
  const cancelRegistration = () => setIsRegistering(false);

  const registerAndSetup = useCallback(
    (
      data: Omit<
        User,
        | 'id'
        | 'avatar'
        | 'banner'
        | 'isVerified'
        | 'friendIds'
        | 'platformLinks'
        | 'blockedUserIds'
      > & { password?: string },
    ) => {
      if (
        users.some((u) => u.username?.toLowerCase() === data.username.toLowerCase())
      ) {
        trackEvent('registration_failed', { reason: 'username_taken' });
        return false;
      }

      const newId = crypto.randomUUID ? crypto.randomUUID() : `u${Date.now()}`;
      const newUser: User = {
        id: newId,
        username: data.username,
        name: data.name,
        email: data.email,
        bio: data.bio,
        tags: data.tags,
        state: data.state,
        county: data.county,
        customLink: data.customLink || '',
        avatar: `https://picsum.photos/seed/${newId}-avatar/200/200`,
        banner: `https://picsum.photos/seed/${newId}-banner/1000/300`,
        isVerified: false,
        friendIds: [],
        platformLinks: [],
        blockedUserIds: [],
      };

      setUsers((prev) => [...prev, newUser]);
      upsertUser(newUser);
      setAuthData({ userId: newUser.id });
      setIsRegistering(false);
      setHistory([{ page: 'feed', context: {} }]);
      trackEvent('registration_success', { userId: newUser.id });
      return true;
    },
    [users, setUsers, upsertUser, setAuthData, setHistory],
  );

  const updateUserProfile = useCallback(
    (patch: Partial<User> & Record<string, any>) => {
      if (!currentUser) return;
      setUsers((prev) =>
        prev.map((user) => (user.id === currentUser.id ? { ...user, ...patch } : user)),
      );
      const updatedUser = { ...currentUser, ...patch } as User;
      upsertUser(updatedUser);
      trackEvent('profile_updated', { userId: currentUser.id });
    },
    [currentUser, setUsers, upsertUser],
  );

  const getUserById = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users],
  );

  const getFriendRequest = useCallback(
    (userId1: string, userId2: string) =>
      friendRequests.find(
        (fr) =>
          (fr.fromUserId === userId1 && fr.toUserId === userId2) ||
          (fr.fromUserId === userId2 && fr.toUserId === userId1),
      ),
    [friendRequests],
  );

  const getFriendRequestById = useCallback(
    (id: string) => friendRequests.find((fr) => fr.id === id),
    [friendRequests],
  );

  const sendFriendRequest = useCallback(
    (toUserId: string) => {
      if (!currentUser) return;
      const fromUserId = currentUser.id;

      const existing = getFriendRequest(fromUserId, toUserId);
      if (existing) return;

      const newRequest: FriendRequest = {
        id: crypto.randomUUID ? crypto.randomUUID() : `fr${Date.now()}`,
        fromUserId,
        toUserId,
        status: FriendRequestStatus.PENDING,
        timestamp: new Date().toISOString(),
      };
      setFriendRequests((prev) => [...prev, newRequest]);
      upsertFriendRequest(newRequest);

      const notification: Notification = {
        id: crypto.randomUUID ? crypto.randomUUID() : `n${Date.now()}`,
        userId: toUserId,
        actorId: fromUserId,
        type: NotificationType.FRIEND_REQUEST,
        entityType: 'friend_request',
        entityId: newRequest.id,
        message: `${currentUser.name} sent you a friend request.`,
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((prev) => [...prev, notification]);
      upsertNotification(notification);
      emitSocketEvent(toUserId, 'notification:new', notification);
      sendWebPush(
        pushSubscriptions,
        toUserId,
        'New Friend Request',
        notification.message,
        `/profile/${currentUser.username}`,
      );
      trackEvent('friend_request_sent', { from: fromUserId, to: toUserId });
    },
    [
      currentUser,
      getFriendRequest,
      setFriendRequests,
      upsertFriendRequest,
      setNotifications,
      upsertNotification,
      pushSubscriptions,
    ],
  );

  const cancelFriendRequest = useCallback(
    (toUserId: string) => {
      if (!currentUser) return;
      const pending = friendRequests.find(
        (fr) =>
          fr.fromUserId === currentUser.id &&
          fr.toUserId === toUserId &&
          fr.status === FriendRequestStatus.PENDING,
      );
      if (!pending) return;

      setFriendRequests((prev) => prev.filter((fr) => fr.id !== pending.id));
      removeFriendRequest(pending.id);
      trackEvent('friend_request_cancelled', {
        from: currentUser.id,
        to: toUserId,
      });
    },
    [currentUser, friendRequests, setFriendRequests, removeFriendRequest],
  );

  const acceptFriendRequest = useCallback(
    (requestId: string) => {
      const request = friendRequests.find((fr) => fr.id === requestId);
      if (!request || !currentUser || request.toUserId !== currentUser.id) return;

      setFriendRequests((prev) =>
        prev.map((fr) =>
          fr.id === requestId ? { ...fr, status: FriendRequestStatus.ACCEPTED } : fr,
        ),
      );
      upsertFriendRequest({ ...request, status: FriendRequestStatus.ACCEPTED });

      setUsers((prev) =>
        prev.map((user) => {
          if (user.id === request.fromUserId)
            return { ...user, friendIds: [...new Set([...user.friendIds, request.toUserId])] };
          if (user.id === request.toUserId)
            return { ...user, friendIds: [...new Set([...user.friendIds, request.fromUserId])] };
          return user;
        }),
      );
      const fromUser = getUserById(request.fromUserId);
      const updatedFromUser = fromUser
        ? {
            ...fromUser,
            friendIds: [...new Set([...fromUser.friendIds, request.toUserId])],
          }
        : undefined;
      if (updatedFromUser) upsertUser(updatedFromUser);
      const updatedToUser = currentUser
        ? {
            ...currentUser,
            friendIds: [...new Set([...currentUser.friendIds, request.fromUserId])],
          }
        : undefined;
      if (updatedToUser) upsertUser(updatedToUser);

      const notification: Notification = {
        id: crypto.randomUUID ? crypto.randomUUID() : `n${Date.now()}`,
        userId: request.fromUserId,
        actorId: request.toUserId,
        type: NotificationType.FRIEND_REQUEST_ACCEPTED,
        entityType: 'user',
        entityId: request.toUserId,
        message: `${currentUser.name} accepted your friend request.`,
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((prev) => [...prev, notification]);
      upsertNotification(notification);
      emitSocketEvent(request.fromUserId, 'notification:new', notification);
      sendWebPush(
        pushSubscriptions,
        request.fromUserId,
        'Friend Request Accepted',
        notification.message,
        `/profile/${currentUser.username}`,
      );

      trackEvent('friend_request_accepted', {
        acceptedBy: request.toUserId,
        requestedBy: request.fromUserId,
      });
    },
    [
      friendRequests,
      currentUser,
      setFriendRequests,
      upsertFriendRequest,
      setUsers,
      getUserById,
      upsertUser,
      setNotifications,
      upsertNotification,
      pushSubscriptions,
    ],
  );

  const declineFriendRequest = useCallback(
    (requestId: string) => {
      const request = friendRequests.find((fr) => fr.id === requestId);
      if (!request) return;
      setFriendRequests((prev) =>
        prev.map((fr) =>
          fr.id === requestId ? { ...fr, status: FriendRequestStatus.DECLINED } : fr,
        ),
      );
      upsertFriendRequest({ ...request, status: FriendRequestStatus.DECLINED });
      trackEvent('friend_request_declined', {
        declinedBy: request.toUserId,
        requestedBy: request.fromUserId,
      });
    },
    [friendRequests, setFriendRequests, upsertFriendRequest],
  );

  const removeFriend = useCallback(
    (friendId: string) => {
      if (!currentUser) return;
      const currentUserId = currentUser.id;

      setUsers((prev) =>
        prev.map((user) => {
          if (user.id === currentUserId) {
            return {
              ...user,
              friendIds: user.friendIds.filter((id) => id !== friendId),
            };
          }
          if (user.id === friendId) {
            return {
              ...user,
              friendIds: user.friendIds.filter((id) => id !== currentUserId),
            };
          }
          return user;
        }),
      );

      const updatedCurrentUser = {
        ...currentUser,
        friendIds: currentUser.friendIds.filter((id) => id !== friendId),
      };
      upsertUser(updatedCurrentUser);
      const friendUser = getUserById(friendId);
      if (friendUser) {
        upsertUser({
          ...friendUser,
          friendIds: friendUser.friendIds.filter((id) => id !== currentUserId),
        });
      }

      setFriendRequests((prev) =>
        prev.filter(
          (fr) =>
            !(
              (fr.fromUserId === currentUserId && fr.toUserId === friendId) ||
              (fr.fromUserId === friendId && fr.toUserId === currentUserId)
            ),
        ),
      );

      trackEvent('friend_removed', { remover: currentUserId, removed: friendId });
    },
    [currentUser, setUsers, upsertUser, getUserById, setFriendRequests],
  );

  const toggleBlockUser = useCallback(
    (userIdToBlock: string) => {
      if (!currentUser) return;
      const currentUserId = currentUser.id;
      const isBlocked = currentUser.blockedUserIds?.includes(userIdToBlock);

      const updatedBlocked = isBlocked
        ? (currentUser.blockedUserIds || []).filter((id) => id !== userIdToBlock)
        : [...new Set([...(currentUser.blockedUserIds || []), userIdToBlock])];

      const patchedUser: User = {
        ...currentUser,
        blockedUserIds: updatedBlocked,
      };
      setUsers((prev) => prev.map((u) => (u.id === currentUserId ? patchedUser : u)));
      upsertUser(patchedUser);

      if (!isBlocked) removeFriend(userIdToBlock);

      trackEvent(isBlocked ? 'user_unblocked' : 'user_blocked', {
        blocker: currentUserId,
        blocked: userIdToBlock,
      });
    },
    [currentUser, setUsers, upsertUser, removeFriend],
  );

  const addPost = useCallback(
    (content: string, image?: string) => {
      if (!currentUser) return;
      const newPost: Post = {
        id: crypto.randomUUID ? crypto.randomUUID() : `p${Date.now()}`,
        authorId: currentUser.id,
        content,
        image,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
        tags: [],
      };
      setPosts((prev) => [newPost, ...prev]);
      upsertPost(newPost);
      trackEvent('post_created', { userId: currentUser.id, postId: newPost.id });
    },
    [currentUser, setPosts, upsertPost],
  );

  const deletePost = useCallback(
    (postId: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      removePost(postId);
      trackEvent('post_deleted', { userId: currentUser?.id, postId });
    },
    [setPosts, removePost, currentUser?.id],
  );

  const addCollaboration = useCallback(
    (
      collabData: Omit<
        Collaboration,
        'id' | 'authorId' | 'timestamp' | 'interestedUserIds'
      >,
    ) => {
      if (!currentUser) return;
      const newCollab: Collaboration = {
        id: crypto.randomUUID ? crypto.randomUUID() : `collab${Date.now()}`,
        authorId: currentUser.id,
        timestamp: new Date().toISOString(),
        interestedUserIds: [],
        ...collabData,
      };
      setCollaborations((prev) => [newCollab, ...prev]);
      upsertCollaboration(newCollab);
      trackEvent('collaboration_created', {
        userId: currentUser.id,
        collabId: newCollab.id,
      });
    },
    [currentUser, setCollaborations, upsertCollaboration],
  );

  const updateCollaboration = useCallback(
    (updatedCollab: Collaboration) => {
      setCollaborations((prev) =>
        prev.map((collab) => (collab.id === updatedCollab.id ? updatedCollab : collab)),
      );
      upsertCollaboration(updatedCollab);
      trackEvent('collaboration_updated', {
        userId: currentUser?.id,
        collabId: updatedCollab.id,
      });
    },
    [setCollaborations, upsertCollaboration, currentUser?.id],
  );

  const deleteCollaboration = useCallback(
    (collabId: string) => {
      setCollaborations((prev) => prev.filter((c) => c.id !== collabId));
      removeCollaboration(collabId);
      trackEvent('collaboration_deleted', { userId: currentUser?.id, collabId });
    },
    [setCollaborations, removeCollaboration, currentUser?.id],
  );

  const toggleCollaborationInterest = useCallback(
    (collabId: string) => {
      if (!currentUser) return;
      const collab = collaborations.find((c) => c.id === collabId);
      if (!collab) return;

      const isInterested = collab.interestedUserIds.includes(currentUser.id);

      const updatedCollab: Collaboration = {
        ...collab,
        interestedUserIds: isInterested
          ? collab.interestedUserIds.filter((id) => id !== currentUser.id)
          : [...collab.interestedUserIds, currentUser.id],
      };

      setCollaborations((prev) =>
        prev.map((c) => (c.id === collabId ? updatedCollab : c)),
      );
      upsertCollaboration(updatedCollab);

      if (!isInterested) {
        const notification: Notification = {
          id: crypto.randomUUID ? crypto.randomUUID() : `n${Date.now()}`,
          userId: collab.authorId,
          actorId: currentUser.id,
          type: NotificationType.COLLAB_REQUEST,
          entityType: 'collaboration',
          entityId: collab.id,
          message: `${currentUser.name} is interested in your "${collab.title}" opportunity.`,
          isRead: false,
          timestamp: new Date().toISOString(),
        };
        setNotifications((prev) => [...prev, notification]);
        upsertNotification(notification);
        emitSocketEvent(collab.authorId, 'notification:new', notification);
        sendWebPush(
          pushSubscriptions,
          collab.authorId,
          'New Interest in Opportunity',
          notification.message,
          `/collaborations`,
        );
      }

      trackEvent('collaboration_interest_toggled', {
        userId: currentUser.id,
        collabId,
        isInterested: !isInterested,
      });
    },
    [
      currentUser,
      collaborations,
      setCollaborations,
      upsertCollaboration,
      setNotifications,
      upsertNotification,
      pushSubscriptions,
    ],
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      if (!currentUser) return;

      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return;

      const other = conversation.participantIds.find((id) => id !== currentUser.id);
      if (!other) return;

      const newMessage: Message = {
        id: crypto.randomUUID ? crypto.randomUUID() : `m${Date.now()}`,
        senderId: currentUser.id,
        receiverId: other,
        text,
        timestamp: new Date().toISOString(),
      };

      const updatedConversation: Conversation = {
        ...conversation,
        messages: [...conversation.messages, newMessage],
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? updatedConversation : c)),
      );
      upsertConversation(updatedConversation);

      const notification: Notification = {
        id: crypto.randomUUID ? crypto.randomUUID() : `n${Date.now()}`,
        userId: other,
        actorId: currentUser.id,
        type: NotificationType.NEW_MESSAGE,
        entityType: 'user',
        entityId: currentUser.id,
        message: `You have a new message from ${currentUser.name}.`,
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((prev) => [...prev, notification]);
      upsertNotification(notification);
      emitSocketEvent(other, 'notification:new', notification);
      sendWebPush(
        pushSubscriptions,
        other,
        `New message from ${currentUser.name}`,
        text,
        `/messages`,
      );

      trackEvent('message_sent', { from: currentUser.id, to: other });
    },
    [
      currentUser,
      conversations,
      setConversations,
      upsertConversation,
      setNotifications,
      upsertNotification,
      pushSubscriptions,
    ],
  );

  const viewConversation = useCallback(
    (participantId: string) => {
      if (!currentUser) return;

      let conversation = conversations.find(
        (c) =>
          c.participantIds.includes(currentUser.id) &&
          c.participantIds.includes(participantId),
      );

      if (!conversation) {
        conversation = {
          id: crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}`,
          participantIds: [currentUser.id, participantId],
          messages: [],
          folder: 'general',
        };
        setConversations((prev) => [...prev, conversation!]);
        upsertConversation(conversation);
      }

      setSelectedConversationId(conversation.id);
      navigate('messages');
    },
    [currentUser, conversations, setConversations, upsertConversation, navigate],
  );

  const moveConversationToFolder = useCallback(
    (conversationId: string, folder: ConversationFolder) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, folder } : c)),
      );
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        upsertConversation({ ...conversation, folder });
      }
      trackEvent('conversation_moved', { conversationId, folder });
    },
    [setConversations, conversations, upsertConversation],
  );

  const markNotificationsAsRead = useCallback(
    (ids: string[]) => {
      setTimeout(() => {
        setNotifications((prev) =>
          prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
        );
        ids.forEach((id) => {
          const existing = notifications.find((n) => n.id === id);
          if (existing) {
            upsertNotification({ ...existing, isRead: true });
          }
        });
      }, 500);
    },
    [setNotifications, notifications, upsertNotification],
  );

  const sendFeedback = useCallback(
    (content: string, type: 'Bug Report' | 'Suggestion') => {
      if (!currentUser) return;
      const newFeedback: Feedback = {
        id: crypto.randomUUID ? crypto.randomUUID() : `f${Date.now()}`,
        userId: currentUser.id,
        type,
        content,
        timestamp: new Date().toISOString(),
      };
      setFeedback((prev) => [newFeedback, ...prev]);
      upsertFeedback(newFeedback);
      trackEvent('feedback_sent', { userId: currentUser.id, type });
    },
    [currentUser, setFeedback, upsertFeedback],
  );

  const subscribeToPushNotifications = useCallback(
    (subscription: PushSubscriptionObject) => {
      if (!currentUser) return;
      setPushSubscriptions((prev) => ({
        ...prev,
        [currentUser.id]: subscription,
      }));
      console.log(`[PUSH_SIM] User ${currentUser.id} subscribed.`);
      trackEvent('push_subscribed', { userId: currentUser.id });
    },
    [currentUser, setPushSubscriptions],
  );

  const value: AppContextType = {
    users,
    posts,
    notifications,
    conversations,
    collaborations,
    feedback,
    friendRequests,

    currentUser,
    isAuthenticated,
    isRegistering,
    isMasterUser,

    currentPage,
    viewingProfileId,
    viewingCollaborationId,
    history,

    selectedConversationId,
    editingCollaborationId,

    theme,

    login,
    logout,

    startRegistration,
    cancelRegistration,
    registerAndSetup,

    updateUserProfile,

    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    toggleBlockUser,

    getFriendRequest,
    getFriendRequestById,

    addPost,
    deletePost,

    addCollaboration,
    updateCollaboration,
    deleteCollaboration,
    toggleCollaborationInterest,

    sendMessage,
    viewConversation,
    setSelectedConversationId,

    setEditingCollaborationId,
    moveConversationToFolder,

    markNotificationsAsRead,
    sendFeedback,

    navigate,
    goBack,
    viewProfile,
    updateCurrentContext,

    getUserById,
    getUserByUsername: (username: string) =>
      users.find((u) => u.username?.toLowerCase() === username.toLowerCase()),

    registerScrollableNode,

    sendPasswordResetLink,

    subscribeToPushNotifications,

    setTheme,

    refreshData,
    refreshConversations,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
