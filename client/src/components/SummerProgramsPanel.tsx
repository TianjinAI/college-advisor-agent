/**
 * SummerProgramsPanel
 * Tabs: Browse | Tracker | Follow-thru
 * Browse: search + filter 21 programs, click to see detail, "Get AI Recommendations"
 * Tracker: user's applications + status management
 * Follow-thru: per-program reflection log + college recap
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SummerProgram {
  id: string;
  name: string;
  brand: string;
  discipline: string[];
  level: string;
  location: string;
  session_dates: string;
  duration_weeks: number;
  cost: { amount: number; notes: string };
  deadline: string;
  application_url: string;
  selectivity: 'extremely-competitive' | 'very-competitive' | 'competitive' | 'moderately-selective';
  cohort_size: number;
  parent_org: string;
  tags: string[];
  prerequisites: {
    grade_range: string;
    prior_knowledge: string[];
    application_requirements: string[];
  };
  essays: Array<{ prompt: string; word_limit: string; tips: string[] }>;
  featured: boolean;
  admissions_signal: 'strong-positive' | 'positive' | 'neutral' | 'mixed';
  outcomes: { college_impact: string; typical_results: string };
  what_they_look_for: string[];
  blurbs: { short: string; long: string };
  curriculum: string;
}

type ApplicationStatus = 'researching' | 'preparing' | 'applied' | 'waitlisted' | 'accepted' | 'declined' | 'rejected';

interface SummerApplication {
  programId: string;
  status: ApplicationStatus;
  notes: string;
  deadline_reminder: boolean;
  applied_at?: number;
  decision_received_at?: number;
  decision_status?: string;
  created_at?: number;
  updated_at?: number;
  program?: SummerProgram;
}

type FollowThruPhase = 'pre-program' | 'during' | 'post-program' | 'college-recap';

interface ReflectionEntry {
  date: string;
  phase: 'pre' | 'during' | 'post';
  content: string;
  key_takeaway: string;
  mood?: 'excited' | 'challenged' | 'glowing' | 'reflective';
}

interface CollegeRecapEntry {
  programId: string;
  how_it_affected: string;
  mentioned_in_essay: boolean;
  mentioned_in_interview: boolean;
  talking_points: string[];
}

interface SummerFollowThruSession {
  programId: string;
  phase: FollowThruPhase;
  goals: string[];
  reflection_log: ReflectionEntry[];
  college_recap?: CollegeRecapEntry;
  created_at?: number;
  updated_at?: number;
  program?: SummerProgram;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SIGNAL_COLORS: Record<string, string> = {
  'strong-positive': '#10b981',
  'positive': '#34d399',
  'neutral': '#f59e0b',
  'mixed': '#f87171',
};
const SIGNAL_LABELS: Record<string, string> = {
  'strong-positive': 'Strong +',
  'positive': 'Positive',
  'neutral': 'Neutral',
  'mixed': 'Mixed',
};
const SELECTIVITY_ORDER = ['moderately-selective', 'competitive', 'very-competitive', 'extremely-competitive'];
const STATUS_COLORS: Record<string, string> = {
  'researching': '#6b7280',
  'preparing': '#f59e0b',
  'applied': '#3b82f6',
  'waitlisted': '#8b5cf6',
  'accepted': '#10b981',
  'declined': '#6b7280',
  'rejected': '#ef4444',
};
const STATUS_LABELS: Record<string, string> = {
  'researching': 'Researching',
  'preparing': 'Preparing',
  'applied': 'Applied',
  'waitlisted': 'Waitlisted',
  'accepted': 'Accepted! 🎉',
  'declined': 'Declined',
  'rejected': 'Rejected',
};
const MOOD_COLORS: Record<string, string> = {
  'excited': '#fbbf24',
  'challenged': '#60a5fa',
  'glowing': '#34d399',
  'reflective': '#a78bfa',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Browse Tab ─────────────────────────────────────────────────────────────

function DisciplineFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (d: string[]) => void;
}) {
  const all = ['math', 'stem', 'cs', 'research', 'leadership', 'writing', 'humanities', 'general'];
  const labels: Record<string, string> = {
    math: 'Math', stem: 'STEM', cs: 'CS/AI', research: 'Research',
    leadership: 'Leadership', writing: 'Writing', humanities: 'Humanities', general: 'General',
  };
  const toggle = (d: string) => {
    if (selected.includes(d)) onChange(selected.filter(x => x !== d));
    else onChange([...selected, d]);
  };
  return (
    <div className="sp-filter-row">
      {all.map(d => (
        <button
          key={d}
          type="button"
          className={`sp-chip ${selected.includes(d) ? 'active' : ''}`}
          onClick={() => toggle(d)}
        >
          {labels[d]}
        </button>
      ))}
    </div>
  );
}

function ProgramCard({
  program,
  application,
  onSelect,
  onTrack,
}: {
  program: SummerProgram;
  application?: SummerApplication;
  onSelect: (p: SummerProgram) => void;
  onTrack: (p: SummerProgram) => void;
}) {
  const isFree = program.cost.amount === 0;
  const isTracked = !!application;
  const signalColor = SIGNAL_COLORS[program.admissions_signal] || '#6b7280';

  return (
    <div className={`sp-card ${isTracked ? 'tracked' : ''}`}>
      <div className="sp-card-header" onClick={() => onSelect(program)}>
        <div className="sp-card-top">
          <span className="sp-card-name">{program.name}</span>
          <div className="sp-card-badges">
            {isFree && <span className="sp-badge-free">Free</span>}
            <span
              className="sp-badge-signal"
              style={{ background: signalColor + '22', color: signalColor }}
            >
              {SIGNAL_LABELS[program.admissions_signal]}
            </span>
          </div>
        </div>
        <p className="sp-card-short">{program.blurbs.short}</p>
        <div className="sp-card-meta">
          <span>{program.discipline.slice(0, 2).join(', ')}</span>
          <span>·</span>
          <span>{program.selectivity.replace('-', ' ')}</span>
          <span>·</span>
          <span>{program.deadline}</span>
        </div>
      </div>
      <div className="sp-card-actions">
        {isTracked ? (
          <span className="sp-tracked-label" style={{ color: STATUS_COLORS[application.status] }}>
            ● {STATUS_LABELS[application.status]}
          </span>
        ) : (
          <button type="button" className="sp-track-btn" onClick={() => onTrack(program)}>
            + Track
          </button>
        )}
        <button type="button" className="sp-detail-btn" onClick={() => onSelect(program)}>
          Details →
        </button>
      </div>
    </div>
  );
}

function GetRecommendationsButton({
  userId,
  interests,
  budget,
  applications,
}: {
  userId: string;
  interests: string;
  budget: string;
  applications: SummerApplication[];
}) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [done, setDone] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const run = async () => {
    setLoading(true);
    setOutput('');
    setDone(false);

    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);
    wsRef.current = ws;

    ws.onopen = () => {
      const appliedStatus: Record<string, string> = {};
      for (const a of applications) appliedStatus[a.programId] = a.status;
      ws.send(JSON.stringify({
        type: 'summer_recommend',
        payload: {
          userId,
          interests: interests ? interests.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          budget: budget ? parseInt(budget) : undefined,
          application_status: JSON.stringify(appliedStatus),
        },
      }));
    };

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'summer_recommend_delta') {
        setOutput(prev => prev + (msg.payload.text || ''));
        if (msg.payload.done) setDone(true);
      }
      if (msg.type === 'summer_recommend_error') {
        setOutput(prev => prev + `\n\nError: ${msg.payload.text}`);
        setDone(true);
      }
    };

    ws.onerror = () => { setDone(true); setLoading(false); };
    ws.onclose = () => { setLoading(false); };
  };

  const stop = () => {
    wsRef.current?.close();
    setLoading(false);
  };

  return (
    <div className="sp-ai-rec">
      <button
        type="button"
        className="sp-ai-btn"
        onClick={loading ? stop : run}
      >
        {loading ? '⏹ Get AI Recommendations' : '✨ Get AI Recommendations'}
      </button>
      {output && (
        <div className="sp-ai-output">
          <div className="sp-ai-markdown">{output}</div>
          {done && <p className="sp-ai-done">— End of recommendations</p>}
        </div>
      )}
    </div>
  );
}

function BrowseTab({
  userId,
  interests,
  budget,
  onSelectProgram,
}: {
  userId: string;
  interests: string;
  budget: string;
  onSelectProgram: (p: SummerProgram) => void;
}) {
  const [programs, setPrograms] = useState<SummerProgram[]>([]);
  const [applications, setApplications] = useState<SummerApplication[]>([]);
  const [search, setSearch] = useState('');
  const [discipline, setDiscipline] = useState<string[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const [maxSelectivity, setMaxSelectivity] = useState(3); // index into SELECTIVITY_ORDER
  const [parentOrg, setParentOrg] = useState('');
  const [signal, setSignal] = useState('');
  const [loading, setLoading] = useState(true);

  const debouncedSearch = useDebounce(search, 200);

  useEffect(() => {
    Promise.all([
      fetch('/api/summer-programs').then(r => r.json()).catch(() => ({ programs: [] })),
      fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/applications`).then(r => r.json()).catch(() => ({ applications: [] })),
    ]).then(([data, appData]) => {
      setPrograms(data.programs || []);
      setApplications(appData.applications || []);
      setLoading(false);
    });
  }, [userId]);

  const getApp = (programId: string) => applications.find(a => a.programId === programId);

  const handleTrack = async (program: SummerProgram) => {
    try {
      const r = await fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId: program.id }),
      });
      if (r.ok) {
        const data = await r.json();
        setApplications(prev => [...prev.filter(a => a.programId !== program.id), data.application]);
      }
    } catch (_) { /* ignore */ }
  };

  const filtered = programs.filter(p => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.blurbs.short.toLowerCase().includes(q) &&
        !p.discipline.some(d => d.toLowerCase().includes(q)) &&
        !p.tags.some(t => t.toLowerCase().includes(q))
      ) return false;
    }
    if (discipline.length > 0 && !p.discipline.some(d => discipline.includes(d))) return false;
    if (freeOnly && p.cost.amount > 0) return false;
    if (SELECTIVITY_ORDER.indexOf(p.selectivity) > maxSelectivity) return false;
    if (parentOrg && p.parent_org !== parentOrg) return false;
    if (signal && p.admissions_signal !== signal) return false;
    return true;
  });

  return (
    <div className="sp-browse">
      <GetRecommendationsButton
        userId={userId}
        interests={interests}
        budget={budget}
        applications={applications}
      />

      <div className="sp-search-wrap">
        <input
          type="search"
          className="sp-search"
          placeholder="Search programs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <DisciplineFilter selected={discipline} onChange={setDiscipline} />

      <div className="sp-filter-row">
        <label className="sp-chip-checkbox">
          <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} />
          Free only
        </label>
        <select
          className="sp-select"
          value={parentOrg}
          onChange={e => setParentOrg(e.target.value)}
        >
          <option value="">All schools</option>
          {Array.from(new Set(programs.map(p => p.parent_org))).sort().map(org => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
        <select
          className="sp-select"
          value={maxSelectivity}
          onChange={e => setMaxSelectivity(Number(e.target.value))}
        >
          <option value={3}>All selectivity</option>
          <option value={2}>Moderately selective+</option>
          <option value={1}>Competitive+</option>
          <option value={0}>Very competitive+</option>
        </select>
        <select
          className="sp-select"
          value={signal}
          onChange={e => setSignal(e.target.value)}
        >
          <option value="">All signals</option>
          <option value="strong-positive">Strong +</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      <p className="sp-count">{filtered.length} programs</p>

      <div className="sp-card-list">
        {filtered.map(p => (
          <ProgramCard
            key={p.id}
            program={p}
            application={getApp(p.id)}
            onSelect={onSelectProgram}
            onTrack={handleTrack}
          />
        ))}
        {filtered.length === 0 && !loading && (
          <p className="sp-empty">No programs match your filters. Try broadening your search.</p>
        )}
      </div>
    </div>
  );
}

