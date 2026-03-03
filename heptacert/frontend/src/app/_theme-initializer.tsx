export function ThemeInitializer() {
  const themeScript = `
    (function() {
      const stored = localStorage.getItem('heptacert-theme');
      const theme = stored || 'system';
      
      const getEffectiveTheme = (t) => {
        if (t === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return t;
      };
      
      const effective = getEffectiveTheme(theme);
      if (effective === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
