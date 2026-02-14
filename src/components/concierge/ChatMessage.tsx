import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage as Message } from './types';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-indigo-600' : 'bg-red-600'
        }`}>
          {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
        </div>

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed shadow-md ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-tr-none' 
            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
        }`}>
          <ReactMarkdown
             components={{
                a: ({node: _node, ...props}) => <a {...props} className="text-blue-400 hover:text-blue-300 underline font-medium" target="_blank" rel="noopener noreferrer" />,
                strong: ({node: _node, ...props}) => <strong {...props} className="font-bold text-white" />,
                ul: ({node: _node, ...props}) => <ul {...props} className="list-disc pl-4 my-2 space-y-1" />,
                ol: ({node: _node, ...props}) => <ol {...props} className="list-decimal pl-4 my-2 space-y-1" />,
             }}
          >
            {message.content}
          </ReactMarkdown>
          <div className={`text-[10px] mt-1 opacity-50 ${isUser ? 'text-indigo-200' : 'text-slate-400'} text-right`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatMessage;