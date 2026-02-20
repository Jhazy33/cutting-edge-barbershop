'use client';

import React, { useState } from 'react';
import { useLiveSession } from '../../hooks/useLiveSession';
import { ConnectionState } from './types';
import { Visualizer } from './VoiceVisualizer';
import { ShopBoard } from './ShopBoard';
import { Transcript } from './Transcript';
import { HistoryPanel } from './HistoryPanel';

export const VoiceInterface: React.FC = () => {
  const {
    connectionState,
    connect,
    disconnect,
    messages,
    volume,
    error,
    barbers,
    history,
    deleteSession,
    restoreSession,
    notification,
    bookAppointmentManual,
  } = useLiveSession();

  const [showHistory, setShowHistory] = useState(false);

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  const handleToggle = () => {
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="h-full w-full bg-background-dark flex flex-col">
      {/* SMS Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 bg-slate-800 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)] rounded-xl p-4 flex items-center gap-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
           <div className="bg-green-500/20 p-2 rounded-full">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6 text-green-500">
               <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
             </svg>
           </div>
           <div>
             <h4 className="font-bold text-white text-sm">Squire Integration</h4>
             <p className="text-xs text-slate-300">{notification.message}</p>
           </div>
        </div>
      )}

      {/* History Button */}
      <button
        onClick={() => setShowHistory(true)}
        className="absolute top-4 right-4 z-30 p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
        title="View Conversation History"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-slate-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      </button>

      {/* Main Grid Layout */}
      <main className="flex-1 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0 p-6">

        {/* Left: Info Panel (Shop Board) - Desktop Only */}
        <section className="hidden md:block col-span-1 h-full min-h-0">
          <ShopBoard barbers={barbers} onBookSlot={bookAppointmentManual} />
        </section>

        {/* Center/Right: Voice Interaction Area */}
        <section className="col-span-1 md:col-span-2 bg-accent-dark/50 backdrop-blur border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col relative h-full min-h-0">
          {/* Connection Status Indicator */}
          <div
            className={`h-0.5 transition-colors duration-500 z-20 ${
              isConnected
                ? 'bg-green-500 shadow-[0_0_10px_#22c55e]'
                : isConnecting
                ? 'bg-yellow-500'
                : 'bg-transparent'
            }`}
          />

          {/* Transcript Area */}
          <Transcript messages={messages} />

          {/* Controls Area (Footer) - Fixed Height */}
          <div className="flex-none bg-background-dark/80 border-t border-slate-700 p-4 flex flex-col items-center justify-center gap-4 z-10">

            <div className="h-12 w-full flex items-center justify-center">
               <Visualizer volume={volume} isActive={isConnected} />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-full border border-red-900/50">
                {error}
              </div>
            )}

            <button
              onClick={handleToggle}
              disabled={isConnecting}
              className={`
                 group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform active:scale-95 w-full md:w-auto
                 ${isConnected
                   ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                   : 'bg-white text-slate-900 hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                 }
                 ${isConnecting ? 'opacity-80 cursor-wait' : ''}
              `}
            >
              {isConnecting ? (
                <>
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                </>
              ) : isConnected ? (
                <>
                  <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  Disconnect Line
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 text-red-600">
                    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                    <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                  </svg>
                  Call The Shop
                </>
              )}
            </button>

            {!isConnected && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3 text-green-500">
                  <path fillRule="evenodd" d="M12 1.5c-1.921 0-3.816.111-5.669.328a.75.75 0 0 0-.636.746v11.252a.75.75 0 0 0 .636.746c1.853.217 3.748.328 5.669.328 1.92 0 3.815-.111 5.669-.328a.75.75 0 0 0 .636-.746V2.574a.75.75 0 0 0-.636-.746A41.953 41.953 0 0 0 12 1.5Z" clipRule="evenodd" />
                  <path d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                </svg>
                <span>Secure Encrypted Connection</span>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center">
              {isConnected ? 'Listening...' : 'Ready to Connect'}
            </p>

            {!isConnected && (
              <p className="text-xs text-slate-600 text-center">
                Tap &quot;Call The Shop&quot; to start your conversation
              </p>
            )}
          </div>
        </section>

        {/* Mobile: Shop Board - Visible only on small screens */}
        <section className="md:hidden col-span-1 h-[400px] flex-none">
          <ShopBoard barbers={barbers} onBookSlot={bookAppointmentManual} />
        </section>

      </main>

      {/* History Modal */}
      {showHistory && (
        <HistoryPanel
          history={history}
          onClose={() => setShowHistory(false)}
          onDelete={deleteSession}
          onRestore={restoreSession}
        />
      )}
    </div>
  );
};

export default VoiceInterface;
