import { useEffect, useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import ProfileCard from './components/ProfileCard';
import ChatPanel from './components/ChatPanel';
import SchoolDirectory from './components/SchoolDirectory';
import EssayPanel from './components/EssayPanel';
import SummerProgramsPanel from './components/SummerProgramsPanel';
import type { StudentProfile, ChatMessage, SchoolSelection, SessionMetadata, AppMode, FinancialProfile } from './types';
import { DEFAULT_FINANCIAL_PROFILE } from './components/FAProfilePanel';
import FinancialAidWorkspace from './components/FinancialAidWorkspace';

const JWT_STORAGE_KEY = 'college-advisor-jwt';
const USER_ID_STORAGE_KEY = 'college-advisor-user-id';
const SESSION_ID_STORAGE_KEY = 'college-advisor-session-id';
const SESSION_MESSAGES_STORAGE_KEY = 'college-advisor-session-messages';
const PROFILE_STORAGE_PREFIX = 'college-advisor-profile';

const defaultProfile: StudentProfile = {
  gpa: '',
  gpa_scale: 'Weighted',
  ap_ib_classes: '',
  sat_score: '',
  act_score: '',
  class_rank: '',
  interests: '',
  intended_majors: '',
  budget: '',
  target_states: '',
  extracurriculars: '',
  summer_camps: '',
  awards_honors: '',
  ethnic_group: '',
  sex: '',
  school_type: '',
  documents: [],
};

function getOrCreateUserId(): string {
  if (typeof window === 'undefined') {
    return 'server-render-placeholder';
  }

  const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing) return existing;

  const nextId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(USER_ID_STORAGE_KEY, nextId);
  return nextId;
}

function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
}

function getProfileStorageKey(userId: string): string {
  return `${PROFILE_STORAGE_PREFIX}:${userId}`;
}

function loadStoredProfile(userId: string): StudentProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getProfileStorageKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StudentProfile>;
    return { ...defaultProfile, ...parsed };
  } catch {
    return null;
  }
}

function storeProfile(userId: string, profile: StudentProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getProfileStorageKey(userId), JSON.stringify(profile));
}

function storeSessionId(sessionId: string | null): void {
  if (typeof window === 'undefined') return;
  if (sessionId) {
    window.localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } else {
    window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
  }
}

