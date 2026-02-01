import React from 'react';
import { SQUIRE_LINK, IMAGES } from '../constants';

const Footer: React.FC = () => {
  return (
    // Reduced padding (pt-16 pb-8) and reduced border width to make it cleaner
    <footer id="contact" className="bg-black text-white pt-16 pb-8 px-6 border-t-2 border-primary">
      <div className="max-w-screen-xl mx-auto">
        <div className="grid md:grid-cols-3 gap-16 mb-12">
          {/* Brand */}
          <div>
            <div className="mb-8">
               <div className="inline-block">
                 {/* Increased logo height to h-32 to be bigger than the button visually */}
                 <img src={IMAGES.LOGO} alt="Cutting Edge Barbershop" className="h-32 w-auto object-contain opacity-90 brightness-0 invert" />
               </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs uppercase tracking-widest italic border-l-2 border-slate-700 pl-4">
              "Your hair is our canvas. Precision is our signature."
            </p>
          </div>

          {/* Location */}
          <div>
            <h5 className="font-display text-xl uppercase mb-8 text-primary tracking-[0.2em] font-bold">Manomet HQ</h5>
            <p className="text-slate-300 mb-2 font-light tracking-wide">34 Manomet Point Rd</p>
            <p className="text-slate-300 mb-8 font-bold tracking-wide">Plymouth, MA 02360</p>
            <a href="tel:5082244408" className="text-2xl font-display font-bold hover:text-primary transition-colors block decoration-primary underline-offset-4 hover:underline">
              (508) 224-4408
            </a>
          </div>

          {/* Hours */}
          <div>
            <h5 className="font-display text-xl uppercase mb-8 text-primary tracking-[0.2em] font-bold">Chair Hours</h5>
            <div className="space-y-3 text-sm text-slate-400 uppercase font-medium tracking-widest">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Tue - Fri</span> <span>9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Saturday</span> <span>9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between pb-2 text-slate-600">
                <span>Sun - Mon</span> <span className="text-primary font-bold">Closed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col-reverse md:flex-row gap-8 items-center justify-between">
          
          <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
             <p className="text-xs text-slate-600 font-bold tracking-widest uppercase text-center md:text-left">
                © {new Date().getFullYear()} Cutting Edge Plymouth.
              </p>
              
              <div className="flex space-x-6 items-center">
                <a href="https://www.facebook.com/p/The-Cutting-Edge-Plymouth-100054632881924/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors hover:scale-110 transform">
                  <span className="sr-only">Facebook</span>
                  <svg fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>

                <a href="https://www.instagram.com/cutting_edge_barbershop/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors hover:scale-110 transform">
                  <span className="sr-only">Instagram</span>
                  <svg fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
          </div>

          <div className="flex md:justify-end md:pr-24">
            <a href={SQUIRE_LINK} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Book Now</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;