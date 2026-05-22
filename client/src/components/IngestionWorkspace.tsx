import { useCallback, useEffect, useMemo, useState } from 'react';

type IngestionSourceType = 'youtube_transcript' | 'web_article' | 'podcast_transcript' | 'manual' | string;
type IngestionConfidence = 'high' | 'medium' | 'med' | 'low';
type IngestionStatus = 'draft' | 'needs_review' | 'approved' | 'indexed' | 'rejected';
type KbTarget = 'college_advisor' | 'financial_aid';

interface AdvisingIngestionEntry {
  id: string;
  topic: string;
  student_profile: string;
  problem: string;
  advice_given: string[];
  reasoning: string;
  action_plan: string[];
  risks: string[];
  source_url: string;
  source_type: IngestionSourceType;
  creator?: string;
  captured_at: string;
  confidence: IngestionConfidence;
  review?: {
    status: IngestionStatus;
    approved_at?: string;
    approved_by?: string;
    indexed_at?: string;
    kb_targets?: KbTarget[];
    ingestion_notes?: string;
  };
}

interface IngestionStats {
  entryCount: number;
  bySourceType: Record<string, number>;
  byConfidence: Record<string, number>;
  byStatus?: Record<string, number>;
  indexedCount?: number;
  draftCount?: number;
}
interface SearchResult { entry: AdvisingIngestionEntry; score: number; }

const JWT_KEY = 'college-advisor-jwt';
function authFetch(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem(JWT_KEY);
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...opts, headers });
}

const statusCopy: Record<IngestionStatus, string> = {
  draft: 'Draft',
  needs_review: 'Needs review',
  approved: 'Approved',
  indexed: 'Indexed',
  rejected: 'Rejected',
};

