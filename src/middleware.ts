import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest): NextResponse {
  const url = request.nextUrl

  // Check for voice subdomain
  const host = request.headers.get('host') || ''

  console.log('🔍 Middleware called:', { host, pathname: url.pathname })

  // Check ALL headers that might contain the hostname
  const xForwardedHost = request.headers.get('x-forwarded-host') || ''
  const xOriginalHost = request.headers.get('x-original-host') || ''

  const isVoiceDomain =
    host.includes('voice.cihconsultingllc.com') ||
    xForwardedHost.includes('voice.cihconsultingllc.com') ||
    xOriginalHost.includes('voice.cihconsultingllc.com')

  if (isVoiceDomain && url.pathname === '/') {
    console.log('✅ Voice domain + root path detected - rewriting to /voice')
    url.pathname = '/voice'
    return NextResponse.rewrite(url)
  }

  console.log('⏭️ Not a voice domain request - passing through')
  return NextResponse.next()
}

// Run middleware on all routes except static assets
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
