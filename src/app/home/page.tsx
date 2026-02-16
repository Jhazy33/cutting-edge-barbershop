'use client'

import { useEffect } from 'react'

export default function HomePage(): React.JSX.Element {
  useEffect((): () => void => {
    // Dynamically load the compiled homepage assets
    const script = document.createElement('script')
    script.type = 'module'
    script.crossOrigin = 'anonymous'
    script.src = '/assets/index-BIIlsidu.js'

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/assets/index-DvedmyuE.css'

    document.head.appendChild(link)
    document.body.appendChild(script)

    return (): void => {
      // Cleanup
      document.head.removeChild(link)
      if (script.parentNode) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return <div id="root" style={{ minHeight: '100vh', backgroundColor: '#0A0A0A' }}></div>
}
