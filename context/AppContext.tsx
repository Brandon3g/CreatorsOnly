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
  Platform,
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

import {
  MOCK_USERS,
  MOCK_POSTS,
  MOCK_NOTIFICATIONS,
  MOCK_CONVERSATIONS,
  MOCK_COLLABORATIONS,
  MASTER_USER_ID,
  MOCK_FEEDBACK,
  MOCK_FRIEND_REQUESTS,
} from '../constants';

import { trackEvent } from '../services/analytics';
import { upsertMyProfile } from '../services/profile';
import { supabase } from '../lib/supabaseClient';
import { fetchAppState, upsertAppState } from '../services/appState';

/* ---------------------------------------------------------------------------
 * Recovery helpers
 * -------------------------------------------------------------------------*/
// Read/write a session-scoped flag so recovery survives Supabase's hash cleaning
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

// Detect if current URL is part of a password recovery/reset flow.
// Works with "#/NewPassword", "#access_token=...&type=recovery", and multi-hash variants.
function urlLooksLikeRecovery(): boolean {
  try {
    const href = window.location.href || '';
    const hash = window.location.hash || '';

    if (/#\/NewPassword/i.test(hash)) return true;

    const fragments = href.split('#').slice(1); // after first '#'
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

// Single source of truth: either URL looks like recovery OR a pre-boot script set the flag
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
const USERS_STORAGE_KEY = 'creatorsOnlyUsers';
const POSTS_STORAGE_KEY = 'creatorsOnlyPosts';
const NOTIFICATIONS_STORAGE_KEY = 'creatorsOnlyNotifications';
const CONVERSATIONS_STORAGE_KEY = 'creatorsOnlyConversations';
const COLLABORATIONS_STORAGE_KEY = 'creatorsOnlyCollaborations';
const FEEDBACK_STORAGE_KEY = 'creatorsOnlyFeedback';
const FRIEND_REQUESTS_STORAGE_KEY = 'creatorsOnlyFriendRequests';
const AUTH_STORAGE_KEY = 'creatorsOnlyAuth';
const THEME_STORAGE_KEY = 'creatorsOnlyTheme';
const HISTORY_STORAGE_KEY = 'creatorsOnlyHistory';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const defaultHistory = (): NavigationEntry[] => [{ page: 'feed', context: {} }];
const createDefaultUsers = () => clone(MOCK_USERS);
const createDefaultPosts = () => clone(MOCK_POSTS);
const createDefaultNotifications = () => clone(MOCK_NOTIFICATIONS);
const createDefaultConversations = () => clone(MOCK_CONVERSATIONS);
const createDefaultCollaborations = () => clone(MOCK_COLLABORATIONS);
const createDefaultFeedback = () => clone(MOCK_FEEDBACK);
const createDefaultFriendRequests = () => clone(MOCK_FRIEND_REQUESTS);

/* ---------------------------------------------------------------------------
 * Context type
 * -------------------------------------------------------------------------*/
interface AppContextType {
  // State
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

  // Actions
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
    collab: Omit<Collaboration, 'id' | 'authorId' | 'timestamp' | 'interestedUserIds'>
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

  // Real email reset via Supabase (redirects to #/NewPassword)
  sendPasswordResetLink: (email: string) => void;

  subscribeToPushNotifications: (subscription: PushSubscriptionObject) => void;

  setTheme: (theme: 'light' | 'dark') => void;

  refreshData: () => Promise<void>;
}

/* ---------------------------------------------------------------------------
 * Context
 * -------------------------------------------------------------------------*/
const AppContext = createContext<AppContextType | undefined>(undefined);

/* ---------------------------------------------------------------------------
 * Provider
 * -------------------------------------------------------------------------*/
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  function useAppStateStorage<T>(
    key: string,
    initialValueFactory: () => T,
  ): [T, (value: T | ((val: T) => T)) => void, boolean, () => Promise<void>] {
    const [currentKey, setCurrentKey] = useState(key);
    const [state, setState] = useState<T>(() => initialValueFactory());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      if (key !== currentKey) {
        setCurrentKey(key);
        setState(initialValueFactory());
        setLoaded(false);
      }
    }, [key, currentKey, initialValueFactory]);

    useEffect(() => {
      let isMounted = true;

      (async () => {
        try {
          const remote = await fetchAppState<T>(currentKey);
          if (!isMounted) return;
          if (remote !== null) {
            setState(remote);
          } else {
            const fallback = initialValueFactory();
            setState(fallback);
            await upsertAppState(currentKey, fallback);
          }
        } catch (error) {
          console.error(`[AppState] Hydration failed for key ${currentKey}`, error);
        } finally {
          if (isMounted) setLoaded(true);
        }
      })();

      return () => {
        isMounted = false;
      };
    }, [currentKey, initialValueFactory]);

    const persist = useCallback(
      (value: T | ((val: T) => T)) => {
        setState((prev) => {
          const next = value instanceof Function ? value(prev) : value;
          upsertAppState(currentKey, next).catch((error) => {
            console.error(`[AppState] Persist failed for key ${currentKey}`, error);
          });
          return next;
        });
      },
      [currentKey],
    );

    const reload = useCallback(async () => {
      try {
        const remote = await fetchAppState<T>(currentKey);
        if (remote !== null) {
          setState(remote);
        }
      } catch (error) {
        console.error(`[AppState] Reload failed for key ${currentKey}`, error);
      }
    }, [currentKey]);

    return [state, persist, loaded, reload];
  }

  // --- State ---------------------------------------------------------------
  const [users, setUsers, , reloadUsers] = useAppStateStorage<User[]>(
    USERS_STORAGE_KEY,
    createDefaultUsers,
  );
  const [posts, setPosts, , reloadPosts] = useAppStateStorage<Post[]>(
    POSTS_STORAGE_KEY,
    createDefaultPosts,
  );
  const [notifications, setNotifications, , reloadNotifications] = useAppStateStorage<Notification[]>(
    NOTIFICATIONS_STORAGE_KEY,
    createDefaultNotifications,
  );
  const [conversations, setConversations, , reloadConversations] = useAppStateStorage<Conversation[]>(
    CONVERSATIONS_STORAGE_KEY,
    createDefaultConversations,
  );
  const [collaborations, setCollaborations, , reloadCollaborations] = useAppStateStorage<Collaboration[]>(
    COLLABORATIONS_STORAGE_KEY,
    createDefaultCollaborations,
  );
  const [feedback, setFeedback, , reloadFeedback] = useAppStateStorage<Feedback[]>(
    FEEDBACK_STORAGE_KEY,
    createDefaultFeedback,
  );
  const [friendRequests, setFriendRequests, , reloadFriendRequests] = useAppStateStorage<FriendRequest[]>(
    FRIEND_REQUESTS_STORAGE_KEY,
    createDefaultFriendRequests,
  );

  const [authData, setAuthData, , reloadAuth] = useAppStateStorage<{ userId: string | null }>(
    AUTH_STORAGE_KEY,
    () => ({ userId: null }),
  );

  const [pushSubscriptions, setPushSubscriptions, , reloadPushSubscriptions] =
    useAppStateStorage<Record<string, PushSubscriptionObject>>(
      PUSH_SUBSCRIPTIONS_STORAGE_KEY,
      () => ({}),
    );

  const [theme, setThemeState, , reloadTheme] = useAppStateStorage<'light' | 'dark'>(
    THEME_STORAGE_KEY,
    () => 'dark',
  );

  const [isRegistering, setIsRegistering] = useState(false);

  const historyKey = useMemo(
    () => `${HISTORY_STORAGE_KEY}:${authData.userId ?? 'guest'}`,
    [authData.userId],
  );
  const [history, setHistory, , reloadHistory] = useAppStateStorage<NavigationEntry[]>(
    historyKey,
    defaultHistory,
  );

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const [editingCollaborationId, setEditingCollaborationId] =
    useState<string | null>(null);

  const scrollableNodeRef = useRef<HTMLDivElement | null>(null);

  // --- Derived -------------------------------------------------------------
  const currentUser = users.find((u) => u.id === authData.userId) || null;
  const isAuthenticated = !!currentUser;
  const isMasterUser = currentUser?.id === MASTER_USER_ID;

  const currentEntry = history[history.length - 1] || { page: 'feed', context: {} };
  const currentPage = currentEntry.page;
  const viewingProfileId =
    (currentEntry.context as PageContext).viewingProfileId ?? null;
  const viewingCollaborationId =
    (currentEntry.context as PageContext).viewingCollaborationId ?? null;

  // --- Supabase → AppContext **BRIDGE** -----------------------------------
// Map any signed-in Supabase user to our AI master profile (MASTER_USER_ID)
useEffect(() => {
  // Initial session check (async)
  (async () => {
    // If URL/tokens look like recovery, persist a flag so we respect it even if Supabase cleans the hash.
    if (urlLooksLikeRecovery()) setRecoveryFlag(true);

    const { data } = await supabase.auth.getSession();
    const hasSession = !!data.session?.user;
    const recovering = isRecoveryActive();

    if (hasSession) {
      if (authData.userId !== MASTER_USER_ID) {
        setAuthData({ userId: MASTER_USER_ID });
      }

      // During recovery, DO NOT clobber route/history; ensure we land on NewPassword.
      if (recovering) {
        if (!/#\/NewPassword/i.test(window.location.hash)) {
          window.location.hash = '#/NewPassword';
        }
      } else {
        setHistory([{ page: 'feed', context: {} }]);
      }

      // Rehydrate after session appears
      reloadUsers();
      trackEvent('login_success', { userId: MASTER_USER_ID, via: 'supabase' });
    } else if (authData.userId !== null) {
      setAuthData({ userId: null });
      setHistory([{ page: 'feed', context: {} }]);
    }
  })();

  // Subscribe to future changes
  const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
    const recoveringNow = isRecoveryActive();

    if (session?.user) {
      setAuthData({ userId: MASTER_USER_ID });

      if (recoveringNow) {
        if (!/#\/NewPassword/i.test(window.location.hash)) {
          window.location.hash = '#/NewPassword';
        }
      } else {
        setHistory([{ page: 'feed', context: {} }]);
      }

      // Rehydrate after session appears
      reloadUsers();
      trackEvent('login_success', { userId: MASTER_USER_ID, via: 'supabase' });
    } else {
      setAuthData({ userId: null });
      setHistory([{ page: 'feed', context: {} }]);
    }
  });

  return () => sub.subscription.unsubscribe();
}, [reloadUsers]);

  // --- Data refresh (simulated) -------------------------------------------
  const refreshData = useCallback(async () => {
    await Promise.all([
      reloadUsers(),
      reloadPosts(),
      reloadNotifications(),
      reloadConversations(),
      reloadCollaborations(),
      reloadFeedback(),
      reloadFriendRequests(),
      reloadAuth(),
      reloadPushSubscriptions(),
      reloadTheme(),
      reloadHistory(),
    ]);
    trackEvent('data_refreshed');
  }, [
    reloadAuth,
    reloadCollaborations,
    reloadConversations,
    reloadFeedback,
    reloadFriendRequests,
    reloadHistory,
    reloadNotifications,
    reloadPosts,
    reloadPushSubscriptions,
    reloadTheme,
    reloadUsers,
  ]);

  // Stay in sync with Supabase updates from other devices/tabs.
  useEffect(() => {
    const historyKeyForUser = `${HISTORY_STORAGE_KEY}:${authData.userId ?? 'guest'}`;

    const keyReloadMap: Record<string, () => Promise<void>> = {
      [USERS_STORAGE_KEY]: reloadUsers,
      [POSTS_STORAGE_KEY]: reloadPosts,
      [NOTIFICATIONS_STORAGE_KEY]: reloadNotifications,
      [CONVERSATIONS_STORAGE_KEY]: reloadConversations,
      [COLLABORATIONS_STORAGE_KEY]: reloadCollaborations,
      [FEEDBACK_STORAGE_KEY]: reloadFeedback,
      [FRIEND_REQUESTS_STORAGE_KEY]: reloadFriendRequests,
      [AUTH_STORAGE_KEY]: reloadAuth,
      [PUSH_SUBSCRIPTIONS_STORAGE_KEY]: reloadPushSubscriptions,
      [THEME_STORAGE_KEY]: reloadTheme,
      [historyKeyForUser]: reloadHistory,
    };

    const channelName = `app_state_sync_${authData.userId ?? 'guest'}`;
    const channel = supabase.channel(channelName);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_state',
      },
      (payload: any) => {
        const changedKey = (payload?.new?.key ?? payload?.old?.key) as string | undefined;
        if (!changedKey) return;

        const reload = keyReloadMap[changedKey];
        if (reload) {
          reload().catch((error) =>
            console.error(`[AppState] Realtime reload failed for key ${changedKey}`, error),
          );
        }
      },
    );

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[AppState] Realtime channel error');
      }
    });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('[AppState] Failed to remove realtime channel', error);
      }
    };
  }, [
    authData.userId,
    reloadAuth,
    reloadCollaborations,
    reloadConversations,
    reloadFeedback,
    reloadFriendRequests,
    reloadHistory,
    reloadNotifications,
    reloadPosts,
    reloadPushSubscriptions,
    reloadTheme,
    reloadUsers,
  ]);

  // --- Theme ---------------------------------------------------------------
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

  // --- Scrolling container -------------------------------------------------
  const registerScrollableNode = useCallback((node: HTMLDivElement) => {
    scrollableNodeRef.current = node;
  }, []);

  // --- Navigation ----------------------------------------------------------
  const navigate = useCallback(
    (page: Page, context: PageContext = {}) => {
      const last = history[history.length - 1];
      if (scrollableNodeRef.current) {
        last.scrollTop = scrollableNodeRef.current.scrollTop;
      }
      if (
        last.page === page &&
        JSON.stringify(last.context) === JSON.stringify(context)
      ) {
        return;
      }
      setHistory((prev) => [...prev, { page, context, scrollTop: 0 }]);
      if (scrollableNodeRef.current) scrollableNodeRef.current.scrollTop = 0;
    },
    [history],
  );

  const updateCurrentContext = useCallback((newContext: Partial<PageContext>) => {
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
  }, []);

  const goBack = useCallback(() => {
    if (history.length > 1) setHistory((p) => p.slice(0, -1));
  }, [history.length]);

  const viewProfile = (userId: string) => navigate('profile', { viewingProfileId: userId });

  // --- Demo login (username)  ---------------------------------------------
  const login = (username: string, _password: string) => {
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    );
    if (user) {
      setAuthData({ userId: user.id });
      setIsRegistering(false);
      setHistory([{ page: 'feed', context: {} }]);
      trackEvent('login_success', { userId: user.id, via: 'demo' });
      return true;
    }
    trackEvent('login_failed', { username });
    return false;
  };

  // Also sign out from Supabase so refresh doesn't auto-login
  const logout = () => {
    try {
      supabase.auth.signOut().catch((e) =>
        console.warn('[logout] supabase signOut error:', e),
      );
    } finally {
      setAuthData({ userId: null });
      setHistory([{ page: 'feed', context: {} }]);
      // Leaving the app → clear any lingering recovery guard
      setRecoveryFlag(false);
      trackEvent('logout', { userId: currentUser?.id, via: 'app_context' });
    }
  };

  // --- Password reset (real; Supabase) ------------------------------------
  const sendPasswordResetLink = (email: string) => {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'https://creatorzonly.com';
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
  };

  // --- Registration (mock) ------------------------------------------------
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
        users.some(
          (u) => u.username.toLowerCase() === data.username.toLowerCase(),
        )
      ) {
        trackEvent('registration_failed', { reason: 'username_taken' });
        return false;
      }

      const newIdNumber = users.length + 100;
      const newUser: User = {
        id: `u${users.length + 1}`,
        username: data.username,
        name: data.name,
        email: data.email,
        bio: data.bio,
        tags: data.tags,
        state: data.state,
        county: data.county,
        customLink: data.customLink || '',
        avatar: `https://picsum.photos/seed/${newIdNumber}a/200/200`,
        banner: `https://picsum.photos/seed/${newIdNumber}b/1000/300`,
        isVerified: false,
        friendIds: [],
        platformLinks: [],
        blockedUserIds: [],
      };

      setUsers((p) => [...p, newUser]);
      setAuthData({ userId: newUser.id });
      setIsRegistering(false);
      setHistory([{ page: 'feed', context: {} }]);
      trackEvent('registration_success', { userId: newUser.id });
      return true;
    },
    [users, setUsers, setAuthData],
  );

  const updateUserProfile = useCallback(
    async (patch: Partial<User> & Record<string, any>) => {
      // 1) Immediate UI update (local users array)
      if (currentUser) {
        setUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? { ...u, ...patch } : u)),
        );
      }

      // 2) Persist to DB (if signed in)
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[profile] getSession error', error);
        return;
      }
      const dbUserId = data?.session?.user?.id;
      if (!dbUserId) return; // not logged in (e.g., guest)

      // Map any UI fields to DB columns; ignore unknowns
      const dbPatch: Record<string, any> = {};
      if (typeof patch.username !== 'undefined') {
        const value =
          typeof patch.username === 'string' ? patch.username.trim() : patch.username;
        dbPatch.username = value ? value : null;
      }

      if (typeof patch.display_name !== 'undefined') {
        const value =
          typeof patch.display_name === 'string' ? patch.display_name.trim() : patch.display_name;
        dbPatch.display_name = value ? value : null;
      }

      if (typeof patch.name !== 'undefined' && typeof dbPatch.display_name === 'undefined') {
        const value = typeof patch.name === 'string' ? patch.name.trim() : patch.name;
        dbPatch.display_name = value ? value : null;
      }

      if (typeof patch.bio !== 'undefined') {
        const value =
          typeof patch.bio === 'string' ? patch.bio.slice(0, 150) : patch.bio;
        dbPatch.bio = value ?? null;
      }

      if (typeof patch.avatar_url !== 'undefined') {
        dbPatch.avatar_url = patch.avatar_url ?? null;
      }

      if (typeof patch.avatar !== 'undefined' && typeof dbPatch.avatar_url === 'undefined') {
        dbPatch.avatar_url = patch.avatar ?? null;
      }
        dbPatch.avatar_url = patch.avatar ?? null;

      try {
        await upsertMyProfile(dbUserId, dbPatch); // writes to public.profiles
      } catch (e) {
        console.error('[profile] upsert failed', e);
      }

      trackEvent('profile_updated', { userId: dbUserId });
    },
    [currentUser, setUsers],
  );

  // --- Social --------------------------------------------------------------
  const getUserById = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users],
  );

  const getFriendRequest = (userId1: string, userId2: string) =>
    friendRequests.find(
      (fr) =>
        (fr.fromUserId === userId1 && fr.toUserId === userId2) ||
        (fr.fromUserId === userId2 && fr.toUserId === userId1),
    );

  const getFriendRequestById = (id: string) =>
    friendRequests.find((fr) => fr.id === id);

  const sendFriendRequest = useCallback(
    (toUserId: string) => {
      if (!currentUser) return;
      const fromUserId = currentUser.id;

      const existing = getFriendRequest(fromUserId, toUserId);
      if (existing) return;

      const newRequest: FriendRequest = {
        id: `fr${friendRequests.length + 1}`,
        fromUserId,
        toUserId,
        status: FriendRequestStatus.PENDING,
        timestamp: new Date().toISOString(),
      };
      setFriendRequests((p) => [...p, newRequest]);

      const notification: Notification = {
        id: `n${notifications.length + 1}`,
        userId: toUserId,
        actorId: fromUserId,
        type: NotificationType.FRIEND_REQUEST,
        entityType: 'friend_request',
        entityId: newRequest.id,
        message: `${currentUser.name} sent you a friend request.`,
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((p) => [...p, notification]);
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
      friendRequests,
      setFriendRequests,
      notifications,
      setNotifications,
      getFriendRequest,
      pushSubscriptions,
    ],
  );

  const cancelFriendRequest = useCallback(
    (toUserId: string) => {
      if (!currentUser) return;
      setFriendRequests((p) =>
        p.filter(
          (fr) =>
            !(
              fr.fromUserId === currentUser.id &&
              fr.toUserId === toUserId &&
              fr.status === FriendRequestStatus.PENDING
            ),
        ),
      );
      trackEvent('friend_request_cancelled', {
        from: currentUser.id,
        to: toUserId,
      });
    },
    [currentUser, setFriendRequests],
  );

  const acceptFriendRequest = useCallback(
    (requestId: string) => {
      const request = friendRequests.find((fr) => fr.id === requestId);
      if (!request || !currentUser || request.toUserId !== currentUser.id) return;

      // Update request status
      setFriendRequests((prev) =>
        prev.map((fr) =>
          fr.id === requestId ? { ...fr, status: FriendRequestStatus.ACCEPTED } : fr,
        ),
      );

      // Connect both users
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id === request.fromUserId)
            return { ...user, friendIds: [...user.friendIds, request.toUserId] };
          if (user.id === request.toUserId)
            return { ...user, friendIds: [...user.friendIds, request.fromUserId] };
          return user;
        }),
      );

      // Notify requester
      const fromUser = getUserById(request.fromUserId);
      if (fromUser) {
        const notification: Notification = {
          id: `n${notifications.length + 1}`,
          userId: request.fromUserId,
          actorId: request.toUserId,
          type: NotificationType.FRIEND_REQUEST_ACCEPTED,
          entityType: 'user',
          entityId: request.toUserId,
          message: `${currentUser.name} accepted your friend request.`,
          isRead: false,
          timestamp: new Date().toISOString(),
        };
        setNotifications((p) => [...p, notification]);
        emitSocketEvent(request.fromUserId, 'notification:new', notification);
        sendWebPush(
          pushSubscriptions,
          request.fromUserId,
          'Friend Request Accepted',
          notification.message,
          `/profile/${currentUser.username}`,
        );
      }

      trackEvent('friend_request_accepted', {
        acceptedBy: request.toUserId,
        requestedBy: request.fromUserId,
      });
    },
    [
      friendRequests,
      setFriendRequests,
      setUsers,
      currentUser,
      notifications,
      setNotifications,
      getUserById,
      pushSubscriptions,
    ],
  );

  const declineFriendRequest = useCallback(
    (requestId: string) => {
      setFriendRequests((prev) =>
        prev.map((fr) =>
          fr.id === requestId ? { ...fr, status: FriendRequestStatus.DECLINED } : fr,
        ),
      );
      const request = friendRequests.find((fr) => fr.id === requestId);
      if (request) {
        trackEvent('friend_request_declined', {
          declinedBy: request.toUserId,
          requestedBy: request.fromUserId,
        });
      }
    },
    [setFriendRequests, friendRequests],
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

      // Also strip any requests
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
    [currentUser, setUsers, setFriendRequests],
  );

  const toggleBlockUser = useCallback(
    (userIdToBlock: string) => {
      if (!currentUser) return;
      const currentUserId = currentUser.id;
      const isBlocked = currentUser.blockedUserIds?.includes(userIdToBlock);

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === currentUserId) {
            const blocked = u.blockedUserIds || [];
            const nextBlocked = isBlocked
              ? blocked.filter((id) => id !== userIdToBlock)
              : [...blocked, userIdToBlock];
            return { ...u, blockedUserIds: nextBlocked };
          }
          return u;
        }),
      );

      if (!isBlocked) removeFriend(userIdToBlock);

      trackEvent(isBlocked ? 'user_unblocked' : 'user_blocked', {
        blocker: currentUserId,
        blocked: userIdToBlock,
      });
    },
    [currentUser, setUsers, removeFriend],
  );

  // --- Posts ---------------------------------------------------------------
  const addPost = useCallback(
    (content: string, image?: string) => {
      if (!currentUser) return;
      const postId = posts.length + 100;
      const newPost: Post = {
        id: `p${posts.length + 1}`,
        authorId: currentUser.id,
        content,
        image: image || `https://picsum.photos/seed/${postId}p/800/600`,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
        tags: [],
      };
      setPosts((prev) => [newPost, ...prev]);
      trackEvent('post_created', { userId: currentUser.id, postId: newPost.id });
    },
    [currentUser, posts, setPosts],
  );

  const deletePost = useCallback(
    (postId: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      trackEvent('post_deleted', { userId: currentUser?.id, postId });
    },
    [setPosts, currentUser],
  );

  // --- Collaborations ------------------------------------------------------
  const addCollaboration = useCallback(
    (
      collabData: Omit<
        Collaboration,
        'id' | 'authorId' | 'timestamp' | 'interestedUserIds'
      >,
    ) => {
      if (!currentUser) return;
      const newCollab: Collaboration = {
        id: `collab${collaborations.length + 1}`,
        authorId: currentUser.id,
        timestamp: new Date().toISOString(),
        interestedUserIds: [],
        ...collabData,
      };
      setCollaborations((prev) => [newCollab, ...prev]);
      trackEvent('collaboration_created', {
        userId: currentUser.id,
        collabId: newCollab.id,
      });
    },
    [currentUser, collaborations, setCollaborations],
  );

  const updateCollaboration = useCallback(
    (updatedCollab: Collaboration) => {
      setCollaborations((prev) =>
        prev.map((c) => (c.id === updatedCollab.id ? updatedCollab : c)),
      );
      trackEvent('collaboration_updated', {
        userId: currentUser?.id,
        collabId: updatedCollab.id,
      });
    },
    [setCollaborations, currentUser],
  );

  const deleteCollaboration = useCallback(
    (collabId: string) => {
      setCollaborations((prev) => prev.filter((c) => c.id !== collabId));
      trackEvent('collaboration_deleted', { userId: currentUser?.id, collabId });
    },
    [setCollaborations, currentUser],
  );

  const toggleCollaborationInterest = useCallback(
    (collabId: string) => {
      if (!currentUser) return;
      const collab = collaborations.find((c) => c.id === collabId);
      if (!collab) return;

      const isInterested = collab.interestedUserIds.includes(currentUser.id);

      setCollaborations((prev) =>
        prev.map((c) => {
          if (c.id !== collabId) return c;
          const updatedIds = isInterested
            ? c.interestedUserIds.filter((id) => id !== currentUser.id)
            : [...c.interestedUserIds, currentUser.id];
          return { ...c, interestedUserIds: updatedIds };
        }),
      );

      if (!isInterested) {
        const notification: Notification = {
          id: `n${notifications.length + 1}`,
          userId: collab.authorId,
          actorId: currentUser.id,
          type: NotificationType.COLLAB_REQUEST,
          entityType: 'collaboration',
          entityId: collab.id,
          message: `${currentUser.name} is interested in your "${collab.title}" opportunity.`,
          isRead: false,
          timestamp: new Date().toISOString(),
        };
        setNotifications((p) => [...p, notification]);
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
      notifications,
      setNotifications,
      pushSubscriptions,
    ],
  );

  // --- Messaging -----------------------------------------------------------
  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      if (!currentUser) return;

      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return;

      const other = conversation.participantIds.find((id) => id !== currentUser.id);
      if (!other) return;

      const newMessage: Message = {
        id: `m${Date.now()}`,
        senderId: currentUser.id,
        receiverId: other,
        text,
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, messages: [...c.messages, newMessage] } : c,
        ),
      );

      const notification: Notification = {
        id: `n${notifications.length + 1}`,
        userId: other,
        actorId: currentUser.id,
        type: NotificationType.NEW_MESSAGE,
        entityType: 'user',
        entityId: currentUser.id,
        message: `You have a new message from ${currentUser.name}.`,
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((p) => [...p, notification]);
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
      notifications,
      setNotifications,
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
          id: `c${conversations.length + 1}`,
          participantIds: [currentUser.id, participantId],
          messages: [],
          folder: 'general',
        };
        setConversations((prev) => [...prev, conversation!]);
      }

      setSelectedConversationId(conversation.id);
      navigate('messages');
    },
    [currentUser, conversations, setConversations, navigate],
  );

  const moveConversationToFolder = useCallback(
    (conversationId: string, folder: ConversationFolder) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, folder } : c)),
      );
      trackEvent('conversation_moved', { conversationId, folder });
    },
    [setConversations],
  );

  // --- Notifications -------------------------------------------------------
  const markNotificationsAsRead = useCallback(
    (ids: string[]) => {
      setTimeout(() => {
        setNotifications((prev) =>
          prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
        );
      }, 500);
    },
    [setNotifications],
  );

  // --- Feedback ------------------------------------------------------------
  const sendFeedback = useCallback(
    (content: string, type: 'Bug Report' | 'Suggestion') => {
      if (!currentUser) return;
      const newFeedback: Feedback = {
        id: `f${feedback.length + 1}`,
        userId: currentUser.id,
        type,
        content,
        timestamp: new Date().toISOString(),
      };
      setFeedback((prev) => [newFeedback, ...prev]);
      trackEvent('feedback_sent', { userId: currentUser.id, type });
    },
    [currentUser, feedback, setFeedback],
  );

  // --- Push subscriptions --------------------------------------------------
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

  // --- Context value -------------------------------------------------------
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
      users.find((u) => u.username.toLowerCase() === username.toLowerCase()),

    registerScrollableNode,

    // Real email reset (Supabase)
    sendPasswordResetLink,

    subscribeToPushNotifications,

    setTheme,

    refreshData,
  };

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
};

/* ---------------------------------------------------------------------------
 * Hook
 * -------------------------------------------------------------------------*/
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
