import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import ProfileCard from './components/ProfileCard';
import ChatPanel from './components/ChatPanel';
import SchoolDirectory from './components/SchoolDirectory';
import type { StudentProfile, ChatMessage, SchoolSelection, SessionMetadata } from './types';

const USER_ID_STORAGE_KEY = 'college-advisor-user-id';
const SESSION_ID_STORAGE_KEY = 'college-advisor-session-id';

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
  awards_honors: '',
  hooks: [],
  school_type: '',
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

function storeSessionId(sessionId: string | null): void {
  if (typeof window === 'undefined') return;
  if (sessionId) {
    window.localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } else {
    window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
  }
}

export default function App() {
  const [profile, setProfile] = useState<StudentProfile>(defaultProfile);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolSelection | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [userId, setUserId] = useState(getOrCreateUserId);
  const [displayName, setDisplayName] = useState('');

  // Fetch display name on mount / userId change
  useEffect(() => {
    let isMounted = true;
    const fetchName = async () => {
      try {
        const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
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
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, displayName: name }),
      });
    } catch { /* ignore */ }
  }, [userId]);

  // Session state
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(getStoredSessionId);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

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

  // Load sessions for user
  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      try {
        const response = await fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error(`Failed to load sessions: ${response.status}`);

        const data = (await response.json()) as { sessions?: SessionMetadata[] };
        const loadedSessions = data.sessions || [];

        if (!isMounted) return;

        setSessions(loadedSessions);
        setIsLoadingSessions(false);

        // Auto-select default session if none stored
        const stored = getStoredSessionId();
        if (stored && loadedSessions.some((s) => s.id === stored)) {
          setCurrentSessionId(stored);
        } else if (loadedSessions.length > 0) {
          const defaultId = loadedSessions[0].id;
          setCurrentSessionId(defaultId);
          storeSessionId(defaultId);
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

  // Load messages when session changes
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    const loadMessages = async () => {
      try {
        const response = await fetch(
          `/api/sessions/${encodeURIComponent(currentSessionId)}/messages?userId=${encodeURIComponent(userId)}`
        );
        if (!response.ok) throw new Error(`Failed to load messages: ${response.status}`);

        const data = (await response.json()) as { messages?: ChatMessage[] };
        if (!isMounted) return;

        setMessages(data.messages || []);
        setIsLoadingMessages(false);
      } catch (error) {
        console.error('[Messages] Failed to load:', error);
        if (!isMounted) return;
        setMessages([]);
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

  // Create session handler
  const handleCreateSession = useCallback(async (name: string, purpose?: string) => {
    try {
      const response = await fetch('/api/sessions', {
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
      />
      <div className="app-body">
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
        <SchoolDirectory
          onSelectSchool={(name) => setSelectedSchool({ name, nonce: Date.now() })}
        />
      </div>
    </div>
  );
}
