// context/AppContext.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
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

/* ──────────────────────────────────────────────────────────────────────────────
   Recovery helpers
   ─────────────────────────────────────────────────────────────────────────── */
const RECOVERY_FLAG = 'co-recovery-active';
const getRecoveryFlag = () => {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG) === '1';
  } catch {
    return false;
  }
};
const setRecoveryFlag = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(RECOVERY_FLAG, '1');
    else sessionStorage.removeItem(RECOVERY_FLAG);
  } catch {}
};

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
const isRecoveryActive = () => urlLooksLikeRecovery() || getRecoveryFlag();

/* ──────────────────────────────────────────────────────────────────────────────
   Simulated socket + push
   ─────────────────────────────────────────────────────────────────────────── */
const emitSocketEvent = (userId: string, eventName: string, payload: any) => {
  window.dispatchEvent(
    new CustomEvent('socket-event', { detail: { userId, eventName, payload } }),
  );
};
const PUSH_SUBSCRIPTIONS_STORAGE_KEY = 'creatorsOnlyPushSubscriptions';
const THEME_STORAGE_KEY = 'creatorsOnlyTheme';
const HISTORY_STORAGE_KEY = 'creatorsOnlyHistory';

/* ──────────────────────────────────────────────────────────────────────────────
   Supabase list helper (safe ordering)
   ─────────────────────────────────────────────────────────────────────────── */
