import React, { useState, useEffect, useMemo } from 'react';
import type { FASchool, TargetSchool } from '../types';

/* ─── CA display name → FA KB canonical name ───────── */
const CA_TO_FA: Record<string, string> = {
  'Amherst College': 'Amherst College',
  'Bates College': 'Bates College',
  'Boston College': 'Boston College',
  'Bowdoin College': 'Bowdoin College',
  'Brown': 'Brown University',
  'Caltech': 'California Institute of Technology',
  'Cal Poly SLO': 'California Polytechnic State University, San Luis Obispo',
  'Carleton College': 'Carleton College',
  'Carnegie Mellon': 'Carnegie Mellon University',
  'Claremont McKenna College': 'Claremont McKenna College',
  'Colby College': 'Colby College',
  'Colgate University': 'Colgate University',
  'Columbia': 'Columbia University in the City of New York',
  'Cornell': 'Cornell University',
  'Dartmouth': 'Dartmouth College',
  'Duke': 'Duke University',
  'Emory': 'Emory University',
  'Georgetown': 'Georgetown University',
  'Georgia Tech': 'Georgia Institute of Technology-Main Campus',
  'Grinnell College': 'Grinnell College',
  'Hamilton College': 'Hamilton College',
  'Harvard': 'Harvard University',
  'Harvey Mudd College': 'Harvey Mudd College',
  'Haverford College': 'Haverford College',
  'Johns Hopkins': 'Johns Hopkins University',
  'MIT': 'Massachusetts Institute of Technology',
  'Middlebury College': 'Middlebury College',
  'NYU': 'New York University',
  'Northeastern': 'Northeastern University',
  'Northwestern': 'Northwestern University',
  'Oberlin College': 'Oberlin College',
  'Pomona College': 'Pomona College',
  'Princeton': 'Princeton University',
  'Purdue': 'Purdue University',
  'RPI': 'Rensselaer Polytechnic Institute',
  'Rice': 'Rice University',
  'Rose-Hulman': 'Rose-Hulman Institute of Technology',
  'Smith College': 'Smith College',
  'Stanford': 'Stanford University',
  'Swarthmore College': 'Swarthmore College',
  'Tufts': 'Tufts University',
  'UC Berkeley': 'University of California, Berkeley',
  'UCLA': 'University of California, Los Angeles',
  'UChicago': 'University of Chicago',
  'Michigan': 'University of Michigan',
  'Notre Dame': 'University of Notre Dame',
  'Penn': 'University of Pennsylvania',
  'USC': 'University of Southern California',
  'Vanderbilt': 'Vanderbilt University',
  'Vassar College': 'Vassar College',
  'Virginia Tech': 'Virginia Polytechnic Institute and State University',
  'WashU': 'Washington University in St. Louis',
  'Wellesley College': 'Wellesley College',
  'Williams College': 'Williams College',
  'WPI': 'Worcester Polytechnic Institute',
  'Yale': 'Yale University',
};

/* ─── Exact or explicit alias match only. No substring bleed. ─── */
function isMatch(userName: string, faName: string): boolean {
  const faCanonical = faName.toLowerCase().trim();
  const userCanonical = (CA_TO_FA[userName] ?? userName).toLowerCase().trim();
  return faCanonical === userCanonical;
}

/* ─── Badge ────────────────────────────────────────── */
interface BadgeProps { label: string; variant?: 'green' | 'blue' | 'amber' | 'purple' | 'red'; }
const Badge: React.FC<BadgeProps> = ({ label, variant = 'green' }) => {
  const bgMap: Record<string, string> = {
    green:  'var(--accent-soft)',
    blue:   'rgba(59,130,246,.14)',
    amber:  'rgba(251,191,36,.14)',
    purple: 'rgba(167,139,250,.14)',
    red:    'var(--danger-soft)',
  };
  const colorMap: Record<string, string> = {
    green:  'var(--accent)',
    blue:   '#60a5fa',
    amber:  '#fbbf24',
    purple: '#a78bfa',
    red:    '#fb7185',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 6,
      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.03em',
      background: bgMap[variant], color: colorMap[variant],
    }}>
      {label}
    </span>
  );
};

/* ─── Section label ────────────────────────────────── */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
  }}>
    {children}
  </div>
);

/* ─── Safe formatters ──────────────────────────────── */
const fmtDollars = (n: number | null | undefined, fallback = 'N/A'): string =>
  typeof n === 'number' && !isNaN(n) ? `$${n.toLocaleString()}` : fallback;

const fmtPct = (n: number | null | undefined, fallback = 'N/A'): string =>
  typeof n === 'number' && !isNaN(n) ? `${n}%` : fallback;

/* ─── Card ─────────────────────────────────────────── */
interface SchoolCardProps { school: FASchool; }

