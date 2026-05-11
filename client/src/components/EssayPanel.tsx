import { useState, useEffect } from 'react';
import EssayWorkspace from './EssayWorkspace';

interface EssayPrompt {
  id: string;
  category: string;
  title: string;
  prompt: string;
  wordLimit: string;
  tips: string[];
  pitfalls: string[];
  examples?: string[];
}

interface EssayPattern {
  id: string;
  type: string;
  name: string;
  description: string;
  structure: string[];
  bestFor: string[];
  cautionNotes: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'common-app': 'Common App',
  'why-us': 'Why Us',
  'why-major': 'Why Major',
  'community': 'Community',
  'challenge': 'Challenge',
  'intellectual': 'Intellectual',
  'creative': 'Creative',
  'short-answer': 'Short Answer',
  'additional-info': 'Additional Info',
};

const CATEGORY_ORDER = [
  'common-app', 'why-us', 'why-major', 'community',
  'challenge', 'intellectual', 'creative', 'short-answer', 'additional-info',
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  'narrative-arc': '#3b82f6',
  'montage': '#8b5cf6',
  'dialogue-driven': '#10b981',
  'object-metaphor': '#f59e0b',
  'counter-intuitive': '#ef4444',
  'academic-deep-dive': '#06b6d4',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function PromptSection({ prompt }: { prompt: EssayPrompt }) {
  const [expanded, setExpanded] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [pitfallsOpen, setPitfallsOpen] = useState(false);

  return (
    <div className="essay-prompt-item">
      <button
        type="button"
        className="essay-prompt-header"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className="essay-prompt-title">{prompt.title}</span>
        <span className="essay-prompt-meta">
          <span className="essay-category-badge">{CATEGORY_LABELS[prompt.category] || prompt.category}</span>
          <span className="essay-word-limit">{prompt.wordLimit}</span>
          <span className="essay-expand-icon" aria-hidden="true">{expanded ? '\u25B2' : '\u25BC'}</span>
        </span>
      </button>

      {expanded && (
        <div className="essay-prompt-body">
          <p className="essay-prompt-text">"{prompt.prompt}"</p>

          <div className="essay-prompt-toggles">
            <button
              type="button"
              className={`essay-toggle-btn ${tipsOpen ? 'active' : ''}`}
              onClick={() => setTipsOpen(o => !o)}
            >
              Tips {tipsOpen ? '\u25B2' : '\u25BC'}
            </button>
            <button
              type="button"
              className={`essay-toggle-btn ${pitfallsOpen ? 'active' : ''}`}
              onClick={() => setPitfallsOpen(o => !o)}
            >
              Pitfalls {pitfallsOpen ? '\u25B2' : '\u25BC'}
            </button>
          </div>

          {tipsOpen && (
            <ul className="essay-tip-list">
              {prompt.tips.map((tip, i) => (
                <li key={i} className="essay-tip">{tip}</li>
              ))}
            </ul>
          )}

          {pitfallsOpen && (
            <ul className="essay-pitfall-list">
              {prompt.pitfalls.map((p, i) => (
                <li key={i} className="essay-pitfall">{p}</li>
              ))}
            </ul>
          )}

          {prompt.examples && prompt.examples.length > 0 && (
            <div className="essay-examples">
              <p className="essay-examples-label">Example openings:</p>
              {prompt.examples.map((ex, i) => (
                <p key={i} className="essay-example">"{ex}"</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern }: { pattern: EssayPattern }) {
  const [expanded, setExpanded] = useState(false);
  const badgeColor = TYPE_BADGE_COLORS[pattern.type] || '#6b7280';

  return (
    <div className="essay-pattern-card">
      <button
        type="button"
        className="essay-pattern-header"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className="essay-pattern-top">
          <span className="essay-pattern-name">{pattern.name}</span>
          <span
            className="essay-type-badge"
            style={{ background: badgeColor + '22', color: badgeColor, borderColor: badgeColor + '44' }}
          >
            {pattern.type}
          </span>
        </div>
        <p className="essay-pattern-desc">{pattern.description.substring(0, 100)}{pattern.description.length > 100 ? '...' : ''}</p>
        <span className="essay-expand-icon" aria-hidden="true">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <div className="essay-pattern-body">
          <p className="essay-pattern-full-desc">{pattern.description}</p>

          <div className="essay-structure">
            <p className="essay-structure-label">Structure:</p>
            <ol className="essay-structure-list">
              {pattern.structure.map((step, i) => (
                <li key={i} className="essay-structure-step">{step}</li>
              ))}
            </ol>
          </div>

          <div className="essay-best-for">
            <span className="essay-best-for-label">Best For: </span>
            {pattern.bestFor.map((b, i) => (
              <span key={i} className="essay-best-for-tag">{b}</span>
            ))}
          </div>

          <p className="essay-caution">
            <strong>Caution:</strong> {pattern.cautionNotes}
          </p>
        </div>
      )}
    </div>
  );
}

interface EssayWorkspaceProps {
  prompts?: EssayPrompt[];   // loaded by EssayPanel internally; optional here
  userId: string;
  currentModel: string;
}

export default function EssayPanel({ userId, currentModel }: EssayWorkspaceProps) {
  const [prompts, setPrompts] = useState<EssayPrompt[]>([]);
  const [patterns, setPatterns] = useState<EssayPattern[]>([]);
  const [activeTab, setActiveTab] = useState<'prompts' | 'patterns' | 'review'>('prompts');
  const [promptSearch, setPromptSearch] = useState('');
  const [patternSearch, setPatternSearch] = useState('');
  const [patternTypeFilter, setPatternTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const debouncedPromptSearch = useDebounce(promptSearch, 200);
  const debouncedPatternSearch = useDebounce(patternSearch, 200);

  useEffect(() => {
    Promise.all([
      fetch('/api/essays/prompts').then(r => r.json()).catch(() => ({ prompts: [] })),
      fetch('/api/essays/patterns').then(r => r.json()).catch(() => ({ patterns: [] })),
    ]).then(([pData, patData]) => {
      setPrompts(pData.prompts || []);
      setPatterns(patData.patterns || []);
      setLoading(false);
    });
  }, []);

  const filteredPrompts = prompts.filter(p => {
    if (!debouncedPromptSearch) return true;
    const q = debouncedPromptSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.prompt.toLowerCase().includes(q) ||
      p.tips.some(t => t.toLowerCase().includes(q))
    );
  });

  const promptsByCategory: Record<string, EssayPrompt[]> = {};
  for (const cat of CATEGORY_ORDER) {
    promptsByCategory[cat] = filteredPrompts.filter(p => p.category === cat);
  }

  const filteredPatterns = patterns.filter(p => {
    if (patternTypeFilter !== 'all' && p.type !== patternTypeFilter) return false;
    if (!debouncedPatternSearch) return true;
    const q = debouncedPatternSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <aside className="essay-panel loading">
        <div className="essay-loading-text">Loading essays...</div>
      </aside>
    );
  }

  return (
    <aside className={`essay-panel ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="essay-panel-toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <span>Essay Writing</span>
        <span aria-hidden="true">{collapsed ? '\u2039' : '\u203A'}</span>
      </button>

      {!collapsed && (
        <div className="essay-panel-body">
          {/* Tab switcher */}
          <div className="essay-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'prompts'}
              className={`essay-tab ${activeTab === 'prompts' ? 'active' : ''}`}
              onClick={() => setActiveTab('prompts')}
            >
              Prompts
              <span className="essay-tab-count">{prompts.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'patterns'}
              className={`essay-tab ${activeTab === 'patterns' ? 'active' : ''}`}
              onClick={() => setActiveTab('patterns')}
            >
              Patterns
              <span className="essay-tab-count">{patterns.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'review'}
              className={`essay-tab ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              Review
            </button>
          </div>

          {/* Prompts tab */}
          {activeTab === 'prompts' && (
            <div className="essay-prompts-view" role="tabpanel">
              <div className="essay-search-wrap">
                <input
                  type="search"
                  className="essay-search"
                  placeholder="Search prompts..."
                  value={promptSearch}
                  onChange={e => setPromptSearch(e.target.value)}
                  aria-label="Search essay prompts"
                />
              </div>

              <div className="essay-prompt-list">
                {CATEGORY_ORDER.map(cat => {
                  const items = promptsByCategory[cat];
                  if (!items || items.length === 0) return null;
                  return (
                    <details key={cat} className="essay-category-section" open={items.length < 5}>
                      <summary className="essay-category-summary">
                        {CATEGORY_LABELS[cat] || cat}
                        <span className="essay-category-count">{items.length}</span>
                      </summary>
                      {items.map(prompt => (
                        <PromptSection key={prompt.id} prompt={prompt} />
                      ))}
                    </details>
                  );
                })}

                {filteredPrompts.length === 0 && (
                  <p className="essay-empty-state">No prompts match "{promptSearch}"</p>
                )}
              </div>
            </div>
          )}

          {/* Patterns tab */}
          {activeTab === 'patterns' && (
            <div className="essay-patterns-view" role="tabpanel">
              <div className="essay-search-wrap">
                <input
                  type="search"
                  className="essay-search"
                  placeholder="Search patterns..."
                  value={patternSearch}
                  onChange={e => setPatternSearch(e.target.value)}
                  aria-label="Search essay patterns"
                />
              </div>

              <div className="essay-type-filter">
                <select
                  className="essay-type-select"
                  value={patternTypeFilter}
                  onChange={e => setPatternTypeFilter(e.target.value)}
                  aria-label="Filter by pattern type"
                >
                  <option value="all">All Types</option>
                  <option value="narrative-arc">Narrative Arc</option>
                  <option value="montage">Montage</option>
                  <option value="dialogue-driven">Dialogue-Driven</option>
                  <option value="object-metaphor">Object-Metaphor</option>
                  <option value="counter-intuitive">Counter-Intuitive</option>
                  <option value="academic-deep-dive">Academic Deep-Dive</option>
                </select>
              </div>

              <div className="essay-pattern-grid">
                {filteredPatterns.map(pattern => (
                  <PatternCard key={pattern.id} pattern={pattern} />
                ))}
              </div>

              {filteredPatterns.length === 0 && (
                <p className="essay-empty-state">No patterns match "{patternSearch}"</p>
              )}
            </div>
          )}

          {/* Review tab */}
          {activeTab === 'review' && (
            <div className="essay-review-view" role="tabpanel">
              <EssayWorkspace
                prompts={prompts}
                userId={userId}
                currentModel={currentModel}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
