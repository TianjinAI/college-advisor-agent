import { useState, useEffect, useRef, useCallback } from 'react';
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import MessageBubble from './MessageBubble';
import ModelSwitcher from './ModelSwitcher';
import type { ChatMessage, SchoolSelection, StudentProfile } from '../types';

const SUGGESTIONS = [
  '推荐 10 所适合我的大学',
  '帮我对比 UC Berkeley 和 UCLA',
  '计算机专业排名前 20 的大学',
  '预算 5 万以内有什么好选择？',
];

interface ChatPanelProps {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  profile: StudentProfile;
  isStreaming: boolean;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  selectedSchool: SchoolSelection | null;
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
  const needsWeb = /(latest|current|today|recent|deadline|deadlines|ranking|rankings|tuition|acceptance rate|news|202[6-9]|202\d|费用|截止|最新|排名|学费|录取率)/.test(normalized);
  return needsWeb ? 'web' : 'kb';
}

function mergeSources(current: MessageSource, next: MessageSource): MessageSource {
  if (!current) return next;
  if (!next || current === next) return current;
  return 'hybrid';
}

export default function ChatPanel({
  messages,
  setMessages,
  profile,
  isStreaming,
  setIsStreaming,
  selectedSchool,
  availableModels,
  currentModel,
  onModelChange,
  isLoadingModels,
}: ChatPanelProps) {
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }, [input]);

  useEffect(() => {
    if (!selectedSchool) return;
    setInput(selectedSchool.name);
    textareaRef.current?.focus();
  }, [selectedSchool]);

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

    const handleTextStart = (data: Record<string, unknown>) => {
      const payload = data.payload as { messageId: string; source?: string };
      setMessagesRef.current((prev: ChatMessage[]) => [
        ...prev,
        {
          id: payload?.messageId || `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          source: normalizeMessageSource(payload?.source) ?? pendingSourceRef.current,
        },
      ]);
      setInlineError(null);
      setIsStreamingRef.current(true);
    };

    const handleTextDelta = (data: Record<string, unknown>) => {
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

    const handleError = (data: Record<string, unknown>) => {
      const payload = data.payload as { text: string };
      setInlineError(payload?.text || 'Unable to generate a reply right now.');
      setMessagesRef.current((prev: ChatMessage[]) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${payload?.text || 'Unknown error'}`,
          timestamp: Date.now(),
        },
      ]);
      setIsStreamingRef.current(false);
    };

    on('text_start', handleTextStart);
    on('text_delta', handleTextDelta);
    on('error', handleError);
  }, [on]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    setInput('');
    setInlineError(null);
    pendingSourceRef.current = inferResponseSource(text);

    send({
      type: 'send_message',
      payload: {
        content: text,
        profile,
      },
    });
  }, [input, isStreaming, profile, send, setMessages]);

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
      '# College Advisor Export',
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
    link.download = `college-advisor-${exportedAt.toISOString().replace(/[:.]/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setInlineError(null);
  };

  return (
    <div className="chat-panel">
      <div className="connection-status">
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span>{isConnected ? 'Connected to advisor session' : 'Reconnecting to advisor session...'}</span>
        <span className="connection-divider" aria-hidden="true">•</span>
        <span className="connection-mode">{isConnected ? 'KB-ready' : 'Waiting for socket'}</span>
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-screen">
            <div className="welcome-copy">
              <p className="eyebrow">Start with a realistic question</p>
              <h2>Ask for recommendations, tradeoffs, or a shortlist tied to your profile.</h2>
              <p>
                The advisor already has school profiles and admissions insights loaded. Use the chat to narrow
                fit, compare options, or pressure-test an application strategy.
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
                  <li>Academic range: GPA, testing, intended major</li>
                  <li>Constraints: budget, states, reach versus match balance</li>
                  <li>Context: extracurricular depth and any unusual priorities</li>
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
            placeholder="Ask about fit, admissions strategy, program strengths, rankings, or affordability..."
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
