import React, { useState, useEffect, useMemo } from 'react';
import type { FAScholarship } from '../types';

/* ─── Badge helper ─────────────────────────────────── */
const badgeStyle = (color: string): React.CSSProperties => ({
  display:'inline-flex', alignItems:'center', padding:'2px 7px', borderRadius:6,
  fontSize:'0.68rem', fontWeight:600, letterSpacing:'0.03em',
  background: color, color:'var(--text)',
});

/* ─── Safe formatters ──────────────────────────────── */
const fmtAmount = (s: FAScholarship): string => {
  const raw = s.amount;
  if (typeof raw === 'string' && raw.trim()) return raw.startsWith('$') ? raw : `$${raw}`;
  if (typeof s.amount_max === 'number' && s.amount_max > 0) {
    if (typeof s.amount_min === 'number' && s.amount_min > 0 && s.amount_min !== s.amount_max) {
      return `$${s.amount_min.toLocaleString()}–$${s.amount_max.toLocaleString()}`;
    }
    return `$${s.amount_max.toLocaleString()}`;
  }
  return 'Varies';
};

const fmtDeadline = (d: string | null | undefined): string => {
  if (!d) return 'Rolling';
  // Try ISO parse first; if it produces an invalid date, show raw string
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  return d; // non-ISO string, show as-is
};

/* ─── Card ──────────────────────────────────────────── */
interface ScholarshipCardProps { s: FAScholarship; }
const ScholarshipCard: React.FC<ScholarshipCardProps> = ({ s }) => {
  const amountStr = fmtAmount(s);
  const deadlineStr = fmtDeadline(s.deadline);
  const selectivityColor: Record<string, string> = {
    'Very Easy':   '#34d399',
    'Minimal Req.':'#34d399',
    'Easy':        '#60a5fa',
    'Moderate':    '#fbbf24',
    'High':        '#fb7185',
  };
  const categories = Array.isArray(s.category) ? s.category : [];
  const tags = Array.isArray(s.tags) ? s.tags : [];
  const elig = s.eligibility;
  const gpaMin = (elig && typeof elig.gpa_min === 'number') ? elig.gpa_min : null;
  const firstGenReq = elig?.first_gen_required ?? false;
  const pellReq = elig?.pell_eligible_required ?? false;
  const stateReq = elig?.state_required ?? null;
  const gradeLevel = elig?.grade_level ?? null;

  return (
    <div style={{
      padding:'14px 16px', borderRadius:14, border:'1px solid var(--border)',
      background:'var(--surface)',
      boxShadow:'inset 0 1px 0 var(--inner-highlight)', marginBottom:10, transition:'all 150ms',
    }}>
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--text)', lineHeight:1.25, overflow:'hidden', textOverflow:'ellipsis' }}>
            {s.name}
          </div>
          {s.sponsor && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>by {s.sponsor}</div>}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--accent)' }}>{amountStr}</div>
          {s.renewable && <div style={{ fontSize:'0.62rem', color:'var(--text-dim)' }}>renewable{s.renewable_years ? ` (${s.renewable_years}yr)` : ''}</div>}
        </div>
      </div>

      {/* Key details */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
        <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>
          📅 {deadlineStr}
        </span>
        {s.selectivity && (
          <span style={{ fontSize:'0.7rem', color:(selectivityColor[s.selectivity] ?? 'var(--text-muted)'), fontWeight:600 }}>
            • {s.selectivity}
          </span>
        )}
      </div>

      {/* Category + tags */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
        {categories.map(c => (
          <span key={c} style={badgeStyle('rgba(52,211,153,.14)')}>{c}</span>
        ))}
        {tags.slice(0, 3).map(t => (
          <span key={t} style={badgeStyle('rgba(0,0,0,.06)')}>{t}</span>
        ))}
      </div>

      {/* Notes snippet */}
      {s.notes && (
        <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:6, lineHeight:1.45 }}>
          {s.notes.length > 200 ? s.notes.substring(0, 200) + '…' : s.notes}
        </div>
      )}

      {/* Mini eligibility badges */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
        {gpaMin != null && gpaMin > 0 && <span style={{ fontSize:'0.65rem', padding:'1px 5px', borderRadius:4, background:'rgba(59,130,246,.12)', color:'#60a5fa' }}>GPA ≥ {gpaMin.toFixed(1)}</span>}
        {firstGenReq && <span style={{ fontSize:'0.65rem', padding:'1px 5px', borderRadius:4, background:'rgba(167,139,250,.12)', color:'#a78bfa' }}>1st Gen</span>}
        {pellReq && <span style={{ fontSize:'0.65rem', padding:'1px 5px', borderRadius:4, background:'rgba(251,191,36,.12)', color:'#fbbf24' }}>Pell</span>}
        {stateReq && <span style={{ fontSize:'0.65rem', padding:'1px 5px', borderRadius:4, background:'rgba(0,0,0,.06)', color:'var(--text-muted)' }}>{stateReq}</span>}
        {gradeLevel && <span style={{ fontSize:'0.65rem', padding:'1px 5px', borderRadius:4, background:'rgba(0,0,0,.06)', color:'var(--text-muted)' }}>{gradeLevel}</span>}
      </div>

      {/* Application link */}
      {s.application_url && (
        <div style={{ marginTop:4 }}>
          <a href={s.application_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:'0.68rem', color:'var(--accent)' }}>
            Apply ↗
          </a>
        </div>
      )}
    </div>
  );
};

