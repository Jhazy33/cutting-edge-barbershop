import React, { useState } from 'react';
import { GALLERY_ITEMS } from '../constants';

const Gallery: React.FC = () => {
  const [galleryImages] = useState(GALLERY_ITEMS);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = `https://picsum.photos/600/600?random=${Math.random()}`;
  };

  return (
    <section id="gallery" className="py-24 px-6 bg-[#111] border-t border-white/5" style={{ scrollMarginTop: '352px' }}>
      <div className="max-w-screen-xl mx-auto">
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
          {galleryImages.map((item) => (
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
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
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
            className="max-w-full max-h-[90vh] object-contain shadow-2xl border border-white/10 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};

export default Gallery;