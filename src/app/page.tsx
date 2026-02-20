'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage(): React.JSX.Element {
  const router = useRouter()

  useEffect(() => {
    // Check if accessing via voice subdomain
    const hostname = window.location.hostname

    if (hostname.includes('voice.cihconsultingllc.com')) {
      // Immediate redirect to /voice
      window.location.href = '/voice'
    } else {
      // Redirect main domain to /home
      router.push('/home')
    }
  }, [router])

  // Show loading while redirecting
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '18px'
    }}>
      Loading...
    </div>
  )
}
