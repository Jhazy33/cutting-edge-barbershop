'use client'

import VoiceInterface from '@/components/concierge/VoiceInterface'
import Link from 'next/link'

export default function VoicePage(): React.JSX.Element {
  return (
    <div className="h-screen w-full bg-background-dark overflow-hidden flex flex-col">
      {/* Top Navigation Header */}
      <header className="flex-none bg-background-dark border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl px-6 py-3 border border-slate-700">
              <h1 className="text-2xl font-bold text-white">Cutting Edge</h1>
              <p className="text-xs font-bold text-primary tracking-wider">AI VOICE CONCIERGE • SECURE LINE</p>
            </div>
          </div>

          {/* Right: Navigation Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 text-white text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              BACK TO SHOP
            </Link>

            <button
              onClick={() => {/* TODO: Implement logs modal */}}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 text-white text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              LOGS
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <VoiceInterface />
      </div>
    </div>
  )
}
