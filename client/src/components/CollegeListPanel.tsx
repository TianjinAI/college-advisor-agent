import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { AdmissionStrategy, ApplicationPortal, DeadlineType, TestPolicy, PriorityLevel, OwnerType, ChatMessage, SchoolStatus, StudentProfile, TargetSchool } from '../types';
import CollegeListExport from './CollegeListExport';

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
  admit: number;
  sat25: number;
  sat75: number;
  act25: number;
  act75: number;
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

const STRATEGIES: AdmissionStrategy[] = ['ED', 'EA', 'REA', 'RD', ''];

/* ─── Group labels ─── */
const GROUP_META: Record<string, { label: string; color: string; bg: string }> = {
  Reach:     { label: 'Reach',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  Match:     { label: 'Match',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  Safety:    { label: 'Safety',    color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  Unassigned:{ label: 'Unassigned',color: '#6b7280', bg: 'rgba(107,114,128,0.06)' },
};

/* ─── Helpers ─── */

function suggestStatus(schoolName: string, profile?: StudentProfile): '' | SchoolStatus {
  if (!profile) return '';
  const stats = SCHOOL_STATS[schoolName];
  if (!stats) return '';

  const studentStr = profile.sat_score?.trim();
  const studentAct = profile.act_score?.trim();

  let studentNum: number | null = null;
  if (studentStr) studentNum = parseInt(studentStr, 10);
  let studentActNum: number | null = null;
  if (studentAct) studentActNum = parseInt(studentAct, 10);
  if (studentNum == null && studentActNum == null) return '';

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

  if (stats.admit <= 6 && !above75) return 'Reach';
  if (below25) return 'Reach';
  if (above75) return stats.admit <= 15 ? 'Match' : 'Safety';
  if (belowMid) return 'Reach';
  return stats.admit <= 10 ? 'Reach' : 'Match';
}

type ReadinessLevel = 'ready' | 'needs-strategy' | 'needs-deadline' | 'incomplete' | 'needs-work';

function getReadinessStatus(school: TargetSchool): ReadinessLevel {
  const hasStatus = school.status !== '';
  const hasStrategy = school.strategy !== '';
  const hasDeadline = !!school.applicationDeadline;
  const hasMajor = !!school.intendedMajor;

  if (!hasStrategy && !hasDeadline) return 'incomplete';
  if (!hasStrategy) return 'needs-strategy';
  if (!hasDeadline) return 'needs-deadline';

  if (!(hasStatus && hasMajor)) return 'incomplete';

  const missingOptional = !school.supplementalEssayCount
    || !school.recommendedSuggesters?.length
    || !school.nextAction;

  if (missingOptional) return 'needs-work';
  return 'ready';
}

const READINESS_CONFIG: Record<ReadinessLevel, { label: string; icon: string; color: string }> = {
  'ready':          { label: 'Ready',        icon: '✅', color: '#22c55e' },
  'needs-strategy': { label: 'Need strategy',icon: '⚠️', color: '#f59e0b' },
  'needs-deadline': { label: 'Need deadline',icon: '⚠️', color: '#f59e0b' },
  'incomplete':     { label: 'Incomplete',   icon: '⚠️', color: '#ef4444' },
  'needs-work':     { label: 'Needs work',   icon: '🔄', color: '#f59e0b' },
};

interface GroupedSchools {
  group: string;
  schools: TargetSchool[];
}

function sortByDeadline(schools: TargetSchool[]): TargetSchool[] {
  return [...schools].sort((a, b) => {
    if (a.applicationDeadline && b.applicationDeadline) {
      return a.applicationDeadline.localeCompare(b.applicationDeadline);
    }
    if (a.applicationDeadline) return -1;
    if (b.applicationDeadline) return 1;
    return 0;
  });
}

function groupSchoolsByStatus(schools: TargetSchool[]): GroupedSchools[] {
  const groups: Record<string, TargetSchool[]> = { Reach: [], Match: [], Safety: [], Unassigned: [] };
  for (const s of schools) {
    const key = s.status && GROUP_META[s.status] ? s.status : 'Unassigned';
    groups[key].push(s);
  }
  return [
    { group: 'Reach', schools: sortByDeadline(groups.Reach) },
    { group: 'Match', schools: sortByDeadline(groups.Match) },
    { group: 'Safety', schools: sortByDeadline(groups.Safety) },
    { group: 'Unassigned', schools: sortByDeadline(groups.Unassigned) },
  ].filter(g => g.schools.length > 0);
}

function getWarnings(schools: TargetSchool[], groups: GroupedSchools[]): string[] {
  const warnings: string[] = [];
  const total = schools.length;
  if (total === 0) return warnings;

  const reachCount = groups.find(g => g.group === 'Reach')?.schools.length ?? 0;
  const matchCount = groups.find(g => g.group === 'Match')?.schools.length ?? 0;
  const safetyCount = groups.find(g => g.group === 'Safety')?.schools.length ?? 0;

  if (reachCount > 0 && reachCount / total > 0.5) {
    warnings.push(`⚠️ Your list leans heavy on reaches — try to keep reaches under half your total.`);
  }
  if (matchCount + safetyCount < 2) {
    warnings.push(`⚠️ Consider adding 2-3 Match/Safety schools to build a balanced list.`);
  }
  const noStrategy = schools.filter(s => !s.strategy).length;
  if (noStrategy > 0) {
    warnings.push(`⚠️ ${noStrategy} school${noStrategy > 1 ? 's' : ''} missing an application strategy. Pick ED/EA/RD for each.`);
  }
  const noDeadline = schools.filter(s => !s.applicationDeadline).length;
  if (noDeadline > 0) {
    warnings.push(`⚠️ ${noDeadline} school${noDeadline > 1 ? 's' : ''} have no deadline set.`);
  }
  const cssSchools = schools.filter(s => s.cssProfileRequired).map(s => s.name);
  if (cssSchools.length > 0) {
    const names = cssSchools.length <= 3 ? cssSchools.join(', ') : `${cssSchools.length} schools`;
    warnings.push(`⚠️ ${names} require${cssSchools.length === 1 ? 's' : ''} CSS Profile — check FA deadlines.`);
  }
  return warnings;
}

/* ─── Create school ─── */

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
  appNarrative: '',
  recommendedSuggesters: [],
});

const statusColor = (status: SchoolStatus): string => {
  if (status === 'Reach') return '#ef4444';
  if (status === 'Match') return '#f59e0b';
  if (status === 'Safety') return '#22c55e';
  return 'var(--text-dim)';
};

/* ─── Detail field renderers ─── */

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{children}</div>
    </div>
  );
}

