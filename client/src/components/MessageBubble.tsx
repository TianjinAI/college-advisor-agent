import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      <div className="bubble-avatar">{isUser ? '👤' : '🎓'}</div>
      <div className="bubble-content">
        {isUser ? (
          <div className="bubble-text user-text">{message.content}</div>
        ) : (
          <div className="bubble-text markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {isStreaming && <span className="streaming-cursor">▌</span>}
      </div>
    </div>
  );
}
