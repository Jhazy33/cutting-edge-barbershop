import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Voice Concierge | Cutting Edge Barbershop',
  description: 'Experience our AI-powered voice concierge for appointment booking and inquiries.',
}

export default function VoiceLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return <>{children}</>
}
