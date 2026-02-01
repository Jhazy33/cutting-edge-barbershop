import React, { useState, useEffect } from 'react';
import { SQUIRE_LINK, IMAGES } from '../constants';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Removed border-white/10 and border-b from the scrolled state to remove the outline
  const navClass = `fixed top-0 w-full z-50 transition-all duration-500 ${scrolled
      ? 'bg-black/90 backdrop-blur-md py-3 shadow-lg'
      : 'bg-transparent py-6 md:py-10'
    }`;

  return (
    <nav className={navClass}>
      <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between">
        {/* Logo Area */}
        <div className="flex items-center space-x-2 group cursor-pointer">
          <div className="transition-transform duration-300 group-hover:scale-105 origin-left">
            <img
              src={IMAGES.LOGO}
              alt="Cutting Edge Barbershop"
              // Drastically reduced scrolled height to h-12 md:h-16 to make the frame smaller
              // Kept initial height large (h-48 md:h-80) for the hero effect
              className={`${scrolled ? 'h-12 md:h-16' : 'h-48 md:h-80'} brightness-0 invert w-auto object-contain transition-all duration-500 ease-in-out drop-shadow-2xl`}
            />
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex space-x-8 text-sm font-bold uppercase tracking-widest text-white items-center">
          <a href="#services" className="hover:text-primary transition-colors hover:underline decoration-primary underline-offset-4">Services</a>
          <a href="#gallery" className="hover:text-primary transition-colors hover:underline decoration-primary underline-offset-4">Gallery</a>
          <a href="#contact" className="hover:text-primary transition-colors hover:underline decoration-primary underline-offset-4">Visit</a>
        </div>

        {/* CTA */}
        <div className="hidden md:block">
          <a
            href={SQUIRE_LINK}
            target="_blank"
            rel="noreferrer"
            className="bg-primary text-white px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-red-700 transition-all hover:shadow-[0_0_15px_rgba(204,0,0,0.6)]"
          >
            Book Now
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white p-2"
        >
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-black/95 border-b border-white/10 p-6 flex flex-col space-y-6 animate-fadeIn">
          <a href="#services" onClick={() => setIsOpen(false)} className="text-white font-display text-2xl uppercase tracking-widest hover:text-primary">Services</a>
          <a href="#gallery" onClick={() => setIsOpen(false)} className="text-white font-display text-2xl uppercase tracking-widest hover:text-primary">Gallery</a>
          <a href="#contact" onClick={() => setIsOpen(false)} className="text-white font-display text-2xl uppercase tracking-widest hover:text-primary">Visit</a>
          <a href={SQUIRE_LINK} className="bg-primary text-white text-center py-4 text-xl font-bold uppercase tracking-widest">Book Appointment</a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;