'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-primary mb-4">Oops!</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">Something went wrong</h2>
        <p className="text-gray-400 mb-8 max-w-md">
          We encountered an unexpected error. Don't worry, our team has been notified.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-block px-6 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white hover:text-background-dark transition-colors"
          >
            Go Home
          </a>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left text-left max-w-2xl mx-auto">
            <summary className="cursor-pointer text-gray-400 hover:text-white">
              Error Details (Development Only)
            </summary>
            <pre className="mt-4 p-4 bg-accent-dark rounded-lg overflow-auto text-sm text-red-400">
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
