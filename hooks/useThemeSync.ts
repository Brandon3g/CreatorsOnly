import { useCallback, useEffect } from 'react';
import { applyThemePreference, syncThemeToDom, ThemeMode } from '../lib/theme';

type ThemeSetter = (theme: ThemeMode) => void;

type UseThemeSyncOptions = {
  /**
   * When true, a memoized updater function is returned that applies theme
   * preferences (state + persistence). When omitted the hook only synchronises
   * the DOM for the provided theme value.
   */
  withUpdater?: boolean;
};

/**
 * Synchronises the current theme value with the DOM and persistence layer.
 * Returns a stable function that updates the theme preference end-to-end.
 */
export function useThemeSync(theme: ThemeMode, setTheme: ThemeSetter): void;
export function useThemeSync(
  theme: ThemeMode,
  setTheme: ThemeSetter,
  options: { withUpdater: true },
): (nextTheme: ThemeMode) => void;
export function useThemeSync(
  theme: ThemeMode,
  setTheme: ThemeSetter,
  options: UseThemeSyncOptions = {},
) {
  useEffect(() => {
    syncThemeToDom(theme);
  }, [theme]);

  if (!options.withUpdater) {
    return undefined;
  }

  return useCallback(
    (nextTheme: ThemeMode) => {
      if (nextTheme === theme) return;
      applyThemePreference(nextTheme, setTheme);
    },
    [theme, setTheme],
  );
}