/* ─── Props ─── */

interface CollegeListPanelProps {
  targetSchools: TargetSchool[];
  onUpdate: (schools: TargetSchool[]) => void;
  messages: ChatMessage[];
  isLocked: boolean;
  onToggleLock: () => void;
  lockedAt: number;
  profile?: StudentProfile;
  displayName?: string;
}

/* ─── Main Component ─── */

export default function CollegeListPanel({
  targetSchools,
  onUpdate,
  messages,
  isLocked,
  lockedAt,
  onToggleLock,
  profile,
  displayName,
}: CollegeListPanelProps) {
  const [manualQuery, setManualQuery] = useState('');
  const [manualMatches, setManualMatches] = useState<string[]>([]);
  const [foundSchools, setFoundSchools] = useState<string[]>([]);
  const [selectedFound, setSelectedFound] = useState<Set<string>>(new Set());
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [showExport, setShowExport] = useState(false);

  const existingNames = useMemo(
    () => new Set(targetSchools.map((school) => school.name.toLowerCase())),
    [targetSchools],
  );

  const grouped = useMemo(() => groupSchoolsByStatus(targetSchools), [targetSchools]);
  const warnings = useMemo(() => getWarnings(targetSchools, grouped), [targetSchools, grouped]);

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

  const toggleDetails = (id: string) => {
    setExpandedDetails((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sourceSessions = Array.from(new Set(messages.map((message) => message.id)));

  const total = targetSchools.length;
  const readyCount = targetSchools.filter(s => getReadinessStatus(s) === 'ready').length;

  /* ─── Lock timestamp formatting ─── */
  const lockTs = useMemo(() => {
    // lockedAt > 0 means we have a real server-persisted timestamp
    if (isLocked && lockedAt > 0) {
      return new Date(lockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return '';
  }, [isLocked, lockedAt]);

  return (
    <div className="profile-card" style={{ marginTop: 12 }}>
      {/* ─── Header toolbar ─── */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <p className="profile-kicker">My College List</p>
        <h3 style={{ margin: '2px 0 10px', color: 'var(--text)' }}>
          Target schools {total > 0 && <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-dim)' }}>— {total} total</span>}
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="secondary-btn" onClick={handleScan} disabled={isLocked}>Scan chat</button>
          <button
            type="button"
            onClick={onToggleLock}
            style={{ background: isLocked ? 'rgba(245,158,11,0.15)' : 'var(--accent)', color: isLocked ? '#f59e0b' : '#111827', border: isLocked ? '1px solid rgba(245,158,11,0.3)' : 'none', borderRadius: 8, padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}
          >
            {isLocked ? '🔒 Unlock' : 'Lock list'}
          </button>
          {total > 0 && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setShowExport(true)}
              title="Export / Print college list"
            >
              📄 Export / Print
            </button>
          )}
        </div>
        {isLocked && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid var(--accent)', borderRadius: 8, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              🔒 Locked — ready for FA review
              {lockTs && <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>· {lockTs}</span>}
            </span>
          </div>
        )}
        {total > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>
            {readyCount}/{total} schools complete
          </div>
        )}
      </div>

      <div className="profile-form" style={{ paddingTop: 12 }}>
        {/* ─── Add manually ─── */}
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

        {/* ─── Empty state ─── */}
        {targetSchools.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '10px 0' }}>
            No schools yet. Click Scan or Add to build your list.
          </div>
        ) : (
          <div>
            {/* ─── Balance warnings ─── */}
            {warnings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{
                    fontSize: 12, lineHeight: 1.4, color: '#92400e',
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 8, padding: '6px 10px',
                  }}>
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* ─── Grouped sections ─── */}
            {grouped.map(({ group, schools: groupSchools }) => {
              const meta = GROUP_META[group] || GROUP_META.Unassigned;
              return (
                <div key={group} style={{ marginBottom: 16 }}>
                  {/* Group header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', marginBottom: 8,
                    background: meta.bg, borderRadius: 8,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: meta.color, color: '#fff', borderRadius: 10,
                      minWidth: 20, height: 20, fontSize: 11, fontWeight: 700, padding: '0 6px',
                    }}>
                      {groupSchools.length}
                    </span>
                  </div>

                  {/* School cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {groupSchools.map((school) => {
                      const readiness = getReadinessStatus(school);
                      const rc = READINESS_CONFIG[readiness];
                      const isExpanded = expandedDetails.has(school.id);
                      const editable = !isLocked;
                      return (
                        <div key={school.id} style={{
                          background: 'var(--bg-soft)', border: '1px solid var(--border)',
                          borderRadius: 10, padding: 10,
                        }}>
                          {/* ── Row 1: Name + status + readiness + remove ── */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                              <strong style={{ color: 'var(--text)', fontSize: 14 }}>{school.name}</strong>
                              {school.status && (
                                <span style={{
                                  display: 'inline-block', fontSize: 10, fontWeight: 700,
                                  color: statusColor(school.status), background: `${statusColor(school.status)}18`,
                                  padding: '2px 6px', borderRadius: 4, lineHeight: 1.4,
                                }}>
                                  {school.status}
                                </span>
                              )}
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                fontSize: 11, fontWeight: 600, color: rc.color, lineHeight: 1.4,
                              }}>
                                {rc.icon} {rc.label}
                              </span>
                            </div>
                            <button type="button" onClick={() => removeSchool(school.id)} disabled={isLocked}
                              aria-label={`Remove ${school.name}`}
                              style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 20, cursor: isLocked ? 'not-allowed' : 'pointer', lineHeight: 1, padding: 0 }}
                            >×</button>
                          </div>

                          {/* ── Row 2: Major, Strategy, Deadline ── */}
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {editable ? (
                              <input type="text" value={school.intendedMajor}
                                onChange={(e) => updateSchool(school.id, 'intendedMajor', e.target.value)}
                                placeholder="Major" disabled={isLocked}
                                style={{ flex: 1, minWidth: 120, fontSize: 12 }}
                              />
                            ) : school.intendedMajor ? (
                              <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1, minWidth: 120 }}>
                                Major: {school.intendedMajor}
                              </span>
                            ) : null}

                            {editable ? (
                              <select value={school.strategy}
                                onChange={(e) => updateSchool(school.id, 'strategy', e.target.value as AdmissionStrategy)}
                                disabled={isLocked} style={{ width: 80, fontSize: 12 }}
                              >
                                {STRATEGIES.map((strategy) => (
                                  <option key={strategy || 'none'} value={strategy}>{strategy || '—'}</option>
                                ))}
                              </select>
                            ) : school.strategy ? (
                              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{school.strategy}</span>
                            ) : null}

                            {editable ? (
                              <input type="text" value={school.applicationDeadline ?? ''}
                                onChange={(e) => updateSchool(school.id, 'applicationDeadline', e.target.value)}
                                placeholder="Deadline" disabled={isLocked}
                                style={{ width: 100, fontSize: 12 }}
                              />
                            ) : school.applicationDeadline ? (
                              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                Deadline: {school.applicationDeadline}
                              </span>
                            ) : null}
                          </div>

                          {/* ── Row 3: More details toggle ── */}
                          <button type="button" className="secondary-btn"
                            onClick={() => toggleDetails(school.id)}
                            style={{ marginTop: 8, fontSize: 12 }}
                          >
                            {isExpanded ? 'Hide details ▲' : 'More details ▼'}
                          </button>

                          {/* ── Details drawer ── */}
                          {isExpanded && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                              {/* Notes */}
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
                                {editable ? (
                                  <input type="text" value={school.notes} onChange={(e) => updateSchool(school.id, 'notes', e.target.value)} placeholder="General notes" disabled={isLocked} style={{ width: '100%', fontSize: 12 }} />
                                ) : (
                                  <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.notes || '—'}</div>
                                )}
                              </div>

                              {/* Application Narrative */}
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Application Narrative <span style={{ fontWeight: 400, textTransform: 'none' }}>— how will you tell this school's story?</span>
                                </label>
                                {editable ? (
                                  <textarea value={school.appNarrative ?? ''}
                                    onChange={(e) => updateSchool(school.id, 'appNarrative', e.target.value)}
                                    placeholder="How will you tell this school's story in your essays?"
                                    disabled={isLocked} rows={3}
                                    style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontSize: 12 }}
                                  />
                                ) : (
                                  <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.appNarrative || '—'}</div>
                                )}
                              </div>

                              {/* Recommenders */}
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Recommend Letter Suggesters <span style={{ fontWeight: 400, textTransform: 'none' }}>— who could write strong letters?</span>
                                </label>
                                {editable ? (
                                  <input type="text" value={(school.recommendedSuggesters ?? []).join(', ')}
                                    onChange={(e) => updateSchool(school.id, 'recommendedSuggesters', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                    placeholder="e.g. Math teacher, Research mentor" disabled={isLocked}
                                    style={{ width: '100%', fontSize: 12 }}
                                  />
                                ) : (
                                  <div style={{ fontSize: 12, color: 'var(--text)' }}>{(school.recommendedSuggesters ?? []).join(', ') || '—'}</div>
                                )}
                              </div>

                              {/* ── Application details ── */}
                              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                                <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Application Details</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Portal</label>
                                    {editable ? (
                                      <select value={school.applicationPortal ?? ''}
                                        onChange={(e) => updateSchool(school.id, 'applicationPortal', e.target.value as ApplicationPortal)}
                                        disabled={isLocked} style={{ width: '100%', fontSize: 12 }}
                                      >
                                        <option value="">—</option>
                                        <option value="Common App">Common App</option>
                                        <option value="Coalition">Coalition</option>
                                        <option value="UC">UC</option>
                                        <option value="School Portal">School Portal</option>
                                        <option value="Other">Other</option>
                                      </select>
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.applicationPortal || '—'}</div>
                                    )}
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Deadline Type</label>
                                    {editable ? (
                                      <select value={school.deadlineType ?? ''}
                                        onChange={(e) => updateSchool(school.id, 'deadlineType', e.target.value as DeadlineType)}
                                        disabled={isLocked} style={{ width: '100%', fontSize: 12 }}
                                      >
                                        <option value="">—</option>
                                        <option value="ED">ED</option>
                                        <option value="EA">EA</option>
                                        <option value="REA">REA</option>
                                        <option value="RD">RD</option>
                                        <option value="Rolling">Rolling</option>
                                        <option value="Priority">Priority</option>
                                      </select>
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.deadlineType || '—'}</div>
                                    )}
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Test Policy</label>
                                    {editable ? (
                                      <select value={school.testPolicy ?? ''}
                                        onChange={(e) => updateSchool(school.id, 'testPolicy', e.target.value as TestPolicy)}
                                        disabled={isLocked} style={{ width: '100%', fontSize: 12 }}
                                      >
                                        <option value="">—</option>
                                        <option value="Required">Required</option>
                                        <option value="Optional">Optional</option>
                                        <option value="Blind">Blind</option>
                                        <option value="Flexible">Flexible</option>
                                        <option value="Unknown">Unknown</option>
                                      </select>
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.testPolicy || '—'}</div>
                                    )}
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Portfolio</label>
                                    {editable ? (
                                      <select value={school.portfolioRequired ? 'yes' : school.portfolioRequired === false ? 'no' : ''}
                                        onChange={(e) => updateSchool(school.id, 'portfolioRequired', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : undefined)}
                                        disabled={isLocked} style={{ width: '100%', fontSize: 12 }}
                                      >
                                        <option value="">—</option>
                                        <option value="yes">Required</option>
                                        <option value="no">Not required</option>
                                      </select>
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.portfolioRequired === true ? 'Required' : school.portfolioRequired === false ? 'Not required' : '—'}</div>
                                    )}
                                  </div>
                                  <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Supplemental Essays</label>
                                    {editable ? (
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <input type="text" value={school.supplementalEssayCount ?? ''}
                                          onChange={(e) => updateSchool(school.id, 'supplementalEssayCount', e.target.value)}
                                          placeholder="Count" disabled={isLocked}
                                          style={{ width: 60, fontSize: 12 }}
                                        />
                                        <input type="text" value={school.supplementalEssayNotes ?? ''}
                                          onChange={(e) => updateSchool(school.id, 'supplementalEssayNotes', e.target.value)}
                                          placeholder="Notes / prompts" disabled={isLocked}
                                          style={{ flex: 1, fontSize: 12 }}
                                        />
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>
                                        {school.supplementalEssayCount ? `${school.supplementalEssayCount} essay${school.supplementalEssayCount !== '1' ? 's' : ''}` : ''}
                                        {school.supplementalEssayCount && school.supplementalEssayNotes ? ' — ' : ''}
                                        {school.supplementalEssayNotes || '—'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* ── Priority & Ownership ── */}
                              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                                <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority & Ownership</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Priority</label>
                                    {editable ? (
                                      <select value={school.priority ?? ''}
                                        onChange={(e) => updateSchool(school.id, 'priority', e.target.value as PriorityLevel)}
                                        disabled={isLocked} style={{ width: '100%', fontSize: 12 }}
                                      >
                                        <option value="">—</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                      </select>
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.priority || '—'}</div>
                                    )}
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Owner</label>
                                    {editable ? (
                                      <select value={school.owner ?? ''}
                                        onChange={(e) => updateSchool(school.id, 'owner', e.target.value as OwnerType)}
                                        disabled={isLocked} style={{ width: '100%', fontSize: 12 }}
                                      >
                                        <option value="">—</option>
                                        <option value="Student">Student</option>
                                        <option value="Parent">Parent</option>
                                        <option value="Counselor">Counselor</option>
                                        <option value="Recommender">Recommender</option>
                                      </select>
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.owner || '—'}</div>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Next Action</label>
                                    {editable ? (
                                      <input type="text" value={school.nextAction ?? ''}
                                        onChange={(e) => updateSchool(school.id, 'nextAction', e.target.value)}
                                        placeholder="e.g. Request transcript" disabled={isLocked}
                                        style={{ width: '100%', fontSize: 12 }}
                                      />
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.nextAction || '—'}</div>
                                    )}
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Due Date</label>
                                    {editable ? (
                                      <input type="text" value={school.nextActionDueDate ?? ''}
                                        onChange={(e) => updateSchool(school.id, 'nextActionDueDate', e.target.value)}
                                        placeholder="e.g. Oct 15" disabled={isLocked}
                                        style={{ width: '100%', fontSize: 12 }}
                                      />
                                    ) : (
                                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.nextActionDueDate || '—'}</div>
                                    )}
                                  </div>
                                </div>
                                <div style={{ marginTop: 6 }}>
                                  <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Last Reviewed</label>
                                  <div style={{ fontSize: 12, color: 'var(--text)' }}>
                                    {school.lastReviewedAt ? new Date(school.lastReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                                  </div>
                                </div>
                              </div>

                              {/* ── Financial Aid Bridge ── */}
                              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, background: 'rgba(59,130,246,0.04)', borderRadius: 8, padding: '8px 10px' }}>
                                <label style={{ fontSize: 11, color: '#2563eb', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  💰 Financial Aid
                                </label>
                                {!school.estimatedNetPrice && school.cssProfileRequired === undefined && school.fafsaRequired === undefined && school.meetsFullNeed === undefined && school.noLoanPolicy === undefined && (
                                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 8 }}>
                                    FA data not yet synced. Lock your list to pull affordability info from the Financial Aid knowledge base.
                                  </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  <DetailField label="Est. Net Price">{school.estimatedNetPrice || '—'}</DetailField>
                                  <DetailField label="Aid Strategy">{school.aidStrategy || '—'}</DetailField>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>CSS Profile</label>
                                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                                      {school.cssProfileRequired === true ? 'Required' : school.cssProfileRequired === false ? 'Not required' : '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>FAFSA</label>
                                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                                      {school.fafsaRequired === true ? 'Required' : school.fafsaRequired === false ? 'Not required' : '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>Meets Full Need</label>
                                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                                      {school.meetsFullNeed === true ? 'Yes' : school.meetsFullNeed === false ? 'No' : '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>No-Loan Policy</label>
                                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                                      {school.noLoanPolicy === true ? 'Yes' : school.noLoanPolicy === false ? 'No' : '—'}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ marginTop: 6 }}>
                                  <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>FA Priority Deadline</label>
                                  <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.faPriorityDeadline || '—'}</div>
                                </div>
                                <div style={{ marginTop: 4 }}>
                                  <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>FA Fit Notes</label>
                                  {editable ? (
                                    <textarea value={school.financialFitNotes ?? ''}
                                      onChange={(e) => updateSchool(school.id, 'financialFitNotes', e.target.value)}
                                      placeholder="Notes about affordability fit" disabled={isLocked}
                                      rows={2} style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontSize: 12 }}
                                    />
                                  ) : (
                                    <div style={{ fontSize: 12, color: 'var(--text)' }}>{school.financialFitNotes || '—'}</div>
                                  )}
                                </div>
                              </div>

                              {/* ── Update last reviewed ── */}
                              {!isLocked && (
                                <button type="button" className="secondary-btn" style={{ fontSize: 11 }}
                                  onClick={() => updateSchool(school.id, 'lastReviewedAt', Date.now())}>
                                  Mark reviewed now
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showExport && (
        <CollegeListExport
          schools={targetSchools}
          onClose={() => setShowExport(false)}
          displayName={displayName}
        />
      )}

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
                >+</button>
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
