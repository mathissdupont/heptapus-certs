'use client';

import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, isMounted, setTheme } = useTheme();

  if (!isMounted) {
    return (
      <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="relative group">
      <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        {theme === 'light' && <Sun className="h-5 w-5" />}
        {theme === 'dark' && <Moon className="h-5 w-5" />}
        {theme === 'system' && <Monitor className="h-5 w-5" />}
      </button>

      <div className="absolute right-0 top-full hidden group-hover:block mt-1 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50">
        <button
          onClick={() => setTheme('light')}
          className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg ${
            theme === 'light' ? 'bg-brand-50 dark:bg-brand-950 text-brand-600' : ''
          }`}
        >
          <Sun className="h-4 w-4" />
          <span className="text-sm">Açık Tema</span>
          {theme === 'light' && <span className="ml-auto text-xs">✓</span>}
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
            theme === 'dark' ? 'bg-brand-50 dark:bg-brand-950 text-brand-600' : ''
          }`}
        >
          <Moon className="h-4 w-4" />
          <span className="text-sm">Koyu Tema</span>
          {theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
        </button>

        <button
          onClick={() => setTheme('system')}
          className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg ${
            theme === 'system' ? 'bg-brand-50 dark:bg-brand-950 text-brand-600' : ''
          }`}
        >
          <Monitor className="h-4 w-4" />
          <span className="text-sm">Sistem Tercihi</span>
          {theme === 'system' && <span className="ml-auto text-xs">✓</span>}
        </button>
      </div>
    </div>
  );
}
