import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import { Page, NotificationType } from '../types';

type NavItemProps = {
  label: string;
  iconKey: string;
  page: Page;
  notificationCount?: number;
};

type MobileNavItemProps = {
  label?: string;
  iconKey: string;
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

  const setDomTheme = (next: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', next);
    document.body.setAttribute('data-theme', next);

    if (next === 'dark') {
      document.documentElement.style.setProperty('--co-bg', '#0B0B0E');
      document.documentElement.style.setProperty('--co-fg', '#E5E7EB');
      document.documentElement.style.setProperty('--co-fg-muted', '#9CA3AF');
      document.documentElement.style.setProperty('--co-primary', '#7C3AED');
      document.documentElement.style.setProperty('--co-primary-hover', '#6D28D9');
      document.documentElement.style.setProperty('--co-surface-opaque-color', '#121214');
      document.documentElement.style.setProperty('--co-surface-foreground-color', '#E5E7EB');
      document.documentElement.style.setProperty('--co-surface-border-color', '#262626');
      document.documentElement.style.setProperty('--co-surface-hover-color', '#1A1A1F');
      document.documentElement.style.setProperty('--co-surface-shadow', '0 14px 30px rgba(0,0,0,.50)');
    } else {
      document.documentElement.style.setProperty('--co-bg', '#FFFFFF');
      document.documentElement.style.setProperty('--co-fg', '#111827');
      document.documentElement.style.setProperty('--co-fg-muted', '#6B7280');
      document.documentElement.style.setProperty('--co-primary', '#7C3AED');
      document.documentElement.style.setProperty('--co-primary-hover', '#6D28D9');
      document.documentElement.style.setProperty('--co-surface-opaque-color', '#FFFFFF');
      document.documentElement.style.setProperty('--co-surface-foreground-color', '#111827');
      document.documentElement.style.setProperty('--co-surface-border-color', '#E5E7EB');
      document.documentElement.style.setProperty('--co-surface-hover-color', '#F3F4F6');
      document.documentElement.style.setProperty('--co-surface-shadow', '0 10px 25px rgba(0,0,0,.08)');
    }
  };

  const applyTheme = (next: 'light' | 'dark') => {
    setTheme(next);
    setDomTheme(next);
    window.dispatchEvent(new CustomEvent('co:set-theme', { detail: { theme: next } }));
    try {
      localStorage.setItem('co-theme', next);
    } catch {}
  };

  useEffect(() => {
    setDomTheme(theme === 'dark' ? 'dark' : 'light');
  }, [theme]);

  useEffect(() => {
    // Inject global styles (theme + mobile layout helpers)
    let styleEl = document.getElementById('co-global-theme') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'co-global-theme';
      styleEl.textContent = `
        body, .bg-background { background-color: var(--co-bg) !important; }
        .text-text-primary { color: var(--co-fg) !important; }
        .text-text-secondary { color: var(--co-fg-muted) !important; }
        .text-primary { color: var(--co-primary) !important; }
        .bg-primary { background-color: var(--co-primary) !important; color: #fff !important; }
        .hover\\:bg-primary-hover:hover { background-color: var(--co-primary-hover) !important; }
        .border-surface, .border-surface-light, .border-surface-dark { border-color: var(--co-surface-border-color) !important; }
        .bg-surface, .bg-surface-light {
          background-color: var(--co-surface-opaque-color) !important;
          color: var(--co-surface-foreground-color) !important;
          border: 1px solid var(--co-surface-border-color) !important;
          box-shadow: var(--co-surface-shadow) !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }
        .hover\\:bg-surface-light:hover { background-color: var(--co-surface-hover-color) !important; }

        /* iOS paint fix for fixed elements */
        .ios-fixed { backface-visibility: hidden; transform: translateZ(0); will-change: transform; }

        /* Gentle breathing room at the very top of the main content */
        main, [role="main"], .content, .center-column {
          padding-top: clamp(6px, 1.2vh, 12px) !important;
        }

        /* Universal sticky header utility applied by script */
        .co-sticky-top {
          position: sticky !important;
          top: calc(env(safe-area-inset-top, 0px));
          z-index: 35;
          background: var(--co-bg);
          backdrop-filter: saturate(1.2) blur(0px);
          border-bottom: 1px solid var(--co-surface-border-color);
        }

        /* MOBILE */
        @media (max-width: 767px) {
          /* Ensure content can scroll above a fixed footer */
          main, [role="main"], .content, .center-column {
            padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important;
          }
          main::after, [role="main"]::after, .content::after, .center-column::after {
            content: "";
            display: block;
            height: calc(12px + env(safe-area-inset-bottom, 0px));
          }
        }
      `;
      document.head.appendChild(styleEl);
    }
    setDomTheme(theme === 'dark' ? 'dark' : 'light');

    // Heuristically tag a page header as sticky—even if it's not literally the first child.
    const tagStickyHeader = () => {
      const roots = Array.from(document.querySelectorAll<HTMLElement>('main, [role="main"], .content, .center-column'));
      roots.forEach((root) => {
        // Try common header selectors first
        let el: HTMLElement | null =
          root.querySelector<HTMLElement>('header, .page-header, .topbar, .header, .toolbar, .title-bar, .page-title');

        // Fallback: find the first shallow child that looks like a compact bar (<=88px tall)
        if (!el) {
          const candidates = Array.from(root.children) as HTMLElement[];
          el = candidates.find((c) => {
            const cs = window.getComputedStyle(c);
            const h = parseFloat(cs.height || '0');
            return h > 0 && h <= 88 && (cs.display.includes('flex') || cs.position === 'sticky' || cs.position === 'relative');
          }) || null;
        }

        if (el) el.classList.add('co-sticky-top');
      });
    };

    // Tag now and on a short timer (covers content that mounts after first paint)
    tagStickyHeader();
    const t = setTimeout(tagStickyHeader, 100);
    const t2 = setTimeout(tagStickyHeader, 350);

    // Optional: listen for app navigation events if they exist
    const reapply = () => tagStickyHeader();
    window.addEventListener('co:navigate', reapply as EventListener);
    window.addEventListener('popstate', reapply as EventListener);
    window.addEventListener('hashchange', reapply as EventListener);

    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener('co:navigate', reapply as EventListener);
      window.removeEventListener('popstate', reapply as EventListener);
      window.removeEventListener('hashchange', reapply as EventListener);
    };
  }, []);

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

  useEffect(() => {
    const handleOutside = (event: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, []);

  const NavItem: React.FC<NavItemProps> = ({ label, iconKey, page, notificationCount = 0 }) => {
    const isActive = currentPage === page;

    const handleNav = () => {
      if (page === 'profile') {
        if (currentUser) viewProfile(currentUser.id);
      } else {
        navigate(page);
      }
    };

    return (
      <button
        onPointerUp={handleNav}
        className={`flex items-center w-full p-3 my-1 rounded-full transition-colors duration-200 ${
          isActive ? 'bg-primary text-white' : 'hover:bg-surface-light'
        }`}
      >
        <div className="relative">
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

    const handleNav = () => {
      if (page === 'profile') {
        if (currentUser) viewProfile(currentUser.id);
      } else {
        navigate(page);
      }
    };

    return (
      <button
        onPointerUp={handleNav}
        aria-label={label || page}
        className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
          isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <div className="relative">
          {isProfile && currentUser ? (
            <img
              src={currentUser.avatar}
              alt="Profile"
              className={`h-7 w-7 rounded-full border-2 ${isActive ? 'border-primary' : 'border-transparent'}`}
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
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  if (!currentUser) return null;

  const isMessagesPage = currentPage === 'messages';

  return (
    <>
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-20 lg:w-64 bg-background border-r border-surface-light p-4 flex-col justify-between z-40">
        <div className="w-full">
          <div className="text-primary font-bold text-2xl p-3 hidden lg:block">CreatorsOnly</div>
          <div className="w-12 h-12 flex items-center justify-center text-primary font-bold text-xl p-3 lg:hidden">CO</div>

          <nav className="mt-8 flex flex-col w-full items-center lg:items-stretch">
            <NavItem label="Home" iconKey="home" page="feed" />
            <NavItem label="Explore" iconKey="explore" page="explore" />
            <NavItem label="Opportunities" iconKey="collaborations" page="collaborations" />
            <NavItem label="Notifications" iconKey="notifications" page="notifications" notificationCount={otherUnreadCount} />
            <NavItem label="Messages" iconKey="messages" page="messages" notificationCount={unreadMessagesCount} />
            {isMasterUser && <NavItem label="Admin" iconKey="settings" page="admin" />}
            <NavItem label="Profile" iconKey="profile" page="profile" />

            <button
              onPointerUp={handleShareApp}
              className="flex items-center w-full p-3 my-1 rounded-full hover:bg-surface-light transition-colors duration-200"
            >
              <div className="relative">
                {React.cloneElement((copied ? ICONS.copy : ICONS.share) as React.ReactElement<{ className: string }>, { className: 'h-6 w-6' })}
              </div>
              <span className="ml-4 text-xl font-medium hidden lg:inline">{copied ? 'Link Copied!' : 'Share App'}</span>
            </button>
          </nav>
        </div>

        <div className="w-full">
          <button
            onPointerUp={() => openCreateModal('post')}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-full hidden lg:block"
          >
            Create
          </button>

          <button
            onPointerUp={() => openCreateModal('post')}
            className="w-12 h-12 bg-primary hover:bg-primary-hover text-white font-bold rounded-full flex items-center justify-center lg:hidden"
            aria-label="Create"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <div className="mt-4 relative" ref={settingsRef}>
            <button
              type="button"
              onPointerUp={() => setIsSettingsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-light transition-colors duration-200"
              aria-haspopup="menu"
              aria-expanded={isSettingsOpen}
            >
              <div className="flex items-center min-w-0">
                <img src={currentUser.avatar} alt={currentUser.name} className="h-10 w-10 rounded-full object-cover" />
                <div className="ml-3 hidden lg:block min-w-0">
                  <div className="text-sm font-medium truncate">{currentUser.name}</div>
                  <div className="text-xs text-text-secondary truncate">@{currentUser.username}</div>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 hidden lg:block" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {isSettingsOpen && (
              <div
                role="menu"
                className="absolute bottom-full mb-2 w-full rounded-xl shadow-2xl z-50 border border-surface overflow-hidden bg-surface"
                style={{ backgroundColor: 'var(--co-surface-opaque-color)' }}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-text-primary">Theme</span>
                  <div className="flex items-center gap-1 rounded-full bg-surface p-0.5">
                    <button
                      type="button"
                      aria-label="Light theme"
                      className={`h-7 w-7 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                      onPointerUp={() => applyTheme('light')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Dark theme"
                      className={`h-7 w-7 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                      onPointerUp={() => applyTheme('dark')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="border-t border-surface/70" />

                <button
                  type="button"
                  onPointerUp={() => { onOpenFeedbackModal(); setIsSettingsOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-surface-light"
                  role="menuitem"
                >
                  Send Feedback
                </button>

                <div className="border-t border-surface/70" />

                <button
                  type="button"
                  onPointerUp={() => { logout(); setIsSettingsOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-light"
                  role="menuitem"
                >
                  Log out @{currentUser.username}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation with Admin + Profile when master user */}
      <nav className="md:hidden fixed ios-fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-surface">
        {isMessagesPage ? (
          // Messages tab ONLY: two-layer layout so icons align exactly like Home
          <div className="relative" style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="absolute inset-x-0 bottom-0 h-16 pt-1">
              <div className={`grid ${isMasterUser ? 'grid-cols-6' : 'grid-cols-5'} items-center h-full`}>
                <MobileNavItem iconKey="home" label="Home" page="feed" />
                <MobileNavItem iconKey="explore" label="Explore" page="explore" />
                <MobileNavItem iconKey="collaborations" label="Opportunities" page="collaborations" />
                <MobileNavItem iconKey="messages" label="Messages" page="messages" notificationCount={unreadMessagesCount} />
                {isMasterUser && <MobileNavItem iconKey="settings" label="Admin" page="admin" />}
                <MobileNavItem iconKey="profile" label="Profile" page="profile" isProfile />
              </div>
            </div>
          </div>
        ) : (
          // Other tabs keep existing single-layer layout
          <div className={`grid ${isMasterUser ? 'grid-cols-6' : 'grid-cols-5'} items-center h-16 pt-1 pb-[env(safe-area-inset-bottom)]`}>
            <MobileNavItem iconKey="home" label="Home" page="feed" />
            <MobileNavItem iconKey="explore" label="Explore" page="explore" />
            <MobileNavItem iconKey="collaborations" label="Opportunities" page="collaborations" />
            <MobileNavItem iconKey="messages" label="Messages" page="messages" notificationCount={unreadMessagesCount} />
            {isMasterUser && <MobileNavItem iconKey="settings" label="Admin" page="admin" />}
            <MobileNavItem iconKey="profile" label="Profile" page="profile" isProfile />
          </div>
        )}
      </nav>
    </>
  );
};

export default Sidebar;