/* ─── Panel ─────────────────────────────────────────── */
const CATEGORIES = ['', 'Academic', 'Minority', 'Community Service', 'Athletic', 'Creative Arts', 'STEM', 'Need-Based', 'First Generation'];
const GRADE_LEVELS = ['', 'High School Senior', 'Undergraduate', 'Graduate'];

/* ─── API envelope ─────────────────────────────────── */
interface ScholarshipsResponse {
  scholarships: FAScholarship[];
  total: number;
}

export default function FAScholarshipsPanel(): JSX.Element {
  const [scholarships, setScholarships] = useState<FAScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch]                     = useState('');
  const [category, setCategory]                 = useState('');
  const [stateFilter, setStateFilter]           = useState('');
  const [gradeLevel, setGradeLevel]             = useState('');
  const [gpaThreshold, setGpaThreshold]         = useState('');
  const [incomeThreshold, setIncomeThreshold]   = useState('');
  const [firstGenOnly, setFirstGenOnly]         = useState(false);
  const [pellOnly, setPellOnly]                 = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/fa/scholarships')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ScholarshipsResponse) => {
        if (!cancelled) {
          const list = Array.isArray(data?.scholarships) ? data.scholarships : [];
          setScholarships(list);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) { setError(e.message); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!Array.isArray(scholarships)) return [];
    const q = search.toLowerCase().trim();
    const gpaNum = parseFloat(gpaThreshold);
    const incomeNum = parseFloat(incomeThreshold);
    return scholarships.filter(s => {
      // Search
      if (q) {
        const cats = Array.isArray(s.category) ? s.category.join(' ') : '';
        const tgs = Array.isArray(s.tags) ? s.tags.join(' ') : '';
        const hay = `${s.name} ${s.sponsor ?? ''} ${cats} ${tgs} ${(s.notes ?? '')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Category filter: category is an array, check inclusion
      if (category) {
        const cats = Array.isArray(s.category) ? s.category : [];
        if (!cats.includes(category)) return false;
      }
      // State filter via eligibility
      if (stateFilter && s.eligibility?.state_required && s.eligibility.state_required !== stateFilter) return false;
      // Grade level via eligibility
      if (gradeLevel && s.eligibility?.grade_level) {
        const target = gradeLevel.toLowerCase();
        const haystack = s.eligibility.grade_level.toLowerCase();
        const tokens = haystack.split(/[\s,/]+/).filter(Boolean);
        if (!tokens.some(t => target.includes(t) || t.includes(target))) return false;
      }
      // GPA threshold via eligibility
      if (!isNaN(gpaNum) && gpaNum > 0 && s.eligibility?.gpa_min != null && s.eligibility.gpa_min > gpaNum) return false;
      // Income threshold via eligibility
      if (!isNaN(incomeNum) && incomeNum > 0 && s.eligibility?.income_max != null && s.eligibility.income_max > 0 && s.eligibility.income_max < incomeNum) return false;
      // First-gen via eligibility
      if (firstGenOnly && s.eligibility?.first_gen_required !== true) return false;
      // Pell via eligibility
      if (pellOnly && s.eligibility?.pell_eligible_required !== true) return false;
      return true;
    });
  }, [scholarships, search, category, stateFilter, gradeLevel, gpaThreshold, incomeThreshold, firstGenOnly, pellOnly]);

  const selectStyle: React.CSSProperties = {
    padding:'6px 8px', background:'rgba(0,0,0,.03)', border:'1px solid var(--border)',
    borderRadius:8, color:'var(--text)', fontSize:'0.75rem',
  };

  const inputStyle: React.CSSProperties = {
    padding:'6px 10px', background:'rgba(0,0,0,.03)', border:'1px solid var(--border)',
    borderRadius:8, color:'var(--text)', fontSize:'0.78rem', width:'100%', boxSizing:'border-box',
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding:'4px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:500, cursor:'pointer',
    border:'1px solid', transition:'all 120ms',
    ...(active
      ? { background:'var(--accent-soft)', borderColor:'rgba(52,211,153,.3)', color:'var(--accent)' }
      : { background:'rgba(0,0,0,.04)', borderColor:'var(--border)', color:'var(--text-muted)' }
    ),
  });

  return (
    <div style={{ padding:'12px 12px 0', display:'flex', flexDirection:'column', gap:8, height:'100%' }}>
      {/* Search */}
      <div style={{ position:'relative' }}>
        <input
          type="text"
          placeholder="Search scholarships…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft:32 }}
        />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"
          style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>

      {/* Filter row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
          <option value="">All categories</option>
          {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={selectStyle}>
          <option value="">All grades</option>
          {GRADE_LEVELS.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        <input type="text" placeholder="GPA ≥" value={gpaThreshold} onChange={e => setGpaThreshold(e.target.value)} style={inputStyle} />
        <input type="text" placeholder="Income ≤" value={incomeThreshold} onChange={e => setIncomeThreshold(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        <input type="text" placeholder="State (e.g. CA)" value={stateFilter} onChange={e => setStateFilter(e.target.value)}
          style={{ ...inputStyle, width:90, flex:'0 0 90px' }} />
        <button onClick={() => setFirstGenOnly(v => !v)} style={toggleStyle(firstGenOnly)}>1st Gen</button>
        <button onClick={() => setPellOnly(v => !v)} style={toggleStyle(pellOnly)}>Pell</button>
      </div>

      {/* Result count */}
      <div style={{ fontSize:'0.72rem', color:'var(--text-dim)' }}>
        {loading ? 'Loading…' : `${filtered.length} of ${scholarships.length} scholarships`}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', paddingRight:2 }}>
        {loading && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-dim)', fontSize:'0.82rem' }}>
            Loading scholarships…
          </div>
        )}
        {error && (
          <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--danger-soft)', color:'#fb7185', fontSize:'0.8rem' }}>
            Failed to load scholarships: {error}
          </div>
        )}
        {!loading && !error && filtered.map(s => <ScholarshipCard key={s.id} s={s} />)}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-dim)', fontSize:'0.82rem' }}>
            No scholarships match your filters.
          </div>
        )}
      </div>
    </div>
  );
}