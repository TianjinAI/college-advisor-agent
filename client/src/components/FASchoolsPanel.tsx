import React, { useState, useEffect, useMemo } from 'react';
import type { FASchool } from '../types';

/* ─── Badge ────────────────────────────────────────── */
interface BadgeProps { label: string; variant?: 'green' | 'blue' | 'amber' | 'purple' | 'red'; }
const Badge: React.FC<BadgeProps> = ({ label, variant = 'green' }) => {
  const colors: Record<string, string> = {
    green:  'background:var(--accent-soft);color:var(--accent)',
    blue:    'background:rgba(59,130,246,.14);color:#60a5fa',
    amber:   'background:rgba(251,191,36,.14);color:#fbbf24',
    purple:  'background:rgba(167,139,250,.14);color:#a78bfa',
    red:     'background:var(--danger-soft);color:#fb7185',
  };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 7px', borderRadius:6, fontSize:'0.68rem', fontWeight:600, letterSpacing:'0.03em', ...(Object.fromEntries(colors[variant].split(';').map(s=>s.split(':'))) as React.CSSProperties) }}>
      {label}
    </span>
  );
};

/* ─── Safe formatters ──────────────────────────────── */
const fmtDollars = (n: number | null | undefined, fallback = 'N/A'): string =>
  typeof n === 'number' && !isNaN(n) ? `$${n.toLocaleString()}` : fallback;

const fmtPct = (n: number | null | undefined, fallback = 'N/A'): string =>
  typeof n === 'number' && !isNaN(n) ? `${n}%` : fallback;

const fmtDollarsK = (n: number | null | undefined, fallback = 'N/A'): string =>
  typeof n === 'number' && !isNaN(n) ? `$${(n / 1000).toFixed(0)}k` : fallback;

/* ─── Card ─────────────────────────────────────────── */
interface SchoolCardProps { school: FASchool; }
const SchoolCard: React.FC<SchoolCardProps> = ({ school }) => (
  <div style={{
    padding:'14px 16px', borderRadius:14, border:'1px solid var(--border)',
    background:'linear-gradient(180deg,rgba(13,18,18,.96),rgba(10,14,14,.96))',
    boxShadow:'inset 0 1px 0 var(--inner-highlight)', marginBottom:10, transition:'all 150ms',
  }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
      <div>
        <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text)', lineHeight:1.2 }}>{school.name}</div>
        {school.id && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:1 }}>{school.id}</div>}
      </div>
      <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--accent)', whiteSpace:'nowrap', textAlign:'right' }}>
        {fmtDollars(school.avg_aid_award)}
        <div style={{ fontSize:'0.65rem', fontWeight:400, color:'var(--text-dim)' }}>avg aid</div>
      </div>
    </div>

    {/* Badges */}
    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
      {school.meets_full_need        && <Badge label="Full Need Met"       variant="green"  />}
      {school.no_loan_policy         && <Badge label="No-Loan Policy"      variant="blue"   />}
      {school.need_only              && <Badge label="Need-Only FA"         variant="purple" />}
      {school.css_profile_required   && <Badge label="CSS Profile"         variant="amber"  />}
      {school.merit_aid_available    && <Badge label="Merit Aid"           variant="green"  />}
      {school.fafsa_required         && <Badge label="FAFSA"               variant="blue"   />}
      {school.questbridge_partner    && <Badge label="QuestBridge"         variant="purple" />}
      {school.posse_partner         && <Badge label="Posse"               variant="blue"   />}
    </div>

    {/* Net Price by Income */}
    {school.net_price_by_income && (
      <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:6 }}>
        Net price: &lt;$30k {fmtDollars(school.net_price_by_income.band_0_30k)} · $30-48k {fmtDollars(school.net_price_by_income.band_30_48k)} · $48-75k {fmtDollars(school.net_price_by_income.band_48_75k)} · $75-110k {fmtDollars(school.net_price_by_income.band_75_110k)} · &gt;$110k {fmtDollars(school.net_price_by_income.band_110k_plus)}
      </div>
    )}

    {/* Key stats */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6, marginTop:10, padding:'8px 10px', background:'rgba(255,255,255,.03)', borderRadius:8 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text)' }}>{fmtPct(school.percent_need_met)}</div>
        <div style={{ fontSize:'0.63rem', color:'var(--text-dim)', marginTop:1 }}>need met</div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text)' }}>{fmtDollarsK(school.avg_aid_award)}</div>
        <div style={{ fontSize:'0.63rem', color:'var(--text-dim)', marginTop:1 }}>avg aid</div>
      </div>
    </div>

    {/* Merit thresholds */}
    {school.merit_aid_available && school.merit_thresholds && (
      <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:4 }}>
        Merit: GPA≥{school.merit_thresholds.gpa_floor ?? '?'}{school.merit_thresholds.sat_floor != null ? `, SAT≥${school.merit_thresholds.sat_floor}` : ''}{school.merit_thresholds.act_floor != null ? `, ACT≥${school.merit_thresholds.act_floor}` : ''}
      </div>
    )}

    {/* Early options */}
    {(school.ed_available || school.ea_available || school.rea_available) && (
      <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:4 }}>
        {school.ed_available && 'ED '}{school.ea_available && 'EA '}{school.rea_available && 'REA'}
      </div>
    )}

    {/* Deadlines */}
    {(school.fa_priority_deadline || school.fa_regular_deadline) && (
      <div style={{ display:'flex', gap:8, marginTop:8, fontSize:'0.7rem', color:'var(--text-muted)' }}>
        {school.fa_priority_deadline && (
          <span>Priority: <strong style={{ color:'var(--text)' }}>{school.fa_priority_deadline}</strong></span>
        )}
        {school.fa_regular_deadline && (
          <span>Regular: <strong style={{ color:'var(--text)' }}>{school.fa_regular_deadline}</strong></span>
        )}
      </div>
    )}
  </div>
);

