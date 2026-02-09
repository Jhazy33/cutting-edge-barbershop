import React, { useState } from 'react';
import { SQUIRE_LINK, IMAGES } from '../constants';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navClass = `fixed top-0 w-full z-50 pt-0 pb-2 md:pt-2 md:pb-4 transition-colors duration-500 bg-transparent`;

  return (
    <nav className={navClass}>
      <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between">
        {/* Logo Area */}
        <a href="/" className="flex items-center space-x-2 group cursor-pointer">
          <div className="transition-transform duration-300 group-hover:scale-105 origin-left">
            <img
              src={IMAGES.LOGO}
              alt="Cutting Edge Barbershop"
              // Permanent large size: h-48 (mobile) md:h-80 (desktop)
              className="h-32 md:h-48 brightness-0 invert w-auto object-contain drop-shadow-2xl scale-110"
            />
          </div>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex justify-center items-center gap-12 text-base font-bold uppercase tracking-wide text-white">
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
            className="bg-primary text-white px-8 py-3 text-base font-bold uppercase tracking-wide hover:bg-red-700 transition-all hover:shadow-[0_0_15px_rgba(204,0,0,0.6)]"
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