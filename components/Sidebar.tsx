import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import { Page, NotificationType } from '../types';

type NavItemProps = {
  label: string;
  iconKey: keyof typeof ICONS;
  page: Page;
  notificationCount?: number;
};

type MobileNavItemProps = {
  label?: string; // for accessibility/tooltips on mobile
  iconKey: keyof typeof ICONS;
  page: Page;
  notificationCount?: number;
  isProfile?: boolean;
};

type SidebarProps = {
  openCreateModal: (initialTab?: 'post' | 'project') => void;
  onOpenFeedbackModal: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ openCreateModal, onOpenFeedbackModal }) => {
  const {
    currentPage,
    navigate,
    currentUser,
    viewProfile,
    viewingProfileId,
    logout,
    isMasterUser,
    theme,
    setTheme,
    notifications,
  } = useAppContext();

  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Derive unread counts
  const unreadMessageSenders = new Set(
    notifications
      .filter(
        (n) =>
          currentUser &&
          n.userId === currentUser.id &&
          n.type === NotificationType.NEW_MESSAGE &&
          !n.isRead,
      )
      .map((n) => n.actorId),
  );
  const unreadMessagesCount = unreadMessageSenders.size;

  const otherUnreadCount = notifications.filter(
    (n) =>
      currentUser &&
      n.userId === currentUser.id &&
      n.type !== NotificationType.NEW_MESSAGE &&
      !n.isRead,
  ).length;

  // Close settings if clicking/touching outside
  useEffect(() => {
    const handleInteractionOutside = (event: MouseEvent | TouchEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleInteractionOutside);
    document.addEventListener('touchstart', handleInteractionOutside);
    return () => {
      document.removeEventListener('mousedown', handleInteractionOutside);
      document.removeEventListener('touchstart', handleInteractionOutside);
    };
  }, []);

  const NavItem: React.FC<NavItemProps> = ({ label, iconKey, page, notificationCount = 0 }) => {
    const isActive = currentPage === page;

    const handleClick = () => {
      if (page === 'profile') {
        if (currentUser) viewProfile(currentUser.id);
      } else {
        navigate(page);
      }
    };

    return (
      <button
        onClick={handleClick}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleClick();
        }}
        className={`flex items-center w-full p-3 my-1 rounded-full transition-colors duration-200 ${
          isActive ? 'bg-primary text-white' : 'hover:bg-surface-light'
        }`}
      >
        <div className="relative">
          {/* @ts-ignore icon is a ReactElement */}
          {ICONS[iconKey]}
          {notificationCount > 0 &&
            (page === 'notifications' ? (
              <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-accent-red ring-2 ring-background" />
            ) : (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-white text-xs">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            ))}
        </div>
        <span className="ml-4 text-xl font-medium hidden lg:inline">{label}</span>
      </button>
    );
  };

  const MobileNavItem: React.FC<MobileNavItemProps> = ({
    label,
    iconKey,
    page,
    notificationCount = 0,
    isProfile,
  }) => {
    const isActive =
      page === 'profile'
        ? currentPage === 'profile' && viewingProfileId === currentUser?.id
        : currentPage === page;

    const handleClick = () => {
      if (page === 'profile') {
        if (currentUser) viewProfile(currentUser.id);
      } else {
        navigate(page);
      }
    };

    return (
      <button
        onClick={handleClick}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleClick();
        }}
        aria-label={label || String(page)}
        className={`flex flex-col items-center justify-center w-full h-full py-2 transition-colors duration-200 ${
          isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <div className="relative">
          {isProfile && currentUser ? (
            <img
              src={currentUser.avatar}
              alt="Profile"
              className={`h-7 w-7 rounded-full border-2 ${
                isActive ? 'border-primary' : 'border-transparent'
              }`}
            />
          ) : (
            React.cloneElement(ICONS[iconKey] as React.ReactElement<{ className: string }>, {
              className: 'h-7 w-7',
            })
          )}
          {notificationCount > 0 &&
            (page === 'notifications' ? (
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent-red" />
            ) : (
              <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent-red text-white text-[10px]">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            ))}
        </div>
      </button>
    );
  };

  const handleShareApp = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: 'CreatorsOnly',
      text: 'Join me on CreatorsOnly, the platform for creators to connect, collaborate, and grow!',
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (error) {
      // Fallback: copy link
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-20 lg:w-64 bg-background border-r border-surface-light p-4 flex-col justify-between z-40">
        {/* Top: Brand + Nav */}
        <div className="w-full">
          {/* Brand */}
          <div className="text-primary font-bold text-2xl p-3 hidden lg:block">CreatorsOnly</div>
          <div className="w-12 h-12 flex items-center justify-center text-primary font-bold text-xl p-3 lg:hidden">
            CO
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex flex-col w-full items-center lg:items-stretch">
            <NavItem label="Home" iconKey="home" page="feed" />
            <NavItem label="Explore" iconKey="explore" page="explore" />
            <NavItem label="Opportunities" iconKey="collaborations" page="collaborations" />
            <NavItem
              label="Notifications"
              iconKey="notifications"
              page="notifications"
              notificationCount={otherUnreadCount}
            />
            <NavItem
              label="Messages"
              iconKey="messages"
              page="messages"
              notificationCount={unreadMessagesCount}
            />
            {isMasterUser && <NavItem label="Admin" iconKey="settings" page="admin" />}
            <NavItem label="Profile" iconKey="profile" page="profile" />

            {/* Share App */}
            <button
              onClick={handleShareApp}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleShareApp();
              }}
              className="flex items-center w-full p-3 my-1 rounded-full hover:bg-surface-light transition-colors duration-200"
            >
              <div className="relative">
                {React.cloneElement(
                  (copied ? ICONS.copy : ICONS.share) as React.ReactElement<{ className: string }>,
                  { className: 'h-6 w-6' },
                )}
              </div>
              <span className="ml-4 text-xl font-medium hidden lg:inline">
                {copied ? 'Link Copied!' : 'Share App'}
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom: Create + User Card (restored) */}
        <div className="w-full">
          {/* Create */}
          <button
            onClick={() => openCreateModal('post')}
            onTouchEnd={(e) => {
              e.preventDefault();
              openCreateModal('post');
            }}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-full hidden lg:block"
          >
            Create
          </button>

          <button
            onClick={() => openCreateModal('post')}
            onTouchEnd={(e) => {
              e.preventDefault();
              openCreateModal('post');
            }}
            className="w-12 h-12 bg-primary hover:bg-primary-hover text-white font-bold rounded-full flex items-center justify-center lg:hidden"
            aria-label="Create"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* User Card / Menu trigger (this is the piece that was missing) */}
          <div className="mt-4 relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setIsSettingsOpen((v) => !v)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsSettingsOpen((v) => !v);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-light transition-colors duration-200"
              aria-haspopup="menu"
              aria-expanded={isSettingsOpen}
            >
              <div className="flex items-center min-w-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="ml-3 hidden lg:block min-w-0">
                  <div className="text-sm font-medium truncate">{currentUser.name}</div>
                  <div className="text-xs text-text-secondary truncate">@{currentUser.username}</div>
                </div>
              </div>
              {/* three-dots icon */}
              <span className="ml-2 flex-shrink-0 hidden lg:inline">
                {React.cloneElement(ICONS.more as React.ReactElement<{ className: string }>, {
                  className: 'h-5 w-5',
                })}
              </span>
            </button>

            {/* Settings / quick actions menu */}
            {isSettingsOpen && (
              <div
                role="menu"
                className="absolute bottom-full mb-2 w-full bg-surface-light rounded-lg shadow-lg py-1 z-50"
              >
                {/* Theme quick switcher */}
                <div className="w-full text-left px-4 py-2 text-sm text-text-primary flex justify-between items-center">
                  <span>Theme</span>
                  <div className="flex items-center rounded-full p-0.5 bg-surface">
                    <button
                      onClick={() => setTheme('light')}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setTheme('light');
                      }}
                      aria-label="Switch to light theme"
                      className={`p-1 rounded-full ${
                        theme === 'light' ? 'bg-primary text-white' : 'text-text-secondary'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setTheme('dark');
                      }}
                      aria-label="Switch to dark theme"
                      className={`p-1 rounded-full ${
                        theme === 'dark' ? 'bg-primary text-white' : 'text-text-secondary'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* divider */}
                <div className="border-t border-surface my-1" />

                {/* Send Feedback */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenFeedbackModal();
                    setIsSettingsOpen(false);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onOpenFeedbackModal();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface/50"
                  role="menuitem"
                >
                  Send Feedback
                </button>

                {/* Theme toggle (global event) */}
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface/50 flex items-center gap-2"
                  onClick={() => window.dispatchEvent(new Event('co:toggle-theme'))}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new Event('co:toggle-theme'));
                  }}
                  role="menuitem"
                >
                  <span aria-hidden="true">🌓</span>
                  <span>Theme</span>
                </button>

                {/* Log out */}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsSettingsOpen(false);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    logout();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface/50"
                  role="menuitem"
                >
                  Log out @{currentUser.username}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-background border-t border-surface">
        <div className="grid grid-cols-5 items-stretch">
          <MobileNavItem iconKey="home" label="Home" page="feed" />
          <MobileNavItem iconKey="explore" label="Explore" page="explore" />
          <MobileNavItem iconKey="collaborations" label="Opportunities" page="collaborations" />
          <MobileNavItem
            iconKey="messages"
            label="Messages"
            page="messages"
            notificationCount={unreadMessagesCount}
          />
          {/* Profile / account */}
          <MobileNavItem iconKey="profile" label="Profile" page="profile" isProfile />
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
