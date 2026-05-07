import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const sourceLabel = message.source === 'web'
    ? 'Web search'
    : message.source === 'hybrid'
      ? 'KB + web'
      : message.source === 'kb'
        ? 'KB context'
        : null;

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      <div className="bubble-avatar" aria-hidden="true">{isUser ? 'YU' : 'AI'}</div>
      <div className="bubble-content">
        {!isUser && sourceLabel && <div className={`message-source-badge ${message.source}`}>{sourceLabel}</div>}
        {isUser ? (
          <div className="bubble-text user-text">{message.content}</div>
        ) : (
          <div className="bubble-text markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {isStreaming && <span className="streaming-cursor" aria-hidden="true">▌</span>}
      </div>
    </div>
  );
}
