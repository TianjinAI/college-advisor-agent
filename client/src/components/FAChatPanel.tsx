import { useState, useEffect, useRef, useCallback } from 'react';
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import MessageBubble from './MessageBubble';
import ModelSwitcher from './ModelSwitcher';
import type { ChatMessage, FinancialProfile } from '../types';

const SUGGESTIONS = [
  "What's my estimated family contribution?",
  'Which of my target schools meet 100% of need?',
  'What private scholarships am I eligible for?',
  'How does ED affect my financial aid?',
];

interface FAChatPanelProps {
  financialProfile: FinancialProfile;
  userId: string;
  sessionId: string | null;
  isStreaming: boolean;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  availableModels: string[];
  currentModel: string;
  onModelChange: (model: string) => void;
  isLoadingModels: boolean;
}

type MessageSource = ChatMessage['source'];

function normalizeMessageSource(raw: unknown): MessageSource {
  if (typeof raw !== 'string') return undefined;

  const value = raw.toLowerCase();
  const hasWeb = /web|search|tavily|internet/.test(value);
  const hasKb = /kb|knowledge|context|school|insight/.test(value);

  if (hasWeb && hasKb) return 'hybrid';
  if (hasWeb) return 'web';
  if (hasKb) return 'kb';
  return undefined;
}

function inferResponseSource(prompt: string): Exclude<MessageSource, undefined> {
  const normalized = prompt.toLowerCase();
  const needsWeb = /(latest|current|today|recent|deadline|deadlines|ranking|rankings|tuition|cost|scholarship|scholarships|fafsa|css|202[6-9]|202\d|费用|截止|最新|排名|学费|奖学金)/.test(normalized);
  return needsWeb ? 'web' : 'kb';
}

function mergeSources(current: MessageSource, next: MessageSource): MessageSource {
  if (!current) return next;
  if (!next || current === next) return current;
  return 'hybrid';
}

