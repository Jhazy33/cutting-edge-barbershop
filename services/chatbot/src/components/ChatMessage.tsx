import React from 'react';
import ReactMarkdown from 'react-markdown';

export interface MessageSource {
  content: string;
  category: string;
  similarity: number;
  source?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[];
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessage;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-6 py-4 ${
            isUser
              ? 'bg-red-600 text-white'
              : 'bg-white/10 backdrop-blur-lg text-white border border-white/10'
          }`}
        >
          {!isUser ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Display Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs font-semibold text-gray-300 mb-2">Sources:</p>
              <ul className="space-y-2">
                {message.sources.map((source, idx) => (
                  <li key={idx} className="text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <div className="flex-1">
                        <span className="text-gray-300">
                          {source.content.substring(0, 80)}
                          {source.content.length > 80 ? '...' : ''}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-red-600/20 rounded text-[10px] text-red-400 uppercase">
                            {source.category}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {(source.similarity * 100).toFixed(0)}% match
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <p className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};