export default function IngestionWorkspace() {
  const [stats, setStats] = useState<IngestionStats | null>(null);
  const [entries, setEntries] = useState<AdvisingIngestionEntry[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<AdvisingIngestionEntry | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [conflictAnalysis, setConflictAnalysis] = useState<any | null>(null);
  const [conflictEntries, setConflictEntries] = useState<Array<{ entry: AdvisingIngestionEntry; score: number; reason: string }>>([]);
  const [coreEvidence, setCoreEvidence] = useState<Array<{ source_type: string; title: string; score: number }>>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const normalize = (entry: AdvisingIngestionEntry): AdvisingIngestionEntry => ({
    ...entry,
    review: entry.review || { status: 'draft', kb_targets: [] },
  });

  const loadStats = useCallback(async () => {
    const r = await authFetch('/api/advising-ingestion/stats');
    if (!r.ok) throw new Error(`Stats failed: ${r.status}`);
    setStats(await r.json());
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await authFetch('/api/advising-ingestion');
      if (!r.ok) throw new Error(`Load failed: ${r.status}`);
      const data = await r.json();
      const list = (data.entries || []).map(normalize);
      setEntries(list);
      setResults([]);
      setSelected(s => s ? (list.find((e: AdvisingIngestionEntry) => e.id === s.id) || null) : (list[0] || null));
      await loadStats();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [loadStats]);

  useEffect(() => { void loadEntries(); }, [loadEntries]);

  const search = useCallback(async () => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await authFetch(`/api/advising-ingestion?q=${encodeURIComponent(query)}&limit=20`);
      if (!r.ok) throw new Error(`Search failed: ${r.status}`);
      const data = await r.json();
      setResults((data.results || []).map((x: SearchResult) => ({ ...x, entry: normalize(x.entry) })));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [query]);

  const approveSelected = useCallback(async () => {
    if (!selected) return;
    setBusyId(selected.id);
    setError(null);
    try {
      const r = await authFetch(`/api/advising-ingestion/${encodeURIComponent(selected.id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'shaobin', targets: ['college_advisor', 'financial_aid'] }),
      });
      if (!r.ok) throw new Error(`Approve failed: ${r.status}`);
      const data = await r.json();
      const updated = normalize(data.entry);
      setSelected(updated);
      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
      setResults(prev => prev.map(r => r.entry.id === updated.id ? { ...r, entry: updated } : r));
      setStats(data.stats || null);
    } catch (err: any) { setError(err.message); }
    finally { setBusyId(null); }
  }, [selected]);

  const analyzeConflicts = useCallback(async () => {
    if (!selected) return;
    setAnalyzing(true);
    setError(null);
    try {
      const r = await authFetch(`/api/advising-ingestion/${encodeURIComponent(selected.id)}/analyze-conflicts`, { method: 'POST' });
      if (!r.ok) throw new Error((await r.json()).error || `Analysis failed: ${r.status}`);
      const data = await r.json();
      setConflictAnalysis(data.analysis);
      setConflictEntries(data.conflicts || []);
      setCoreEvidence(data.coreEvidence || []);
    } catch (err: any) { setError(err.message); }
    finally { setAnalyzing(false); }
  }, [selected]);

  const importText = useCallback(async () => {
    if (textInput.trim().length < 20) { setError('Paste at least 20 characters.'); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await authFetch('/api/advising-ingestion/import/text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: textInput })
      });
      if (!r.ok) throw new Error((await r.json()).error || `Text import failed: ${r.status}`);
      const data = await r.json();
      const entry = normalize(data.entry);
      setEntries(prev => [entry, ...prev]);
      setSelected(entry);
      setConflictEntries(data.conflicts || []);
      setStats(data.stats || null);
      setTextInput('');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [textInput]);

  const importUrl = useCallback(async () => {
    if (!urlInput.trim()) { setError('Paste a web link first.'); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await authFetch('/api/advising-ingestion/import/url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: urlInput })
      });
      if (!r.ok) throw new Error((await r.json()).error || `URL import failed: ${r.status}`);
      const data = await r.json();
      const entry = normalize(data.entry);
      setEntries(prev => [entry, ...prev]);
      setSelected(entry);
      setConflictEntries(data.conflicts || []);
      setStats(data.stats || null);
      setUrlInput('');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [urlInput]);

  const importFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await authFetch('/api/advising-ingestion/import/file', { method: 'POST', body: form });
      if (!r.ok) throw new Error((await r.json()).error || `File import failed: ${r.status}`);
      const data = await r.json();
      const entry = normalize(data.entry);
      setEntries(prev => [entry, ...prev]);
      setSelected(entry);
      setConflictEntries(data.conflicts || []);
      setStats(data.stats || null);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  const visible = useMemo(() => results.length ? results.map(r => ({ ...r.entry, score: r.score })) : entries, [results, entries]);
  const selectedStatus = selected?.review?.status || 'draft';
  const indexed = stats?.indexedCount ?? stats?.byStatus?.indexed ?? 0;
  const drafts = stats?.draftCount ?? ((stats?.byStatus?.draft || 0) + (stats?.byStatus?.needs_review || 0));
  const approved = stats?.byStatus?.approved || 0;
  const rejected = stats?.byStatus?.rejected || 0;

  return (
    <section className="apple-ingest-shell" aria-label="Knowledge Workspace">
      <style>{appleCss}</style>

      <header className="apple-ingest-hero">
        <div>
          <p className="apple-kicker">Shared Knowledge Pipeline</p>
          <h2>Review public-source advising data before College Advisor and Financial Aid can use it.</h2>
          <p className="apple-subtitle">Source → AI draft → human approval → shared knowledge base. No mystery about what got ingested.</p>
        </div>
        <div className="apple-hero-actions">
          <button className="apple-secondary" onClick={loadEntries} disabled={loading}>Reload drafts</button>
          <button className="apple-primary" onClick={approveSelected} disabled={!selected || selectedStatus === 'indexed' || busyId === selected?.id}>
            {busyId === selected?.id ? 'Ingesting…' : selectedStatus === 'indexed' ? 'Already indexed' : 'Approve & Ingest to Shared KB'}
          </button>
        </div>
      </header>

      <section className="apple-intake-card" aria-label="Add new knowledge source">
        <div className="apple-intake-url">
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste web link…" />
          <button className="apple-secondary" onClick={importUrl} disabled={loading}>Import link</button>
          <label className="apple-upload-btn">
            Upload file
            <input type="file" accept=".txt,.md,.csv,.json" onChange={e => void importFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Or paste notes / transcript text here…" />
        <div className="apple-intake-foot">
          <span>New imports become drafts. Conflict check runs before approval.</span>
          <button className="apple-secondary" onClick={importText} disabled={loading || textInput.trim().length < 20}>Create draft from text</button>
        </div>
      </section>

      <div className="apple-pipeline" role="list" aria-label="Ingestion stages">
        <Stage n="1" title="Source captured" count={stats?.entryCount || 0} />
        <Stage n="2" title="AI extracted" count={stats?.entryCount || 0} />
        <Stage n="3" title="Human approved" count={approved + indexed} />
        <Stage n="4" title="Indexed to KB" count={indexed} active />
      </div>

      <div className="apple-metrics">
        <Metric label="Sources" value={stats?.entryCount || 0} />
        <Metric label="Draft / review" value={drafts} />
        <Metric label="Approved" value={approved} />
        <Metric label="Indexed in KB" value={indexed} tone="good" />
        <Metric label="Rejected" value={rejected} tone="warn" />
      </div>

      {error && <div className="apple-error">{error}</div>}

      <div className="apple-workgrid">
        <aside className="apple-card apple-source-queue">
          <div className="apple-card-head">
            <div>
              <p className="apple-card-kicker">Queue</p>
              <h3>Sources & drafts</h3>
            </div>
          </div>
          <div className="apple-search-row">
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && void search()} placeholder="Search drafts…" />
            <button onClick={search} disabled={loading}>Search</button>
          </div>
          <div className="apple-source-list">
            {visible.map((entry: AdvisingIngestionEntry & { score?: number }) => (
              <button key={entry.id} className={`apple-source-item ${selected?.id === entry.id ? 'active' : ''}`} onClick={() => setSelected(entry)}>
                <span className={`apple-status-dot ${entry.review?.status || 'draft'}`} />
                <span className="apple-source-main">
                  <strong>{entry.topic}</strong>
                  <small>{entry.source_type.replace(/_/g, ' ')} · {entry.confidence}{entry.score ? ` · score ${entry.score}` : ''}</small>
                </span>
                <span className={`apple-status-pill ${entry.review?.status || 'draft'}`}>{statusCopy[entry.review?.status || 'draft']}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="apple-card apple-review-pane">
          {selected ? (
            <>
              <div className="apple-card-head wide">
                <div>
                  <p className="apple-card-kicker">AI extracted KB draft</p>
                  <h3>{selected.topic}</h3>
                </div>
                <span className={`apple-status-pill large ${selectedStatus}`}>{statusCopy[selectedStatus]}</span>
              </div>
              <a className="apple-link" href={selected.source_url} target="_blank" rel="noreferrer">Open source proof ↗</a>
              <ReviewBlock title="Student profile" body={selected.student_profile} />
              <ReviewBlock title="Problem" body={selected.problem} />
              <ReviewList title="Advice" items={selected.advice_given} />
              <ReviewBlock title="Reasoning" body={selected.reasoning} />
              <ReviewList title="Action plan" items={selected.action_plan} />
              <ReviewList title="Risks" items={selected.risks} muted />
            </>
          ) : <div className="apple-empty">Select draft.</div>}
        </main>

        <aside className="apple-card apple-readiness">
          <p className="apple-card-kicker">KB readiness</p>
          <h3>Can CA / FA use this?</h3>
          {selected ? (
            <>
              <Checklist label="Public source captured" ok={Boolean(selected.source_url)} />
              <Checklist label="Transcript-grounded extraction" ok={selected.source_type.includes('transcript')} />
              <Checklist label="High confidence" ok={selected.confidence === 'high'} />
              <Checklist label="Human approved" ok={selectedStatus === 'indexed' || selectedStatus === 'approved'} />
              <Checklist label="Indexed to shared KB" ok={selectedStatus === 'indexed'} />

              <div className="apple-targets">
                <div><strong>College Advisor</strong><span>{selected.review?.kb_targets?.includes('college_advisor') ? 'Available' : 'Not indexed'}</span></div>
                <div><strong>Financial Aid</strong><span>{selected.review?.kb_targets?.includes('financial_aid') ? 'Available' : 'Not indexed'}</span></div>
              </div>

              <button className="apple-secondary full" onClick={analyzeConflicts} disabled={analyzing}>
                {analyzing ? 'Checking conflicts…' : 'Run conflict check'}
              </button>

              <div className={`apple-conflict-box ${conflictEntries.length || (conflictAnalysis && conflictAnalysis.relationship !== 'complementary') ? 'warn' : ''}`}>
                <strong>{conflictAnalysis ? `${conflictAnalysis.relationship || 'review'} · ${conflictAnalysis.recommendation || 'flag_for_review'}` : 'Conflict check not run yet'}</strong>
                <span>{conflictAnalysis?.rationale || 'Run conflict check before approving. Approval also runs this gate automatically.'}</span>
                {Array.isArray(conflictAnalysis?.context_conditions) && conflictAnalysis.context_conditions.slice(0, 3).map((x: string) => <p key={x}>• {x}</p>)}
                {coreEvidence.slice(0, 4).map(c => <p key={`${c.source_type}-${c.title}`}>Core KB: {c.title}</p>)}
                {conflictEntries.slice(0, 3).map(c => <p key={c.entry.id}>External note: {c.entry.topic}</p>)}
              </div>

              {selected.review?.indexed_at && <p className="apple-footnote">Indexed at {new Date(selected.review.indexed_at).toLocaleString()}</p>}
            </>
          ) : <p className="apple-footnote">Pick a draft to inspect readiness.</p>}
        </aside>
      </div>
    </section>
  );
}

function Stage({ n, title, count, active }: { n: string; title: string; count: number; active?: boolean }) {
  return <div className={`apple-stage ${active ? 'active' : ''}`}><span>{n}</span><strong>{title}</strong><em>{count}</em></div>;
}
function Metric({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' }) {
  return <div className={`apple-metric ${tone || ''}`}><span>{label}</span><strong>{value}</strong></div>;
}
function ReviewBlock({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return <section className="apple-review-block"><h4>{title}</h4><p>{body}</p></section>;
}
function ReviewList({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  if (!items?.length) return null;
  return <section className={`apple-review-block ${muted ? 'muted' : ''}`}><h4>{title}</h4><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></section>;
}
function Checklist({ label, ok }: { label: string; ok: boolean }) {
  return <div className="apple-check"><span className={ok ? 'ok' : ''}>{ok ? '✓' : '•'}</span><p>{label}</p></div>;
}

const appleCss = `
.apple-ingest-shell{width:100%;height:100%;overflow:hidden;background:#f5f5f7;color:#1d1d1f;font-family:"SF Pro Text",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:32px;display:flex;flex-direction:column;gap:18px}
.apple-ingest-hero{background:#fff;border-radius:28px;padding:34px 38px;display:flex;align-items:flex-end;justify-content:space-between;gap:28px;border:1px solid #e8e8ed}
.apple-kicker,.apple-card-kicker{margin:0 0 7px;color:#7a7a7a;font-size:12px;letter-spacing:-.12px;text-transform:uppercase;font-weight:600}
.apple-ingest-hero h2{margin:0;font-size:40px;line-height:1.05;font-weight:600;letter-spacing:-.42px;color:#1d1d1f;max-width:760px}
.apple-subtitle{margin:12px 0 0;color:#333;font-size:17px;line-height:1.47;letter-spacing:-.374px;max-width:760px}
.apple-hero-actions{display:flex;gap:12px;align-items:center;flex-shrink:0}.apple-primary,.apple-secondary{border:none;border-radius:9999px;padding:11px 22px;font-size:17px;line-height:1.2;cursor:pointer;transition:.16s ease}.apple-primary{background:#0066cc;color:#fff}.apple-primary:hover:not(:disabled){background:#0071e3}.apple-primary:disabled,.apple-secondary:disabled{opacity:.55;cursor:not-allowed}.apple-secondary{background:#fff;color:#0066cc;border:1px solid #d2d2d7}.apple-primary.full{width:100%;margin-top:18px}
.apple-pipeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.apple-stage{background:#fff;border:1px solid #e8e8ed;border-radius:18px;padding:16px;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:12px}.apple-stage span{width:34px;height:34px;border-radius:50%;background:#f5f5f7;display:grid;place-items:center;color:#333;font-weight:600}.apple-stage strong{font-size:15px}.apple-stage em{font-style:normal;color:#0066cc;font-size:22px;font-weight:600}.apple-stage.active{border-color:#0066cc}
.apple-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.apple-metric{background:#fff;border:1px solid #e8e8ed;border-radius:18px;padding:16px}.apple-metric span{display:block;color:#7a7a7a;font-size:12px}.apple-metric strong{display:block;margin-top:4px;font-size:28px;line-height:1.1}.apple-metric.good strong{color:#107c41}.apple-metric.warn strong{color:#b45309}
.apple-error{background:#fff2f2;border:1px solid #ffd7d7;color:#b91c1c;border-radius:14px;padding:12px 16px}.apple-intake-card{background:#fff;border:1px solid #e8e8ed;border-radius:24px;padding:16px;display:grid;gap:12px}.apple-intake-url{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px}.apple-intake-url input,.apple-intake-card textarea{border:1px solid #d2d2d7;background:#fafafc;border-radius:18px;padding:12px 14px;font-size:14px;outline:none}.apple-intake-card textarea{min-height:72px;resize:vertical}.apple-upload-btn{position:relative;display:inline-flex;align-items:center;border-radius:9999px;padding:11px 22px;background:#fff;color:#0066cc;border:1px solid #d2d2d7;cursor:pointer;font-size:17px}.apple-upload-btn input{display:none}.apple-intake-foot{display:flex;justify-content:space-between;gap:16px;align-items:center;color:#7a7a7a;font-size:13px}.apple-workgrid{min-height:0;flex:1;display:grid;grid-template-columns:360px minmax(0,1.55fr) 360px;gap:16px}.apple-card{background:#fff;border:1px solid #e8e8ed;border-radius:24px;min-height:0;overflow:hidden}.apple-card-head{padding:22px 22px 14px;display:flex;align-items:center;justify-content:space-between;gap:14px}.apple-card-head h3{margin:0;font-size:22px;line-height:1.12;letter-spacing:-.28px}.apple-card-head.wide{padding-bottom:6px}.apple-search-row{display:flex;gap:8px;padding:0 16px 14px}.apple-search-row input{flex:1;border:1px solid #d2d2d7;background:#fafafc;border-radius:9999px;padding:10px 14px;font-size:14px;outline:none}.apple-search-row input:focus{border-color:#0066cc}.apple-search-row button{border:none;border-radius:9999px;background:#0066cc;color:#fff;padding:0 16px}.apple-source-list,.apple-review-pane,.apple-readiness{overflow:auto}.apple-source-list{height:calc(100% - 94px);padding:0 8px 12px}.apple-source-item{width:100%;display:grid;grid-template-columns:10px 1fr auto;gap:10px;align-items:center;text-align:left;border:none;background:transparent;border-radius:16px;padding:12px;cursor:pointer}.apple-source-item:hover,.apple-source-item.active{background:#f5f5f7}.apple-source-main strong{display:block;font-size:14px;line-height:1.25;color:#1d1d1f}.apple-source-main small{display:block;margin-top:4px;color:#7a7a7a;font-size:12px}.apple-status-dot{width:8px;height:8px;border-radius:50%;background:#b7b7bd}.apple-status-dot.indexed{background:#107c41}.apple-status-dot.rejected{background:#c2410c}.apple-status-dot.approved{background:#0066cc}.apple-status-pill{white-space:nowrap;border-radius:9999px;background:#f5f5f7;color:#333;padding:5px 9px;font-size:11px;font-weight:600}.apple-status-pill.indexed{background:#e8f7ee;color:#107c41}.apple-status-pill.rejected{background:#fff1e8;color:#c2410c}.apple-status-pill.approved{background:#e8f1ff;color:#0066cc}.apple-status-pill.large{font-size:13px;padding:7px 12px}.apple-link{display:inline-block;margin:0 22px 18px;color:#0066cc;text-decoration:none;font-size:14px}.apple-review-block{padding:0 22px 18px}.apple-review-block h4{margin:0 0 6px;font-size:12px;color:#7a7a7a;text-transform:uppercase;letter-spacing:-.12px}.apple-review-block p,.apple-review-block li{font-size:15px;line-height:1.52;letter-spacing:-.2px;color:#1d1d1f}.apple-review-block ul{margin:0;padding-left:20px}.apple-review-block li{margin:0 0 6px}.apple-review-block.muted li{color:#555}.apple-readiness{padding:22px}.apple-readiness h3{margin:0 0 18px;font-size:22px}.apple-check{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0}.apple-check span{width:22px;height:22px;border-radius:50%;background:#f5f5f7;color:#7a7a7a;display:grid;place-items:center;font-size:13px;font-weight:700}.apple-check span.ok{background:#e8f7ee;color:#107c41}.apple-check p{margin:0;font-size:14px}.apple-targets{margin-top:18px;background:#f5f5f7;border-radius:18px;padding:14px}.apple-targets div{display:flex;justify-content:space-between;gap:12px;padding:8px 0}.apple-targets strong{font-size:14px}.apple-targets span{color:#7a7a7a;font-size:14px}.apple-conflict-box{margin-top:14px;border-radius:16px;background:#f5f5f7;padding:13px;display:grid;gap:5px}.apple-conflict-box.warn{background:#fff7ed;border:1px solid #fed7aa}.apple-conflict-box strong{font-size:14px}.apple-conflict-box span,.apple-conflict-box p{margin:0;color:#7a7a7a;font-size:12px;line-height:1.35}.apple-footnote{color:#7a7a7a;font-size:12px;line-height:1.4}.apple-empty{height:100%;display:grid;place-items:center;color:#7a7a7a}
@media(max-width:1200px){.apple-workgrid{grid-template-columns:320px minmax(0,1fr)}.apple-readiness{display:none}.apple-metrics{grid-template-columns:repeat(3,1fr)}}
`;