export default function FAChatPanel({
  financialProfile,
  userId,
  sessionId,
  isStreaming,
  setIsStreaming,
  availableModels,
  currentModel,
  onModelChange,
  isLoadingModels,
}: FAChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handlersRegistered = useRef(false);
  const pendingSourceRef = useRef<Exclude<MessageSource, undefined>>('kb');
  const { isConnected, on, send } = useWebSocket('/ws');

  // Keep refs to stable callbacks
  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;
  const setIsStreamingRef = useRef(setIsStreaming);
  setIsStreamingRef.current = setIsStreaming;

  // Auto-scroll to bottom — only when not streaming (avoids input bounce during streaming)
  useEffect(() => {
    if (isStreaming) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isStreaming]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }, [input]);

  useEffect(() => {
    if (!currentModel || !isConnected) return;
    send({
      type: 'set_model',
      payload: { model: currentModel },
    });
  }, [currentModel, isConnected, send]);

  // Register WebSocket message handlers — only once
  useEffect(() => {
    if (handlersRegistered.current) return;
    handlersRegistered.current = true;

    const handleFAStart = (data: Record<string, unknown>) => {
      const payload = data.payload as { messageId: string; source?: string };
      setMessagesRef.current((prev: ChatMessage[]) => [
        ...prev,
        {
          id: payload?.messageId || `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          source: normalizeMessageSource(payload?.source) ?? pendingSourceRef.current,
          userId,
        },
      ]);
      setInlineError(null);
      setIsStreamingRef.current(true);
    };

    const handleFADelta = (data: Record<string, unknown>) => {
      const payload = data.payload as { text: string; done: boolean; messageId: string; source?: string };
      setMessagesRef.current((prev: ChatMessage[]) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          const nextSource = mergeSources(
            last.source,
            normalizeMessageSource(payload?.source) ??
              ((payload?.text || '').includes('http://') || (payload?.text || '').includes('https://') ? 'web' : undefined)
          );
          return prev.map((msg: ChatMessage, i: number) =>
            i === prev.length - 1
              ? { ...msg, content: msg.content + (payload?.text || ''), source: nextSource }
              : msg
          );
        }
        return prev;
      });

      if (payload?.done) {
        setIsStreamingRef.current(false);
      }
    };

    const handleFAError = (data: Record<string, unknown>) => {
      const payload = data.payload as { text: string };
      setInlineError(payload?.text || 'Unable to generate a financial aid reply right now.');
      setMessagesRef.current((prev: ChatMessage[]) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${payload?.text || 'Unknown error'}`,
          timestamp: Date.now(),
          userId,
        },
      ]);
      setIsStreamingRef.current(false);
    };

    on('fa_start', handleFAStart);
    on('fa_delta', handleFADelta);
    on('fa_error', handleFAError);
  }, [on, userId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      userId,
    };

    setMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    setInput('');
    setInlineError(null);
    pendingSourceRef.current = inferResponseSource(text);

    // Build conversation history (last 12 messages, excluding current)
    const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));

    send({
      type: 'fa_query',
      payload: {
        content: text,
        financialProfile,
        history,
        userId,
        sessionId,
        model: currentModel,
      },
    });
  }, [input, isStreaming, messages, financialProfile, send, userId, sessionId, currentModel]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const handleExport = () => {
    const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant' && message.content.trim());
    if (!lastAssistantMessage) {
      setInlineError('No assistant markdown is available to export yet.');
      return;
    }

    const exportedAt = new Date();
    const header = [
      '# Financial Aid Advisor Export',
      '',
      `Exported: ${exportedAt.toLocaleString()}`,
      '',
      '---',
      '',
    ].join('\n');

    const blob = new Blob([`${header}${lastAssistantMessage.content}\n`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-aid-advisor-${exportedAt.toISOString().replace(/[:.]/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setInlineError(null);
  };

  return (
    <div className="chat-panel">
      <div className="connection-status">
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span>{isConnected ? 'Connected to FA advisor session' : 'Reconnecting...'}</span>
        <span className="connection-divider" aria-hidden="true">•</span>
        <span className="connection-mode">{isConnected ? (sessionId ? 'Session active' : 'No session') : 'Waiting for socket'}</span>
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-screen">
            <div className="welcome-copy">
              <p className="eyebrow">Start with your situation</p>
              <h2>Ask about aid strategy, school net costs, scholarships, or your timeline.</h2>
              <p>
                The financial aid advisor uses your financial profile and local session context to answer aid,
                scholarship, FAFSA, CSS Profile, and affordability questions.
              </p>
            </div>
            <div className="welcome-grid">
              <div className="welcome-card">
                <p className="welcome-card-label">Good first prompts</p>
                <div className="suggestions">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      className="suggestion-chip"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="welcome-card welcome-card-muted">
                <p className="welcome-card-label">What improves the answer</p>
                <ul className="welcome-list">
                  <li>Family size, income, assets, and students in college</li>
                  <li>Target schools, residency, and deadline timing</li>
                  <li>Special circumstances that may support an appeal</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'}
          />
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="typing-indicator" aria-hidden="true">
            <div className="typing-indicator-avatar" />
            <div className="typing-indicator-content">
              <span className="typing-line typing-line-wide"></span>
              <span className="typing-line"></span>
              <span className="typing-line typing-line-short"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="composer-shell">
        {inlineError && (
          <div className="inline-error" role="status">
            {inlineError}
          </div>
        )}
        <div className="composer-toolbar">
          <button
            type="button"
            className="export-button"
            onClick={handleExport}
            disabled={!messages.some((message) => message.role === 'assistant' && message.content.trim())}
          >
            <span aria-hidden="true">↓</span>
            <span>Export</span>
          </button>
        </div>
        <div className="input-container">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about aid strategy, scholarships, net cost, FAFSA, CSS Profile, or affordability..."
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            aria-label={isStreaming ? 'Waiting for response' : 'Send message'}
          >
            {isStreaming ? '...' : 'Send'}
          </button>
        </div>
        <div className="chat-footer">
          <div className="model-endpoint">Endpoint: `/api/models`</div>
          <ModelSwitcher
            availableModels={availableModels}
            currentModel={currentModel}
            onChange={onModelChange}
            isLoading={isLoadingModels}
          />
        </div>
      </div>
    </div>
  );
}
