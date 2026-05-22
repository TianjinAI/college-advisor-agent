import { useState, useEffect, useCallback } from 'react';

// Mirror of server AdvisingIngestionEntry — keep in sync with server/src/knowledge/types.ts
export type IngestionSourceType = 'youtube_transcript' | 'web_article' | 'podcast_transcript' | 'manual';
export type IngestionConfidence = 'high' | 'medium' | 'low';

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
  notebooklm_source_id?: string;
  transcript_path?: string;
}

const JWT_KEY = 'college-advisor-jwt';

function getJwt(): string | null {
  return localStorage.getItem(JWT_KEY);
}

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = getJwt();
  const h: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...opts, headers: h });
}

interface IngestionStats {
  entryCount: number;
  bySourceType: Record<string, number>;
  byConfidence: Record<string, number>;
  byTopic: string[];
}

interface SearchResult {
  entry: AdvisingIngestionEntry;
  score: number;
}

export default function AdvisingIngestionPanel() {
  const [stats, setStats] = useState<IngestionStats | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allEntries, setAllEntries] = useState<AdvisingIngestionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [selected, setSelected] = useState<AdvisingIngestionEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const r = await authFetch('/api/advising-ingestion/stats');
      if (!r.ok) throw new Error(`Stats failed: ${r.status}`);
      setStats(await r.json());
    } catch (err: any) {
      setLoadError(err.message);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await authFetch('/api/advising-ingestion');
      if (!r.ok) throw new Error(`Load failed: ${r.status}`);
      const data = await r.json();
      setAllEntries(data.entries || []);
      setResults([]);
      setSelected(null);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setAllEntries([]); setSelected(null); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const r = await authFetch(`/api/advising-ingestion?q=${encodeURIComponent(q)}&limit=10`);
      if (!r.ok) throw new Error(`Search failed: ${r.status}`);
      const data = await r.json();
      setResults(data.results || []);
      setAllEntries([]);
      setSelected(null);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReload = useCallback(async () => {
    setReloading(true);
    setLoadError(null);
    try {
      const r = await authFetch('/api/advising-ingestion/reload', { method: 'POST' });
      if (!r.ok) throw new Error(`Reload failed: ${r.status}`);
      await loadStats();
      await loadAll();
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setReloading(false);
    }
  }, [loadStats, loadAll]);

  useEffect(() => { loadStats(); loadAll(); }, [loadStats, loadAll]);

  const confidenceColor = (c: string) =>
    c === 'high' ? '#10b981' : c === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <div className="ingestion-panel">
      {/* Header row */}
      <div className="ingestion-header">
        <div className="ingestion-title-row">
          <span className="ingestion-title">Advising Ingestion</span>
          <button
            className={`ingestion-reload-btn ${reloading ? 'spinning' : ''}`}
            onClick={handleReload}
            disabled={reloading}
            title="Hot-reload entries from disk"
          >
            {reloading ? '⟳' : '↻'} Reload
          </button>
        </div>
        {loadError && <div className="ingestion-error">{loadError}</div>}
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="ingestion-stats">
          <div className="ingestion-stat-chip">
            <span className="ingestion-stat-num">{stats.entryCount}</span>
            <span className="ingestion-stat-label">entries</span>
          </div>
          {Object.entries(stats.bySourceType).map(([k, v]) => (
            <div key={k} className="ingestion-stat-chip">
              <span className="ingestion-stat-num">{v}</span>
              <span className="ingestion-stat-label">{k.replace('_', ' ')}</span>
            </div>
          ))}
          {Object.entries(stats.byConfidence).map(([k, v]) => (
            <div key={k} className="ingestion-stat-chip">
              <span className="ingestion-stat-num" style={{ color: confidenceColor(k) }}>{v}</span>
              <span className="ingestion-stat-label">{k}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="ingestion-search-wrap">
        <input
          type="text"
          className="ingestion-search"
          placeholder="Search topics, advice, problems…"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) doSearch('');
          }}
          onKeyDown={e => e.key === 'Enter' && doSearch(query)}
        />
        <button
          className="ingestion-search-btn"
          onClick={() => doSearch(query)}
          disabled={loading}
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {/* Body: list + detail */}
      <div className="ingestion-body">
        {/* Left: list */}
        <div className="ingestion-list">
          {loading ? (
            <div className="ingestion-loading">Loading…</div>
          ) : results.length > 0 ? (
            results.map(({ entry, score }) => (
              <IngestionListItem
                key={entry.id}
                entry={entry}
                score={score}
                selected={selected?.id === entry.id}
                onClick={() => setSelected(entry)}
                confidenceColor={confidenceColor}
              />
            ))
          ) : allEntries.length > 0 ? (
            allEntries.map(entry => (
              <IngestionListItem
                key={entry.id}
                entry={entry}
                score={null}
                selected={selected?.id === entry.id}
                onClick={() => setSelected(entry)}
                confidenceColor={confidenceColor}
              />
            ))
          ) : !loading && !loadError ? (
            <div className="ingestion-empty">
              {query ? 'No matches for your search.' : 'No entries yet. Add JSON files to data/advising-ingestion/entries/ and click Reload.'}
            </div>
          ) : null}
        </div>

        {/* Right: detail */}
        {selected ? (
          <div className="ingestion-detail">
            <div className="ingestion-detail-header">
              <span className="ingestion-detail-topic">{selected.topic}</span>
              <button className="ingestion-detail-close" onClick={() => setSelected(null)} title="Close">×</button>
            </div>

            <div className="ingestion-detail-meta">
              <span className="ingestion-confidence-badge" style={{ background: confidenceColor(selected.confidence) }}>
                {selected.confidence}
              </span>
              <span className="ingestion-source-type">{selected.source_type.replace('_', ' ')}</span>
              {selected.creator && <span className="ingestion-creator">{selected.creator}</span>}
            </div>

            {selected.source_url && (
              <a className="ingestion-source-url" href={selected.source_url} target="_blank" rel="noopener noreferrer">
                🔗 {selected.source_url}
              </a>
            )}

            {selected.student_profile && (
              <DetailSection label="Student Profile" content={selected.student_profile} />
            )}
            {selected.problem && (
              <DetailSection label="Problem" content={selected.problem} />
            )}
            {selected.advice_given?.length > 0 && (
              <DetailList label="Advice Given" items={selected.advice_given} color="#3b82f6" />
            )}
            {selected.reasoning && (
              <DetailSection label="Reasoning" content={selected.reasoning} />
            )}
            {selected.action_plan?.length > 0 && (
              <DetailList label="Action Plan" items={selected.action_plan} color="#10b981" />
            )}
            {selected.risks?.length > 0 && (
              <DetailList label="Risks" items={selected.risks} color="#f59e0b" />
            )}
          </div>
        ) : (
          <div className="ingestion-detail-placeholder">
            Select an entry to view details
          </div>
        )}
      </div>

      <style>{`
        .ingestion-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          font-size: 13px;
          font-family: inherit;
        }
        .ingestion-header {
          padding: 10px 12px 6px;
          flex-shrink: 0;
        }
        .ingestion-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ingestion-title {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-primary, #e2e8f0);
        }
        .ingestion-reload-btn {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(59,130,246,0.2);
          color: #60a5fa;
          border: 1px solid rgba(59,130,246,0.3);
          cursor: pointer;
          transition: background 0.15s;
        }
        .ingestion-reload-btn:hover { background: rgba(59,130,246,0.35); }
        .ingestion-reload-btn.spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ingestion-error {
          margin-top: 4px;
          color: #ef4444;
          font-size: 11px;
        }
        .ingestion-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          padding: 0 12px 8px;
          flex-shrink: 0;
        }
        .ingestion-stat-chip {
          display: flex;
          align-items: baseline;
          gap: 3px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 2px 7px;
          font-size: 11px;
        }
        .ingestion-stat-num {
          font-weight: 700;
          font-size: 12px;
          color: var(--text-primary, #e2e8f0);
        }
        .ingestion-stat-label {
          color: var(--text-muted, #94a3b8);
        }
        .ingestion-search-wrap {
          display: flex;
          gap: 6px;
          padding: 0 12px 8px;
          flex-shrink: 0;
        }
        .ingestion-search {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          padding: 6px 10px;
          color: var(--text-primary, #e2e8f0);
          font-size: 12px;
          outline: none;
        }
        .ingestion-search:focus { border-color: rgba(59,130,246,0.5); }
        .ingestion-search::placeholder { color: rgba(148,163,184,0.5); }
        .ingestion-search-btn {
          padding: 5px 10px;
          border-radius: 6px;
          background: #3b82f6;
          color: white;
          border: none;
          font-size: 12px;
          cursor: pointer;
        }
        .ingestion-search-btn:disabled { opacity: 0.5; }
        .ingestion-body {
          display: flex;
          flex: 1;
          overflow: hidden;
          gap: 0;
        }
        .ingestion-list {
          flex: 1;
          overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.06);
          padding: 4px;
        }
        .ingestion-loading, .ingestion-empty {
          padding: 16px 12px;
          color: var(--text-muted, #94a3b8);
          font-size: 12px;
          text-align: center;
        }
        .ingestion-detail {
          width: 45%;
          overflow-y: auto;
          padding: 10px;
          flex-shrink: 0;
        }
        .ingestion-detail-placeholder {
          width: 45%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #94a3b8);
          font-size: 12px;
          flex-shrink: 0;
        }
        .ingestion-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .ingestion-detail-topic {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-primary, #e2e8f0);
          line-height: 1.4;
          flex: 1;
          margin-right: 8px;
        }
        .ingestion-detail-close {
          background: none;
          border: none;
          color: var(--text-muted, #94a3b8);
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .ingestion-detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 8px;
        }
        .ingestion-confidence-badge {
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          text-transform: capitalize;
        }
        .ingestion-source-type {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          color: var(--text-secondary, #94a3b8);
          text-transform: capitalize;
        }
        .ingestion-creator {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          font-style: italic;
        }
        .ingestion-source-url {
          display: block;
          font-size: 11px;
          color: #60a5fa;
          text-decoration: none;
          margin-bottom: 10px;
          word-break: break-all;
        }
        .ingestion-source-url:hover { text-decoration: underline; }
        .ingestion-detail-section { margin-bottom: 10px; }
        .ingestion-detail-section-label {
          font-weight: 600;
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .ingestion-detail-section-content {
          font-size: 12px;
          color: var(--text-secondary, #cbd5e1);
          line-height: 1.5;
        }
        .ingestion-detail-list { margin-bottom: 10px; }
        .ingestion-detail-list-label {
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .ingestion-detail-list ul {
          margin: 0;
          padding-left: 16px;
        }
        .ingestion-detail-list li {
          font-size: 12px;
          color: var(--text-secondary, #cbd5e1);
          line-height: 1.5;
          margin-bottom: 3px;
        }
        /* List item row */
        .ingestion-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 7px 9px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.12s, border-color 0.12s;
          margin-bottom: 2px;
        }
        .ingestion-item:hover { background: rgba(255,255,255,0.04); }
        .ingestion-item.selected {
          background: rgba(59,130,246,0.12);
          border-color: rgba(59,130,246,0.3);
        }
        .ingestion-item-row1 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .ingestion-item-topic {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary, #e2e8f0);
          line-height: 1.3;
          flex: 1;
        }
        .ingestion-item-score {
          font-size: 10px;
          color: #60a5fa;
          font-weight: 700;
          flex-shrink: 0;
        }
        .ingestion-item-meta {
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .ingestion-item-conf {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ingestion-item-source {
          font-size: 10px;
          color: var(--text-muted, #94a3b8);
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function IngestionListItem({
  entry,
  score,
  selected,
  onClick,
  confidenceColor,
}: {
  entry: AdvisingIngestionEntry;
  score: number | null;
  selected: boolean;
  onClick: () => void;
  confidenceColor: (c: string) => string;
}) {
  return (
    <div className={`ingestion-item ${selected ? 'selected' : ''}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="ingestion-item-row1">
        <span className="ingestion-item-topic">{entry.topic}</span>
        {score !== null && <span className="ingestion-item-score">#{score}</span>}
      </div>
      <div className="ingestion-item-meta">
        <span className="ingestion-item-conf" style={{ background: confidenceColor(entry.confidence) }} />
        <span className="ingestion-item-source">{entry.source_type.replace('_', ' ')}</span>
        {entry.creator && <span className="ingestion-item-source">· {entry.creator.split('/')[0].trim()}</span>}
      </div>
    </div>
  );
}

function DetailSection({ label, content }: { label: string; content: string }) {
  return (
    <div className="ingestion-detail-section">
      <div className="ingestion-detail-section-label">{label}</div>
      <div className="ingestion-detail-section-content">{content}</div>
    </div>
  );
}

function DetailList({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div className="ingestion-detail-list">
      <div className="ingestion-detail-list-label" style={{ color }}>{label}</div>
      <ul>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}