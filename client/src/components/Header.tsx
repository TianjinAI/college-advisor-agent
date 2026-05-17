import { useEffect, useState, useRef } from 'react';
import SessionSwitcher from './SessionSwitcher';
import type { SessionMetadata, AppMode } from '../types';

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'light' ? 'light' : 'dark';
}

interface HeaderProps {
  userId: string;
  displayName: string;
  sessions: SessionMetadata[];
  currentSessionId: string | null;
  isLoadingSessions: boolean;
  onSwitchSession: (sessionId: string) => void;
  onCreateSession: (name: string, purpose?: string) => void;
  onChangeUserId: (newUserId: string) => void;
  onSetDisplayName: (name: string) => void;
  onLogout: () => void;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export default function Header({
  userId,
  displayName,
  sessions,
  currentSessionId,
  isLoadingSessions,
  onSwitchSession,
  onCreateSession,
  onChangeUserId,
  onSetDisplayName,
  onLogout,
  mode,
  onModeChange,
}: HeaderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [editingUserId, setEditingUserId] = useState(false);
  const [draftUserId, setDraftUserId] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const userIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.appMode = mode;
  }, [mode]);

  useEffect(() => {
    if (editingName && nameInputRef.current) { nameInputRef.current.focus(); nameInputRef.current.select(); }
  }, [editingName]);
  useEffect(() => {
    if (editingUserId && userIdInputRef.current) { userIdInputRef.current.focus(); userIdInputRef.current.select(); }
  }, [editingUserId]);

  const handleSaveName = () => {
    const t = draftName.trim();
    if (t && t !== displayName) onSetDisplayName(t);
    setEditingName(false);
  };
  const handleSaveUserId = () => {
    const t = draftUserId.trim();
    if (t && t !== userId) onChangeUserId(t);
    setEditingUserId(false);
  };

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="app-header">
      <button
        type="button"
        className="theme-toggle-absolute"
        onClick={() => setTheme(nextTheme)}
        aria-label={`Switch to ${nextTheme} theme`}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      </button>

      <button
        type="button"
        onClick={onLogout}
        aria-label="Sign out"
        style={{
          position: 'absolute', top: 16, left: 80,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', fontSize: 13,
          padding: '4px 8px', borderRadius: 6,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
      >
        Sign out
      </button>

      <div className="header-content">
        <div className="header-title-group">
          <p className="eyebrow">{mode === 'college' ? 'College Advisor' : 'Financial Aid'}</p>
          <h1 className="header-title">{mode === 'college' ? 'Your admissions counselor' : 'Maximize need + merit aid'}</h1>
        </div>

        <div className="mode-toggle" role="group" aria-label="Switch app mode">
          <button
            type="button"
            className={`mode-toggle-btn${mode === 'college' ? ' active' : ''}`}
            onClick={() => onModeChange('college')}
            aria-pressed={mode === 'college'}
          >
            College Advisor
          </button>
          <button
            type="button"
            className={`mode-toggle-btn${mode === 'fa' ? ' active' : ''}`}
            onClick={() => onModeChange('fa')}
            aria-pressed={mode === 'fa'}
          >
            Financial Aid
          </button>
        </div>

        <div className="header-status">
          <div className="header-identity">
            {editingName ? (
              <span className="header-identity-edit">
                <input ref={nameInputRef} type="text" className="identity-input"
                  value={draftName} onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  onBlur={handleSaveName} placeholder="Your name" maxLength={48} />
              </span>
            ) : (
              <button className="identity-name" onClick={() => { setDraftName(displayName); setEditingName(true); }}>
                {displayName || 'Set name'}
              </button>
            )}

            {!editingUserId && !editingName && (
              <button className="identity-new-btn" onClick={() => {
                const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                onChangeUserId(newId);
              }} onDoubleClick={() => { setDraftUserId(userId); setEditingUserId(true); }}
                title="Create new user (double-click to switch)">
                <span className="identity-new-icon">+</span>
              </button>
            )}

            {editingUserId ? (
              <span className="header-identity-edit">
                <input ref={userIdInputRef} type="text" className="identity-input identity-input-id"
                  value={draftUserId} onChange={e => setDraftUserId(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveUserId(); if (e.key === 'Escape') setEditingUserId(false); }}
                  onBlur={handleSaveUserId} placeholder="Enter user ID" maxLength={64} />
              </span>
            ) : (
              <SessionSwitcher sessions={sessions} currentSessionId={currentSessionId}
                isLoading={isLoadingSessions} onSwitch={onSwitchSession} onCreate={onCreateSession} />
            )}
          </div>

          <p className="header-kb-status">49 schools · 57 insights · dossier active</p>
        </div>
      </div>
    </header>
  );
}