import { useEffect, useState, useRef } from 'react';
import SessionSwitcher from './SessionSwitcher';
import type { SessionMetadata } from '../types';

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

      <div className="header-content">
        <div className="header-title-group">
          <p className="eyebrow">College Advisor</p>
          <h1 className="header-title">Your admissions&nbsp;counselor</h1>
        </div>

        <div className="header-status">
          {/* Identity — subtle, one line */}
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
            <span className="identity-sep" aria-hidden="true">·</span>
            <SessionSwitcher sessions={sessions} currentSessionId={currentSessionId}
              isLoading={isLoadingSessions} onSwitch={onSwitchSession} onCreate={onCreateSession} />
            <span className="identity-sep" aria-hidden="true">·</span>
            {editingUserId ? (
              <span className="header-identity-edit">
                <input ref={userIdInputRef} type="text" className="identity-input identity-input-id"
                  value={draftUserId} onChange={e => setDraftUserId(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveUserId(); if (e.key === 'Escape') setEditingUserId(false); }}
                  onBlur={handleSaveUserId} placeholder="User ID" maxLength={64} />
              </span>
            ) : (
              <button className="identity-id" onClick={() => { setDraftUserId(userId); setEditingUserId(true); }}
                title="Switch user">
                {userId.length <= 10 ? userId : `${userId.slice(0, 6)}…${userId.slice(-4)}`}
              </button>
            )}
          </div>

          {/* KB status — one subtle line */}
          <p className="header-kb-status">49 schools · 57 insights · dossier active</p>
        </div>
      </div>
    </header>
  );
}
