export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'heptacert-theme';
const COLOR_SCHEME_MEDIA = '(prefers-color-scheme: dark)';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return (stored as Theme) || null;
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(COLOR_SCHEME_MEDIA).matches ? 'dark' : 'light';
}

export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const effective = getEffectiveTheme(theme);
  const root = document.documentElement;

  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function initializeTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  const stored = getStoredTheme();
  const theme = stored || 'system';
  applyTheme(theme);
  return theme;
}

export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const media = window.matchMedia(COLOR_SCHEME_MEDIA);
  const listener = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