const SchoolCard: React.FC<SchoolCardProps> = ({ school }) => {
  const [expanded, setExpanded] = useState(false);

  const badgeList: { label: string; variant: BadgeProps['variant'] }[] = [];
  if (school.meets_full_need)      badgeList.push({ label: 'Full Need Met',  variant: 'green'  });
  if (school.no_loan_policy)       badgeList.push({ label: 'No-Loan Policy', variant: 'blue'   });
  if (school.need_only)            badgeList.push({ label: 'Need-Only FA',   variant: 'purple' });
  if (school.css_profile_required) badgeList.push({ label: 'CSS Profile',    variant: 'amber'  });
  if (school.merit_aid_available)  badgeList.push({ label: 'Merit Aid',      variant: 'green'  });
  if (school.fafsa_required)       badgeList.push({ label: 'FAFSA',          variant: 'blue'   });
  if (school.questbridge_partner)  badgeList.push({ label: 'QuestBridge',    variant: 'purple' });
  if (school.posse_partner)        badgeList.push({ label: 'Posse',          variant: 'blue'   });

  const hasNetPrice = school.net_price_by_income &&
    Object.values(school.net_price_by_income).some(v => typeof v === 'number' && v > 0);
  const hasMerit    = school.merit_aid_available && school.merit_thresholds;
  const hasEarly    = school.ed_available || school.ea_available || school.rea_available;

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      style={{
        padding: '14px 16px', borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        boxShadow: 'inset 0 1px 0 var(--inner-highlight)',
        marginBottom: 10, cursor: 'pointer',
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,.25)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
    >
      {/* ─── Top: name + avg aid ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)',
            lineHeight: 1.25, letterSpacing: '-0.01em',
          }}>
            {school.name}
          </div>
        </div>
        <div style={{
          fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)',
          whiteSpace: 'nowrap', textAlign: 'right', flexShrink: 0,
        }}>
          {fmtDollars(school.avg_aid_award)}
          <div style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--text-dim)' }}>
            avg aid
          </div>
        </div>
      </div>

      {/* ─── Badges ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {badgeList.map(b => <Badge key={b.label} label={b.label} variant={b.variant} />)}
      </div>

      {/* ─── Compact stats row ─── */}
      <div style={{
        display: 'flex', gap: 12, marginTop: 8, fontSize: '0.75rem',
        color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span>
          <strong style={{ color: 'var(--text)' }}>{fmtPct(school.percent_need_met)}</strong> need met
        </span>
        {hasEarly && (
          <span style={{ color: 'var(--text-dim)' }}>
            {school.ed_available && 'ED '}
            {school.ea_available && 'EA '}
            {school.rea_available && 'REA'}
          </span>
        )}
        {(school.fa_priority_deadline || school.fa_regular_deadline) && (
          <span style={{ color: 'var(--text-dim)' }}>
            {school.fa_priority_deadline && <>Priority: {school.fa_priority_deadline}</>}
            {school.fa_priority_deadline && school.fa_regular_deadline && ' · '}
            {school.fa_regular_deadline && <>Regular: {school.fa_regular_deadline}</>}
          </span>
        )}
      </div>

      {/* ─── Expanded details ─── */}
      {expanded && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>

          {/* Net price by income */}
          {hasNetPrice && (
            <div>
              <SectionLabel>What you actually pay after financial aid</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
                {[
                  ['< $30k', school.net_price_by_income!.band_0_30k],
                  ['$30–48k', school.net_price_by_income!.band_30_48k],
                  ['$48–75k', school.net_price_by_income!.band_48_75k],
                  ['$75–110k', school.net_price_by_income!.band_75_110k],
                  ['> $110k', school.net_price_by_income!.band_110k_plus],
                ].map(([label, val]) => (
                  <div key={label as string} style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDollars(val as number | null)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 5, lineHeight: 1.4 }}>
                * Sticker price = tuition + housing + meals + fees. These numbers show what families in each bracket typically end up paying after the school gives them free aid (grants &amp; scholarships). Your actual cost may differ. Does not include books, travel, or pocket money.
              </div>
            </div>
          )}

          {/* Merit thresholds */}
          {hasMerit && (
            <div>
              <SectionLabel>Merit Aid Thresholds</SectionLabel>
              <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                GPA ≥ {school.merit_thresholds!.gpa_floor ?? '?'}
                {school.merit_thresholds!.sat_floor != null && <> · SAT ≥ {school.merit_thresholds!.sat_floor}</>}
                {school.merit_thresholds!.act_floor != null && <> · ACT ≥ {school.merit_thresholds!.act_floor}</>}
              </div>
            </div>
          )}

          {/* Appeal policy */}
          {school.appeal_policy && (
            <div>
              <SectionLabel>Appeal Policy</SectionLabel>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {school.appeal_policy}
              </div>
            </div>
          )}

          {/* Source links */}
          {school.source_urls && school.source_urls.length > 0 && (
            <div>
              <SectionLabel>Sources</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {school.source_urls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: '0.72rem', color: 'var(--accent)',
                      textDecoration: 'none', opacity: 0.8,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: '100%',
                    }}
                  >
                    {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Expand hint ─── */}
      <div style={{
        marginTop: 6, fontSize: '0.62rem', color: 'var(--text-dim)',
        textAlign: 'center', opacity: 0.5, userSelect: 'none',
      }}>
        {expanded ? '▲ collapse' : '▼ click for details'}
      </div>
    </div>
  );
};

/* ─── API envelope ─────────────────────────────────── */
interface SchoolsResponse {
  schools: FASchool[];
  total: number;
}

export default function FASchoolsPanel({ userSchools }: { userSchools?: TargetSchool[] }): JSX.Element {
  const [schools, setSchools] = useState<FASchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMeetsFullNeed, setFilterMeetsFullNeed] = useState(false);
  const [filterNoLoan, setFilterNoLoan] = useState(false);
  const [filterNeedOnly, setFilterNeedOnly] = useState(false);
  const [showOnlyUserSchools, setShowOnlyUserSchools] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    fetch('/api/fa/schools', { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: SchoolsResponse) => {
        if (!cancelled) {
          const list = Array.isArray(data?.schools) ? data.schools : [];
          setSchools(list);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        if (!cancelled) { setError(e.message); setLoading(false); }
      });
    return () => { cancelled = true; ctrl.abort(); };
  }, []);

  const matchedSchools = useMemo(() => {
    if (!userSchools?.length || !schools.length) return [];
    return schools.filter(s => userSchools.some(us => isMatch(us.name, s.name)));
  }, [schools, userSchools]);

  const hasMatches = matchedSchools.length > 0;

  const filtered = useMemo(() => {
    if (!Array.isArray(schools)) return [];
    const source = showOnlyUserSchools && hasMatches ? matchedSchools : schools;
    const q = search.toLowerCase().trim();
    return source.filter(s => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (filterMeetsFullNeed && !s.meets_full_need) return false;
      if (filterNoLoan && !s.no_loan_policy) return false;
      if (filterNeedOnly && !s.need_only) return false;
      return true;
    });
  }, [schools, matchedSchools, showOnlyUserSchools, hasMatches, search, filterMeetsFullNeed, filterNoLoan, filterNeedOnly]);

  return (
    <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search schools…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px 9px 34px',
            background: 'rgba(0,0,0,.03)',
            border: '1px solid var(--border)', borderRadius: 10,
            color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box',
          }}
        />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* Toggle filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {([
          [filterMeetsFullNeed, setFilterMeetsFullNeed, 'Full Need'],
          [filterNoLoan, setFilterNoLoan, 'No-Loan'],
          [filterNeedOnly, setFilterNeedOnly, 'Need-Only'],
        ] as const).map(([active, setter, label]) => (
          <button
            key={label}
            onClick={() => setter(v => !v)}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem',
              fontWeight: 500, cursor: 'pointer',
              border: '1px solid', transition: 'all 120ms',
              ...(active
                ? { background: 'var(--accent-soft)', borderColor: 'rgba(52,211,153,.3)', color: 'var(--accent)' }
                : { background: 'rgba(0,0,0,.04)', borderColor: 'var(--border)', color: 'var(--text-muted)' }
              ),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* User-schools toggle */}
      {hasMatches && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowOnlyUserSchools(v => !v)}
            style={{
              fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer',
              padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)',
              background: showOnlyUserSchools ? 'var(--accent-soft)' : 'rgba(0,0,0,.04)',
              color: showOnlyUserSchools ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {showOnlyUserSchools ? 'Show all KB schools' : 'Show only my colleges'}
          </button>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            {matchedSchools.length} match{matchedSchools.length !== 1 ? 'es' : ''} from your list
          </span>
        </div>
      )}

      {/* Result count */}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
        {loading ? 'Loading…' : `${filtered.length} of ${schools.length} schools`}
        {!loading && showOnlyUserSchools && hasMatches && (
          <span style={{ marginLeft: 6, opacity: 0.7 }}>(viewing matched subset)</span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
            Loading schools…
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--danger-soft)', color: '#fb7185', fontSize: '0.8rem' }}>
            Failed to load schools: {error}
          </div>
        )}
        {!loading && !error && filtered.map(s => <SchoolCard key={s.id} school={s} />)}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
            {showOnlyUserSchools && hasMatches
              ? 'No matched schools fit the current filters.'
              : showOnlyUserSchools && !hasMatches
                ? 'Your college list has no matches in the FA knowledge base yet.'
                : 'No schools match your filters.'}
          </div>
        )}
      </div>
    </div>
  );
}
