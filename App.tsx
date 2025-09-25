// src/App.tsx
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { RealtimeProvider } from './context/RealtimeProvider';

// App pages & components
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import NotificationsPage from './pages/Notifications';
import Messages from './pages/Messages';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Collaborations from './pages/Collaborations';
import Admin from './pages/Admin';
import InterestedUsers from './pages/InterestedUsers';

// Auth pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import NewPassword from './pages/NewPassword';
import SignUp from './pages/SignUp';

// Misc
import ProfileSetup from './pages/ProfileSetup';
import TestAuth from './pages/TestAuth';
import { supabase } from './lib/supabaseClient';
import { ICONS } from './constants';
import type { Collaboration, User, Notification, PushSubscriptionObject } from './types';
import { trackEvent } from './services/analytics';

/* ----------------------------- THEME ----------------------------- */
const THEME_KEY = 'co-theme';
type Theme = 'light' | 'dark';
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}
function useThemeBoot() {
  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme) ?? 'dark';
    applyTheme(saved);
  }, []);
}

/* ----------------------------- PUSH / VAPID ----------------------------- */
const VAPID_PUBLIC_KEY =
  'BNo5Yg0kYp4e7n-0_q-g-i_zE9X8fG7H4gQjY3hJ1gU8a8nJ5jP2cE6lI8cE7wT5gY6cZ3dE1fX0yA';
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
const requestNotificationPermission = async (subscribeFn: (sub: PushSubscriptionObject) => void) => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const subJson = subscription.toJSON();
      const subscriptionObject: PushSubscriptionObject = {
        endpoint: subJson.endpoint!,
        keys: { p256dh: subJson.keys!.p256dh!, auth: subJson.keys!.auth! },
      };
      subscribeFn(subscriptionObject);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }
};

/* ----------------------------- ERROR BOUNDARY ----------------------------- */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error('[App ErrorBoundary]', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center p-6 text-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-text-secondary">
              Refresh the page. If it persists, revert the last change.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

/* ----------------------------- TOAST ----------------------------- */
type ToastProps = { notification: Notification | null; onClose: () => void };
const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const { getUserById, navigate } = useAppContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const t = setTimeout(() => handleClose(), 5000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!notification) return null;
  const actor = getUserById(notification.actorId);
  if (!actor) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'FRIEND_REQUEST':
        return ICONS.plus;
      case 'FRIEND_REQUEST_ACCEPTED':
        return ICONS.verified;
      case 'NEW_MESSAGE':
        return ICONS.messages;
      case 'POST_LIKE':
        return ICONS.like;
      default:
        return ICONS.notifications;
    }
  };

  const openNotifications = () => {
    navigate('notifications');
    handleClose();
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] transition-opacity ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onPointerUp={openNotifications}
      role="status"
      aria-live="polite"
    >
      <div className="bg-surface rounded-xl border border-surface-light shadow-lg px-4 py-3 flex items-start space-x-3 cursor-pointer">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="text-sm">
          <div className="font-semibold">{actor.name}</div>
          <div className="text-text-secondary">{notification.message}</div>
        </div>
        <button
          onPointerUp={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="rounded-md inline-flex text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="Close"
        >
          {ICONS.close}
        </button>
      </div>
    </div>
  );
};

/* ----------------------------- CREATE MODAL ----------------------------- */
type CreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'post' | 'project';
  editingCollaboration?: Collaboration | null;
};

