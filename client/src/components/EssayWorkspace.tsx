import { useState, useEffect, useRef, useCallback } from 'react';
import type { EssayEntry } from '../types';

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

interface EssayWorkspaceProps {
  prompts: EssayPrompt[];
  userId: string;
  currentModel: string;
}

interface ReviewState {
  essayId: string | null;
  content: string;
  isStreaming: boolean;
  error: string | null;
}

export default function EssayWorkspace({ prompts, userId, currentModel }: EssayWorkspaceProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<EssayPrompt | null>(null);
  const [draftText, setDraftText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [review, setReview] = useState<ReviewState>({ essayId: null, content: '', isStreaming: false, error: null });
  const [essayHistory, setEssayHistory] = useState<EssayEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, (data: Record<string, unknown>) => void>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewEndRef = useRef<HTMLDivElement>(null);

  // ─── WebSocket connection ────────────────────────────────────────────────

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      console.log('[EssayWS] Connected');
    };
    ws.onclose = () => {
      setWsConnected(false);
      console.log('[EssayWS] Reconnecting in 3s...');
      reconnectTimer.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        const type = data.type as string;
        const handler = handlersRef.current.get(type);
        if (handler) handler(data);
      } catch (e) {
        console.error('[EssayWS] Parse error:', e);
      }
    };

    wsRef.current = ws;
  }, []);

  const onWs = useCallback((type: string, handler: (data: Record<string, unknown>) => void) => {
    handlersRef.current.set(type, handler);
  }, []);

  const offWs = useCallback((type: string) => {
    handlersRef.current.delete(type);
  }, []);

  const sendWs = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // ─── Load essay history ─────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/essays/user/${userId}`)
      .then(r => r.json())
      .then(data => setEssayHistory(data.essays || []))
      .catch(() => setEssayHistory([]));
  }, [userId]);

  // ─── Word count ─────────────────────────────────────────────────────────

  useEffect(() => {
    const words = draftText.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [draftText]);

  // ─── Auto-scroll review ────────────────────────────────────────────────

  useEffect(() => {
    reviewEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [review.content]);

  // ─── Register WS handlers ───────────────────────────────────────────────

  useEffect(() => {
    const handleReviewStart = (data: Record<string, unknown>) => {
      const payload = data.payload as { essayId: string };
      setReview({ essayId: payload.essayId, content: '', isStreaming: true, error: null });
      setIsSubmitting(false);
    };

    const handleReviewDelta = (data: Record<string, unknown>) => {
      const payload = data.payload as { text: string; done: boolean };
      if (payload.done) {
        setReview(r => ({ ...r, isStreaming: false }));
      } else {
        setReview(r => ({ ...r, content: r.content + payload.text }));
      }
    };

    const handleReviewError = (data: Record<string, unknown>) => {
      const payload = data.payload as { text: string };
      setReview(r => ({ ...r, isStreaming: false, error: payload.text }));
      setIsSubmitting(false);
    };

    onWs('review_start', handleReviewStart);
    onWs('review_delta', handleReviewDelta);
    onWs('review_error', handleReviewError);

    return () => {
      offWs('review_start');
      offWs('review_delta');
      offWs('review_error');
    };
  }, [onWs, offWs]);

  // ─── Submit essay for review ───────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!selectedPrompt || !draftText.trim() || isSubmitting || !wsConnected) return;

    setIsSubmitting(true);
    setReview({ essayId: null, content: '', isStreaming: false, error: null });
    setSelectedHistoryId(null);

    try {
      // Save essay to server
      const res = await fetch(`/api/essays/user/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: selectedPrompt.id,
          promptLabel: selectedPrompt.title,
          draftText: draftText.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save essay');
      }

      const { essay } = await res.json();

      // Send review request via WebSocket
      sendWs({
        type: 'review_essay',
        payload: {
          essayId: essay.id,
          essayText: draftText.trim(),
          promptId: selectedPrompt.id,
          promptLabel: selectedPrompt.title,
          promptText: selectedPrompt.prompt,
          wordLimit: selectedPrompt.wordLimit,
          tips: selectedPrompt.tips,
          pitfalls: selectedPrompt.pitfalls,
          userId,
          model: currentModel,
        },
      });
    } catch (err: any) {
      setReview({ essayId: null, content: '', isStreaming: false, error: err.message || 'Submission failed' });
      setIsSubmitting(false);
    }
  }, [selectedPrompt, draftText, isSubmitting, wsConnected, userId, currentModel, sendWs]);

  // ─── Load history entry ───────────────────────────────────────────────

  const handleLoadHistory = useCallback((entry: EssayEntry) => {
    setSelectedHistoryId(entry.id);
    const prompt = prompts.find(p => p.id === entry.promptId) || prompts[0];
    if (prompt) setSelectedPrompt(prompt);
    setDraftText(entry.draftText);
    if (entry.review) {
      setReview({ essayId: entry.id, content: entry.review.content, isStreaming: false, error: null });
    } else {
      setReview({ essayId: entry.id, content: '', isStreaming: false, error: null });
    }
  }, [prompts]);

  // ─── Render ────────────────────────────────────────────────────────────

  const selectedLimit = selectedPrompt?.wordLimit || '';
  const overLimit = selectedLimit && wordCount > parseInt(selectedLimit.replace(/\D/g, '')) * 1.1;
  const canSubmit = selectedPrompt && draftText.trim().length > 50 && !isSubmitting && wsConnected;

  return (
    <div className="essay-workspace">
      {/* Top: Submit area + History sidebar */}
      <div className="essay-workspace-layout">
        {/* Left: Editor */}
        <div className="essay-workspace-main">
          {/* Prompt selector */}
          <div className="essay-prompt-select-wrap">
            <label className="essay-workspace-label" htmlFor="essay-prompt-select">
              Which prompt are you answering?
            </label>
            <select
              id="essay-prompt-select"
              className="essay-prompt-select"
              value={selectedPrompt?.id || ''}
              onChange={e => {
                const p = prompts.find(p => p.id === e.target.value);
                setSelectedPrompt(p || null);
                setReview({ essayId: null, content: '', isStreaming: false, error: null });
              }}
            >
              <option value="">— Select a prompt —</option>
              {prompts.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.title} ({p.wordLimit})
                </option>
              ))}
            </select>
          </div>

          {selectedPrompt && (
            <div className="essay-prompt-preview">
              <p className="essay-prompt-preview-text">"{selectedPrompt.prompt}"</p>
              <div className="essay-prompt-preview-meta">
                <span className="essay-prompt-preview-limit">Limit: {selectedPrompt.wordLimit}</span>
                {selectedPrompt.tips.length > 0 && (
                  <span className="essay-prompt-preview-tip-count">{selectedPrompt.tips.length} tips available</span>
                )}
              </div>
            </div>
          )}

          {/* Draft textarea */}
          <div className="essay-draft-wrap">
            <div className="essay-draft-header">
              <label className="essay-workspace-label" htmlFor="essay-draft">
                Your Essay Draft
              </label>
              <span className={`essay-word-count ${overLimit ? 'over-limit' : ''}`}>
                {wordCount} words
                {selectedLimit && (
                  <> / {selectedLimit}
                    {overLimit && <span className="essay-over-limit-warn"> (over limit!)</span>}
                  </>
                )}
              </span>
            </div>
            <textarea
              id="essay-draft"
              className="essay-draft-textarea"
              value={draftText}
              onChange={e => {
                setDraftText(e.target.value);
                setReview({ essayId: null, content: '', isStreaming: false, error: null });
                setSelectedHistoryId(null);
              }}
              placeholder="Paste your essay draft here (minimum 50 words)..."
              rows={14}
              disabled={isSubmitting || review.isStreaming}
            />
          </div>

          {/* Submit */}
          <div className="essay-submit-row">
            <button
              type="button"
              className={`essay-review-btn ${isSubmitting || review.isStreaming ? 'loading' : ''}`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Saving essay...' : review.isStreaming ? 'Review streaming...' : 'Submit for Review'}
            </button>
            {!wsConnected && (
              <span className="essay-ws-status disconnected">Reconnecting to server...</span>
            )}
            {review.error && (
              <span className="essay-review-error">{review.error}</span>
            )}
          </div>

          {/* Streaming review */}
          {(review.content || review.isStreaming) && (
            <div className="essay-review-output">
              <div className="essay-review-header">
                <span className="essay-review-title">Essay Review</span>
                {review.isStreaming && <span className="essay-review-streaming-dot" />}
              </div>
              <div className="essay-review-body">
                {/* Simple markdown-ish rendering */}
                <div className="essay-review-markdown">
                  {review.content.split('\n').map((line, i) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('### ')) return <h4 key={i} className="review-h4">{trimmed.slice(4)}</h4>;
                    if (trimmed.startsWith('## ')) return <h3 key={i} className="review-h3">{trimmed.slice(3)}</h3>;
                    if (trimmed.startsWith('**') && trimmed.endsWith('**')) return <p key={i} className="review-bold"><strong>{trimmed.slice(2, -2)}</strong></p>;
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <li key={i} className="review-li">{trimmed.slice(2)}</li>;
                    if (/^\d+\.\s/.test(trimmed)) return <li key={i} className="review-li-num">{trimmed.replace(/^\d+\.\s/, '')}</li>;
                    if (trimmed === '') return <br key={i} />;
                    return <p key={i} className="review-p">{trimmed}</p>;
                  })}
                  {review.isStreaming && <span className="review-cursor" aria-hidden="true">▍</span>}
                </div>
                <div ref={reviewEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Right: History sidebar */}
        <div className="essay-history-sidebar">
          <p className="essay-history-title">Past Essays ({essayHistory.length})</p>
          {essayHistory.length === 0 ? (
            <p className="essay-history-empty">No essays submitted yet.</p>
          ) : (
            <ul className="essay-history-list">
              {essayHistory.map(entry => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`essay-history-item ${selectedHistoryId === entry.id ? 'active' : ''}`}
                    onClick={() => handleLoadHistory(entry)}
                  >
                    <span className="essay-history-label">{entry.promptLabel}</span>
                    <span className="essay-history-meta">
                      {entry.wordCount}w · {new Date(entry.submittedAt).toLocaleDateString()}
                    </span>
                    {entry.review ? (
                      <span className="essay-history-reviewed">✓ reviewed</span>
                    ) : (
                      <span className="essay-history-no-review">pending</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