// ─── Tracker Tab ─────────────────────────────────────────────────────────────

function TrackerTab({ userId }: { userId: string }) {
  const [applications, setApplications] = useState<SummerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/applications`)
      .then(r => r.json())
      .then(d => { setApplications(d.applications || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (programId: string, status: ApplicationStatus) => {
    setUpdating(programId);
    try {
      await fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/applications/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      load();
    } finally {
      setUpdating(null);
    }
  };

  const remove = async (programId: string) => {
    if (!confirm('Remove this program from your tracker?')) return;
    await fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/applications/${programId}`, { method: 'DELETE' });
    load();
  };

  const STATUSES: ApplicationStatus[] = ['researching', 'preparing', 'applied', 'waitlisted', 'accepted', 'declined', 'rejected'];

  return (
    <div className="sp-tracker">
      {applications.length === 0 && !loading && (
        <p className="sp-empty">No programs tracked yet. Browse programs and click "Track" to add them.</p>
      )}
      {applications.map(app => {
        const statusColor = STATUS_COLORS[app.status] || '#6b7280';
        return (
          <div key={app.programId} className="sp-tracker-item">
            <div className="sp-tracker-header">
              <span className="sp-tracker-name">{app.program?.name || app.programId}</span>
              <span className="sp-tracker-status" style={{ color: statusColor }}>
                ● {STATUS_LABELS[app.status]}
              </span>
            </div>
            {app.program && (
              <div className="sp-tracker-meta">
                <span>{app.program.discipline.slice(0, 2).join(', ')}</span>
                <span>·</span>
                <span>Deadline: {app.program.deadline}</span>
                {app.program.cost.amount === 0 && <span>· Free</span>}
              </div>
            )}
            {app.notes && <p className="sp-tracker-notes">{app.notes}</p>}
            <div className="sp-tracker-controls">
              <select
                className="sp-select-small"
                value={app.status}
                onChange={e => updateStatus(app.programId, e.target.value as ApplicationStatus)}
                disabled={updating === app.programId}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <button type="button" className="sp-remove-btn" onClick={() => remove(app.programId)}>
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Follow-thru Tab ─────────────────────────────────────────────────────────

function FollowThruTab({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SummerFollowThruSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<FollowThruPhase>('pre-program');
  const [goals, setGoals] = useState('');
  const [reflectionContent, setReflectionContent] = useState('');
  const [keyTakeaway, setKeyTakeaway] = useState('');
  const [mood, setMood] = useState<ReflectionEntry['mood']>('excited');
  const [recapContent, setRecapContent] = useState('');
  const [talkingPoints, setTalkingPoints] = useState('');
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null); // programId

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/followthru`)
      .then(r => r.json())
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const createSession = async (programId: string) => {
    const goalsList = goals.split('\n').map(g => g.trim()).filter(Boolean);
    if (!goalsList.length) { alert('Enter at least one goal'); return; }
    const r = await fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/followthru/${programId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goals: goalsList }),
    });
    if (r.ok) { setShowCreateForm(null); setGoals(''); load(); }
  };

  const addReflection = async (programId: string) => {
    if (!reflectionContent.trim()) return;
    await fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/followthru/${programId}/reflection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        phase: activePhase === 'pre-program' ? 'pre' : activePhase === 'during' ? 'during' : 'post',
        content: reflectionContent,
        key_takeaway: keyTakeaway,
        mood,
      }),
    });
    setReflectionContent('');
    setKeyTakeaway('');
    load();
  };

  const saveRecap = async (programId: string) => {
    await fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/followthru/${programId}/recap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programId,
        how_it_affected: recapContent,
        mentioned_in_essay: false,
        mentioned_in_interview: false,
        talking_points: talkingPoints.split('\n').map(t => t.trim()).filter(Boolean),
      }),
    });
    load();
  };

  const PHASE_COLORS: Record<string, string> = {
    'pre-program': '#3b82f6',
    'during': '#f59e0b',
    'post-program': '#10b981',
    'college-recap': '#8b5cf6',
  };

  return (
    <div className="sp-followthru">
      {/* Accepted programs without follow-thru yet */}
      <AcceptedProgramsWithoutFollowThru
        userId={userId}
        onCreateClick={pid => setShowCreateForm(pid)}
        showCreateForm={showCreateForm}
        goals={goals}
        setGoals={setGoals}
        createSession={createSession}
      />

      {sessions.length === 0 && !loading && (
        <p className="sp-empty">
          Track programs and mark them as "Accepted" to start a follow-thru session.
        </p>
      )}

      {sessions.map(session => {
        const phaseColor = PHASE_COLORS[session.phase] || '#6b7280';
        return (
          <div key={session.programId} className="sp-ft-session">
            <div className="sp-ft-header">
              <span className="sp-ft-program">{session.program?.name || session.programId}</span>
              <span className="sp-ft-phase" style={{ background: phaseColor + '22', color: phaseColor }}>
                {session.phase.replace('-', ' ')}
              </span>
            </div>

            {/* Goals */}
            {session.goals.length > 0 && (
              <div className="sp-ft-section">
                <p className="sp-ft-label">Goals</p>
                <ul className="sp-ft-goals">
                  {session.goals.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}

            {/* Reflections */}
            {session.reflection_log.length > 0 && (
              <div className="sp-ft-section">
                <p className="sp-ft-label">Reflection Log</p>
                {session.reflection_log.map((r, i) => (
                  <div key={i} className="sp-ft-reflection">
                    <div className="sp-ft-reflect-header">
                      <span className="sp-ft-date">{r.date}</span>
                      <span className="sp-ft-reflect-phase">[{r.phase}]</span>
                      {r.mood && (
                        <span className="sp-ft-mood" style={{ color: MOOD_COLORS[r.mood] }}>
                          {r.mood}
                        </span>
                      )}
                    </div>
                    <p className="sp-ft-reflect-content">{r.content}</p>
                    {r.key_takeaway && (
                      <p className="sp-ft-takeaway">→ {r.key_takeaway}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* College Recap */}
            {session.college_recap && (
              <div className="sp-ft-section">
                <p className="sp-ft-label">College Recap</p>
                <p className="sp-ft-recap">{session.college_recap.how_it_affected}</p>
                {session.college_recap.talking_points.length > 0 && (
                  <div>
                    <p className="sp-ft-label">Talking Points</p>
                    <ul className="sp-ft-talking-points">
                      {session.college_recap.talking_points.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Phase tabs */}
            {session.phase !== 'college-recap' && (
              <div className="sp-ft-phases">
                {(['pre-program', 'during', 'post-program', 'college-recap'] as FollowThruPhase[]).map(phase => (
                  <button
                    key={phase}
                    type="button"
                    className={`sp-ft-phase-btn ${activePhase === phase ? 'active' : ''}`}
                    onClick={() => setActivePhase(phase)}
                  >
                    {phase.replace('-', ' ')}
                  </button>
                ))}
              </div>
            )}

            {/* Add reflection */}
            {session.phase !== 'college-recap' && (
              <div className="sp-ft-add-reflection">
                <textarea
                  className="sp-textarea"
                  placeholder="What happened? What did you learn?"
                  value={reflectionContent}
                  onChange={e => setReflectionContent(e.target.value)}
                  rows={3}
                />
                <input
                  type="text"
                  className="sp-input"
                  placeholder="One-sentence key takeaway"
                  value={keyTakeaway}
                  onChange={e => setKeyTakeaway(e.target.value)}
                />
                <div className="sp-ft-reflect-controls">
                  <select
                    className="sp-select-small"
                    value={mood || 'excited'}
                    onChange={e => setMood(e.target.value as ReflectionEntry['mood'])}
                  >
                    <option value="excited">Excited</option>
                    <option value="challenged">Challenged</option>
                    <option value="glowing">Glowing</option>
                    <option value="reflective">Reflective</option>
                  </select>
                  <button type="button" className="sp-save-btn" onClick={() => addReflection(session.programId)}>
                    Add Reflection
                  </button>
                </div>
              </div>
            )}

            {/* College recap form */}
            {session.phase === 'college-recap' && !session.college_recap && (
              <div className="sp-ft-add-reflection">
                <textarea
                  className="sp-textarea"
                  placeholder="How did this program affect your college applications, essay narrative, or interview talking points?"
                  value={recapContent}
                  onChange={e => setRecapContent(e.target.value)}
                  rows={3}
                />
                <textarea
                  className="sp-textarea"
                  placeholder="Talking points (one per line) — what will you mention in interviews or essays?"
                  value={talkingPoints}
                  onChange={e => setTalkingPoints(e.target.value)}
                  rows={2}
                />
                <button type="button" className="sp-save-btn" onClick={() => saveRecap(session.programId)}>
                  Save College Recap
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AcceptedProgramsWithoutFollowThru({
  userId,
  onCreateClick,
  showCreateForm,
  goals,
  setGoals,
  createSession,
}: {
  userId: string;
  onCreateClick: (pid: string) => void;
  showCreateForm: string | null;
  goals: string;
  setGoals: (v: string) => void;
  createSession: (pid: string) => void;
}) {
  const [accepted, setAccepted] = useState<SummerApplication[]>([]);

  useEffect(() => {
    fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/applications`)
      .then(r => r.json())
      .then(d => {
        const apps: SummerApplication[] = d.applications || [];
        setAccepted(apps.filter((a: SummerApplication) => a.status === 'accepted'));
      });
  }, [userId]);

  if (accepted.length === 0) return null;

  return (
    <div className="sp-accepted-prompt">
      <p className="sp-accepted-title">🎉 Accepted Programs</p>
      {accepted.map(app => {
        const isOpen = showCreateForm === app.programId;
        return (
          <div key={app.programId} className="sp-accepted-item">
            <div className="sp-accepted-row">
              <span>{app.program?.name || app.programId}</span>
              {!isOpen && (
                <button type="button" className="sp-start-ft-btn" onClick={() => onCreateClick(app.programId)}>
                  Start Follow-thru →
                </button>
              )}
            </div>
            {isOpen && (
              <div className="sp-ft-create-form">
                <p className="sp-ft-label">What do you want to get out of this program? (one goal per line)</p>
                <textarea
                  className="sp-textarea"
                  placeholder="e.g. Build deep friendships with math enthusiasts&#10;Learn number theory fundamentals&#10;Strengthen college narrative around intellectual curiosity"
                  value={goals}
                  onChange={e => setGoals(e.target.value)}
                  rows={4}
                />
                <div className="sp-ft-create-actions">
                  <button type="button" className="sp-save-btn" onClick={() => createSession(app.programId)}>
                    Create Follow-thru Session
                  </button>
                  <button type="button" className="sp-cancel-btn" onClick={() => onCreateClick('' as any)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Program Detail Modal ─────────────────────────────────────────────────────

function ProgramDetailModal({
  program,
  application,
  userId,
  onClose,
  onTrack,
}: {
  program: SummerProgram;
  application?: SummerApplication;
  userId: string;
  onClose: () => void;
  onTrack: (p: SummerProgram) => void;
}) {
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const signalColor = SIGNAL_COLORS[program.admissions_signal] || '#6b7280';

  const handleSaveNotes = async () => {
    if (!application) return;
    await fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/applications/${program.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="sp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sp-modal">
        <button type="button" className="sp-modal-close" onClick={onClose}>×</button>

        <div className="sp-modal-header">
          <h2 className="sp-modal-title">{program.name}</h2>
          <div className="sp-modal-badges">
            {program.cost.amount === 0 && <span className="sp-badge-free">Free</span>}
            <span className="sp-badge-signal" style={{ background: signalColor + '22', color: signalColor }}>
              {SIGNAL_LABELS[program.admissions_signal]} Signal
            </span>
            <span className="sp-badge-selectivity">{program.selectivity.replace('-', ' ')}</span>
          </div>
        </div>

        <p className="sp-modal-blurb">{program.blurbs.long}</p>

        <div className="sp-modal-grid">
          <div className="sp-modal-field">
            <span className="sp-field-label">Location</span>
            <span className="sp-field-value">{program.location}</span>
          </div>
          <div className="sp-modal-field">
            <span className="sp-field-label">Dates</span>
            <span className="sp-field-value">{program.session_dates}</span>
          </div>
          <div className="sp-modal-field">
            <span className="sp-field-label">Deadline</span>
            <span className="sp-field-value">{program.deadline}</span>
          </div>
          <div className="sp-modal-field">
            <span className="sp-field-label">Cost</span>
            <span className="sp-field-value">
              {program.cost.amount === 0 ? 'Free' : `$${program.cost.amount.toLocaleString()}`}
              {program.cost.notes ? ` — ${program.cost.notes}` : ''}
            </span>
          </div>
          <div className="sp-modal-field">
            <span className="sp-field-label">Cohort Size</span>
            <span className="sp-field-value">{program.cohort_size} students</span>
          </div>
          <div className="sp-modal-field">
            <span className="sp-field-label">Grade Level</span>
            <span className="sp-field-value">{program.prerequisites.grade_range}</span>
          </div>
        </div>

        <div className="sp-modal-section">
          <p className="sp-modal-section-title">What They Look For</p>
          <ul className="sp-modal-list">
            {program.what_they_look_for.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>

        <div className="sp-modal-section">
          <p className="sp-modal-section-title">Curriculum</p>
          <p className="sp-modal-text">{program.curriculum}</p>
        </div>

        <div className="sp-modal-section">
          <p className="sp-modal-section-title">Application Requirements</p>
          <ul className="sp-modal-list">
            {program.prerequisites.application_requirements.map((req, i) => <li key={i}>{req}</li>)}
          </ul>
        </div>

        {program.essays.length > 0 && (
          <div className="sp-modal-section">
            <p className="sp-modal-section-title">Essay Prompts</p>
            {program.essays.map((e, i) => (
              <div key={i} className="sp-modal-essay">
                <p className="sp-modal-essay-prompt">"{e.prompt}"</p>
                <p className="sp-modal-essay-limit">Word limit: {e.word_limit}</p>
                {e.tips.length > 0 && (
                  <ul className="sp-modal-list">
                    {e.tips.map((tip, j) => <li key={j}>{tip}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="sp-modal-section">
          <p className="sp-modal-section-title">College Admissions Impact</p>
          <p className="sp-modal-text">{program.outcomes.college_impact}</p>
          <p className="sp-modal-text">{program.outcomes.typical_results}</p>
        </div>

        {application ? (
          <div className="sp-modal-tracker">
            <p className="sp-modal-section-title">Your Tracker</p>
            <div className="sp-modal-tracker-row">
              <span style={{ color: STATUS_COLORS[application.status] }}>
                ● {STATUS_LABELS[application.status]}
              </span>
            </div>
            <textarea
              className="sp-textarea"
              placeholder="Your notes about this program..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
            <button type="button" className="sp-save-btn" onClick={handleSaveNotes}>
              {saved ? 'Saved ✓' : 'Save Notes'}
            </button>
          </div>
        ) : (
          <button type="button" className="sp-track-btn-large" onClick={() => onTrack(program)}>
            + Add to My Tracker
          </button>
        )}

        <a
          href={program.application_url}
          target="_blank"
          rel="noopener noreferrer"
          className="sp-apply-link"
        >
          Apply on program website →
        </a>
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface SummerProgramsPanelProps {
  userId: string;
  interests: string;
  budget: string;
}

export default function SummerProgramsPanel({ userId, interests, budget }: SummerProgramsPanelProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'tracker' | 'followthru'>('browse');
  const [selectedProgram, setSelectedProgram] = useState<SummerProgram | null>(null);
  const [applications, setApplications] = useState<SummerApplication[]>([]);

  const getApp = (pid: string) => applications.find(a => a.programId === pid);

  const handleTrack = async (program: SummerProgram) => {
    const r = await fetch(`/api/summer-programs/user/${encodeURIComponent(userId)}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId: program.id }),
    });
    if (r.ok) {
      const data = await r.json();
      setApplications(prev => [...prev.filter(a => a.programId !== program.id), data.application]);
    }
  };

  return (
    <>
      <div className="sp-tabs" role="tablist">
        <button
          role="tab"
          type="button"
          className={`sp-tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
          aria-selected={activeTab === 'browse'}
        >
          Browse
        </button>
        <button
          role="tab"
          type="button"
          className={`sp-tab ${activeTab === 'tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracker')}
          aria-selected={activeTab === 'tracker'}
        >
          Tracker
        </button>
        <button
          role="tab"
          type="button"
          className={`sp-tab ${activeTab === 'followthru' ? 'active' : ''}`}
          onClick={() => setActiveTab('followthru')}
          aria-selected={activeTab === 'followthru'}
        >
          Follow-thru
        </button>
      </div>

      <div className="sp-content">
        {activeTab === 'browse' && (
          <BrowseTab
            userId={userId}
            interests={interests}
            budget={budget}
            onSelectProgram={setSelectedProgram}
          />
        )}
        {activeTab === 'tracker' && <TrackerTab userId={userId} />}
        {activeTab === 'followthru' && <FollowThruTab userId={userId} />}
      </div>

      {selectedProgram && (
        <ProgramDetailModal
          program={selectedProgram}
          application={getApp(selectedProgram.id)}
          userId={userId}
          onClose={() => setSelectedProgram(null)}
          onTrack={handleTrack}
        />
      )}
    </>
  );
}
