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
import { supabase } from '../lib/supabaseClient';

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
  userId: string,
  title: string,
  body: string,
  url: string,
) => {
  console.log(`[PUSH_SIM] Sending push to user ${userId}: ${title}`);
  const subscriptions = JSON.parse(
    localStorage.getItem(PUSH_SUBSCRIPTIONS_STORAGE_KEY) || '{}',
  );
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
  // localStorage state helper
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

  // --- State ---------------------------------------------------------------
  const [users, setUsers] = useLocalStorage<User[]>(USERS_STORAGE_KEY, MOCK_USERS);
  const [posts, setPosts] = useLocalStorage<Post[]>(POSTS_STORAGE_KEY, MOCK_POSTS);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>(
    NOTIFICATIONS_STORAGE_KEY,
    MOCK_NOTIFICATIONS,
  );
  const [conversations, setConversations] = useLocalStorage<Conversation[]>(
    CONVERSATIONS_STORAGE_KEY,
    MOCK_CONVERSATIONS,
  );
  const [collaborations, setCollaborations] = useLocalStorage<Collaboration[]>(
    COLLABORATIONS_STORAGE_KEY,
    MOCK_COLLABORATIONS,
  );
  const [feedback, setFeedback] = useLocalStorage<Feedback[]>(
    FEEDBACK_STORAGE_KEY,
    MOCK_FEEDBACK,
  );
  const [friendRequests, setFriendRequests] = useLocalStorage<FriendRequest[]>(
    FRIEND_REQUESTS_STORAGE_KEY,
    MOCK_FRIEND_REQUESTS,
  );

  // App-level "auth" is just a pointer to a user id from the users array
  const [authData, setAuthData] = useLocalStorage<{ userId: string | null }>(
    AUTH_STORAGE_KEY,
    { userId: null },
  );

  const [pushSubscriptions, setPushSubscriptions] = useLocalStorage<Record<string, PushSubscriptionObject>>(
    PUSH_SUBSCRIPTIONS_STORAGE_KEY,
    {},
  );

  const [theme, setThemeState] = useLocalStorage<'light' | 'dark'>(THEME_STORAGE_KEY, 'dark');

  const [isRegistering, setIsRegistering] = useState(false);

  const [history, setHistory] = useState<NavigationEntry[]>([
    { page: 'feed', context: {} },
  ]);

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const [editingCollaborationId, setEditingCollaborationId] =
    useState<string | null>(null);

  const scrollableNodeRef = useRef<HTMLDivElement | null>(null);

  // --- Cross-tab sync (except AUTH) ----------------------------------------
  useEffect(() => {
    const syncState = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY) return;
      if (!event.key || event.newValue === null) return;

      try {
        const value = JSON.parse(event.newValue);
        switch (event.key) {
          case USERS_STORAGE_KEY:
            setUsers(value);
            break;
          case POSTS_STORAGE_KEY:
            setPosts(value);
            break;
          case NOTIFICATIONS_STORAGE_KEY:
            setNotifications(value);
            break;
          case CONVERSATIONS_STORAGE_KEY:
            setConversations(value);
            break;
          case COLLABORATIONS_STORAGE_KEY:
            setCollaborations(value);
            break;
          case FEEDBACK_STORAGE_KEY:
            setFeedback(value);
            break;
          case FRIEND_REQUESTS_STORAGE_KEY:
            setFriendRequests(value);
            break;
          case THEME_STORAGE_KEY:
            setThemeState(value);
            break;
        }
      } catch (err) {
        console.error(`Error syncing state for key ${event.key}:`, err);
      }
    };

    window.addEventListener('storage', syncState);
    return () => window.removeEventListener('storage', syncState);
  }, [
    setUsers,
    setPosts,
    setNotifications,
    setConversations,
    setCollaborations,
    setFeedback,
    setFriendRequests,
    setThemeState,
  ]);

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
      // initial check
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session?.user;
      if (hasSession) {
        if (authData.userId !== MASTER_USER_ID) {
          setAuthData({ userId: MASTER_USER_ID });
          setHistory([{ page: 'feed', context: {} }]);
          trackEvent('login_success', { userId: MASTER_USER_ID, via: 'supabase' });
        }
      } else if (authData.userId !== null) {
        setAuthData({ userId: null });
        setHistory([{ page: 'feed', context: {} }]);
      }

      // subscribe
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session?.user) {
          setAuthData({ userId: MASTER_USER_ID });
          setHistory([{ page: 'feed', context: {} }]);
          trackEvent('login_success', { userId: MASTER_USER_ID, via: 'supabase' });
        } else {
          setAuthData({ userId: null });
          setHistory([{ page: 'feed', context: {} }]);
          trackEvent('logout', { via: 'supabase' });
        }
      });

      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // --- Data refresh (simulated) -------------------------------------------
  const refreshData = useCallback(async () => {
    // simulate a network refresh
    await new Promise((res) => setTimeout(res, 600));
    trackEvent('data_refreshed');
  }, []);

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
      // Avoid pushing duplicates
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
  // Left in place for dev; Supabase login happens in /pages/Login.tsx
  const login = (username: string, _password: string) => {
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    );
    if (user) {
      setAuthData({ userId: user.id });
      setIsRegistering(false);
      setHistory([{ page: 'feed', context: {} }]); // reset history
      trackEvent('login_success', { userId: user.id, via: 'demo' });
      return true;
    }
    trackEvent('login_failed', { username });
    return false;
  };

  // ✅ UPDATED: also sign out from Supabase so refresh doesn't auto-login
  const logout = () => {
    try {
      // fire-and-forget; our onAuthStateChange will also clear local state
      supabase.auth.signOut().catch((e) => console.warn('[logout] supabase signOut error:', e));
    } finally {
      setAuthData({ userId: null });
      setHistory([{ page: 'feed', context: {} }]);
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

      // If newly blocking, also remove friendship
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
      sendWebPush(other, `New message from ${currentUser.name}`, text, `/messages`);

      trackEvent('message_sent', { from: currentUser.id, to: other });
    },
    [
      currentUser,
      conversations,
      setConversations,
      notifications,
      setNotifications,
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
      }, 500); // small delay for UX
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
