import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'light' ? 'light' : 'dark';
}

export default function Header() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="app-header">
      <div className="header-content">
        <div>
          <p className="eyebrow">College Advisor</p>
          <h1 className="header-title">A sharper admissions workspace for school matching and strategy.</h1>
          <p className="header-subtitle">Curated school profiles first, web research only when the question needs fresh data.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} theme`}
            title={`Switch to ${nextTheme} theme`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <div className="kb-indicator" aria-label="Knowledge base status">
            <span className="kb-indicator-dot" aria-hidden="true" />
            <div>
              <p className="kb-indicator-label">Knowledge base</p>
              <p className="kb-indicator-value">49 schools + 57 insights loaded</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