/* ─── API envelope ─────────────────────────────────── */
interface SchoolsResponse {
  schools: FASchool[];
  total: number;
}

export default function FASchoolsPanel(): JSX.Element {
  const [schools, setSchools] = useState<FASchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMeetsFullNeed, setFilterMeetsFullNeed] = useState(false);
  const [filterNoLoan, setFilterNoLoan] = useState(false);
  const [filterNeedOnly, setFilterNeedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/fa/schools')
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
        if (!cancelled) { setError(e.message); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!Array.isArray(schools)) return [];
    const q = search.toLowerCase().trim();
    return schools.filter(s => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (filterMeetsFullNeed && !s.meets_full_need)  return false;
      if (filterNoLoan       && !s.no_loan_policy)    return false;
      if (filterNeedOnly     && !s.need_only)          return false;
      return true;
    });
  }, [schools, search, filterMeetsFullNeed, filterNoLoan, filterNeedOnly]);

  return (
    <div style={{ padding:'12px 12px 0', display:'flex', flexDirection:'column', gap:10, height:'100%' }}>
      {/* Search */}
      <div style={{ position:'relative' }}>
        <input
          type="text"
          placeholder="Search schools…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width:'100%', padding:'9px 12px 9px 34px', background:'rgba(14,22,21,.9)',
            border:'1px solid var(--border)', borderRadius:10, color:'var(--text)',
            fontSize:'0.82rem', boxSizing:'border-box',
          }}
        />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"
          style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>

      {/* Toggle filters */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {([
          [filterMeetsFullNeed, setFilterMeetsFullNeed, 'Full Need'],
          [filterNoLoan,       setFilterNoLoan,        'No-Loan'],
          [filterNeedOnly,     setFilterNeedOnly,      'Need-Only'],
        ] as const).map(([active, setter, label]) => (
          <button
            key={label}
            onClick={() => setter(v => !v)}
            style={{
              padding:'4px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:500, cursor:'pointer',
              border:'1px solid', transition:'all 120ms',
              ...(active
                ? { background:'var(--accent-soft)', borderColor:'rgba(52,211,153,.3)', color:'var(--accent)' }
                : { background:'rgba(255,255,255,.04)', borderColor:'var(--border)', color:'var(--text-muted)' }
              ),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Result count */}
      <div style={{ fontSize:'0.72rem', color:'var(--text-dim)' }}>
        {loading ? 'Loading…' : `${filtered.length} of ${schools.length} schools`}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', paddingRight:2 }}>
        {loading && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-dim)', fontSize:'0.82rem' }}>
            Loading schools…
          </div>
        )}
        {error && (
          <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--danger-soft)', color:'#fb7185', fontSize:'0.8rem' }}>
            Failed to load schools: {error}
          </div>
        )}
        {!loading && !error && filtered.map(s => <SchoolCard key={s.id} school={s} />)}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-dim)', fontSize:'0.82rem' }}>
            No schools match your filters.
          </div>
        )}
      </div>
    </div>
  );
}