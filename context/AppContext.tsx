// context/AppContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  User,
  Post,
  Notification,
  Conversation,
  Collaboration,
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
import { supabase } from '../lib/supabaseClient';
import {
  fetchUsers as fetchUsersFromDb,
  fetchPosts as fetchPostsFromDb,
  fetchNotifications as fetchNotificationsFromDb,
  fetchCollaborations as fetchCollaborationsFromDb,
  fetchFeedback as fetchFeedbackFromDb,
  fetchFriendRequests as fetchFriendRequestsFromDb,
  fetchPushSubscriptions as fetchPushSubscriptionsFromDb,
  fetchConversations as fetchConversationsFromDb,
  upsertPushSubscription,
  createNotification as createNotificationRow,
  markNotificationsRead,
  createCollaboration as createCollaborationRow,
  updateCollaborationRow,
  deleteCollaborationRow,
  upsertCollaborationInterest,
  createMessage as createMessageRow,
  ensureConversation,
  submitFeedback as submitFeedbackRow,
  updateConversationFolder as updateConversationFolderRow,
  updateUserFriends,
  updateUserBlocked,
  mapDbPostToLegacy,
  mapRowToUser,
  mapRowToNotification,
  mapRowToCollaboration,
  mapRowToMessage,
  mapRowToConversation,
  mapRowToFeedback,
  mapRowToFriendRequest,
} from '../services/appData';
import {
  sendFriendRequest as sendFriendRequestRow,
  acceptFriendRequest as acceptFriendRequestRow,
  declineFriendRequest as declineFriendRequestRow,
  cancelFriendRequest as cancelFriendRequestRow,
} from '../services/friendRequests';
import { createPost, deletePost as deletePostFromDb } from '../services/posts';
import { subscribeToAppRealtime, subscribeToTable } from '../services/realtime';

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
/* ---------------------------------------------------------------------------
 * Storage keys
 * -------------------------------------------------------------------------*/
