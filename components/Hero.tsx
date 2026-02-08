import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SQUIRE_LINK } from '../constants';

gsap.registerPlugin(ScrollTrigger);

const Hero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We target the new scroll-root for all triggers
    const scroller = document.querySelector('.overflow-y-auto');

    const ctx = gsap.context(() => {
      // Text Reveal
      gsap.fromTo(textRef.current?.children || [],
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          duration: 1,
          ease: "power4.out",
          delay: 0.2
        }
      );

      // We could add parallax here to the global background if desired,
      // but for now let's focus on the text and mask.
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <header ref={containerRef} className="relative pt-64 md:pt-[500px] pb-32 min-h-screen flex flex-col justify-center">
      {/* Background is now global in App.tsx */}

      <div className="relative z-10 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div ref={textRef}>
          <div className="inline-block px-3 py-1 mb-6 border border-primary text-primary text-xs font-bold tracking-widest uppercase">
            Est. 2012 • Manomet Point, MA
          </div>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl text-white font-bold leading-[0.85] uppercase mb-8 tracking-tighter drop-shadow-xl">
            Unmatched <br />
            <span className="text-primary italic pr-2">Attention</span> <br />
            to Detail
          </h1>
          <p className="text-slate-300 text-lg md:text-xl mb-10 leading-relaxed max-w-md font-light drop-shadow-md">
            Modern Urban meets Classic Barbershop artistry. Elevating the standard of grooming in Plymouth since 2012.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
            <a
              href={SQUIRE_LINK}
              target="_blank"
              rel="noreferrer"
              className="group relative px-8 py-4 bg-primary text-white font-display text-2xl font-bold uppercase tracking-widest overflow-hidden transition-all hover:scale-[1.02] shadow-2xl shadow-primary/30"
            >
              <span className="relative z-10">Book Your Chair</span>
              <div className="absolute inset-0 bg-white/20 transform -translate-x-full skew-x-12 group-hover:animate-shimmer"></div>
            </a>
            <a
              href="#gallery"
              className="px-8 py-4 border border-white/20 bg-black/40 backdrop-blur text-white font-display text-2xl font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
            >
              See Fresh Cuts
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Hero;