'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ConciergeModal from './ConciergeModal';

const FloatingConciergeButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');

  const handleOpen = (selectedMode: 'chat' | 'voice'): void => {
    setMode(selectedMode);
    setIsOpen(true);
  };

  const handleClose = (): void => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
          {/* Quick action buttons that appear on hover */}
          <div className="flex flex-col gap-2 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={() => handleOpen('voice')}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg border border-slate-700 flex items-center gap-2 text-sm font-medium transition-all"
            >
              <span>🎤</span>
              <span>Voice</span>
            </button>
            <button
              onClick={() => handleOpen('chat')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full shadow-lg shadow-red-900/20 flex items-center gap-2 text-sm font-medium transition-all"
            >
              <span>💬</span>
              <span>Chat</span>
            </button>
          </div>

          {/* Main button */}
          <button
            onClick={() => handleOpen('chat')}
            className="group relative flex items-center justify-center w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl shadow-red-900/40 transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <MessageCircle className="w-8 h-8 animate-pulse" />
            <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-20" />

            {/* Tooltip */}
            <div className="absolute right-full mr-3 px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              Need help? Ask our concierge
            </div>
          </button>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <ConciergeModal
          isOpen={isOpen}
          onClose={handleClose}
          defaultMode={mode}
        />
      )}
    </>
  );
};

export default FloatingConciergeButton;