function useSupabaseList<T extends { id?: string }>(
  table: string,
  {
    select = '*',
    where = {} as Record<string, string | number | boolean | null>,
    // If you pass order, we’ll only apply it when the column actually exists.
    // This prevents 400s like: "column profiles.created_at does not exist".
    order,
    channelKey,
  }: {
    select?: string;
    where?: Record<string, string | number | boolean | null>;
    order?: { column?: string; ascending?: boolean } | undefined;
    channelKey?: string;
  } = {},
) {
  const [rows, setRows] = React.useState<T[]>([]);
  const whereString = React.useMemo(() => JSON.stringify(where ?? {}), [where]);
  const chanRef = React.useRef(channelKey || table);

  const refresh = React.useCallback(async () => {
    let query = supabase.from(table).select(select);

    // Apply filters
    const filters: Record<string, string | number | boolean | null> = JSON.parse(whereString);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        query = query.eq(key, value as any);
      }
    }

    // Apply order ONLY when explicitly provided; this avoids 400s on missing columns
    if (order?.column) {
      try {
        query = query.order(order.column, { ascending: !!order.ascending });
      } catch {
        // ignore — some drivers throw synchronously if invalid, but Supabase usually returns 400 later.
      }
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      setRows(data as T[]);
    } else if (error) {
      // Log once to console; keeps UI stable
      // eslint-disable-next-line no-console
      console.warn(`[useSupabaseList] Failed to load ${table}`, error);
    }
  }, [table, select, whereString, order?.column, order?.ascending]);

  // initial + dependency refresh
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // realtime
  React.useEffect(() => {
    const channel = supabase
      .channel(`realtime:${chanRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
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

/* ──────────────────────────────────────────────────────────────────────────────
   Context shape
   ─────────────────────────────────────────────────────────────────────────── */
interface AppContextType {
  // state
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

  // nav
  navigate: (page: Page, context?: PageContext) => void;
  goBack: () => void;
  viewProfile: (userId: string) => void;
  updateCurrentContext: (newContext: Partial<PageContext>) => void;

  // lookups
  getUserById: (id: string) => User | undefined;
  getUserByUsername: (username: string) => User | undefined;

  // misc UI
  registerScrollableNode: (node: HTMLDivElement) => void;

  // auth & profile
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

  // social
  sendFriendRequest: (toUserId: string) => void;
  cancelFriendRequest: (toUserId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  removeFriend: (friendId: string) => void;
  toggleBlockUser: (userId: string) => void;

  getFriendRequest: (userId1: string, userId2: string) => FriendRequest | undefined;
  getFriendRequestById: (id: string) => FriendRequest | undefined;

  // posts
  addPost: (content: string, image?: string) => void;
  deletePost: (postId: string) => void;

  // collabs
  addCollaboration: (
    collab: Omit<Collaboration, 'id' | 'authorId' | 'timestamp' | 'interestedUserIds'>,
  ) => void;
  updateCollaboration: (updatedCollab: Collaboration) => void;
  deleteCollaboration: (collabId: string) => void;
  toggleCollaborationInterest: (collabId: string) => void;

  // messaging
  sendMessage: (conversationId: string, text: string) => void;
  viewConversation: (participantId: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  moveConversationToFolder: (conversationId: string, folder: ConversationFolder) => void;

  // notifications & feedback
  markNotificationsAsRead: (ids: string[]) => void;
  sendFeedback: (content: string, type: 'Bug Report' | 'Suggestion') => void;

  // push + theme
  subscribeToPushNotifications: (subscription: PushSubscriptionObject) => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // data management
  refreshData: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Context
   ─────────────────────────────────────────────────────────────────────────── */
const AppContext = createContext<AppContextType | undefined>(undefined);

/* ──────────────────────────────────────────────────────────────────────────────
   Provider
   ─────────────────────────────────────────────────────────────────────────── */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // little localStorage helper
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

  // auth pointer
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
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

  // where clauses that depend on auth
  const notificationsWhere = useMemo(
    // IMPORTANT: column name is recipient_id in your DB (per earlier RLS + schema)
    () => (currentUserId ? { recipient_id: currentUserId } : {}),
    [currentUserId],
  );
  const feedbackWhere = useMemo(
    () => (currentUserId ? { user_id: currentUserId } : {}),
    [currentUserId],
  );
  const friendRequestWhere = useMemo(
    () => (currentUserId ? { recipient_id: currentUserId } : {}),
    [currentUserId],
  );

  /* ── server-backed state (safe ordering) ─────────────────────────────────── */

  // profiles: DO NOT pass order here (no created_at on your profiles)
  const {
    rows: users,
    setRows: setUsers,
    refresh: refreshUsers,
    upsert: upsertUser,
  } = useSupabaseList<User>('profiles', { select: '*' });

  const {
    rows: posts,
    setRows: setPosts,
    refresh: refreshPosts,
    upsert: upsertPost,
    remove: removePost,
  } = useSupabaseList<Post>('posts', {
    // posts.timestamp exists in your seed code; if unsure, drop order to avoid 400s
    order: { column: 'timestamp', ascending: false },
  });

  const {
    rows: notifications,
    setRows: setNotifications,
    refresh: refreshNotifications,
    upsert: upsertNotification,
  } = useSupabaseList<Notification>('notifications', {
    where: notificationsWhere,
    channelKey: currentUserId ? `notifications:${currentUserId}` : 'notifications',
  });

  const {
    rows: conversations,
    setRows: setConversations,
    refresh: refreshConversations, // exposed to context
    upsert: upsertConversation,
  } = useSupabaseList<Conversation>('conversations', {
    channelKey: currentUserId ? `conversations:${currentUserId}` : 'conversations',
  });

  const {
    rows: collaborations,
    setRows: setCollaborations,
    refresh: refreshCollaborations,
    upsert: upsertCollaboration,
    remove: removeCollaboration,
  } = useSupabaseList<Collaboration>('collaborations', {
    channelKey: currentUserId ? `collaborations:${currentUserId}` : 'collaborations',
  });

  const {
    rows: feedback,
    setRows: setFeedback,
    refresh: refreshFeedback,
    upsert: upsertFeedback,
  } = useSupabaseList<Feedback>('feedback', {
    where: feedbackWhere,
    channelKey: currentUserId ? `feedback:${currentUserId}` : 'feedback',
  });

  const {
    rows: friendRequests,
    setRows: setFriendRequests,
    refresh: refreshFriendRequests,
    upsert: upsertFriendRequest,
    remove: removeFriendRequest,
  } = useSupabaseList<FriendRequest>('friend_requests', {
    where: friendRequestWhere,
    channelKey: currentUserId ? `friend_requests:${currentUserId}` : 'friend_requests',
  });

  const authData = { userId: currentUserId };
  const setAuthData = (next: { userId: string | null }) => setCurrentUserId(next.userId);

  /* ── local state ─────────────────────────────────────────────────────────── */
  const [pushSubscriptions, setPushSubscriptions] =
    useLocalStorage<Record<string, PushSubscriptionObject>>(PUSH_SUBSCRIPTIONS_STORAGE_KEY, {});
  const [theme, setThemeState] = useLocalStorage<'light' | 'dark'>(THEME_STORAGE_KEY, 'dark');

  const historyKey = useMemo(
    () => `${HISTORY_STORAGE_KEY}:${authData.userId ?? 'guest'}`,
    [authData.userId],
  );
  const [history, setHistory] = useLocalStorage<NavigationEntry[]>(
    historyKey,
    [{ page: 'feed', context: {} }],
  );

  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [editingCollaborationId, setEditingCollaborationId] = useState<string | null>(null);
  const scrollableNodeRef = useRef<HTMLDivElement | null>(null);

  /* ── derived ─────────────────────────────────────────────────────────────── */
  const currentUser = users.find((u) => u.id === authData.userId) || null;
  const isAuthenticated = !!currentUser;
  const isMasterUser = currentUser?.id === MASTER_USER_ID;

  const currentEntry = history[history.length - 1] || { page: 'feed', context: {} };
  const currentPage = currentEntry.page;
  const viewingProfileId = (currentEntry.context as PageContext)?.viewingProfileId ?? null;
  const viewingCollaborationId = (currentEntry.context as PageContext)?.viewingCollaborationId ?? null;

  /* ── refresh all ─────────────────────────────────────────────────────────── */
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

  /* ── theme ───────────────────────────────────────────────────────────────── */
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

  /* ── nav helpers ─────────────────────────────────────────────────────────── */
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

  /* ── auth / account ──────────────────────────────────────────────────────── */
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
      supabase.auth.signOut().catch(() => {});
    } finally {
      setAuthData({ userId: null });
      setHistory([{ page: 'feed', context: {} }]);
      setRecoveryFlag(false);
      trackEvent('logout', { userId: currentUser?.id, via: 'app_context' });
    }
  }, [setAuthData, setHistory, currentUser]);

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
      if (users.some((u) => u.username?.toLowerCase() === data.username.toLowerCase())) {
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

  /* ── lookups ─────────────────────────────────────────────────────────────── */
  const getUserById = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users],
  );
  const getUserByUsername = useCallback(
    (username: string) =>
      users.find((u) => u.username?.toLowerCase() === username.toLowerCase()),
    [users],
  );

  /* ── social / friends ───────────────────────────────────────────────────── */
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
        userId: toUserId, // kept for UI compatibility
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
      trackEvent('friend_request_sent', { from: fromUserId, to: toUserId });
    },
    [
      currentUser,
      getFriendRequest,
      setFriendRequests,
      upsertFriendRequest,
      setNotifications,
      upsertNotification,
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
      trackEvent('friend_request_cancelled', { from: currentUser.id, to: toUserId });
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
      setNotifications,
      upsertNotification,
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
        declinedBy: request?.toUserId,
        requestedBy: request?.fromUserId,
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
            return { ...user, friendIds: user.friendIds.filter((id) => id !== friendId) };
          }
          if (user.id === friendId) {
            return { ...user, friendIds: user.friendIds.filter((id) => id !== currentUserId) };
          }
          return user;
        }),
      );

      trackEvent('friend_removed', { remover: currentUserId, removed: friendId });
    },
    [currentUser, setUsers],
  );

  const toggleBlockUser = useCallback(
    (userIdToBlock: string) => {
      if (!currentUser) return;
      const currentUserId = currentUser.id;
      const isBlocked = currentUser.blockedUserIds?.includes(userIdToBlock);

      const updatedBlocked = isBlocked
        ? (currentUser.blockedUserIds || []).filter((id) => id !== userIdToBlock)
        : [...new Set([...(currentUser.blockedUserIds || []), userIdToBlock])];

      const patchedUser: User = { ...currentUser, blockedUserIds: updatedBlocked };
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

  /* ── posts ───────────────────────────────────────────────────────────────── */
  const addPost = useCallback(
    (content: string, image?: string) => {
      if (!currentUser) return;
      const id = crypto.randomUUID ? crypto.randomUUID() : `p${Date.now()}`;
      const newPost: Post = {
        id,
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
      trackEvent('post_created', { userId: currentUser.id, postId: id });
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

  /* ── collaborations ─────────────────────────────────────────────────────── */
  const addCollaboration = useCallback(
    (
      collabData: Omit<
        Collaboration,
        'id' | 'authorId' | 'timestamp' | 'interestedUserIds'
      >,
    ) => {
      if (!currentUser) return;
      const id = crypto.randomUUID ? crypto.randomUUID() : `collab${Date.now()}`;
      const newCollab: Collaboration = {
        id,
        authorId: currentUser.id,
        timestamp: new Date().toISOString(),
        interestedUserIds: [],
        ...collabData,
      };
      setCollaborations((prev) => [newCollab, ...prev]);
      upsertCollaboration(newCollab);
      trackEvent('collaboration_created', { userId: currentUser.id, collabId: id });
    },
    [currentUser, setCollaborations, upsertCollaboration],
  );

  const updateCollaboration = useCallback(
    (updatedCollab: Collaboration) => {
      setCollaborations((prev) =>
        prev.map((c) => (c.id === updatedCollab.id ? updatedCollab : c)),
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
    ],
  );

  /* ── messaging ───────────────────────────────────────────────────────────── */
  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      if (!currentUser) return;
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return;

      const other = conversation.participantIds.find((id) => id !== currentUser.id);
      if (!other) return;

      const id = crypto.randomUUID ? crypto.randomUUID() : `m${Date.now()}`;
      const newMessage: Message = {
        id,
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

      trackEvent('message_sent', { from: currentUser.id, to: other });
    },
    [
      currentUser,
      conversations,
      setConversations,
      upsertConversation,
      setNotifications,
      upsertNotification,
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

  /* ── notifications & feedback ───────────────────────────────────────────── */
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
      }, 250);
    },
    [setNotifications, notifications, upsertNotification],
  );

  const sendFeedback = useCallback(
    (content: string, type: 'Bug Report' | 'Suggestion') => {
      if (!currentUser) return;
      const id = crypto.randomUUID ? crypto.randomUUID() : `f${Date.now()}`;
      const newFeedback: Feedback = {
        id,
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

  /* ── push ────────────────────────────────────────────────────────────────── */
  const subscribeToPushNotifications = useCallback(
    (subscription: PushSubscriptionObject) => {
      if (!currentUser) return;
      setPushSubscriptions((prev) => ({
        ...prev,
        [currentUser.id]: subscription,
      }));
      trackEvent('push_subscribed', { userId: currentUser.id });
    },
    [currentUser, setPushSubscriptions],
  );

  /* ── context value ───────────────────────────────────────────────────────── */
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

    // nav
    navigate,
    goBack,
    viewProfile,
    updateCurrentContext,

    // lookups
    getUserById,
    getUserByUsername,

    // misc
    registerScrollableNode,

    // auth
    login,
    logout,
    startRegistration,
    cancelRegistration,
    registerAndSetup,
    updateUserProfile,

    // social
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    toggleBlockUser,
    getFriendRequest,
    getFriendRequestById,

    // posts
    addPost,
    deletePost,

    // collabs
    addCollaboration,
    updateCollaboration,
    deleteCollaboration,
    toggleCollaborationInterest,

    // messages
    sendMessage,
    viewConversation,
    setSelectedConversationId,
    moveConversationToFolder,

    // notifications & feedback
    markNotificationsAsRead,
    sendFeedback,

    // push + theme
    subscribeToPushNotifications,
    setTheme,

    // data management
    refreshData,
    refreshConversations,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/* ──────────────────────────────────────────────────────────────────────────────
   Hook
   ─────────────────────────────────────────────────────────────────────────── */
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within an AppProvider');
  return ctx;
};
