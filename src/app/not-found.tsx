import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="text-center px-4">
        <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-white mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-md">
          Sorry, we couldn't find the page you're looking for. Let's get you back on track.
        </p>
        <div className="space-x-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/home"
            className="inline-block px-6 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white hover:text-background-dark transition-colors"
          >
            Visit Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
