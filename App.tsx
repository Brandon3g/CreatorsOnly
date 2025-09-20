import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import NotificationsPage from './pages/Notifications';
import Messages from './pages/Messages';
import Search from './pages/Search';
import Profile from './pages/Profile';
import RightSidebar from './components/RightSidebar';
import Collaborations from './pages/Collaborations';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPasswordSent from './pages/ResetPasswordSent';
import Admin from './pages/Admin';
import InterestedUsers from './pages/InterestedUsers';
import { ICONS } from './constants';
import type { Collaboration, User, Notification, PushSubscriptionObject } from './types';
import { trackEvent } from './services/analytics';

// === Theme wiring (start) ===
const THEME_KEY = 'co-theme';
type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  const root = document.documentElement;           // <html>
  root.classList.toggle('dark', theme === 'dark'); // Tailwind dark mode
  root.setAttribute('data-theme', theme);          // DaisyUI theme
  localStorage.setItem(THEME_KEY, theme);
}

function useThemeBoot() {
  // If your file already imports `useEffect` from 'react', this works as-is.
  // (If not, change to React.useEffect(...) or add the import.)
  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme) ?? 'dark';
    applyTheme(saved);
  }, []);
}
// === Theme wiring (end) ===


// --- Web Push Notification Service ---
// In a real app, this key would be loaded from the server/environment variables.
const VAPID_PUBLIC_KEY = 'BNo5Yg0kYp4e7n-0_q-g-i_zE9X8fG7H4gQjY3hJ1gU8a8nJ5jP2cE6lI8cE7wT5gY6cZ3dE1fX0yA';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const requestNotificationPermission = async (subscribeFn: (sub: PushSubscriptionObject) => void) => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('Push notifications not supported in this browser.');
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        console.log('Notification permission granted.');
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            const subJson = subscription.toJSON();
            const subscriptionObject: PushSubscriptionObject = {
                endpoint: subJson.endpoint!,
                keys: {
                    p256dh: subJson.keys!.p256dh!,
                    auth: subJson.keys!.auth!,
                }
            };
            subscribeFn(subscriptionObject);
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
        }
    } else {
        console.log('Notification permission denied.');
    }
};


