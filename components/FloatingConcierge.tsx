import React, { useState, useEffect } from 'react';
import { SQUIRE_LINK, IMAGES } from '../constants';
// Realtime subscription removed - Supabase client has realtime disabled
// to prevent WebSocket security errors on HTTPS pages

const FloatingConcierge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  return (
    <>
      {/* Desktop Floating Button */}
      <div className="fixed bottom-8 right-8 z-40 hidden md:block group">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-4 bg-black/60 backdrop-blur-xl border border-white/10 hover:border-primary/50 text-white pl-6 pr-3 py-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 group"
        >
          <div className="text-left mr-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">Need Help?</p>
            <p className="font-display font-bold uppercase tracking-widest leading-none text-sm">Digital Client</p>
          </div>
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(204,0,0,0.4)] group-hover:shadow-[0_0_30px_rgba(204,0,0,0.6)] transition-all">
            <img
              src={IMAGES.LOGO}
              alt="CE"
              className="w-8 h-8 object-contain brightness-0 invert"
            />
          </div>
        </button>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-6 left-6 right-6 z-40 md:hidden flex gap-4">
        <a href={SQUIRE_LINK} className="flex-1 bg-primary text-white h-16 rounded-2xl font-display text-xl font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/30 flex items-center justify-center space-x-3 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-2xl">event_available</span>
          <span>Book Now</span>
        </a>
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-black/80 backdrop-blur-lg border border-white/10 text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
        >
          <img
            src={IMAGES.LOGO}
            alt="CE"
            className="w-8 h-8 object-contain brightness-0 invert"
          />
        </button>
      </div>

      {/* Modal Overlay */}
      {notification && (
        <div className="fixed top-24 right-8 z-[60] animate-fadeIn">
          <div className="bg-black/80 backdrop-blur-md border border-primary/50 text-white px-6 py-3 rounded-full shadow-[0_0_30px_rgba(204,0,0,0.4)] flex items-center space-x-3">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="font-display uppercase tracking-widest text-xs font-bold">{notification}</span>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 w-full max-w-lg rounded-3xl p-7 md:p-10 relative shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-scaleIn overflow-hidden group">

            {/* Background Accent Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all z-20"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="text-center mb-10 relative z-10">
              <div className="w-44 h-44 bg-gradient-to-br from-primary to-red-900 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-[0_20px_40px_rgba(204,0,0,0.3)] animate-float">
                <img
                  src={IMAGES.LOGO}
                  alt="Cutting Edge"
                  className="w-40 h-40 object-contain brightness-0 invert"
                />
              </div>
              <h3 className="font-display text-4xl md:text-5xl text-white uppercase font-bold tracking-[0.1em] mb-3">Digital Client</h3>
              <p className="text-slate-400 text-base font-light tracking-wide">Choose your preferred way to connect.</p>
            </div>

            <div className="space-y-4 relative z-10">
              {/* Voice Mode */}
              <a
                href="https://voice-ce.cihconsultingllc.com"
                rel="noreferrer"
                className="block group/item relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 hover:bg-white/[0.06] transition-all duration-500 p-6 md:p-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary group-hover/item:scale-110 group-hover/item:bg-primary transition-all duration-500 group-hover/item:text-white shadow-inner">
                      <span className="material-symbols-outlined text-3xl">mic</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-white text-xl font-bold uppercase tracking-widest mb-1 group-hover/item:text-primary transition-colors">Voice Mode</h4>
                      <p className="text-slate-500 text-sm group-hover/item:text-slate-300 transition-colors">Speak naturally with our AI scheduler.</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover/item:border-primary/50 group-hover/item:bg-primary/10 transition-all">
                    <span className="material-symbols-outlined text-slate-500 group-hover/item:text-white group-hover/item:translate-x-1 transition-all">arrow_forward</span>
                  </div>
                </div>
              </a>

              {/* Chat Mode */}
              <a
                href="https://chat.cuttingedge.cihconsultingllc.com"
                rel="noreferrer"
                className="block group/item relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/40 hover:bg-white/[0.06] transition-all duration-500 p-6 md:p-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white group-hover/item:scale-110 group-hover/item:bg-white transition-all duration-500 group-hover/item:text-black">
                      <span className="material-symbols-outlined text-3xl">chat</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-white text-xl font-bold uppercase tracking-widest mb-1 group-hover/item:text-primary transition-colors">Chat Mode</h4>
                      <p className="text-slate-500 text-sm group-hover/item:text-slate-300 transition-colors">Text with our 24/7 Digital Assistant</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover/item:border-primary/50 group-hover/item:bg-primary/10 transition-all">
                    <span className="material-symbols-outlined text-slate-500 group-hover/item:text-white group-hover/item:translate-x-1 transition-all">arrow_forward</span>
                  </div>
                </div>
              </a>
            </div>

            <div className="mt-12 text-center border-t border-white/10 pt-6 relative z-10">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
                <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-[0.2em] font-bold">
                  <span className="text-white">Live Status:</span> All Systems Synced
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes float { 
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
};

export default FloatingConcierge;