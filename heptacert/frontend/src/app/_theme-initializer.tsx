export function createThemeInitializerScript(themeEnabled: boolean) {
  return `
  (function() {
    var theme = 'system';
    var enabled = ${JSON.stringify(themeEnabled)};
    if (enabled) {
      try {
        var stored = localStorage.getItem('heptacert-theme');
        if (stored === 'light' || stored === 'dark' || stored === 'system') theme = stored;
      } catch (_) {}
    } else {
      theme = 'light';
    }
    var systemDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = theme === 'dark' || (theme === 'system' && systemDark);
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  })();
`;
}

export const THEME_INITIALIZER_SCRIPT = createThemeInitializerScript(
  process.env.NEXT_PUBLIC_THEME_TOGGLE_ENABLED === "true",
);

export function ThemeInitializer() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INITIALIZER_SCRIPT }} />;
}
