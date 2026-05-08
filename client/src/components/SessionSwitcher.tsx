import { useState, useRef, useEffect } from 'react';
import type { SessionMetadata } from '../types';

interface SessionSwitcherProps {
  sessions: SessionMetadata[];
  currentSessionId: string | null;
  isLoading: boolean;
  onSwitch: (sessionId: string) => void;
  onCreate: (name: string, purpose?: string) => void;
}

export default function SessionSwitcher({
  sessions,
  currentSessionId,
  isLoading,
  onSwitch,
  onCreate,
}: SessionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const displayName = currentSession?.name || 'Select session...';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewName('');
    setIsCreating(false);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewName('');
    }
  };

  return (
    <div className="session-switcher" ref={dropdownRef}>
      <button
        type="button"
        className="session-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-label="Switch session"
        title="Switch session"
      >
        <span className="session-switcher-icon" aria-hidden="true">📁</span>
        <span className="session-switcher-label">
          {isLoading ? 'Loading...' : displayName}
        </span>
        <span className={`session-switcher-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="session-switcher-dropdown">
          <div className="session-switcher-header">
            <span className="session-switcher-title">Projects</span>
            <button
              type="button"
              className="session-switcher-add-btn"
              onClick={() => { setIsCreating(true); setNewName(''); }}
              title="New project"
              aria-label="Create new project"
            >
              + New
            </button>
          </div>

          {isCreating && (
            <div className="session-switcher-create">
              <input
                ref={inputRef}
                type="text"
                className="session-switcher-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Essay Review, MIT Strategy..."
                maxLength={80}
              />
              <div className="session-switcher-create-actions">
                <button
                  type="button"
                  className="session-switcher-create-btn"
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="session-switcher-cancel-btn"
                  onClick={() => { setIsCreating(false); setNewName(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="session-switcher-list">
            {sessions.length === 0 && !isCreating && (
              <div className="session-switcher-empty">
                No sessions yet. Create your first project.
              </div>
            )}
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`session-switcher-item ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => {
                  onSwitch(session.id);
                  setIsOpen(false);
                }}
              >
                <span className="session-switcher-item-icon" aria-hidden="true">
                  {session.id === currentSessionId ? '●' : '○'}
                </span>
                <div className="session-switcher-item-content">
                  <span className="session-switcher-item-name">{session.name}</span>
                  {session.purpose && (
                    <span className="session-switcher-item-purpose">{session.purpose}</span>
                  )}
                </div>
                <span className="session-switcher-item-time">
                  {formatRelativeTime(session.updated_at)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}