const THEME_STORAGE_KEY = 'creatorsOnlyTheme';

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

  updateUserProfile: (updatedUser: User) => void;

  sendFriendRequest: (toUserId: string) => Promise<void>;
  cancelFriendRequest: (toUserId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  toggleBlockUser: (userId: string) => Promise<void>;

  getFriendRequest: (userId1: string, userId2: string) => FriendRequest | undefined;
  getFriendRequestById: (id: string) => FriendRequest | undefined;

  addPost: (content: string, image?: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;

  addCollaboration: (
    collab: Omit<Collaboration, 'id' | 'authorId' | 'timestamp' | 'interestedUserIds'>
  ) => Promise<void>;
  updateCollaboration: (updatedCollab: Collaboration) => Promise<void>;
  deleteCollaboration: (collabId: string) => Promise<void>;
  toggleCollaborationInterest: (collabId: string) => Promise<void>;

  sendMessage: (conversationId: string, text: string) => Promise<void>;
  viewConversation: (participantId: string) => Promise<void>;
  setSelectedConversationId: (id: string | null) => void;

  setEditingCollaborationId: (id: string | null) => void;
  moveConversationToFolder: (conversationId: string, folder: ConversationFolder) => Promise<void>;

  markNotificationsAsRead: (ids: string[]) => Promise<void>;
  sendFeedback: (content: string, type: 'Bug Report' | 'Suggestion') => Promise<void>;

  navigate: (page: Page, context?: PageContext) => void;
  goBack: () => void;
  viewProfile: (userId: string) => void;
  updateCurrentContext: (newContext: Partial<PageContext>) => void;

  getUserById: (id: string) => User | undefined;
  getUserByUsername: (username: string) => User | undefined;

  registerScrollableNode: (node: HTMLDivElement) => void;

  // Real email reset via Supabase (redirects to #/NewPassword)
  sendPasswordResetLink: (email: string) => void;

  subscribeToPushNotifications: (subscription: PushSubscriptionObject) => Promise<void>;

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
  // --- State ---------------------------------------------------------------
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [notifications, setNotifications] = useState<Notification[]>(
    MOCK_NOTIFICATIONS,
  );
  const [conversations, setConversations] = useState<Conversation[]>(
    MOCK_CONVERSATIONS,
  );
  const [collaborations, setCollaborations] = useState<Collaboration[]>(
    MOCK_COLLABORATIONS,
  );
  const [feedback, setFeedback] = useState<Feedback[]>(MOCK_FEEDBACK);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(
    MOCK_FRIEND_REQUESTS,
  );

  // App-level "auth" is just a pointer to a user id from the users array
  const [authData, setAuthData] = useState<{ userId: string | null }>({
    userId: null,
  });

  const [pushSubscriptions, setPushSubscriptions] = useState<
    Record<string, PushSubscriptionObject>
  >({});

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as 'light' | 'dark') : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  const [isRegistering, setIsRegistering] = useState(false);

  const [history, setHistory] = useState<NavigationEntry[]>([
    { page: 'feed', context: {} },
  ]);

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const [editingCollaborationId, setEditingCollaborationId] =
    useState<string | null>(null);

  const scrollableNodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch {
      /* ignore */
    }
  }, [theme]);

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
    let unsub = () => {};

    (async () => {
      // If URL/tokens look like recovery, persist a flag so we respect it even if Supabase cleans the hash.
      if (urlLooksLikeRecovery()) setRecoveryFlag(true);

      // initial check
      const { data } = await supabase.auth.getSession();
      const supabaseId = data.session?.user?.id ?? null;
      setSupabaseUserId(supabaseId);
      const hasSession = !!supabaseId;
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

        trackEvent('login_success', { userId: MASTER_USER_ID, via: 'supabase' });
      } else if (authData.userId !== null) {
        setAuthData({ userId: null });
        setSupabaseUserId(null);
        setHistory([{ page: 'feed', context: {} }]);
      }

      // subscribe to future changes
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        const recoveringNow = isRecoveryActive();

        if (session?.user) {
          setSupabaseUserId(session.user.id);
          setAuthData({ userId: MASTER_USER_ID });

          if (recoveringNow) {
            if (!/#\/NewPassword/i.test(window.location.hash)) {
              window.location.hash = '#/NewPassword';
            }
          } else {
            setHistory([{ page: 'feed', context: {} }]);
          }

          trackEvent('login_success', { userId: MASTER_USER_ID, via: 'supabase' });
        } else {
          setSupabaseUserId(null);
          setAuthData({ userId: null });
          setHistory([{ page: 'feed', context: {} }]);
          // Leaving auth state; clear recovery guard just in case
          setRecoveryFlag(false);
          trackEvent('logout', { via: 'supabase' });
        }
      });

      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  useEffect(() => {
    let active = true;
    const failures: string[] = [];

    async function hydrate() {
      try {
        const remoteUsers = await fetchUsersFromDb();
        if (active && remoteUsers.length > 0) {
          setUsers(remoteUsers);
        }
      } catch (error) {
        console.error('[AppProvider] failed to load users from Supabase', error);
        failures.push('profiles');
      }

      try {
        const remotePosts = await fetchPostsFromDb();
        if (active) setPosts(remotePosts);
      } catch (error) {
        console.error('[AppProvider] failed to load posts from Supabase', error);
        failures.push('posts');
      }

      try {
        const remoteCollaborations = await fetchCollaborationsFromDb();
        if (active) setCollaborations(remoteCollaborations);
      } catch (error) {
        console.error('[AppProvider] failed to load collaborations', error);
        failures.push('collaborations');
      }

      try {
        const remoteFeedback = await fetchFeedbackFromDb();
        if (active) setFeedback(remoteFeedback);
      } catch (error) {
        console.error('[AppProvider] failed to load feedback', error);
        failures.push('feedback');
      }

      try {
        const remoteConversations = await fetchConversationsFromDb();
        if (active) setConversations(remoteConversations);
      } catch (error) {
        console.error('[AppProvider] failed to load conversations', error);
        failures.push('messages');
      }

      try {
        const remoteSubscriptions = await fetchPushSubscriptionsFromDb();
        if (active) setPushSubscriptions(remoteSubscriptions);
      } catch (error) {
        console.error('[AppProvider] failed to load push subscriptions', error);
        failures.push('push notifications');
      }

      if (supabaseUserId) {
        try {
          const remoteNotifications = await fetchNotificationsFromDb(supabaseUserId);
          if (active) setNotifications(remoteNotifications);
        } catch (error) {
          console.error('[AppProvider] failed to load notifications', error);
          failures.push('notifications');
        }

        try {
          const remoteFriendRequests = await fetchFriendRequestsFromDb(supabaseUserId);
          if (active) setFriendRequests(remoteFriendRequests);
        } catch (error) {
          console.error('[AppProvider] failed to load friend requests', error);
          failures.push('friend requests');
        }
      }

      if (failures.length > 0 && active) {
        window.alert(
          `Some data could not be refreshed from the server: ${failures.join(', ')}`,
        );
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, [supabaseUserId]);

  useEffect(() => {
    const offs: Array<() => void> = [];

    offs.push(
      subscribeToAppRealtime(supabaseUserId ?? null, {
        posts: {
          onInsert: (payload) => {
            if (!payload.new) return;
            const post = mapDbPostToLegacy(payload.new as any);
            setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
          },
          onUpdate: (payload) => {
            if (!payload.new) return;
            const post = mapDbPostToLegacy(payload.new as any);
            setPosts((prev) =>
              prev.map((p) => (p.id === post.id ? post : p)),
            );
          },
          onDelete: (payload) => {
            if (!payload.old) return;
            setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
          },
        },
        notifications: {
          onInsert: (payload) => {
            if (!payload.new) return;
            const notification = mapRowToNotification(payload.new);
            setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
          },
          onUpdate: (payload) => {
            if (!payload.new) return;
            const notification = mapRowToNotification(payload.new);
            setNotifications((prev) =>
              prev.map((n) => (n.id === notification.id ? notification : n)),
            );
          },
          onDelete: (payload) => {
            if (!payload.old) return;
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
          },
        },
        messages: {
          onInsert: (payload) => {
            if (!payload.new) return;
            const message = mapRowToMessage(payload.new);
            const conversationId = (payload.new as any).conversation_id;
            setConversations((prev) =>
              prev.map((c) =>
                c.id === conversationId
                  ? c.messages.some((m) => m.id === message.id)
                    ? c
                    : { ...c, messages: [...c.messages, message] }
                  : c,
              ),
            );
          },
        },
        conversations: {
          onInsert: (payload) => {
            if (!payload.new) return;
            const conversation = mapRowToConversation(payload.new, []);
            setConversations((prev) => {
              const existing = prev.find((c) => c.id === conversation.id);
              if (existing) {
                return prev.map((c) =>
                  c.id === conversation.id
                    ? { ...conversation, messages: existing.messages }
                    : c,
                );
              }
              return [...prev, conversation];
            });
          },
          onUpdate: (payload) => {
            if (!payload.new) return;
            const conversation = mapRowToConversation(payload.new, []);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === conversation.id
                  ? { ...conversation, messages: c.messages }
                  : c,
              ),
            );
          },
        },
      }),
    );

    offs.push(
      subscribeToTable(
        { table: 'collaborations', event: '*' },
        {
          onInsert: (payload) => {
            if (!payload.new) return;
            const collab = mapRowToCollaboration(payload.new);
            setCollaborations((prev) => [collab, ...prev.filter((c) => c.id !== collab.id)]);
          },
          onUpdate: (payload) => {
            if (!payload.new) return;
            const collab = mapRowToCollaboration(payload.new);
            setCollaborations((prev) =>
              prev.map((c) => (c.id === collab.id ? collab : c)),
            );
          },
          onDelete: (payload) => {
            if (!payload.old) return;
            setCollaborations((prev) => prev.filter((c) => c.id !== payload.old.id));
          },
        },
      ),
    );

    offs.push(
      subscribeToTable(
        { table: 'users', event: '*' },
        {
          onInsert: (payload) => {
            if (!payload.new) return;
            const user = mapRowToUser(payload.new);
            setUsers((prev) => [user, ...prev.filter((u) => u.id !== user.id)]);
          },
          onUpdate: (payload) => {
            if (!payload.new) return;
            const user = mapRowToUser(payload.new);
            setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
          },
          onDelete: (payload) => {
            if (!payload.old) return;
            setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
          },
        },
      ),
    );

    offs.push(
      subscribeToTable(
        { table: 'friend_requests', event: '*' },
        {
          onInsert: (payload) => {
            if (!payload.new) return;
            const request = mapRowToFriendRequest(payload.new);
            setFriendRequests((prev) => [request, ...prev.filter((fr) => fr.id !== request.id)]);
          },
          onUpdate: (payload) => {
            if (!payload.new) return;
            const request = mapRowToFriendRequest(payload.new);
            setFriendRequests((prev) =>
              prev.map((fr) => (fr.id === request.id ? request : fr)),
            );
          },
          onDelete: (payload) => {
            if (!payload.old) return;
            setFriendRequests((prev) => prev.filter((fr) => fr.id !== payload.old.id));
          },
        },
      ),
    );

    offs.push(
      subscribeToTable(
        { table: 'feedback', event: 'INSERT' },
        {
          onInsert: (payload) => {
            if (!payload.new) return;
            const entry = mapRowToFeedback(payload.new);
            setFeedback((prev) => [entry, ...prev]);
          },
        },
      ),
    );

    offs.push(
      subscribeToTable(
        { table: 'push_subscriptions', event: '*' },
        {
          onAny: () => {
            fetchPushSubscriptionsFromDb()
              .then((subs) => setPushSubscriptions(subs))
              .catch((error) =>
                console.error('[AppProvider] failed to refresh push subscriptions', error),
              );
          },
        },
      ),
    );

    return () => {
      offs.forEach((off) => {
        try {
          off();
        } catch {
          /* ignore */
        }
      });
    };
  }, [supabaseUserId]);

  // --- Data refresh (simulated) -------------------------------------------
  const refreshData = useCallback(async () => {
    const failures: string[] = [];

    try {
      const remotePosts = await fetchPostsFromDb();
      setPosts(remotePosts);
    } catch (error) {
      console.error('[AppProvider] refresh posts failed', error);
      failures.push('posts');
    }

    try {
      const remoteCollabs = await fetchCollaborationsFromDb();
      setCollaborations(remoteCollabs);
    } catch (error) {
      console.error('[AppProvider] refresh collaborations failed', error);
      failures.push('collaborations');
    }

    try {
      const remoteFeedback = await fetchFeedbackFromDb();
      setFeedback(remoteFeedback);
    } catch (error) {
      console.error('[AppProvider] refresh feedback failed', error);
      failures.push('feedback');
    }

    try {
      const remoteConversations = await fetchConversationsFromDb();
      setConversations(remoteConversations);
    } catch (error) {
      console.error('[AppProvider] refresh conversations failed', error);
      failures.push('messages');
    }

    try {
      const remoteUsers = await fetchUsersFromDb();
      if (remoteUsers.length > 0) setUsers(remoteUsers);
    } catch (error) {
      console.error('[AppProvider] refresh users failed', error);
      failures.push('profiles');
    }

    try {
      const remoteSubscriptions = await fetchPushSubscriptionsFromDb();
      setPushSubscriptions(remoteSubscriptions);
    } catch (error) {
      console.error('[AppProvider] refresh push subscriptions failed', error);
      failures.push('push notifications');
    }

    if (supabaseUserId) {
      try {
        const remoteNotifications = await fetchNotificationsFromDb(supabaseUserId);
        setNotifications(remoteNotifications);
      } catch (error) {
        console.error('[AppProvider] refresh notifications failed', error);
        failures.push('notifications');
      }

      try {
        const remoteRequests = await fetchFriendRequestsFromDb(supabaseUserId);
        setFriendRequests(remoteRequests);
      } catch (error) {
        console.error('[AppProvider] refresh friend requests failed', error);
        failures.push('friend requests');
      }
    }

    if (failures.length > 0) {
      window.alert(
        `Refresh completed with issues: ${failures.join(', ')}`,
      );
    }

    trackEvent('data_refreshed');
  }, [supabaseUserId]);

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

  const sendPushNotification = useCallback(
    (userId: string, title: string, body: string, url: string) => {
      console.log(`[PUSH_SIM] Sending push to user ${userId}: ${title}`);
      const subscription = pushSubscriptions[userId];
      if (!subscription) {
        console.warn(`[PUSH_SIM] No push subscription found for user ${userId}`);
        return;
      }

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'show-notification',
          payload: {
            title,
            options: { body, data: { url } },
          },
        });
      }
    },
    [pushSubscriptions],
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
    (updatedUser: User) => {
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      trackEvent('profile_updated', { userId: updatedUser.id });
    },
    [setUsers],
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
    async (toUserId: string) => {
      if (!currentUser) return;
      const fromUserId = currentUser.id;

      const existing = getFriendRequest(fromUserId, toUserId);
      if (existing) return;

      try {
        const request = await sendFriendRequestRow(toUserId);
        setFriendRequests((prev) => [request, ...prev]);

        const notification = await createNotificationRow({
          userId: toUserId,
          actorId: fromUserId,
          type: NotificationType.FRIEND_REQUEST,
          entityType: 'friend_request',
          entityId: request.id,
          message: `${currentUser.name} sent you a friend request.`,
        });
        setNotifications((prev) => [notification, ...prev]);
        emitSocketEvent(toUserId, 'notification:new', notification);
        sendPushNotification(
          toUserId,
          'New Friend Request',
          notification.message,
          `/profile/${currentUser.username}`,
        );
        trackEvent('friend_request_sent', { from: fromUserId, to: toUserId });
      } catch (error) {
        console.error('[AppProvider] failed to send friend request', error);
        window.alert('Unable to send friend request right now. Please try again later.');
      }
    },
    [
      currentUser,
      getFriendRequest,
      setFriendRequests,
      setNotifications,
      sendPushNotification,
    ],
  );

  const cancelFriendRequest = useCallback(
    async (toUserId: string) => {
      if (!currentUser) return;
      const request = friendRequests.find(
        (fr) =>
          fr.fromUserId === currentUser.id &&
          fr.toUserId === toUserId &&
          fr.status === FriendRequestStatus.PENDING,
      );
      if (!request) return;

      try {
        await cancelFriendRequestRow(request.id);
        setFriendRequests((prev) => prev.filter((fr) => fr.id !== request.id));
        trackEvent('friend_request_cancelled', {
          from: currentUser.id,
          to: toUserId,
        });
      } catch (error) {
        console.error('[AppProvider] failed to cancel friend request', error);
        window.alert('Unable to cancel the friend request right now.');
      }
    },
    [currentUser, friendRequests, setFriendRequests],
  );

  const acceptFriendRequest = useCallback(
    async (requestId: string) => {
      const request = friendRequests.find((fr) => fr.id === requestId);
      if (!request || !currentUser || request.toUserId !== currentUser.id) return;

      try {
        const updated = await acceptFriendRequestRow(requestId);
        setFriendRequests((prev) =>
          prev.map((fr) => (fr.id === requestId ? updated : fr)),
        );

        const sender = users.find((u) => u.id === updated.fromUserId);
        const receiver = users.find((u) => u.id === updated.toUserId);
        const nextSenderFriends = sender
          ? Array.from(new Set([...sender.friendIds, updated.toUserId]))
          : [updated.toUserId];
        const nextReceiverFriends = receiver
          ? Array.from(new Set([...receiver.friendIds, updated.fromUserId]))
          : [updated.fromUserId];

        setUsers((prev) =>
          prev.map((user) => {
            if (user.id === updated.fromUserId) {
              return { ...user, friendIds: nextSenderFriends };
            }
            if (user.id === updated.toUserId) {
              return { ...user, friendIds: nextReceiverFriends };
            }
            return user;
          }),
        );

        const friendSyncResults = await Promise.allSettled([
          updateUserFriends(updated.fromUserId, nextSenderFriends),
          updateUserFriends(updated.toUserId, nextReceiverFriends),
        ]);
        if (friendSyncResults.some((res) => res.status === 'rejected')) {
          window.alert(
            'Friend list sync failed. Changes may not appear on other devices yet.',
          );
        }

        const notification = await createNotificationRow({
          userId: updated.fromUserId,
          actorId: updated.toUserId,
          type: NotificationType.FRIEND_REQUEST_ACCEPTED,
          entityType: 'user',
          entityId: updated.toUserId,
          message: `${currentUser.name} accepted your friend request.`,
        });
        setNotifications((prev) => [notification, ...prev]);
        emitSocketEvent(updated.fromUserId, 'notification:new', notification);
        sendPushNotification(
          updated.fromUserId,
          'Friend Request Accepted',
          notification.message,
          `/profile/${currentUser.username}`,
        );

        trackEvent('friend_request_accepted', {
          acceptedBy: updated.toUserId,
          requestedBy: updated.fromUserId,
        });
      } catch (error) {
        console.error('[AppProvider] failed to accept friend request', error);
        window.alert('Unable to accept the friend request right now.');
      }
    },
    [
      friendRequests,
      currentUser,
      users,
      setFriendRequests,
      setUsers,
      setNotifications,
      sendPushNotification,
    ],
  );

  const declineFriendRequest = useCallback(
    async (requestId: string) => {
      const request = friendRequests.find((fr) => fr.id === requestId);
      if (!request) return;

      try {
        const updated = await declineFriendRequestRow(requestId);
        setFriendRequests((prev) =>
          prev.map((fr) => (fr.id === requestId ? updated : fr)),
        );
        trackEvent('friend_request_declined', {
          declinedBy: request.toUserId,
          requestedBy: request.fromUserId,
        });
      } catch (error) {
        console.error('[AppProvider] failed to decline friend request', error);
        window.alert('Unable to decline the friend request right now.');
      }
    },
    [friendRequests, setFriendRequests],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!currentUser) return;
      const currentUserId = currentUser.id;

      const currentState = users.find((u) => u.id === currentUserId);
      const friendState = users.find((u) => u.id === friendId);
      const nextCurrentFriends = currentState
        ? currentState.friendIds.filter((id) => id !== friendId)
        : [];
      const nextFriendFriends = friendState
        ? friendState.friendIds.filter((id) => id !== currentUserId)
        : [];

      setUsers((prev) =>
        prev.map((user) => {
          if (user.id === currentUserId) {
            return { ...user, friendIds: nextCurrentFriends };
          }
          if (user.id === friendId) {
            return { ...user, friendIds: nextFriendFriends };
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

      const syncResults = await Promise.allSettled([
        updateUserFriends(currentUserId, nextCurrentFriends),
        updateUserFriends(friendId, nextFriendFriends),
      ]);
      if (syncResults.some((res) => res.status === 'rejected')) {
        window.alert('Friend removal synced locally but not on the server.');
      }

      trackEvent('friend_removed', { remover: currentUserId, removed: friendId });
    },
    [currentUser, users, setUsers, setFriendRequests],
  );

  const toggleBlockUser = useCallback(
    async (userIdToBlock: string) => {
      if (!currentUser) return;
      const currentUserId = currentUser.id;
      const currentState = users.find((u) => u.id === currentUserId);
      const blocked = currentState?.blockedUserIds || [];
      const isBlocked = blocked.includes(userIdToBlock);
      const nextBlocked = isBlocked
        ? blocked.filter((id) => id !== userIdToBlock)
        : [...blocked, userIdToBlock];

      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUserId ? { ...u, blockedUserIds: nextBlocked } : u,
        ),
      );

      try {
        await updateUserBlocked(currentUserId, nextBlocked);
      } catch (error) {
        console.error('[AppProvider] failed to update block list', error);
        window.alert('Unable to update your block list right now.');
      }

      if (!isBlocked) removeFriend(userIdToBlock);

      trackEvent(isBlocked ? 'user_unblocked' : 'user_blocked', {
        blocker: currentUserId,
        blocked: userIdToBlock,
      });
    },
    [currentUser, users, setUsers, removeFriend],
  );

  // --- Posts ---------------------------------------------------------------
  const addPost = useCallback(
    async (content: string, image?: string) => {
      if (!currentUser) return;

      try {
        const dbUserId = supabaseUserId ?? currentUser.id;
        const created = await createPost(dbUserId, content, image);
        const newPost = mapDbPostToLegacy(created);
        if (currentUser.id !== newPost.authorId) {
          newPost.authorId = currentUser.id;
        }
        setPosts((prev) => [newPost, ...prev]);
        trackEvent('post_created', { userId: currentUser.id, postId: newPost.id });
      } catch (error) {
        console.error('[AppProvider] failed to create post', error);
        window.alert('Unable to create post right now.');
      }
    },
    [currentUser, setPosts, supabaseUserId],
  );

  const deletePost = useCallback(
    async (postId: string) => {
      try {
        await deletePostFromDb(postId);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        trackEvent('post_deleted', { userId: currentUser?.id, postId });
      } catch (error) {
        console.error('[AppProvider] failed to delete post', error);
        window.alert('Unable to delete this post right now.');
      }
    },
    [setPosts, currentUser],
  );

  // --- Collaborations ------------------------------------------------------
  const addCollaboration = useCallback(
    async (
      collabData: Omit<
        Collaboration,
        'id' | 'authorId' | 'timestamp' | 'interestedUserIds'
      >,
    ) => {
      if (!currentUser) return;

      try {
        const created = await createCollaborationRow({
          ...collabData,
          authorId: currentUser.id,
          status: collabData.status,
        });
        setCollaborations((prev) => [created, ...prev]);
        trackEvent('collaboration_created', {
          userId: currentUser.id,
          collabId: created.id,
        });
      } catch (error) {
        console.error('[AppProvider] failed to create collaboration', error);
        window.alert('Unable to create collaboration right now.');
      }
    },
    [currentUser, setCollaborations],
  );

  const updateCollaboration = useCallback(
    async (updatedCollab: Collaboration) => {
      try {
        const saved = await updateCollaborationRow(updatedCollab.id, {
          title: updatedCollab.title,
          description: updatedCollab.description,
          image: updatedCollab.image,
          status: updatedCollab.status,
          interestedUserIds: updatedCollab.interestedUserIds,
        });
        setCollaborations((prev) =>
          prev.map((c) => (c.id === saved.id ? saved : c)),
        );
        trackEvent('collaboration_updated', {
          userId: currentUser?.id,
          collabId: saved.id,
        });
      } catch (error) {
        console.error('[AppProvider] failed to update collaboration', error);
        window.alert('Unable to update collaboration right now.');
      }
    },
    [setCollaborations, currentUser],
  );

  const deleteCollaboration = useCallback(
    async (collabId: string) => {
      try {
        await deleteCollaborationRow(collabId);
        setCollaborations((prev) => prev.filter((c) => c.id !== collabId));
        trackEvent('collaboration_deleted', { userId: currentUser?.id, collabId });
      } catch (error) {
        console.error('[AppProvider] failed to delete collaboration', error);
        window.alert('Unable to delete collaboration right now.');
      }
    },
    [setCollaborations, currentUser],
  );

  const toggleCollaborationInterest = useCallback(
    async (collabId: string) => {
      if (!currentUser) return;
      const collab = collaborations.find((c) => c.id === collabId);
      if (!collab) return;

      const isInterested = collab.interestedUserIds.includes(currentUser.id);
      const updatedIds = isInterested
        ? collab.interestedUserIds.filter((id) => id !== currentUser.id)
        : [...collab.interestedUserIds, currentUser.id];

      try {
        const updated = await upsertCollaborationInterest(collabId, updatedIds);
        setCollaborations((prev) =>
          prev.map((c) => (c.id === collabId ? updated : c)),
        );

        if (!isInterested) {
          const notification = await createNotificationRow({
            userId: collab.authorId,
            actorId: currentUser.id,
            type: NotificationType.COLLAB_REQUEST,
            entityType: 'collaboration',
            entityId: collab.id,
            message: `${currentUser.name} is interested in your "${collab.title}" opportunity.`,
          });
          setNotifications((prev) => [notification, ...prev]);
          emitSocketEvent(collab.authorId, 'notification:new', notification);
          sendPushNotification(
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
      } catch (error) {
        console.error('[AppProvider] failed to toggle collaboration interest', error);
        window.alert('Unable to update collaboration interest right now.');
      }
    },
    [
      currentUser,
      collaborations,
      setCollaborations,
      setNotifications,
      sendPushNotification,
    ],
  );

  // --- Messaging -----------------------------------------------------------
  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      if (!currentUser) return;

      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return;

      const other = conversation.participantIds.find((id) => id !== currentUser.id);
      if (!other) return;

      try {
        const message = await createMessageRow(conversationId, {
          senderId: currentUser.id,
          receiverId: other,
          text,
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c,
          ),
        );

        const notification = await createNotificationRow({
          userId: other,
          actorId: currentUser.id,
          type: NotificationType.NEW_MESSAGE,
          entityType: 'user',
          entityId: currentUser.id,
          message: `You have a new message from ${currentUser.name}.`,
        });
        setNotifications((prev) => [notification, ...prev]);
        emitSocketEvent(other, 'notification:new', notification);
        sendPushNotification(
          other,
          `New message from ${currentUser.name}`,
          text,
          `/messages`,
        );

        trackEvent('message_sent', { from: currentUser.id, to: other });
      } catch (error) {
        console.error('[AppProvider] failed to send message', error);
        window.alert('Unable to send your message right now.');
      }
    },
    [
      currentUser,
      conversations,
      setConversations,
      setNotifications,
      sendPushNotification,
    ],
  );

  const viewConversation = useCallback(
    async (participantId: string) => {
      if (!currentUser) return;

      try {
        const conversation = await ensureConversation([
          currentUser.id,
          participantId,
        ]);
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversation.id);
          if (exists) {
            return prev.map((c) => (c.id === conversation.id ? conversation : c));
          }
          return [...prev, conversation];
        });
        setSelectedConversationId(conversation.id);
        navigate('messages');
      } catch (error) {
        console.error('[AppProvider] failed to load conversation', error);
        window.alert('Unable to open this conversation right now.');
      }
    },
    [currentUser, setConversations, navigate],
  );

  const moveConversationToFolder = useCallback(
    async (conversationId: string, folder: ConversationFolder) => {
      try {
        const updated = await updateConversationFolderRow(conversationId, folder);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? updated : c)),
        );
        trackEvent('conversation_moved', { conversationId, folder });
      } catch (error) {
        console.error('[AppProvider] failed to move conversation', error);
        window.alert('Unable to move this conversation right now.');
      }
    },
    [setConversations],
  );

  // --- Notifications -------------------------------------------------------
  const markNotificationsAsRead = useCallback(
    async (ids: string[]) => {
      try {
        const updated = await markNotificationsRead(ids);
        const updatesById = new Map(updated.map((n) => [n.id, n]));
        setNotifications((prev) =>
          prev.map((n) => updatesById.get(n.id) ?? n),
        );
      } catch (error) {
        console.error('[AppProvider] failed to mark notifications as read', error);
        window.alert('Unable to mark notifications as read right now.');
      }
    },
    [setNotifications],
  );

  // --- Feedback ------------------------------------------------------------
  const sendFeedback = useCallback(
    async (content: string, type: 'Bug Report' | 'Suggestion') => {
      if (!currentUser) return;
      try {
        const created = await submitFeedbackRow({
          userId: currentUser.id,
          type,
          content,
        });
        setFeedback((prev) => [created, ...prev]);
        trackEvent('feedback_sent', { userId: currentUser.id, type });
      } catch (error) {
        console.error('[AppProvider] failed to submit feedback', error);
        window.alert('Unable to send feedback right now.');
      }
    },
    [currentUser, setFeedback],
  );

  // --- Push subscriptions --------------------------------------------------
  const subscribeToPushNotifications = useCallback(
    async (subscription: PushSubscriptionObject) => {
      if (!currentUser) return;
      try {
        await upsertPushSubscription(currentUser.id, subscription);
        setPushSubscriptions((prev) => ({
          ...prev,
          [currentUser.id]: subscription,
        }));
        console.log(`[PUSH_SIM] User ${currentUser.id} subscribed.`);
        trackEvent('push_subscribed', { userId: currentUser.id });
      } catch (error) {
        console.error('[AppProvider] failed to save push subscription', error);
        window.alert('Unable to save your push notification preference right now.');
      }
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