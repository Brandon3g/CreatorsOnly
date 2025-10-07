import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ICONS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { useThemeSync } from '../hooks/useThemeSync';

type MobileTopBarProps = {
  title: string;
  className?: string;
};

const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input[type="text"]:not([disabled])',
  'input[type="radio"]:not([disabled])',
  'input[type="checkbox"]:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const FEEDBACK_EMAIL = 'support@creatorsonly.app';
const FEEDBACK_SUBJECT = encodeURIComponent('CreatorsOnly Feedback');

const MobileTopBar: React.FC<MobileTopBarProps> = ({ title, className = '' }) => {
  const { currentUser, theme, setTheme, logout } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const username = currentUser?.username ? `@${currentUser.username}` : '';

  useThemeSync(theme, setTheme);

  const handleThemeToggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setIsMenuOpen(false);
  }, [setTheme, theme]);

  const feedbackHref = useMemo(
    () => `mailto:${FEEDBACK_EMAIL}?subject=${FEEDBACK_SUBJECT}`,
    [],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.add('co-has-pinned-header');
    return () => {
      document.documentElement.classList.remove('co-has-pinned-header');
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;

    const menuNode = menuRef.current;
    const focusable = menuNode?.querySelectorAll<HTMLElement>(focusableSelectors);
    focusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !focusable || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuNode &&
        !menuNode.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) return;
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isMenuOpen]);

  const handleLogout = useCallback(() => {
    logout();
    setIsMenuOpen(false);
  }, [logout, setIsMenuOpen]);

  return (
    <header
      className={`md:hidden sticky top-0 z-40 border-b border-base-content/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`.trim()}
    >
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="flex h-[calc(var(--co-topbar-h,56px))] items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-primary">{title}</h1>
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-topbar-menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors duration-200 hover:bg-base-content/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              {ICONS.settings}
              <span className="sr-only">Open settings</span>
            </button>

            {isMenuOpen ? (
              <div
                ref={menuRef}
                id="mobile-topbar-menu"
                role="menu"
                aria-label="Quick settings"
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-base-content/10 bg-base-100/90 p-2 text-left shadow-xl backdrop-blur supports-[backdrop-filter]:bg-base-100/60"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleThemeToggle}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-base-content/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span>{theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}</span>
                  <span className="ml-2 text-primary">{theme === 'dark' ? '☀️' : '🌙'}</span>
                </button>
                <a
                  role="menuitem"
                  href={feedbackHref}
                  onClick={() => setIsMenuOpen(false)}
                  className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-base-content/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span>Send feedback</span>
                  <span className="ml-2 text-primary">✉️</span>
                </a>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-error transition-colors duration-200 hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                >
                  <span>Sign out {username}</span>
                  <span aria-hidden="true">↩️</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileTopBar;