import React, { useState } from 'react';
import { SavedSession } from './types';

interface HistoryPanelProps {
  history: SavedSession[];
  onDelete: (id: string, permanent: boolean) => void;
  onRestore: (id: string) => void;
  onClose: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onDelete, onRestore, onClose }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null);

  const filteredHistory = history.filter(s => s.status === activeTab);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            Review Conversations
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Container */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar List */}
          <div className="w-1/3 border-r border-slate-700 flex flex-col">
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => { setActiveTab('active'); setSelectedSession(null); }}
                className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'active' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                Saved Chats
              </button>
              <button
                onClick={() => { setActiveTab('trash'); setSelectedSession(null); }}
                className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'trash' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                Trash Bin
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredHistory.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">
                  {activeTab === 'active' ? 'No saved chats yet.' : 'Trash is empty.'}
                </div>
              )}
              {filteredHistory.map(session => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors ${selectedSession?.id === session.id ? 'bg-slate-800 border-l-4 border-l-red-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(session.date).toLocaleDateString()} {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">{session.preview}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detail View */}
          <div className="flex-1 bg-slate-900 flex flex-col">
            {selectedSession ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {selectedSession.messages.map(msg => (
                     <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                        msg.role === 'user' ? 'bg-slate-700 text-slate-200' : 'bg-red-900/20 text-red-100 border border-red-900/30'
                      }`}>
                         <span className="text-xs opacity-50 block mb-1 uppercase font-bold">{msg.role}</span>
                         {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
                   {activeTab === 'active' ? (
                     <button
                       onClick={() => { onDelete(selectedSession.id, false); setSelectedSession(null); }}
                       className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600 hover:text-white rounded-lg text-sm font-semibold transition-colors"
                     >
                       Move to Trash
                     </button>
                   ) : (
                     <>
                       <button
                         onClick={() => { onRestore(selectedSession.id); setSelectedSession(null); }}
                         className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/50 hover:bg-green-600 hover:text-white rounded-lg text-sm font-semibold transition-colors"
                       >
                         Restore
                       </button>
                       <button
                         onClick={() => { onDelete(selectedSession.id, true); setSelectedSession(null); }}
                         className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors"
                       >
                         Delete Forever
                       </button>
                     </>
                   )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="size-16 mb-4 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
                <p>Select a conversation to review.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
