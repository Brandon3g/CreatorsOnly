export type ThemeMode = 'light' | 'dark';

const STANDALONE_THEME_STORAGE_KEY = 'co-theme';

type ThemeSetter = (theme: ThemeMode) => void;

const setThemeAttributes = (next: ThemeMode) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const { body } = document;

  root.setAttribute('data-theme', next);
  if (body) body.setAttribute('data-theme', next);

  if (next === 'dark') {
    root.style.setProperty('--co-bg', '#0B0B0E');
    root.style.setProperty('--co-fg', '#E5E7EB');
    root.style.setProperty('--co-fg-muted', '#9CA3AF');
    root.style.setProperty('--co-primary', '#7C3AED');
    root.style.setProperty('--co-primary-hover', '#6D28D9');
    root.style.setProperty('--co-surface-opaque-color', '#121214');
    root.style.setProperty('--co-surface-foreground-color', '#E5E7EB');
    root.style.setProperty('--co-surface-border-color', '#262626');
    root.style.setProperty('--co-surface-hover-color', '#1A1A1F');
    root.style.setProperty('--co-surface-shadow', '0 14px 30px rgba(0,0,0,.50)');
  } else {
    root.style.setProperty('--co-bg', '#FFFFFF');
    root.style.setProperty('--co-fg', '#111827');
    root.style.setProperty('--co-fg-muted', '#6B7280');
    root.style.setProperty('--co-primary', '#7C3AED');
    root.style.setProperty('--co-primary-hover', '#6D28D9');
    root.style.setProperty('--co-surface-opaque-color', '#FFFFFF');
    root.style.setProperty('--co-surface-foreground-color', '#111827');
    root.style.setProperty('--co-surface-border-color', '#E5E7EB');
    root.style.setProperty('--co-surface-hover-color', '#F3F4F6');
    root.style.setProperty('--co-surface-shadow', '0 10px 25px rgba(0,0,0,.08)');
  }
};

const broadcastThemeChange = (next: ThemeMode) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('co:set-theme', { detail: { theme: next } }));
};

const persistThemePreference = (next: ThemeMode) => {
  try {
    localStorage.setItem(STANDALONE_THEME_STORAGE_KEY, next);
  } catch {
    /* ignore persistence errors */
  }
};

export const syncThemeToDom = (next: ThemeMode) => {
  setThemeAttributes(next);
};

export const applyThemePreference = (next: ThemeMode, setTheme: ThemeSetter) => {
  setTheme(next);
  setThemeAttributes(next);
  broadcastThemeChange(next);
  persistThemePreference(next);
};