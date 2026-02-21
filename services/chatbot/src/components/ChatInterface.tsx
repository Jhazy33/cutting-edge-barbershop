import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageComponent, MessageSource } from './ChatMessage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[];
  timestamp: Date;
}

// Configuration - Single local API endpoint
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SHOP_ID = 1; // Cutting Edge Barbershop

interface ChatResponse {
  response: string;
  sources?: MessageSource[];
  conversationId?: string;
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgIdCounter, setMsgIdCounter] = useState(0);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Send message to local API
   *
   * The backend handles:
   * - RAG context retrieval
   * - AI generation (Ollama)
   * - Response formatting
   */
  const sendMessage = async (userMessage: string): Promise<{ response: string; sources?: MessageSource[] }> => {
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          shopId: SHOP_ID,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      return {
        response: data.response,
        sources: data.sources
      };
    } catch (err) {
      console.error('Chat API error:', err);
      throw err;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-${msgIdCounter}`,
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date()
    };

    setMsgIdCounter(prev => prev + 1);
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Call single local API endpoint
      const { response, sources } = await sendMessage(userMessage.content);

      // Add assistant response
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${msgIdCounter + 1}`,
        role: 'assistant',
        content: response,
        sources: sources && sources.length > 0 ? sources : undefined,
        timestamp: new Date()
      }]);
      setMsgIdCounter(prev => prev + 1);

    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Background Accent Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <div className="border-b border-white/5 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-sky-400">smart_toy</span>
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-white tracking-widest uppercase">
                  Digital Concierge
                </h1>
                <p className="text-[10px] text-sky-400 uppercase tracking-widest font-medium">
                  Sovereign AI • Local API
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
              <span className="text-[10px] text-white uppercase tracking-widest font-bold">Secure Link</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 relative">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          {messages.length === 0 && (
            <div className="text-center py-16 animate-fadeIn">
              <div className="w-24 h-24 bg-gradient-to-br from-sky-500 to-blue-800 mx-auto rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-sky-500/20">
                <span className="material-symbols-outlined text-5xl text-white">chat_bubble</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-3 uppercase tracking-wider">
                Elite Strategy Chat
              </h2>
              <p className="text-slate-400 max-w-sm mx-auto font-light leading-relaxed mb-10">
                I'm your AI consultant, powered by local infrastructure for maximum privacy. How can I assist you today?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {[
                  'What services do you offer?',
                  'How do I book an appointment?',
                  'Where is the shop located?',
                  'What are your pricing tiers?'
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="px-6 py-4 bg-slate-900/50 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/30 rounded-2xl text-sm text-slate-300 transition-all duration-300 text-left group flex items-center justify-between"
                  >
                    <span>{q}</span>
                    <span className="material-symbols-outlined text-slate-600 group-hover:text-sky-400 transition-colors">north_east</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessageComponent key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="glass-card rounded-2xl px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  <span className="text-xs text-sky-400 uppercase tracking-widest font-bold">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl flex items-center space-x-3">
              <span className="material-symbols-outlined text-sm">error</span>
              <p className="text-xs font-medium uppercase tracking-wider">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/5 bg-slate-900/80 backdrop-blur-2xl p-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Strategic inquiry..."
              disabled={isLoading}
              rows={1}
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl pl-6 pr-20 py-5 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-sky-500/40 focus:ring-4 focus:ring-sky-500/5 transition-all disabled:opacity-50 font-sans text-sm"
              style={{ minHeight: '64px', maxHeight: '200px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-3 p-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded-xl transition-all duration-300 disabled:opacity-50 shadow-xl shadow-sky-600/20"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
          <div className="flex items-center justify-between mt-4 px-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
              Local API: <span className="text-sky-400">Integrated</span>
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
              Encrypted Privacy Shield Active
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .glass-card {
          background: rgba(30, 41, 59, 0.4);
          background-image: linear-gradient(145deg, rgba(51, 65, 85, 0.4) 0%, rgba(15, 23, 42, 0.1) 100%);
          backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};
