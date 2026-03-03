'use client';

import { useEffect, useState, useCallback } from 'react';
import { Theme, getStoredTheme, setStoredTheme, applyTheme, getEffectiveTheme, watchSystemTheme } from '@/lib/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from storage on mount
  useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    setTheme(stored || 'system');
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    setStoredTheme(theme);
  }, [theme, mounted]);

  // Watch for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    return watchSystemTheme(() => {
      applyTheme(theme);
    });
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const setThemeValue = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  const effectiveTheme = mounted ? getEffectiveTheme(theme) : 'light';

  return {
    theme,
    effectiveTheme,
    setTheme: setThemeValue,
    toggleTheme,
    isDark: effectiveTheme === 'dark',
    isMounted: mounted,
  };
}
