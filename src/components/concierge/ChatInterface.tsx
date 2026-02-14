import React, { useState, useRef, useEffect } from 'react';
import { Send, Scissors, Loader2 } from 'lucide-react';
import { ChatMessage as Message } from './types';
import { INITIAL_MESSAGE } from './constants';
import { sendMessageStreamToGemini } from './geminiService';
import ChatMessage from './ChatMessage';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'model',
      content: INITIAL_MESSAGE,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (): Promise<void> => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Create a placeholder for the bot response
      const botMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          role: 'model',
          content: '',
          timestamp: Date.now(),
        },
      ]);

      let fullText = '';
      const stream = sendMessageStreamToGemini(userMessage.content);

      for await (const chunk of stream) {
        fullText += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, content: fullText } : msg
          )
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optional: Add an error message to chat
      setMessages((prev) => [
        ...prev,
        {
            id: Date.now().toString(),
            role: 'model',
            content: "My bad, something disconnected. Try saying that again.",
            timestamp: Date.now(),
        }
      ]);
    } finally {
      setIsLoading(false);
      // Re-focus input for fast chatting
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-3xl mx-auto bg-black shadow-2xl overflow-hidden relative border-x border-slate-800">
      
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg text-white shadow-lg shadow-red-900/20">
            <Scissors size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">CUTTING EDGE</h1>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
               <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Digital Concierge</p>
            </div>
          </div>
        </div>
        <div className="hidden sm:block">
            <span className="text-xs font-bold text-slate-500 border border-slate-700 px-2 py-1 rounded">EST. 2024</span>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
             <div className="flex w-full mb-4 justify-start">
                <div className="flex max-w-[80%] gap-3 flex-row">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-600">
                         <Scissors size={16} className="text-white animate-spin-slow" />
                    </div>
                     <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-slate-800 border border-slate-700 flex items-center">
                        <Loader2 className="animate-spin text-slate-400 w-5 h-5" />
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative flex items-center gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 py-2 outline-none"
            placeholder="I need a fade..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck="true"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-lg transition-all duration-200 ${
              input.trim() && !isLoading
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20 active:scale-95'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
        <div className="text-center mt-2">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Powered by Gemini 3 Flash</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;