const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'post',
  editingCollaboration,
}) => {
  const {
    addPost,
    addCollaboration,
    updateCollaboration,
    navigate,
    users,
    currentUser,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'post' | 'project'>(initialTab);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const postTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<User[]>([]);

  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectImage, setProjectImage] = useState<string | null>(null);
  const projectImageInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = !!editingCollaboration;

  useEffect(() => {
    if (isOpen) {
      if (editingCollaboration) {
        setActiveTab('project');
        setProjectTitle(editingCollaboration.title);
        setProjectDesc(editingCollaboration.description);
        setProjectImage(editingCollaboration.image || null);
      } else {
        setActiveTab(initialTab);
      }
    } else {
      setPostContent('');
      setPostImage(null);
      setProjectTitle('');
      setProjectDesc('');
      setProjectImage(null);
      setMentionQuery(null);
      setSuggestions([]);
    }
  }, [isOpen, initialTab, editingCollaboration]);

  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      return;
    }
    const filtered = users
      .filter(
        (u) =>
          (currentUser ? u.id !== currentUser.id : true) &&
          (u.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
      )
      .slice(0, 5);
    setSuggestions(filtered);
  }, [mentionQuery, users, currentUser]);

  if (!isOpen) return null;

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (postContent.trim() || postImage) {
      addPost(postContent, postImage || undefined);
      onClose();
      navigate('feed');
    }
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectTitle.trim() && projectDesc.trim()) {
      if (isEditing && editingCollaboration) {
        const updated: Collaboration = {
          ...editingCollaboration,
          title: projectTitle,
          description: projectDesc,
          image: projectImage || undefined,
        };
        updateCollaboration(updated);
      } else {
        const newCollab: Omit<
          Collaboration,
          'id' | 'authorId' | 'timestamp' | 'interestedUserIds'
        > = {
          title: projectTitle,
          description: projectDesc,
          image: projectImage || undefined,
          status: 'open',
        };
        addCollaboration(newCollab);
      }
      onClose();
      if (currentUser) navigate('profile', { viewingProfileId: currentUser.id });
    }
  };

  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) =>
        setPostImage((event.target?.result as string) || null);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleProjectImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) =>
        setProjectImage((event.target?.result as string) || null);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPostContent(text);
    const caret = e.target.selectionStart;
    const before = text.substring(0, caret);
    const at = before.match(/@(\w+)$/);
    if (at) setMentionQuery(at[1]);
    else setMentionQuery(null);
  };

  const handleSelectMention = (username: string) => {
    const textarea = postTextAreaRef.current;
    if (!textarea) return;
    const text = textarea.value;
    const caret = textarea.selectionStart;
    const before = text.substring(0, caret);
    const at = before.match(/@(\w+)$/);
    if (at) {
      const start = at.index || 0;
      const newText = text.substring(0, start) + `@${username} ` + text.substring(caret);
      setPostContent(newText);
      const newCaret = start + `@${username} `.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCaret, newCaret);
      }, 0);
    }
    setMentionQuery(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
      onPointerUp={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit opportunity' : 'Create'}
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-xl relative"
        onPointerUp={(e) => e.stopPropagation()}
      >
        <button
          onPointerUp={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
          aria-label="Close"
        >
          {ICONS.close}
        </button>

        <div className="p-6">
          <div className="flex border-b border-surface-light -mx-6">
            {!isEditing && (
              <button
                onPointerUp={() => setActiveTab('post')}
                className={`flex-1 p-4 font-bold ${
                  activeTab === 'post'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-secondary'
                }`}
              >
                Create Post
              </button>
            )}
            <button
              onPointerUp={() => setActiveTab('project')}
              className={`flex-1 p-4 font-bold ${
                activeTab === 'project'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary'
              }`}
            >
              {isEditing ? 'Edit Opportunity' : 'Post Opportunity'}
            </button>
          </div>

          <div className="pt-4">
            {activeTab === 'post' && !isEditing ? (
              <form onSubmit={handlePostSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    ref={postTextAreaRef}
                    value={postContent}
                    onChange={handleContentChange}
                    onBlur={() => setTimeout(() => setMentionQuery(null), 200)}
                    placeholder="What's happening? Mention others with @"
                    className="w-full h-32 bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-surface rounded-md shadow-lg border border-surface-light mt-1 z-20 max-h-48 overflow-y-auto">
                      {suggestions.map((user) => (
                        <div
                          key={user.id}
                          onPointerUp={() => handleSelectMention(user.username)}
                          className="flex items-center space-x-3 p-2 hover:bg-surface-light cursor-pointer"
                        >
                          <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                          <div>
                            <p className="font-bold text-sm">{user.name}</p>
                            <p className="text-xs text-text-secondary">@{user.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {postImage && (
                  <div className="mt-4 relative">
                    <img
                      src={postImage}
                      alt="Preview"
                      className="rounded-lg object-contain w-full max-h-80"
                    />
                    <button
                      onPointerUp={() => setPostImage(null)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                      aria-label="Remove image"
                    >
                      {ICONS.close}
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4">
                  <input
                    type="file"
                    ref={postImageInputRef}
                    onChange={handlePostImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onPointerUp={() => postImageInputRef.current?.click()}
                    className="text-primary hover:text-primary-hover"
                    aria-label="Add photo"
                  >
                    {ICONS.camera}
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary-hover disabled:opacity-50"
                    disabled={!postContent.trim() && !postImage}
                  >
                    Post
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-text-secondary">Opportunity Title</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary">Description</label>
                  <textarea
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    className="w-full h-24 bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {projectImage && (
                  <div className="relative">
                    <img
                      src={projectImage}
                      alt="Preview"
                      className="rounded-lg object-contain w-full max-h-80"
                    />
                    <button
                      onPointerUp={() => setProjectImage(null)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                      aria-label="Remove image"
                    >
                      {ICONS.close}
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <input
                    type="file"
                    ref={projectImageInputRef}
                    onChange={handleProjectImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onPointerUp={() => projectImageInputRef.current?.click()}
                    className="text-primary hover:text-primary-hover"
                    aria-label="Add photo for opportunity"
                  >
                    {ICONS.camera}
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary-hover disabled:opacity-50"
                    disabled={!projectTitle.trim() || !projectDesc.trim()}
                  >
                    {isEditing ? 'Save Changes' : 'Post Opportunity'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------- FEEDBACK MODAL ----------------------------- */
type FeedbackModalProps = { isOpen: boolean; onClose: () => void };
const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { sendFeedback } = useAppContext();
  const [feedbackType, setFeedbackType] = useState<'Bug Report' | 'Suggestion'>('Suggestion');
  const [feedbackContent, setFeedbackContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackContent.trim()) {
      sendFeedback(feedbackContent, feedbackType);
      setFeedbackContent('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onPointerUp={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-md relative" onPointerUp={(e) => e.stopPropagation()}>
        <button
          onPointerUp={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
          aria-label="Close"
        >
          {ICONS.close}
        </button>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Send Feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Feedback Type</label>
              <div className="flex space-x-4 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="Suggestion"
                    checked={feedbackType === 'Suggestion'}
                    onChange={(e) => setFeedbackType(e.target.value as 'Bug Report' | 'Suggestion')}
                    className="form-radio bg-surface-light border-surface-light text-primary focus:ring-primary"
                  />
                  <span>Suggestion</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="Bug Report"
                    checked={feedbackType === 'Bug Report'}
                    onChange={(e) => setFeedbackType(e.target.value as 'Bug Report' | 'Suggestion')}
                    className="form-radio bg-surface-light border-surface-light text-primary focus:ring-primary"
                  />
                  <span>Bug Report</span>
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="feedbackContent" className="text-sm text-text-secondary">
                Details
              </label>
              <textarea
                id="feedbackContent"
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder={`Enter your ${feedbackType.toLowerCase()}...`}
                className="w-full h-32 bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none mt-1"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary-hover disabled:opacity-50"
                disabled={!feedbackContent.trim()}
              >
                Send Feedback
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------- APP CONTENT (inside providers) ----------------------------- */
const AppContent: React.FC = () => {
  const {
    currentPage,
    viewingProfileId,
    isAuthenticated,
    registerScrollableNode,
    currentUser,
    history,
    subscribeToPushNotifications,
    editingCollaborationId,
    setEditingCollaborationId,
    collaborations,
    navigate,
  } = useAppContext();

  const mainContentRef = useRef<HTMLDivElement>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialTab, setCreateModalInitialTab] =
    useState<'post' | 'project'>('post');

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);

  const editingCollab = collaborations.find((c) => c.id === editingCollaborationId);
  const isEditCollabModalOpen = !!editingCollab;

  const openCreateModal = (initialTab: 'post' | 'project' = 'post') => {
    setCreateModalInitialTab(initialTab);
    setIsCreateModalOpen(true);
    trackEvent('open_create_modal', { initialTab });
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setEditingCollaborationId(null);
  };

  const openFeedbackModal = () => {
    setIsFeedbackModalOpen(true);
    trackEvent('open_feedback_modal');
  };

  useEffect(() => {
    if (mainContentRef.current) registerScrollableNode(mainContentRef.current);
  }, [registerScrollableNode]);

  useLayoutEffect(() => {
    const lastEntry = history[history.length - 1];
    if (mainContentRef.current && lastEntry.scrollTop !== undefined) {
      mainContentRef.current.scrollTop = lastEntry.scrollTop;
    }
  }, [currentPage, viewingProfileId, history]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const handleSocketEvent = (event: Event) => {
      const { userId, eventName, payload } = (event as CustomEvent).detail;
      if (userId === currentUser.id && eventName === 'notification:new') {
        setToastNotification(payload);
      }
    };

    window.addEventListener('socket-event', handleSocketEvent);
    requestNotificationPermission(subscribeToPushNotifications);
    return () => window.removeEventListener('socket-event', handleSocketEvent);
  }, [isAuthenticated, currentUser, subscribeToPushNotifications]);

  // Debug page: #/test-auth
  if (typeof window !== 'undefined' && window.location.hash.includes('test-auth')) {
    return (
      <div className="p-4">
        <TestAuth />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      const h = window.location.hash.toLowerCase();
      if (
        !h.includes('/login') &&
        !h.includes('/forgotpassword') &&
        !h.includes('/newpassword') &&
        !h.includes('/signup')
      ) {
        window.location.hash = '#/Login';
      }
    }
    // Wrap auth pages so useAppContext() is available inside Login
    return (
      <AppProvider>
        <AuthPagesRouter />
      </AppProvider>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'feed':
        return <Feed />;
      case 'explore':
        return <Explore />;
      case 'notifications':
        return <NotificationsPage />;
      case 'messages':
        return <Messages />;
      case 'search':
        return <Search />;
      case 'profile':
        if (viewingProfileId)
          return <Profile userId={viewingProfileId} onOpenFeedbackModal={openFeedbackModal} />;
        if (currentUser)
          return <Profile userId={currentUser.id} onOpenFeedbackModal={openFeedbackModal} />;
        return <Feed />;
      case 'collaborations':
        return <Collaborations openCreateModal={openCreateModal} />;
      case 'admin':
        return <Admin />;
      case 'interestedUsers':
        return <InterestedUsers />;
      default:
        return <Feed />;
    }
  };

  const isMessagesPage = currentPage === 'messages';
  if (isMessagesPage) {
    return (
      <>
        <div className="flex full-height overflow-hidden safe-pads">
          <Sidebar openCreateModal={openCreateModal} onOpenFeedbackModal={openFeedbackModal} />
          <main className="flex-1 md:ml-20 lg:ml-64 overflow-y-auto main-content-mobile-padding">
            <Messages />
          </main>

          <CreateModal
            isOpen={isCreateModalOpen || isEditCollabModalOpen}
            onClose={handleCloseModals}
            initialTab={createModalInitialTab}
            editingCollaboration={editingCollab || null}
          />
          <FeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
          />
        </div>

        <Toast notification={toastNotification} onClose={() => setToastNotification(null)} />
      </>
    );
  }

  return (
    <>
      <div className="flex full-height overflow-hidden safe-pads">
        <Sidebar openCreateModal={openCreateModal} onOpenFeedbackModal={openFeedbackModal} />

        <main ref={mainContentRef} className="flex-1 md:ml-20 lg:ml-64 overflow-y-auto main-content-mobile-padding">
          <div className="max-w-5xl mx-auto">
            <div className="md:grid md:grid-cols-3">
              <div className="md:col-span-2 border-l border-r md:border-l-0 border-surface-light min-h-screen">
                {renderPage()}
              </div>

              <div className="hidden md:block md:col-span-1">
                <RightSidebar />
              </div>
            </div>
          </div>
        </main>

        <CreateModal
          isOpen={isCreateModalOpen || isEditCollabModalOpen}
          onClose={handleCloseModals}
          initialTab={createModalInitialTab}
          editingCollaboration={editingCollab || null}
        />

        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
        />
      </div>

      <Toast notification={toastNotification} onClose={() => setToastNotification(null)} />
    </>
  );
};

/* ----------------------------- AUTH ROUTER ----------------------------- */
const AuthPagesRouter: React.FC = () => {
  const [hash, setHash] = useState<string>(typeof window !== 'undefined' ? window.location.hash : '');

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const lower = hash.toLowerCase();

  const sendResetLink = async (email: string) => {
    const redirectTo = `${location.origin}/#/NewPassword`;
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  };

  if (lower.includes('signup')) return <SignUp />;
  if (lower.includes('newpassword')) return <NewPassword />;
  if (lower.includes('forgotpassword')) {
    return (
      <ForgotPassword
        onSendResetLink={(email) => sendResetLink(email)}
        onBackToLogin={() => {
          window.location.hash = '#/Login';
        }}
      />
    );
  }

  return (
    <Login
      onForgotPassword={() => {
        window.location.hash = '#/ForgotPassword';
      }}
    />
  );
};

/* ----------------------------- AUTH GATE ----------------------------- */
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!data.session);
      setChecking(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setHasSession(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-text-secondary">Checking your session…</p>
      </div>
    );
  }

  // If not logged in, show the auth router wrapped in AppProvider
  if (!hasSession) {
    return (
      <AppProvider>
        <AuthPagesRouter />
      </AppProvider>
    );
  }

  // Logged in -> show the full app providers + content
  return <>{children}</>;
};

/* ----------------------------- APP WRAPPER ----------------------------- */
const AppWrapper: React.FC = () => {
  useThemeBoot();

  // IMPORTANT: Do NOT strip tokens here.
  // NewPassword.tsx now reads tokens from the hash and then cleans the URL itself.

  return (
    <ErrorBoundary>
      <AuthGate>
        <AppProvider>
          <RealtimeProvider>
            {/* Optionally render ProfileSetup for new accounts */}
            {/* {isRegistering && <ProfileSetup />} */}
            <AppContent />
          </RealtimeProvider>
        </AppProvider>
      </AuthGate>
    </ErrorBoundary>
  );
};

export default AppWrapper;
