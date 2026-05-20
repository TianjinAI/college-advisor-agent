import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { AdmissionStrategy, ChatMessage, SchoolStatus, StudentProfile, TargetSchool } from '../types';

const SCHOOL_NAMES = [
  'Amherst College', 'Bates College', 'Boston College', 'Bowdoin College', 'Brown',
  'Caltech', 'Cal Poly SLO', 'Carleton College', 'Carnegie Mellon', 'Claremont McKenna College',
  'Colby College', 'Colgate University', 'Columbia', 'Cornell', 'Dartmouth',
  'Duke', 'Emory', 'Georgetown', 'Georgia Tech', 'Grinnell College',
  'Hamilton College', 'Harvard', 'Harvey Mudd College', 'Haverford College', 'Johns Hopkins',
  'MIT', 'Middlebury College', 'NYU', 'Northeastern', 'Northwestern',
  'Oberlin College', 'Pomona College', 'Princeton', 'Purdue', 'RPI',
  'Rice', 'Rose-Hulman', 'Smith College', 'Stanford', 'Swarthmore College',
  'Tufts', 'UC Berkeley', 'UCLA', 'UChicago', 'Michigan',
  'Notre Dame', 'Penn', 'USC', 'Vanderbilt', 'Vassar College',
  'Virginia Tech', 'WashU', 'Wellesley College', 'Williams College', 'WPI',
  'Yale',
];

/* ─── School stats for semi-auto status ─── */
interface SchoolStat {
  admit: number;        // admit rate 0–100
  sat25: number;        // 25th percentile SAT (1600 scale)
  sat75: number;        // 75th percentile SAT
  act25: number;       // 25th percentile ACT
  act75: number;       // 75th percentile ACT
}

const SCHOOL_STATS: Record<string, SchoolStat> = {
  'Harvard':          { admit: 3,  sat25: 1460, sat75: 1580, act25: 33, act75: 36 },
  'Yale':             { admit: 5,  sat25: 1460, sat75: 1560, act25: 33, act75: 35 },
  'Princeton':        { admit: 4,  sat25: 1500, sat75: 1570, act25: 34, act75: 35 },
  'Columbia':         { admit: 4,  sat25: 1450, sat75: 1560, act25: 33, act75: 35 },
  'MIT':              { admit: 4,  sat25: 1500, sat75: 1570, act25: 34, act75: 36 },
  'Stanford':         { admit: 4,  sat25: 1470, sat75: 1560, act25: 33, act75: 35 },
  'Caltech':          { admit: 3,  sat25: 1530, sat75: 1580, act25: 35, act75: 36 },
  'UChicago':         { admit: 5,  sat25: 1490, sat75: 1570, act25: 33, act75: 35 },
  'Duke':             { admit: 6,  sat25: 1430, sat75: 1550, act25: 33, act75: 35 },
  'Northwestern':     { admit: 7,  sat25: 1410, sat75: 1540, act25: 32, act75: 35 },
  'Dartmouth':        { admit: 6,  sat25: 1420, sat75: 1560, act25: 32, act75: 35 },
  'Brown':            { admit: 5,  sat25: 1430, sat75: 1550, act25: 33, act75: 35 },
  'Cornell':          { admit: 7,  sat25: 1400, sat75: 1540, act25: 32, act75: 35 },
  'Penn':             { admit: 6,  sat25: 1440, sat75: 1560, act25: 33, act75: 35 },
  'Johns Hopkins':    { admit: 7,  sat25: 1420, sat75: 1550, act25: 33, act75: 35 },
  'Rice':             { admit: 8,  sat25: 1430, sat75: 1550, act25: 33, act75: 35 },
  'Vanderbilt':       { admit: 7,  sat25: 1410, sat75: 1530, act25: 33, act75: 35 },
  'Notre Dame':       { admit: 13, sat25: 1400, sat75: 1530, act25: 32, act75: 35 },
  'Georgetown':       { admit: 14, sat25: 1360, sat75: 1520, act25: 31, act75: 34 },
  'Emory':            { admit: 13, sat25: 1350, sat75: 1520, act25: 31, act75: 34 },
  'Tufts':            { admit: 14, sat25: 1370, sat75: 1520, act25: 31, act75: 34 },
  'Boston College':   { admit: 17, sat25: 1330, sat75: 1490, act25: 30, act75: 34 },
  'Northeastern':     { admit: 18, sat25: 1370, sat75: 1510, act25: 32, act75: 34 },
  'USC':              { admit: 10, sat25: 1410, sat75: 1540, act25: 32, act75: 35 },
  'UCLA':             { admit: 9,  sat25: 1290, sat75: 1490, act25: 29, act75: 34 },
  'UC Berkeley':      { admit: 12, sat25: 1300, sat75: 1530, act25: 29, act75: 35 },
  'Michigan':         { admit: 18, sat25: 1340, sat75: 1500, act25: 30, act75: 34 },
  'Carnegie Mellon':  { admit: 11, sat25: 1430, sat75: 1550, act25: 33, act75: 35 },
  'Georgia Tech':     { admit: 16, sat25: 1310, sat75: 1490, act25: 29, act75: 34 },
  'NYU':              { admit: 12, sat25: 1370, sat75: 1520, act25: 31, act75: 34 },
};

const STATUSES: SchoolStatus[] = ['Reach', 'Match', 'Safety'];
const STRATEGIES: AdmissionStrategy[] = ['ED', 'EA', 'REA', 'RD', ''];

/** Suggest Reach/Match/Safety based on student scores vs school stats */
function suggestStatus(schoolName: string, profile?: StudentProfile): '' | SchoolStatus {
  if (!profile) return '';
  const stats = SCHOOL_STATS[schoolName];
  if (!stats) return '';

  const studentStr = profile.sat_score?.trim();
  const studentAct = profile.act_score?.trim();

  // Need at least one test score to suggest
  let studentNum: number | null = null;
  if (studentStr) {
    studentNum = parseInt(studentStr, 10);
  }
  let studentActNum: number | null = null;
  if (studentAct) {
    studentActNum = parseInt(studentAct, 10);
  }
  if (studentNum == null && studentActNum == null) return '';

  // Use SAT if available, else ACT
  let below25 = false;
  let belowMid = false;
  let above75 = false;

  if (studentNum != null && studentNum > 0) {
    if (studentNum < stats.sat25) below25 = true;
    else if (studentNum >= stats.sat75) above75 = true;
    else if (studentNum < (stats.sat25 + stats.sat75) / 2) belowMid = true;
  }
  if (studentActNum != null && studentActNum > 0) {
    if (studentActNum < stats.act25) below25 = true;
    else if (studentActNum >= stats.act75) above75 = true;
    else if (studentActNum < (stats.act25 + stats.act75) / 2) belowMid = true;
  }

  // Ultra-low admit rate overrides
  if (stats.admit <= 6 && !above75) return 'Reach';

  if (below25) return 'Reach';
  if (above75) {
    // Score above 75th percentile — could be Safety for mid-tier schools
    return stats.admit <= 15 ? 'Match' : 'Safety';
  }
  if (belowMid) return 'Reach';
  // Between midpoint and 75th
  return stats.admit <= 10 ? 'Reach' : 'Match';
}

function statusTag(schoolName: string, profile?: StudentProfile): '' | string {
  const s = suggestStatus(schoolName, profile);
  if (!s) return '';
  if (s === 'Reach') return 'Reach — below school avg';
  if (s === 'Match') return 'Match — near school avg';
  return 'Safety — above school avg';
}

interface CollegeListPanelProps {
  targetSchools: TargetSchool[];
  onUpdate: (schools: TargetSchool[]) => void;
  messages: ChatMessage[];
  isLocked: boolean;
  onToggleLock: () => void;
  profile?: StudentProfile;
}

const createSchool = (name: string, sourceSessions: string[] = [], profile?: StudentProfile): TargetSchool => ({
  id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  name,
  intendedMajor: '',
  status: suggestStatus(name, profile),
  strategy: '',
  notes: '',
  locked: false,
  addedAt: Date.now(),
  sourceSessions,
});

const statusColor = (status: SchoolStatus): string => {
  if (status === 'Reach') return '#ef4444';
  if (status === 'Match') return '#f59e0b';
  if (status === 'Safety') return '#22c55e';
  return 'var(--text-dim)';
};

