import type { Metadata } from 'next'
import { Oswald, Inter } from 'next/font/google'
import Script from 'next/script'
import '@/styles/globals.css'

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Cutting Edge Barbershop | Plymouth, MA | Precision Fades & Hair Design',
  description: 'Cutting Edge Barber Shop in Plymouth, MA. Unmatched attention to detail. Precision fades, beard trims, and artistic hair designs. Walk-ins welcome.',
  keywords: ['barbershop', 'Plymouth MA', 'haircut', 'fade', 'beard trim', 'barber'],
  authors: [{ name: 'Cutting Edge Barbershop' }],
  openGraph: {
    type: 'website',
    title: 'Cutting Edge Barbershop | Plymouth, MA',
    description: 'Precision fades and urban artistry in the heart of Manomet. Book your chair at the #1 rated shop in Plymouth.',
    url: 'https://ce-vercel.vercel.app',
    images: [
      {
        url: 'https://scontent-bos5-1.xx.fbcdn.net/v/t39.30808-6/273684555_4823755517708758_6897495879521931324_n.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cutting Edge Barbershop | Plymouth, MA',
    description: 'Precision fades and urban artistry in the heart of Manomet.',
  },
  other: {
    'geo.region': 'US-MA',
    'geo.placename': 'Plymouth',
    'geo.position': '41.9584;-70.6673',
    'ICBM': '41.9584, -70.6673',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />

        {/* Tailwind CSS - Required for archived homepage */}
        <Script
          src="https://cdn.tailwindcss.com"
          strategy="beforeInteractive"
        />
        <Script
          id="tailwind-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: 'class',
                theme: {
                  extend: {
                    colors: {
                      primary: "#CC0000",
                      "background-light": "#F8F8F8",
                      "background-dark": "#0A0A0A",
                      "accent-dark": "#1A1A1A",
                    },
                    fontFamily: {
                      display: ["Oswald", "sans-serif"],
                      sans: ["Inter", "sans-serif"],
                    },
                  },
                },
              }
            `,
          }}
        />

        {/* Inline styles matching live site */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body {
                background-color: #0A0A0A;
                color: #ffffff;
              }

              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }

              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `,
          }}
        />
      </head>
      <body className={`${oswald.variable} ${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
