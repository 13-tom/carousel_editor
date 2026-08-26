import { useEffect, useState } from 'react';

const KEY = 'carousel-editor-theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem(KEY) || 'light');
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
