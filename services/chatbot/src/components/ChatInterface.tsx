import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageComponent, MessageSource } from './ChatMessage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[];
  timestamp: Date;
}

// Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const OLLAMA_API = import.meta.env.VITE_OLLAMA_API || 'http://localhost:11434';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  // RAG: Retrieve context before generating response
  const retrieveContext = async (query: string): Promise<MessageSource[]> => {
    try {
      const response = await fetch(`${API_URL}/api/knowledge/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          shopId: 1,
          limit: 3,
          threshold: 0.7
        })
      });

      if (!response.ok) {
        console.error('RAG search failed:', response.status);
        return [];
      }

      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.error('RAG retrieval failed:', err);
      return [];
    }
  };

  // Send message to Ollama with streaming
  const sendMessageStream = async (
    userMessage: string,
    context: MessageSource[]
  ): Promise<string> => {
    // Build enhanced system prompt with retrieved context
    let systemInstruction = `You are a helpful assistant for Cutting Edge Barbershop.

Be concise, friendly, and professional. Answer questions about:
- Services and pricing
- Hours and location
- Staff and barbers
- Booking and appointments
- Policies and procedures

If you don't know something specific, say so and suggest they contact the shop directly.`;

    // Add RAG context to system instruction
    if (context.length > 0) {
      const contextText = context
        .map(c => `- [${c.category}] ${c.content}`)
        .join('\n');
      systemInstruction += `\n\nRELEVANT INFORMATION:\n${contextText}\n\nUse this information to answer accurately. If the information doesn't answer the question, say so politely.`;
    }

    const response = await fetch(`${OLLAMA_API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          { role: 'user', content: userMessage }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            fullResponse += parsed.message.content;

            // Update UI with streaming response
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = fullResponse;
              }
              return newMessages;
            });
          }
        } catch (e) {
          // Skip invalid JSON
          console.error('Failed to parse chunk:', line);
        }
      }
    }

    return fullResponse;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // RAG Step 1: Retrieve relevant context
      const retrievedContext = await retrieveContext(userMessage.content);

      // Add placeholder for assistant response
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      // RAG Step 2: Generate response with context
      const assistantResponse = await sendMessageStream(
        userMessage.content,
        retrievedContext
      );

      // Update with final response and sources
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = assistantResponse;
          lastMessage.sources = retrievedContext.length > 0 ? retrievedContext : undefined;
        }
        return newMessages;
      });

    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');

      // Remove the placeholder message
      setMessages(prev => prev.slice(0, -1));
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-black to-red-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-widest">
                Digital Concierge
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                AI-Powered Barbershop Assistant with RAG
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-400">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💈</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to Cutting Edge
              </h2>
              <p className="text-gray-400 mb-6">
                Ask me anything about our services, pricing, or booking!
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {['How much does a haircut cost?', 'What are your hours?', 'Who are the barbers?', 'Do you do beard trims?'].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 transition-colors"
                  >
                    {q}
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
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-6 py-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl">
              <p className="text-sm font-semibold mb-1">Error</p>
              <p className="text-xs">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Shift+Enter for new line)"
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all disabled:opacity-50"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Powered by Ollama + RAG vector search
          </p>
        </div>
      </div>
    </div>
  );
};
