'use client'

import VoiceInterface from '@/components/concierge/VoiceInterface'
import Link from 'next/link'

export default function VoicePage(): React.JSX.Element {
  return (
    <div className="h-screen w-full bg-background-dark overflow-hidden flex flex-col">
      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <VoiceInterface />
      </div>
    </div>
  )
}
