import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { GALLERY_ITEMS } from '../constants';

const Gallery: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [galleryImages, setGalleryImages] = useState(GALLERY_ITEMS);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  useEffect(() => {
    // We prioritize local images for the Portfolio of Freshness bento grid.
    // Commenting out dynamic fetch to ensure the user's requested layout and images persist.
    /*
    const fetchImages = async () => {
      try {
        const API_BASE = import.meta.env.DEV ? 'http://109.199.118.38:3000' : '';
        const res = await fetch(`${API_BASE}/cms/gallery`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const mapped = data.map((img: any, idx: number) => ({
              id: img.id || idx,
              src: img.image_url,
              alt: img.caption || 'Cutting Edge Cut',
              isVertical: false 
            }));
            setGalleryImages(mapped);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch gallery images, falling back to static", err);
      }
    };
    fetchImages();
    */
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gallery-item", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 70%",
        },
        scale: 0.9,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: "power2.out"
      });
    }, containerRef);
    return () => ctx.revert();
  }, [galleryImages]); // Re-run animation when images load

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Fallback if the long FB tokens expire
    e.currentTarget.src = `https://picsum.photos/600/600?random=${Math.random()}`;
  };

  return (
    <section id="gallery" className="py-24 px-6 bg-[#111] border-t border-white/5">
      <div ref={containerRef} className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/10 pb-8">
          <h2 className="font-display text-4xl md:text-5xl text-white uppercase border-l-4 border-primary pl-6 tracking-widest leading-none">
            Portfolio <br /> of Freshness
          </h2>
          <a
            href="https://www.instagram.com/cutting_edge_barbershop/"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center text-slate-500 hover:text-primary uppercase font-bold tracking-[0.3em] transition-colors mt-6 md:mt-0"
          >
            Follow the Feed
            <span className="material-symbols-outlined ml-2">arrow_forward</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[300px]">
          {galleryImages.map((item, index) => (
            <div
              key={item.id}
              className={`gallery-item relative overflow-hidden group bg-slate-900 cursor-pointer ${item.isVertical ? 'md:col-span-1 md:row-span-2' : 'md:col-span-2 md:row-span-1'}`}
              onClick={() => setSelectedImage(item)}
            >
              <img
                src={item.src}
                alt={item.alt}
                onError={handleImageError}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="text-white font-display uppercase tracking-widest font-bold border border-white px-4 py-2">View Style</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 md:hidden">
          <a href="https://www.instagram.com/cutting_edge_barbershop/" className="text-slate-500 hover:text-primary uppercase font-bold tracking-[0.3em] text-sm">Follow on Instagram →</a>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>

          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            className="max-w-full max-h-[90vh] object-contain shadow-2xl border border-white/10 rounded-lg animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
            <p className="font-display text-xl uppercase tracking-widest text-white/80">{selectedImage.alt || 'Master Cut'}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out forwards; }
      `}</style>
    </section>
  );
};

export default Gallery;