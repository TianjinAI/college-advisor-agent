import type { TargetSchool } from '../types';

interface CollegeListExportProps {
  schools: TargetSchool[];
  onClose: () => void;
  displayName?: string;
}

const statusClass = (status: TargetSchool['status']): string => {
  if (status === 'Reach') return 'status-reach';
  if (status === 'Match') return 'status-match';
  if (status === 'Safety') return 'status-safety';
  return 'status-none';
};

const statusLabel = (status: TargetSchool['status']): string => status || 'Unassigned';



const todayStr = (): string =>
  new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

// ─── Helpers ──────────────────────────────────────────────────────────────

const byStatus = (schools: TargetSchool[]) => ({
  reach: schools.filter((s) => s.status === 'Reach'),
  match: schools.filter((s) => s.status === 'Match'),
  safety: schools.filter((s) => s.status === 'Safety'),
  unassigned: schools.filter((s) => s.status === '' || !s.status),
});

const sortByDeadline = (schools: TargetSchool[]): TargetSchool[] =>
  [...schools].sort((a, b) => {
    if (!a.applicationDeadline) return 1;
    if (!b.applicationDeadline) return -1;
    return a.applicationDeadline.localeCompare(b.applicationDeadline);
  });

const hasEarlyApp = (s: TargetSchool): boolean =>
  s.deadlineType === 'ED' || s.deadlineType === 'EA' || s.deadlineType === 'REA';

const isComplete = (s: TargetSchool): boolean =>
  !!(s.status && s.strategy && s.intendedMajor && s.applicationDeadline);

const hasAffordData = (s: TargetSchool): boolean =>
  !!(s.estimatedNetPrice || s.meetsFullNeed !== undefined || s.cssProfileRequired !== undefined);

// ─── CSV generation ───────────────────────────────────────────────────────

const CSV_FIELDS = [
  'School', 'Status', 'Strategy', 'Major', 'Deadline', 'Portal', 'Essays',
  'TestPolicy', 'NetPrice', 'MeetsFullNeed', 'NoLoan', 'CSSProfile', 'FAFSA',
  'AidStrategy', 'Priority', 'Owner', 'NextAction', 'NextActionDue', 'Notes',
  'AppNarrative',
] as const;

