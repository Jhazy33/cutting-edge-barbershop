'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Mic } from 'lucide-react';
import { ConciergeMode } from './types';
import ChatInterface from './ChatInterface';

interface ConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode: ConciergeMode;
}

const ConciergeModal: React.FC<ConciergeModalProps> = ({ isOpen, onClose, defaultMode }) => {
  const [mode, setMode] = useState<ConciergeMode>(defaultMode);
  const [_volume, setVolume] = useState(0);

  useEffect(() => {
    // Reset mode when modal opens
    if (isOpen) {
      setMode(defaultMode);
    }
  }, [isOpen, defaultMode]);

  // Simulate voice activity
  useEffect(() => {
    if (mode === 'voice') {
      const interval = setInterval(() => {
        setVolume(Math.random() * 0.8 + 0.2);
      }, 100);
      return (): void => clearInterval(interval);
    }
  }, [mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[80vh] md:h-[700px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Digital Concierge</h2>
              <p className="text-sm text-slate-400">Cutting Edge Barbershop</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center justify-center gap-4 p-4 border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              mode === 'chat'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setMode('voice')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              mode === 'voice'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Mic className="w-5 h-5" />
            <span>Voice</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {mode === 'chat' ? (
            <ChatInterface />
          ) : (
            <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center p-8">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/20">
                  <Mic className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Voice Concierge</h3>
                <p className="text-slate-400">Coming soon! For now, use our chat interface.</p>
              </div>

              {/* Visualizer (for demo purposes) */}
              <div className="w-full max-w-md">
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-end gap-1 h-12">
                      {Array.from({ length: 20 }).map((_, i: number) => (
                        <div
                          key={i}
                          className="w-1 bg-red-600 rounded-full transition-all duration-75"
                          style={{
                            height: `${4 + Math.random() * 44}px`,
                            opacity: Math.random() * 0.7 + 0.3,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-sm text-slate-400">Voice visualization demo</p>
                </div>
              </div>

              <button
                onClick={() => setMode('chat')}
                className="mt-8 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors border border-slate-700"
              >
                Switch to Chat Mode
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConciergeModal;
