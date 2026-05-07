import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import MessageBubble from './MessageBubble';
import type { ChatMessage, StudentProfile } from '../types';

const SUGGESTIONS = [
  '推荐 10 所适合我的大学',
  '帮我对比 UC Berkeley 和 UCLA',
  '计算机专业排名前 20 的大学',
  '预算 5 万以内有什么好选择？',
];

interface ChatPanelProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  profile: StudentProfile;
  isStreaming: boolean;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ChatPanel({
  messages,
  setMessages,
  profile,
  isStreaming,
  setIsStreaming,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handlersRegistered = useRef(false);
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

  // Register WebSocket message handlers — only once
  useEffect(() => {
    if (handlersRegistered.current) return;
    handlersRegistered.current = true;

    const handleTextStart = (data: Record<string, unknown>) => {
      const payload = data.payload as { messageId: string };
      setMessagesRef.current((prev) => [
        ...prev,
        {
          id: payload?.messageId || `assistant-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        },
      ]);
      setIsStreamingRef.current(true);
    };

    const handleTextDelta = (data: Record<string, unknown>) => {
      const payload = data.payload as { text: string; done: boolean; messageId: string };
      setMessagesRef.current((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((msg, i) =>
            i === prev.length - 1
              ? { ...msg, content: msg.content + (payload?.text || '') }
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
      setMessagesRef.current((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `❌ Error: ${payload?.text || 'Unknown error'}`,
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

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    send({
      type: 'send_message',
      payload: {
        content: text,
        profile,
      },
    });
  }, [input, isStreaming, profile, send, setMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="chat-panel">
      <div className="connection-status">
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        {isConnected ? 'Connected' : 'Reconnecting...'}
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-screen">
            <div className="welcome-icon">🎓</div>
            <h2>Welcome to College Advisor!</h2>
            <p>I can help you find the best US universities based on your profile.</p>
            <p>Fill in your student profile on the left, then ask me anything!</p>
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
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'}
          />
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about universities, admissions, rankings..."
          rows={1}
          disabled={isStreaming}
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}
