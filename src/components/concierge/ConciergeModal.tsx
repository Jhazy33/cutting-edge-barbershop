'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Mic } from 'lucide-react';
import { ConciergeMode } from './types';
import ChatInterface from './ChatInterface';
import VoiceInterface from './VoiceInterface';

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
            onClick={() => window.open('https://chat.cihconsultingllc.com', '_blank')}
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
            onClick={() => window.open('https://voice.cihconsultingllc.com', '_blank')}
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
            <VoiceInterface />
          )}
        </div>
      </div>
    </div>
  );
};

export default ConciergeModal;
