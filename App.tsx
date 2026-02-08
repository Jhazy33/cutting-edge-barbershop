import React, { useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Gallery from './components/Gallery';
import Footer from './components/Footer';
import FloatingConcierge from './components/FloatingConcierge';
import { IMAGES } from './constants';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const App: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hide loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');

    if (scrollRef.current) {
      ScrollTrigger.config({ limitCallbacks: true });
      ScrollTrigger.defaults({
        scroller: scrollRef.current
      });
      // Refresh to ensure all triggers acknowledge the scroller
      ScrollTrigger.refresh();
      scrollRef.current.scrollTo(0, 0);
    }

    // Handle internal anchor links for the custom scroller
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = anchor.getAttribute('href')?.substring(1);
        const element = document.getElementById(id || '');
        if (element && scrollRef.current) {
          scrollRef.current.scrollTo({
            top: element.offsetTop,
            behavior: 'smooth'
          });
        }
      }
    };

    window.addEventListener('click', handleAnchorClick);
    return () => window.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-white selection:bg-primary selection:text-white font-sans overflow-hidden relative">
      <Navbar />

      {/* PERSISTENT BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent z-10"></div>
        <img
          src={IMAGES.EXTERIOR_HERO}
          alt="Cutting Edge Background"
          className="w-full h-full object-cover brightness-[0.4]"
        />
      </div>

      {/* MASKED CONTENT LAYER */}
      <div
        ref={scrollRef}
        className="fixed inset-0 z-10 overflow-y-auto scroll-smooth no-scrollbar"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0, transparent var(--mask-h, 240px), black var(--mask-h, 240px))',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, transparent var(--mask-h, 240px), black var(--mask-h, 240px))'
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          :root { --mask-h: 240px; }
          @media (min-width: 768px) { :root { --mask-h: 400px; } }
        `}} />

        <main>
          <Hero />
          <Services />
          <Gallery />
          <Footer />
        </main>
      </div>

      <FloatingConcierge />
    </div>
  );
};

export default App;