function getStoredMessagesMap(): Record<string, ChatMessage[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SESSION_MESSAGES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function storeSessionMessages(sessionId: string, messages: ChatMessage[]): void {
  if (typeof window === 'undefined' || !sessionId) return;
  const all = getStoredMessagesMap();
  all[sessionId] = messages.slice(-200);
  window.localStorage.setItem(SESSION_MESSAGES_STORAGE_KEY, JSON.stringify(all));
}

function getSessionMessages(sessionId: string): ChatMessage[] {
  return getStoredMessagesMap()[sessionId] || [];
}

function getJwt(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(JWT_STORAGE_KEY);
}

function storeJwt(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(JWT_STORAGE_KEY, token);
}

function clearJwt(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(JWT_STORAGE_KEY);
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getJwt();
  const headers = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({
  onLogin,
  error,
}: {
  onLogin: (username: string, password: string) => void;
  error: string;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    onLogin(username.trim(), password);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: '40px 48px',
        width: 360,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
            College Advisor
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
            Sign in to access your portal
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '10px 14px',
                color: '#fff', fontSize: 15, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '10px 14px',
                color: '#fff', fontSize: 15, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px',
              color: '#fca5a5', fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              background: loading ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.9)',
              border: 'none', borderRadius: 8,
              padding: '12px 20px',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState<StudentProfile>(defaultProfile);
  const profileHydratedRef = useRef(false);
  const [mode, setMode] = useState<AppMode>('college');
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile>(DEFAULT_FINANCIAL_PROFILE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rightView, setRightView] = useState<'schools' | 'essays' | 'summer'>('schools');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolSelection | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [userId, setUserId] = useState(getOrCreateUserId);
  const [displayName, setDisplayName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(!!getJwt());
  const [loginError, setLoginError] = useState('');

  // Restore profile from server on user change, with localStorage as fallback
  useEffect(() => {
    let isMounted = true;
    profileHydratedRef.current = false;

    const hydrateProfile = async () => {
      try {
        const response = await authFetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
        if (response.ok) {
          const data = await response.json() as { displayName?: string; studentProfile?: StudentProfile };
          if (!isMounted) return;
          if (data.studentProfile && Object.keys(data.studentProfile).length > 0) {
            setProfile({ ...defaultProfile, ...data.studentProfile });
            profileHydratedRef.current = true;
            return;
          }
        }
      } catch {
        // fall through to localStorage
      }

      const storedProfile = loadStoredProfile(userId);
      if (isMounted) {
        setProfile(storedProfile ?? defaultProfile);
        profileHydratedRef.current = true;
      }
    };

    hydrateProfile();

    return () => { isMounted = false; };
  }, [userId]);

  // Persist profile edits so refreshes don't clear the form
  useEffect(() => {
    if (!profileHydratedRef.current) return;
    storeProfile(userId, profile);
    const timeout = window.setTimeout(() => {
      void authFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, studentProfile: profile }),
      }).catch(() => {});
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [profile, userId]);

  // Fetch display name on mount / userId change
  useEffect(() => {
    let isMounted = true;
    const fetchName = async () => {
      try {
        const response = await authFetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
        if (response.ok) {
          const data = (await response.json()) as { displayName?: string };
          if (isMounted && data.displayName) setDisplayName(data.displayName);
        }
      } catch { /* ignore */ }
    };
    fetchName();
    return () => { isMounted = false; };
  }, [userId]);

  // Handle user ID change — persist and reload sessions
  const handleChangeUserId = useCallback((newUserId: string) => {
    window.localStorage.setItem(USER_ID_STORAGE_KEY, newUserId);
    setUserId(newUserId);
    setDisplayName('');
    setSessions([]);
    setCurrentSessionId(null);
    window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
    setIsLoadingSessions(true);
  }, []);

  // Handle display name change
  const handleSetDisplayName = useCallback(async (name: string) => {
    setDisplayName(name);
    try {
      await authFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, displayName: name }),
      });
    } catch { /* ignore */ }
  }, [userId]);

  // Login handler
  const handleLogin = useCallback(async (username: string, password: string) => {
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Login failed');
        return;
      }
      const { token, userId: returnedUserId } = await res.json() as { token: string; userId: string };
      storeJwt(token);
      if (returnedUserId) {
        window.localStorage.setItem(USER_ID_STORAGE_KEY, returnedUserId);
        setUserId(returnedUserId);
      }
      setIsLoggedIn(true);

      // Create default session immediately so user has one ready
      try {
        const sessRes = await authFetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: returnedUserId, name: 'General Advising' }),
        });
        if (sessRes.ok) {
          const { session } = await sessRes.json() as { session?: { id: string } };
          if (session?.id) {
            window.localStorage.setItem('college-advisor-session-id', session.id);
          }
        }
      } catch { /* non-fatal */ }
    } catch {
      setLoginError('Network error — please try again');
    }
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    clearJwt();
    setIsLoggedIn(false);
    setUserId(getOrCreateUserId());
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
    setDisplayName('');
  }, []);

  // Session state
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(getStoredSessionId);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Panel resize state
  const [leftPanelWidth, setLeftPanelWidth] = useState(340);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const dragState = useRef<{
    handle: 'left' | 'right';
    startX: number;
    startLeft: number;
    startRight: number;
  } | null>(null);

  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

  const handleDragStart = useCallback((
    handle: 'left' | 'right',
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    dragState.current = {
      handle,
      startX: e.clientX,
      startLeft: leftPanelWidth,
      startRight: rightPanelWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftPanelWidth, rightPanelWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const { handle, startX, startLeft, startRight } = dragState.current;
      const delta = e.clientX - startX;
      if (handle === 'left') {
        setLeftPanelWidth(clamp(startLeft + delta, 260, 460));
      } else {
        // Right handle: drag right (positive delta) shrinks right panel,
        // drag left (negative delta) expands it.
        setRightPanelWidth(clamp(startRight - delta, 260, 600));
      }
    };
    const handleMouseUp = () => {
      dragState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Load models
  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        const response = await fetch('/api/models');
        if (!response.ok) {
          throw new Error(`Failed to load models: ${response.status}`);
        }

        const data = (await response.json()) as { models?: string[]; default?: string };
        const models = data.models?.length ? data.models : [];
        const selected = data.default || models[0] || '';

        if (!isMounted) return;

        setAvailableModels(models);
        setCurrentModel(selected);
      } catch (error) {
        console.error('[Models] Failed to load:', error);
        if (!isMounted) return;
        setAvailableModels([]);
        setCurrentModel('');
      } finally {
        if (isMounted) {
          setIsLoadingModels(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  // Track the previous session ID to detect transitions (null → session, or session → session)
  const prevSessionIdRef = useRef<string | null>(null);

  // Load sessions for user — also triggers message load when session transitions
  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      try {
        const response = await authFetch(`/api/sessions?userId=${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error(`Failed to load sessions: ${response.status}`);

        const data = (await response.json()) as { sessions?: SessionMetadata[] };
        const loadedSessions = data.sessions || [];

        if (!isMounted) return;

        setSessions(loadedSessions);
        setIsLoadingSessions(false);

        // Auto-select default session if none stored
        const stored = getStoredSessionId();
        const targetId = (stored && loadedSessions.some((s) => s.id === stored))
          ? stored
          : loadedSessions.length > 0
            ? loadedSessions[0].id
            : null;

        if (targetId) {
          setCurrentSessionId(targetId);
          storeSessionId(targetId);
        }
      } catch (error) {
        console.error('[Sessions] Failed to load:', error);
        if (!isMounted) return;
        setIsLoadingSessions(false);
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Load messages whenever currentSessionId transitions to a new non-null value.
  // Using prevSessionIdRef ensures we only load on actual transitions (not stable renders).
  useEffect(() => {
    if (!currentSessionId || currentSessionId === prevSessionIdRef.current) return;
    prevSessionIdRef.current = currentSessionId;

    let isMounted = true;
    setIsLoadingMessages(true);

    const loadMessages = async () => {
      try {
        const response = await authFetch(
          `/api/sessions/${encodeURIComponent(currentSessionId)}/messages?userId=${encodeURIComponent(userId)}`
        );
        if (!response.ok) throw new Error(`Failed to load messages: ${response.status}`);

        const data = (await response.json()) as { messages?: ChatMessage[] };
        if (!isMounted) return;

        setMessages(data.messages || []);
        if (data.messages?.length) storeSessionMessages(currentSessionId, data.messages);
        if (data.messages?.length) storeSessionMessages(currentSessionId, data.messages);
        setIsLoadingMessages(false);
      } catch (error) {
        console.error('[Messages] Failed to load:', error);
        if (!isMounted) return;
        const local = getSessionMessages(currentSessionId);
        setMessages(local.length > 0 ? local : []);
        setIsLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [currentSessionId, userId]);

  // Switch session handler
  const handleSwitchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    storeSessionId(sessionId);
  }, []);

  // Persist messages to localStorage whenever they change — safety net for server failures
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;
    storeSessionMessages(currentSessionId, messages);
  }, [messages, currentSessionId]);

  // Create session handler
  const handleCreateSession = useCallback(async (name: string, purpose?: string) => {
    try {
      const response = await authFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, purpose }),
      });
      if (!response.ok) throw new Error(`Failed to create session: ${response.status}`);

      const data = (await response.json()) as { session?: SessionMetadata };
      if (data.session) {
        setSessions((prev) => [data.session!, ...prev]);
        setCurrentSessionId(data.session.id);
        storeSessionId(data.session.id);
      }
    } catch (error) {
      console.error('[Session] Create failed:', error);
    }
  }, [userId]);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="app-container">
      <Header
        userId={userId}
        displayName={displayName}
        sessions={sessions}
        currentSessionId={currentSessionId}
        isLoadingSessions={isLoadingSessions}
        onSwitchSession={handleSwitchSession}
        onCreateSession={handleCreateSession}
        onChangeUserId={handleChangeUserId}
        onSetDisplayName={handleSetDisplayName}
        onLogout={handleLogout}
        mode={mode}
        onModeChange={setMode}
      />
      {/* Grid layout shared across both modes; content panes differ */}
      <div
        className="app-body"
        style={{
          gridTemplateColumns: `${leftPanelWidth}px 8px calc(100vw - ${leftPanelWidth}px - ${rightPanelWidth}px - 16px) 8px ${rightPanelWidth}px`,
        }}
      >
        {mode === 'fa' ? (
          <FinancialAidWorkspace
            financialProfile={financialProfile}
            onFinancialProfileChange={setFinancialProfile}
            userId={userId}
            sessionId={currentSessionId}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
            availableModels={availableModels}
            currentModel={currentModel}
            onModelChange={setCurrentModel}
            isLoadingModels={isLoadingModels}
            onResizeHandleDrag={handleDragStart}
          />
        ) : (
          <>
            <aside className="sidebar">
              <div className="sidebar-copy">
                <p className="eyebrow">Student Snapshot</p>
                <h2>Give the advisor enough context to filter for fit, affordability, and admissions odds.</h2>
                <p>
                  Keep this lightweight. Even partial inputs help the recommendations lean on the loaded school
                  profiles and admissions insights.
                </p>
              </div>
              <ProfileCard profile={profile} onProfileChange={setProfile} />
            </aside>

            {/* Left resize handle — between sidebar and main */}
            <div
              className="resize-handle"
              onMouseDown={(e) => handleDragStart('left', e)}
              aria-label="Resize sidebar"
              role="separator"
            />

            <main className="main-content">
              <ChatPanel
                messages={messages}
                setMessages={setMessages}
                profile={profile}
                userId={userId}
                sessionId={currentSessionId}
                isStreaming={isStreaming}
                setIsStreaming={setIsStreaming}
                selectedSchool={selectedSchool}
                availableModels={availableModels}
                currentModel={currentModel}
                onModelChange={setCurrentModel}
                isLoadingModels={isLoadingModels}
                isLoadingMessages={isLoadingMessages}
              />
            </main>

            {/* Right resize handle — between main and right panel */}
            <div
              className="resize-handle"
              onMouseDown={(e) => handleDragStart('right', e)}
              aria-label="Resize right panel"
              role="separator"
            />

            <div className="right-panel-wrapper">
              {/* Horizontal tab bar — primary visible switcher inside the panel */}
              <div className="right-view-switcher" role="group" aria-label="Right panel view">
                <button
                  type="button"
                  className={`right-view-btn ${rightView === 'schools' ? 'active' : ''}`}
                  onClick={() => setRightView('schools')}
                  title="School Directory"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Schools
                </button>
                <button
                  type="button"
                  className={`right-view-btn ${rightView === 'essays' ? 'active' : ''}`}
                  onClick={() => setRightView('essays')}
                  title="Essay Writing"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  Essays
                </button>
                <button
                  type="button"
                  className={`right-view-btn ${rightView === 'summer' ? 'active' : ''}`}
                  onClick={() => setRightView('summer')}
                  title="Summer Programs"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  Summer
                </button>
              </div>

              {rightView === 'schools' ? (
                <SchoolDirectory
                  onSelectSchool={(name) => setSelectedSchool({ name, nonce: Date.now() })}
                />
              ) : rightView === 'essays' ? (
                <EssayPanel userId={userId} currentModel={currentModel} />
              ) : (
                <SummerProgramsPanel userId={userId} interests={profile.interests} budget={profile.budget} currentModel={currentModel} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