// --- Toast Component ---
type ToastProps = {
    notification: Notification | null;
    onClose: () => void;
};

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
    const { getUserById, navigate } = useAppContext();
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        if (notification) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                handleClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
    };

    if (!notification) return null;

    const actor = getUserById(notification.actorId);
    if (!actor) return null;

    const getIcon = () => {
        switch(notification.type) {
            case 'FRIEND_REQUEST': return ICONS.plus;
            case 'FRIEND_REQUEST_ACCEPTED': return ICONS.verified;
            case 'NEW_MESSAGE': return ICONS.messages;
            case 'POST_LIKE': return ICONS.like;
            default: return ICONS.notifications;
        }
    }

    const handleClick = () => {
        navigate('notifications');
        handleClose();
    }
    
    const handleCloseClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation(); 
        handleClose();
    }

    return (
        <div 
            onClick={handleClick}
            onTouchEnd={(e) => { e.preventDefault(); handleClick() }}
            className={`fixed top-4 right-4 w-full max-w-sm bg-surface shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden z-[200] transition-all duration-300 ease-in-out cursor-pointer
            ${ isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0' }`}
        >
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 text-primary">
                        {getIcon()}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-text-primary">{actor.name}</p>
                        <p className="mt-1 text-sm text-text-secondary">{notification.message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button 
                            onClick={handleCloseClick} 
                            onTouchEnd={handleCloseClick}
                            className="rounded-md inline-flex text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                            <span className="sr-only">Close</span>
                            {ICONS.close}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


type CreateModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'post' | 'project';
    editingCollaboration?: Collaboration | null;
};

const CreateModal: React.FC<CreateModalProps> = ({ isOpen, onClose, initialTab = 'post', editingCollaboration }) => {
    const { addPost, addCollaboration, updateCollaboration, navigate, users, currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState(initialTab);
    
    // Post state
    const [postContent, setPostContent] = useState('');
    const [postImage, setPostImage] = useState<string | null>(null);
    const postImageInputRef = useRef<HTMLInputElement>(null);
    const postTextAreaRef = useRef<HTMLTextAreaElement>(null);
    
    // Mention state
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<User[]>([]);
    
    // Project state
    const [projectTitle, setProjectTitle] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const [projectImage, setProjectImage] = useState<string | null>(null);
    const projectImageInputRef = useRef<HTMLInputElement>(null);

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
            // Reset state on close
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
        if (!currentUser) return;
        const filteredUsers = users.filter(user =>
            user.id !== currentUser.id &&
            (user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
             user.name.toLowerCase().includes(mentionQuery.toLowerCase()))
        ).slice(0, 5);
        setSuggestions(filteredUsers);
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
                 const updatedCollab: Collaboration = {
                    ...editingCollaboration,
                    title: projectTitle,
                    description: projectDesc,
                    image: projectImage || undefined,
                };
                updateCollaboration(updatedCollab);
            } else {
                const newCollab: Omit<Collaboration, 'id' | 'authorId' | 'timestamp' | 'interestedUserIds'> = {
                    title: projectTitle,
                    description: projectDesc,
                    image: projectImage || undefined,
                    status: 'open',
                };
                addCollaboration(newCollab);
            }
            onClose();
            if (currentUser) {
                navigate('profile', { viewingProfileId: currentUser.id });
            }
        }
    };

    const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                setPostImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProjectImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                setProjectImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setPostContent(text);
    
        const caretPos = e.target.selectionStart;
        const textBeforeCaret = text.substring(0, caretPos);
        const atMatch = textBeforeCaret.match(/@(\w+)$/);
    
        if (atMatch) {
            setMentionQuery(atMatch[1]);
        } else {
            setMentionQuery(null);
        }
    };
    
    const handleSelectMention = (username: string) => {
        const textarea = postTextAreaRef.current;
        if (!textarea) return;
    
        const text = textarea.value;
        const caretPos = textarea.selectionStart;
    
        const textBeforeCaret = text.substring(0, caretPos);
        const atMatch = textBeforeCaret.match(/@(\w+)$/);
    
        if (atMatch) {
            const mentionStartIndex = atMatch.index || 0;
            const newText = text.substring(0, mentionStartIndex) + `@${username} ` + text.substring(caretPos);
            setPostContent(newText);
    
            const newCaretPos = mentionStartIndex + `@${username} `.length;
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(newCaretPos, newCaretPos);
            }, 0);
        }
        setMentionQuery(null);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface rounded-2xl w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} onTouchStart={() => {}} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">{ICONS.close}</button>
                <div className="flex border-b border-surface-light">
                    {!isEditing && <button onClick={() => setActiveTab('post')} onTouchStart={() => {}} className={`flex-1 p-4 font-bold ${activeTab === 'post' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}>Create Post</button>}
                    <button onClick={() => setActiveTab('project')} onTouchStart={() => {}} className={`flex-1 p-4 font-bold ${activeTab === 'project' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}>{isEditing ? 'Edit Opportunity' : 'Post Opportunity'}</button>
                </div>
                <div className="p-6">
                    {activeTab === 'post' && !isEditing ? (
                        <form onSubmit={handlePostSubmit}>
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
                                        {suggestions.map(user => (
                                            <div key={user.id} onClick={() => handleSelectMention(user.username)} onTouchStart={() => handleSelectMention(user.username)} className="flex items-center space-x-3 p-2 hover:bg-surface-light cursor-pointer">
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
                                    <img src={postImage} alt="Preview" className="rounded-lg object-contain w-full max-h-80" />
                                    <button
                                        onClick={() => setPostImage(null)}
                                        onTouchStart={() => {}}
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
                                    onClick={() => postImageInputRef.current?.click()}
                                    onTouchStart={() => {}}
                                    className="text-primary hover:text-primary-hover"
                                    aria-label="Add photo"
                                >
                                    {ICONS.camera}
                                </button>
                                <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary-hover disabled:opacity-50" disabled={!postContent.trim() && !postImage}>Post</button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleProjectSubmit} className="space-y-4">
                             <div>
                                <label className="text-sm text-text-secondary">Opportunity Title</label>
                                <input type="text" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="text-sm text-text-secondary">Description</label>
                                <textarea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} className="w-full h-24 bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"/>
                            </div>
                             {projectImage && (
                                <div className="relative">
                                    <img src={projectImage} alt="Preview" className="rounded-lg object-contain w-full max-h-80" />
                                    <button
                                        onClick={() => setProjectImage(null)}
                                        onTouchStart={() => {}}
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
                                    onClick={() => projectImageInputRef.current?.click()}
                                    onTouchStart={() => {}}
                                    className="text-primary hover:text-primary-hover"
                                    aria-label="Add photo for opportunity"
                                >
                                    {ICONS.camera}
                                </button>
                                <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary-hover disabled:opacity-50" disabled={!projectTitle.trim() || !projectDesc.trim()}>{isEditing ? 'Save Changes' : 'Post Opportunity'}</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

type FeedbackModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

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
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface rounded-2xl w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} onTouchStart={() => {}} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">{ICONS.close}</button>
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Send Feedback</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-text-secondary">Feedback Type</label>
                            <div className="flex space-x-4 mt-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="feedbackType" value="Suggestion" checked={feedbackType === 'Suggestion'} onChange={(e) => setFeedbackType(e.target.value as 'Bug Report' | 'Suggestion')} className="form-radio bg-surface-light border-surface-light text-primary focus:ring-primary" />
                                    <span>Suggestion</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="feedbackType" value="Bug Report" checked={feedbackType === 'Bug Report'} onChange={(e) => setFeedbackType(e.target.value as 'Bug Report' | 'Suggestion')} className="form-radio bg-surface-light border-surface-light text-primary focus:ring-primary"/>
                                    <span>Bug Report</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="feedbackContent" className="text-sm text-text-secondary">Details</label>
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
                            <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary-hover disabled:opacity-50" disabled={!feedbackContent.trim()}>Send Feedback</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};


const AppContent: React.FC = () => {
    const { currentPage, viewingProfileId, isAuthenticated, isRegistering, registerScrollableNode, currentUser, history, sendPasswordResetLink, subscribeToPushNotifications, editingCollaborationId, setEditingCollaborationId, collaborations } = useAppContext();
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalInitialTab, setCreateModalInitialTab] = useState<'post' | 'project'>('post');
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [toastNotification, setToastNotification] = useState<Notification | null>(null);

    const [authStage, setAuthStage] = useState<'login' | 'forgot' | 'sent'>('login');
    const [forgotEmail, setForgotEmail] = useState('');

    const editingCollab = collaborations.find(c => c.id === editingCollaborationId);
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
        if (mainContentRef.current) {
            registerScrollableNode(mainContentRef.current);
        }
    }, [registerScrollableNode]);
    
    useLayoutEffect(() => {
        const lastEntry = history[history.length - 1];
        if (mainContentRef.current && lastEntry.scrollTop !== undefined) {
             mainContentRef.current.scrollTop = lastEntry.scrollTop;
        }
    }, [currentPage, viewingProfileId, history]);
    
    // --- Socket Event Listener & Push Permission ---
    useEffect(() => {
        if (!isAuthenticated || !currentUser) return;

        const handleSocketEvent = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { userId, eventName, payload } = customEvent.detail;
            if (userId === currentUser.id && eventName === 'notification:new') {
                setToastNotification(payload);
            }
        };

        window.addEventListener('socket-event', handleSocketEvent);
        
        // Request notification permission once after login
        requestNotificationPermission(subscribeToPushNotifications);

        return () => {
            window.removeEventListener('socket-event', handleSocketEvent);
        };
    }, [isAuthenticated, currentUser, subscribeToPushNotifications]);


    const handleForgotPassword = () => setAuthStage('forgot');
    const handleSendResetLink = (email: string) => {
        sendPasswordResetLink(email);
        setForgotEmail(email);
        setAuthStage('sent');
    };
    const handleBackToLogin = () => setAuthStage('login');


    if (!isAuthenticated) {
        if (isRegistering) {
            return <ProfileSetup />;
        }
        if (authStage === 'forgot') {
            return <ForgotPassword onSendResetLink={handleSendResetLink} onBackToLogin={handleBackToLogin} />;
        }
        if (authStage === 'sent') {
            return <ResetPasswordSent email={forgotEmail} onBackToLogin={handleBackToLogin} />;
        }
        return <Login onForgotPassword={handleForgotPassword} />;
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
                if (viewingProfileId) {
                    return <Profile userId={viewingProfileId} onOpenFeedbackModal={openFeedbackModal} />;
                }
                if(currentUser) {
                    return <Profile userId={currentUser.id} onOpenFeedbackModal={openFeedbackModal} />;
                }
                return <Feed />; // Fallback to feed
            case 'collaborations':
                return <Collaborations openCreateModal={openCreateModal}/>;
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
                <div className="flex h-screen overflow-hidden">
                    <Sidebar openCreateModal={openCreateModal} onOpenFeedbackModal={openFeedbackModal}/>
                    <main className="flex-1 md:ml-20 lg:ml-64">
                        <Messages />
                    </main>
                    <CreateModal isOpen={isCreateModalOpen || isEditCollabModalOpen} onClose={handleCloseModals} initialTab={createModalInitialTab} editingCollaboration={editingCollab}/>
                    <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
                </div>
                <Toast notification={toastNotification} onClose={() => setToastNotification(null)} />
            </>
        );
    }

    return (
        <>
            <div className="flex h-screen overflow-hidden">
                <Sidebar openCreateModal={openCreateModal} onOpenFeedbackModal={openFeedbackModal}/>
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
                <CreateModal isOpen={isCreateModalOpen || isEditCollabModalOpen} onClose={handleCloseModals} initialTab={createModalInitialTab} editingCollaboration={editingCollab}/>
                <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
            </div>
            <Toast notification={toastNotification} onClose={() => setToastNotification(null)} />
        </>
    );
};

const AppWrapper: React.FC = () => {
  // run once on mount to apply saved theme (default 'dark')
  useThemeBoot();

  // click handler to flip light/dark
  const toggleTheme = React.useCallback(() => {
    const current = (localStorage.getItem(THEME_KEY) as Theme) ?? 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }, []);

  // listen for global toggle requests (from the sidebar/menu)
  React.useEffect(() => {
    const handler = () => toggleTheme();
    window.addEventListener('co:toggle-theme', handler);
    return () => window.removeEventListener('co:toggle-theme', handler);
  }, [toggleTheme]);

  return (
    <AppProvider>
      <AppContent />

      {/* TEMP button to verify; remove later */}
      <button
        className="btn btn-sm fixed bottom-4 right-4 z-50"
        onClick={toggleTheme}
      >
        Theme
      </button>
    </AppProvider>
  );
};

export default AppWrapper;
