import React, { useEffect, useRef } from 'react';
import { VoiceMessage } from './types';

interface TranscriptProps {
  messages: VoiceMessage[];
}

export const Transcript: React.FC<TranscriptProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
      {messages.length === 0 && (
        <div className="text-center text-slate-500 mt-20 italic">
          <p>Tap connect to start talking to the shop...</p>
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`
              max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-slate-700 text-slate-100 rounded-tr-sm'
                : 'bg-red-600/10 border border-red-500/20 text-red-100 rounded-tl-sm shadow-[0_0_15px_rgba(239,68,68,0.1)]'
              }
            `}
          >
            <div className={`text-xs mb-1 font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-slate-400' : 'text-red-400'}`}>
              {msg.role === 'user' ? 'You' : 'Cutting Edge'}
            </div>
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
