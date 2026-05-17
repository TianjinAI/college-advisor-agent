import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { AdmissionStrategy, ChatMessage, SchoolStatus, TargetSchool } from '../types';

const SCHOOL_NAMES = [
  'Harvard', 'Yale', 'Princeton', 'Columbia', 'MIT', 'Stanford', 'Caltech', 'UChicago',
  'Duke', 'Northwestern', 'Dartmouth', 'Brown', 'Cornell', 'Penn', 'Johns Hopkins',
  'Rice', 'Vanderbilt', 'Notre Dame', 'Georgetown', 'Emory', 'Tufts', 'Boston College',
  'Northeastern', 'USC', 'UCLA', 'UC Berkeley', 'Michigan', 'Carnegie Mellon',
  'Georgia Tech', 'NYU',
];

const STATUSES: SchoolStatus[] = ['Reach', 'Match', 'Safety'];
const STRATEGIES: AdmissionStrategy[] = ['ED', 'EA', 'REA', 'RD', ''];

interface CollegeListPanelProps {
  targetSchools: TargetSchool[];
  onUpdate: (schools: TargetSchool[]) => void;
  messages: ChatMessage[];
  isLocked: boolean;
  onToggleLock: () => void;
}

const createSchool = (name: string, sourceSessions: string[] = []): TargetSchool => ({
  id: crypto.randomUUID(),
  name,
  intendedMajor: '',
  status: '',
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
    onUpdate([...targetSchools, ...uniqueNames.map((name) => createSchool(name, sourceSessions))]);
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
                  <select value={school.status} onChange={(e) => updateSchool(school.id, 'status', e.target.value as SchoolStatus)} disabled={isLocked} style={{ color: statusColor(school.status), fontWeight: 700 }}>
                    <option value="">Status</option>
                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <select value={school.strategy} onChange={(e) => updateSchool(school.id, 'strategy', e.target.value as AdmissionStrategy)} disabled={isLocked}>
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
              <label key={name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input type="checkbox" checked={selectedFound.has(name)} onChange={() => toggleFound(name)} />
                {name}
              </label>
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