export default function CollegeListPanel({
  targetSchools,
  onUpdate,
  messages,
  isLocked,
  onToggleLock,
  profile,
}: CollegeListPanelProps) {
  const [manualQuery, setManualQuery] = useState('');
  const [manualMatches, setManualMatches] = useState<string[]>([]);
  const [foundSchools, setFoundSchools] = useState<string[]>([]);
  const [selectedFound, setSelectedFound] = useState<Set<string>>(new Set());
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const existingNames = useMemo(
    () => new Set(targetSchools.map((school) => school.name.toLowerCase())),
    [targetSchools],
  );

  const addSchools = (names: string[], sourceSessions: string[] = []) => {
    const uniqueNames = names.filter((name) => !existingNames.has(name.toLowerCase()));
    if (uniqueNames.length === 0) return;
    onUpdate([...targetSchools, ...uniqueNames.map((name) => createSchool(name, sourceSessions, profile))]);
  };

  const updateSchool = <K extends keyof TargetSchool>(id: string, field: K, value: TargetSchool[K]) => {
    onUpdate(targetSchools.map((school) => (
      school.id === id ? { ...school, [field]: value } : school
    )));
  };

  const removeSchool = (id: string) => {
    onUpdate(targetSchools.filter((school) => school.id !== id));
  };

  const handleScan = () => {
    const chatText = messages.map((message) => message.content).join('\n').toLowerCase();
    const detected = SCHOOL_NAMES.filter((name) => (
      chatText.includes(name.toLowerCase()) && !existingNames.has(name.toLowerCase())
    ));
    setFoundSchools(detected);
    setSelectedFound(new Set(detected));
    setShowFoundModal(true);
  };

  const handleManualSearch = () => {
    const query = manualQuery.trim().toLowerCase();
    if (!query) {
      setManualMatches([]);
      return;
    }
    setManualMatches(SCHOOL_NAMES.filter((name) => (
      name.toLowerCase().includes(query) && !existingNames.has(name.toLowerCase())
    )));
  };

  const toggleFound = (name: string) => {
    setSelectedFound((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const sourceSessions = Array.from(new Set(messages.map((message) => message.id)));

  return (
    <div className="profile-card" style={{ marginTop: 12 }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <p className="profile-kicker">My College List</p>
        <h3 style={{ margin: '2px 0 10px', color: 'var(--text)' }}>Target schools</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="secondary-btn" onClick={handleScan} disabled={isLocked}>Scan chat</button>
          <button
            type="button"
            onClick={onToggleLock}
            style={{ background: 'var(--accent)', color: '#111827', border: 'none', borderRadius: 8, padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}
          >
            {isLocked ? 'Unlock' : 'Lock'}
          </button>
        </div>
        {isLocked && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text)', background: 'rgba(245,158,11,0.08)', border: '1px solid var(--accent)', borderRadius: 8, padding: 8 }}>
            🔒 Locked — shared with FA
          </div>
        )}
      </div>

      <div className="profile-form" style={{ paddingTop: 12 }}>
        <div className="profile-field">
          <label htmlFor="college-list-manual">Add manually</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              id="college-list-manual"
              type="text"
              value={manualQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setManualQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch(); }}
              placeholder="Search school name"
              disabled={isLocked}
            />
            <button type="button" className="secondary-btn" onClick={handleManualSearch} disabled={isLocked}>Search</button>
          </div>
          {manualMatches.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {manualMatches.map((name) => (
                <button key={name} type="button" className="secondary-btn" onClick={() => addSchools([name])} disabled={isLocked}>{name}</button>
              ))}
            </div>
          )}
        </div>

        {targetSchools.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '10px 0' }}>
            No schools yet. Click Scan or Add to build your list.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {targetSchools.map((school) => (
              <div key={school.id} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text)' }}>{school.name}</strong>
                  <button type="button" onClick={() => removeSchool(school.id)} disabled={isLocked} aria-label={`Remove ${school.name}`} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 20, cursor: isLocked ? 'not-allowed' : 'pointer' }}>×</button>
                </div>
                <input type="text" value={school.intendedMajor} onChange={(e) => updateSchool(school.id, 'intendedMajor', e.target.value)} placeholder="Intended major" disabled={isLocked} style={{ marginTop: 6 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                  <div>
                    <select value={school.status} onChange={(e) => updateSchool(school.id, 'status', e.target.value as SchoolStatus)} disabled={isLocked} style={{ color: statusColor(school.status), fontWeight: 700, width: '100%' }}>
                      <option value="">Status</option>
                      {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    {school.status && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.3 }}>
                        {statusTag(school.name, profile)}
                      </div>
                    )}
                  </div>
                  <select value={school.strategy} onChange={(e) => updateSchool(school.id, 'strategy', e.target.value as AdmissionStrategy)} disabled={isLocked} style={{ width: '100%' }}>
                    {STRATEGIES.map((strategy) => <option key={strategy || 'none'} value={strategy}>{strategy || '—'}</option>)}
                  </select>
                </div>
                <button type="button" className="secondary-btn" onClick={() => setExpandedNotes((current) => { const next = new Set(current); if (next.has(school.id)) next.delete(school.id); else next.add(school.id); return next; })} style={{ marginTop: 6, fontSize: 12 }}>
                  {expandedNotes.has(school.id) ? 'Hide notes' : 'Notes'}
                </button>
                {expandedNotes.has(school.id) && (
                  <input type="text" value={school.notes} onChange={(e) => updateSchool(school.id, 'notes', e.target.value)} placeholder="Notes" disabled={isLocked} style={{ marginTop: 6 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showFoundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, width: 320, maxWidth: '90vw' }}>
            <h3 style={{ marginTop: 0 }}>Found in chat</h3>
            {foundSchools.length === 0 ? <p style={{ color: 'var(--text-dim)' }}>No new schools found.</p> : foundSchools.map((name) => (
              <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input type="checkbox" checked={selectedFound.has(name)} onChange={() => toggleFound(name)} />
                <span style={{ flex: 1, color: 'var(--text)' }}>{name}</span>
                <button
                  type="button"
                  className="school-add-btn"
                  onClick={() => addSchools([name], sourceSessions)}
                  aria-label={`Add ${name} to list`}
                  title="Add to list"
                >
                  +
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button type="button" className="secondary-btn" onClick={() => setShowFoundModal(false)}>Cancel</button>
              <button type="button" className="secondary-btn" onClick={() => { addSchools(Array.from(selectedFound), sourceSessions); setShowFoundModal(false); }} disabled={foundSchools.length === 0}>Add selected</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