const csvEscape = (val: unknown): string => {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvRow = (school: TargetSchool): string =>
  CSV_FIELDS.map((field) => {
    switch (field) {
      case 'School': return csvEscape(school.name);
      case 'Status': return csvEscape(school.status);
      case 'Strategy': return csvEscape(school.strategy);
      case 'Major': return csvEscape(school.intendedMajor);
      case 'Deadline': return csvEscape(school.applicationDeadline);
      case 'Portal': return csvEscape(school.applicationPortal);
      case 'Essays': return csvEscape(school.supplementalEssayCount || school.supplementalEssayNotes || '');
      case 'TestPolicy': return csvEscape(school.testPolicy);
      case 'NetPrice': return csvEscape(school.estimatedNetPrice);
      case 'MeetsFullNeed': return csvEscape(school.meetsFullNeed === true ? 'Yes' : school.meetsFullNeed === false ? 'No' : '');
      case 'NoLoan': return csvEscape(school.noLoanPolicy === true ? 'Yes' : school.noLoanPolicy === false ? 'No' : '');
      case 'CSSProfile': return csvEscape(school.cssProfileRequired === true ? 'Yes' : school.cssProfileRequired === false ? 'No' : '');
      case 'FAFSA': return csvEscape(school.fafsaRequired === true ? 'Yes' : school.fafsaRequired === false ? 'No' : '');
      case 'AidStrategy': return csvEscape(school.aidStrategy);
      case 'Priority': return csvEscape(school.priority);
      case 'Owner': return csvEscape(school.owner);
      case 'NextAction': return csvEscape(school.nextAction);
      case 'NextActionDue': return csvEscape(school.nextActionDueDate);
      case 'Notes': return csvEscape(school.notes || school.financialFitNotes || '');
      case 'AppNarrative': return csvEscape(school.appNarrative);
      default: return '';
    }
  }).join(',');

const downloadCsv = (schools: TargetSchool[]): void => {
  const header = CSV_FIELDS.map(csvEscape).join(',');
  const rows = schools.map(csvRow);
  const bom = '\uFEFF';
  const blob = new Blob([bom + header + '\n' + rows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `college-application-plan-${todayStr().replace(/,/g, '')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Deadline Timeline helper ─────────────────────────────────────────────

interface TimelineBucket {
  label: string;
  schools: TargetSchool[];
}

const buildTimeline = (schools: TargetSchool[]): TimelineBucket[] => {
  const withDeadline = schools.filter((s) => s.applicationDeadline);
  if (withDeadline.length === 0) return [];
  const sorted = sortByDeadline(withDeadline);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const bucketMap = new Map<string, TargetSchool[]>();
  for (const s of sorted) {
    const d = new Date(s.applicationDeadline!);
    const key = months[d.getMonth()];
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key)!.push(s);
  }

  // Separate "before current month" into a special bucket
  const now = new Date();
  const nowMonth = now.getMonth();
  const buckets: TimelineBucket[] = [];
  const beforeLabel = `Before ${months[nowMonth]}`;
  const before: TargetSchool[] = [];

  for (const [label, list] of bucketMap.entries()) {
    const monthIdx = months.indexOf(label);
    if (monthIdx < nowMonth) {
      before.push(...list);
    } else {
      buckets.push({ label, schools: list });
    }
  }

  if (before.length > 0) buckets.unshift({ label: beforeLabel, schools: before });
  return buckets;
};

// ─── Component ────────────────────────────────────────────────────────────

export default function CollegeListExport({ schools, onClose, displayName }: CollegeListExportProps) {
  const groups = byStatus(schools);
  const totalSchoolCount = schools.length;
  const earlyAppCount = schools.filter(hasEarlyApp).length;
  const edCount = schools.filter((s) => s.deadlineType === 'ED').length;
  const eaCount = schools.filter((s) => s.deadlineType === 'EA').length;
  const completeCount = schools.filter(isComplete).length;
  const affordCount = schools.filter(hasAffordData).length;

  const timeline = buildTimeline(schools);
  const nextActions = schools
    .filter((s) => s.nextAction)
    .sort((a, b) => {
      if (!a.nextActionDueDate) return 1;
      if (!b.nextActionDueDate) return -1;
      return a.nextActionDueDate.localeCompare(b.nextActionDueDate);
    });

  const fullNeedSchools = schools.filter((s) => s.meetsFullNeed);
  const noLoanSchools = schools.filter((s) => s.noLoanPolicy);
  const cssProfileSchools = schools.filter((s) => s.cssProfileRequired);

  return (
    <div className="college-export-overlay" role="dialog" aria-modal="true" aria-label="College application plan export">
      <div className="college-export-modal">
        {/* ── Toolbar ── */}
        <div className="college-export-toolbar no-print">
          <h3 style={{ margin: 0 }}>College Application Plan</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="secondary-btn" onClick={() => window.print()}>Print</button>
            <button type="button" className="secondary-btn" onClick={() => downloadCsv(schools)}>Download CSV</button>
            <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        {/* ── Printable Sheet ── */}
        <div className="college-export-sheet print-area">

          {/* ═══ Section 1: Title ═══ */}
          <section className="export-section export-section--title">
            <h1 className="export-title">College Application Plan</h1>
            <p className="export-prepared-by">
              Prepared {todayStr()}{displayName ? ` by ${displayName}` : ''}
            </p>
          </section>

          {/* ═══ Section 2: Summary Dashboard ═══ */}
          <section className="export-section export-section--dashboard">
            <h2 className="export-section-title">Summary Dashboard</h2>
            <div className="export-dashboard-grid">
              <div className="export-dash-item">
                <span className="export-dash-num">{totalSchoolCount}</span>
                <span className="export-dash-label">Total schools</span>
              </div>
              <div className="export-dash-item">
                <span className="export-dash-num">{groups.reach.length}</span>
                <span className="export-dash-label">Reach</span>
              </div>
              <div className="export-dash-item">
                <span className="export-dash-num">{groups.match.length}</span>
                <span className="export-dash-label">Match</span>
              </div>
              <div className="export-dash-item">
                <span className="export-dash-num">{groups.safety.length}</span>
                <span className="export-dash-label">Safety</span>
              </div>
              <div className="export-dash-item">
                <span className="export-dash-num">{earlyAppCount}{earlyAppCount > 0 ? ` (${edCount} ED, ${eaCount} EA)` : ''}</span>
                <span className="export-dash-label">Early apps</span>
              </div>
              <div className="export-dash-item">
                <span className="export-dash-num">{completeCount} / {totalSchoolCount}</span>
                <span className="export-dash-label">Schools complete</span>
              </div>
              <div className="export-dash-item">
                <span className="export-dash-num">{affordCount} / {totalSchoolCount}</span>
                <span className="export-dash-label">Affordability data available</span>
              </div>
            </div>
          </section>

          {/* ═══ Section 3: Schools by Group ═══ */}
          <section className="export-section export-section--groups">
            <h2 className="export-section-title">Schools by Group</h2>

            {(['reach', 'match', 'safety'] as const).map((groupKey) => {
              const list = groups[groupKey];
              if (list.length === 0) return null;
              const label = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
              return (
                <div key={groupKey} className="export-group">
                  <h3 className="export-group-heading">
                    {label} <span className="export-group-count">({list.length})</span>
                  </h3>
                  <div className="college-export-list">
                    {list.map((school) => (
                      <article key={school.id} className="college-export-card">
                        <div className="college-export-head">
                          <h2>{school.name}</h2>
                          <span className={`college-status-badge ${statusClass(school.status)}`}>
                            {statusLabel(school.status)}
                          </span>
                        </div>
                        <p><strong>Strategy:</strong> {school.strategy || 'Not set'}{school.deadlineType ? ` (${school.deadlineType})` : ''}</p>
                        {school.applicationDeadline && <p><strong>Deadline:</strong> {school.applicationDeadline}</p>}
                        <p><strong>Intended major:</strong> {school.intendedMajor || 'Not set'}</p>
                        {school.appNarrative && <p><strong>Application narrative:</strong> {school.appNarrative}</p>}
                        {school.recommendedSuggesters && school.recommendedSuggesters.length > 0 && (
                          <p><strong>Recommendation letter suggesters:</strong> {school.recommendedSuggesters.join(', ')}</p>
                        )}
                        {school.applicationPortal && <p><strong>Portal:</strong> {school.applicationPortal}</p>}
                        {school.testPolicy && <p><strong>Test policy:</strong> {school.testPolicy}</p>}
                        {(school.supplementalEssayCount || school.supplementalEssayNotes) && (
                          <p><strong>Essay requirements:</strong> {school.supplementalEssayCount ? `${school.supplementalEssayCount} supplement${parseInt(school.supplementalEssayCount) !== 1 ? 's' : ''}` : ''}{school.supplementalEssayNotes ? ` — ${school.supplementalEssayNotes}` : ''}</p>
                        )}
                        {school.portfolioRequired !== undefined && (
                          <p><strong>Portfolio required:</strong> {school.portfolioRequired ? 'Yes' : 'No'}</p>
                        )}
                        {school.estimatedNetPrice && <p className="export-fa-field"><strong>Estimated net price:</strong> {school.estimatedNetPrice}</p>}
                        {school.aidStrategy && <p className="export-fa-field"><strong>Aid strategy:</strong> {school.aidStrategy}</p>}
                        {school.meetsFullNeed !== undefined && (
                          <p className="export-fa-field"><strong>Meets full need:</strong> {school.meetsFullNeed ? 'Yes ✅' : 'No'}</p>
                        )}
                        {school.noLoanPolicy !== undefined && (
                          <p className="export-fa-field"><strong>No-loan policy:</strong> {school.noLoanPolicy ? 'Yes ✅' : 'No'}</p>
                        )}
                        {(school.cssProfileRequired !== undefined || school.fafsaRequired !== undefined) && (
                          <p className="export-fa-field">
                            <strong>FA forms:</strong>{' '}
                            {[
                              school.cssProfileRequired ? 'CSS Profile' : '',
                              school.fafsaRequired ? 'FAFSA' : '',
                            ].filter(Boolean).join(', ') || 'None specified'}
                            {school.faPriorityDeadline ? ` — Priority deadline: ${school.faPriorityDeadline}` : ''}
                          </p>
                        )}
                        {(school.priority || school.owner) && (
                          <p><strong>Priority:</strong> {school.priority || '—'} <strong>Owner:</strong> {school.owner || '—'}</p>
                        )}
                        {school.nextAction && (
                          <p><strong>Next action:</strong> {school.nextAction}{school.nextActionDueDate ? ` (due ${school.nextActionDueDate})` : ''}</p>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}

            {groups.unassigned.length > 0 && (
              <div className="export-group">
                <h3 className="export-group-heading export-group-heading--unassigned">
                  Unassigned <span className="export-group-count">({groups.unassigned.length})</span>
                </h3>
                <div className="college-export-list">
                  {groups.unassigned.map((school) => (
                    <article key={school.id} className="college-export-card">
                      <div className="college-export-head">
                        <h2>{school.name}</h2>
                        <span className="college-status-badge status-none">Unassigned</span>
                      </div>
                      <p><em>No status assigned yet. Use Reach/Match/Safety to categorize.</em></p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ═══ Section 4: Financial Aid Overview ═══ */}
          {(fullNeedSchools.length > 0 || noLoanSchools.length > 0 || cssProfileSchools.length > 0) ? (
            <section className="export-section export-section--fa">
              <h2 className="export-section-title">Financial Aid Overview</h2>

              {fullNeedSchools.length > 0 && (
                <div className="export-fa-badge-group">
                  <h4 className="export-fa-badge-title">Meets Full Need</h4>
                  <div className="export-fa-badges">
                    {fullNeedSchools.map((s) => (
                      <span key={s.id} className="export-fa-badge export-fa-badge--fullneed">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {noLoanSchools.length > 0 && (
                <div className="export-fa-badge-group">
                  <h4 className="export-fa-badge-title">No-Loan Policy</h4>
                  <div className="export-fa-badges">
                    {noLoanSchools.map((s) => (
                      <span key={s.id} className="export-fa-badge export-fa-badge--noloan">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {cssProfileSchools.length > 0 && (
                <div className="export-fa-badge-group">
                  <h4 className="export-fa-badge-title">CSS Profile Required</h4>
                  <div className="export-fa-badges">
                    {cssProfileSchools.map((s) => (
                      <span key={s.id} className="export-fa-badge export-fa-badge--css">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="export-fa-detail">
                <h4>Per-School Financial Aid Details</h4>
                {schools.filter((s) => s.estimatedNetPrice || s.meetsFullNeed !== undefined || s.cssProfileRequired !== undefined).map((s) => (
                  <div key={s.id} className="export-fa-school">
                    <strong>{s.name}</strong>
                    {s.estimatedNetPrice && <span> Net price: {s.estimatedNetPrice}</span>}
                    {s.faPriorityDeadline && <span> FA priority: {s.faPriorityDeadline}</span>}
                    {s.aidStrategy && <span> Strategy: {s.aidStrategy}</span>}
                    {s.financialFitNotes && <span className="export-fa-note"> — {s.financialFitNotes}</span>}
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="export-section export-section--fa">
              <h2 className="export-section-title">Financial Aid Overview</h2>
              <div className="export-fa-empty" style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Link FA profile and explore schools in Financial Aid mode to see affordability data here.
              </div>
            </section>
          )}

          {/* ═══ Section 5: Deadline Timeline ═══ */}
          {timeline.length > 0 && (
            <section className="export-section export-section--timeline">
              <h2 className="export-section-title">Deadline Timeline</h2>
              {timeline.map((bucket) => (
                <div key={bucket.label} className="export-timeline-bucket">
                  <h3 className="export-timeline-label">{bucket.label}</h3>
                  <ul className="export-timeline-list">
                    {bucket.schools.map((s) => (
                      <li key={s.id}>
                        {s.name} ({s.deadlineType || s.strategy || 'Applied'})
                        {s.applicationDeadline && <span className="export-timeline-date"> — {s.applicationDeadline}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {/* ═══ Section 6: Next Actions ═══ */}
          {nextActions.length > 0 && (
            <section className="export-section export-section--actions">
              <h2 className="export-section-title">Next Actions</h2>
              <div className="export-actions-list">
                {nextActions.map((s) => (
                  <div key={s.id} className="export-action-item">
                    <strong>{s.name}</strong>
                    <span className="export-action-text">{s.nextAction}</span>
                    {s.nextActionDueDate && <span className="export-action-date">Due: {s.nextActionDueDate}</span>}
                    {s.owner && <span className="export-action-owner">Owner: {s.owner}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ Section 7: Footnotes ═══ */}
          <section className="export-section export-section--footnotes">
            <h2 className="export-section-title">Footnotes — Plain-English Glossary</h2>
            <div className="college-export-footnotes">
              <p><strong>Reach:</strong> Harder odds — your stats are below the school's typical admitted range.</p>
              <p><strong>Match:</strong> Realistic odds — your stats are in or near the school's typical admitted range.</p>
              <p><strong>Safety:</strong> Stronger odds — your stats are above the school's typical admitted range.</p>
              <p><strong>ED (Early Decision):</strong> Binding — if accepted you must attend. Apply early, get decision early.</p>
              <p><strong>EA (Early Action):</strong> Non-binding early application. Get decision early but no commitment.</p>
              <p><strong>REA (Restrictive Early Action):</strong> Non-binding but restricts applying early to other private schools.</p>
              <p><strong>RD (Regular Decision):</strong> Standard deadline, usually January–February.</p>
              <p><strong>Rolling:</strong> Applications reviewed as they come in — apply early for best odds.</p>
              <p><strong>CSS Profile:</strong> A detailed financial aid application used by ~300 schools (mostly private). Requires more information than FAFSA.</p>
              <p><strong>FAFSA:</strong> Free Application for Federal Student Aid — required for all federal aid (loans, grants, work-study).</p>
              <p><strong>Meets Full Need:</strong> The school commits to covering 100% of demonstrated financial need.</p>
              <p><strong>No-Loan Policy:</strong> The school replaces loans with grants/work-study in financial aid packages.</p>
              <p><strong>Estimated Net Price:</strong> What a typical family in your income band actually pays after grants and scholarships — usually much less than the sticker price.</p>
              <p><strong>Test Policy:</strong> Whether SAT/ACT scores are Required, Optional, Blind (not considered even if submitted), or Flexible (can substitute other tests).</p>
              <p><strong>Portfolio:</strong> Some programs (art, architecture, music) require a portfolio of your work as part of the application.</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
