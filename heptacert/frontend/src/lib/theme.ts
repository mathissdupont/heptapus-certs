export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'heptacert-theme';
const COLOR_SCHEME_MEDIA = '(prefers-color-scheme: dark)';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : null;
  } catch {
    return null;
  }
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. Applying the
    // theme for the current page must still work even when persistence does not.
  }
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia(COLOR_SCHEME_MEDIA).matches ? 'dark' : 'light';
}

export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const effectiveTheme = getEffectiveTheme(theme);
  root.classList.toggle('dark', effectiveTheme === 'dark');
  root.style.colorScheme = effectiveTheme;
}

export function initializeTheme(): Theme {
  if (typeof window === 'undefined') return 'system';

  const theme = getStoredTheme() ?? 'system';
  applyTheme(theme);
  return theme;
}

export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(COLOR_SCHEME_MEDIA);
  const onChange = (event: MediaQueryListEvent) => callback(event.matches ? 'dark' : 'light');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
