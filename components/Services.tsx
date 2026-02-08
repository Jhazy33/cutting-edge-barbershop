import React, { useEffect, useState } from 'react';
import { SERVICES as FALLBACK_SERVICES } from '../constants';
import { fetchLiveServices } from '../services/supabaseService';
import { ServiceItem } from '../types';

const Services: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>(FALLBACK_SERVICES);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchLiveServices();
        if (data && data.length > 0) {
          setServices(data);
        }
      } catch (err) {
        console.warn("Failed to load live services, using fallbacks:", err);
      }
    };
    loadData();
  }, []);

  return (
    <section id="services" className="pt-32 pb-24 px-6 bg-background-dark text-white border-t border-white/5 relative" style={{ scrollMarginTop: '320px' }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      <div className="max-w-screen-xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-5xl md:text-6xl uppercase font-bold tracking-widest mb-4">Master Services</h2>
          <div className="h-1 w-24 bg-primary mx-auto mt-6"></div>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service) => (
            <div key={service.id} className="service-card group bg-accent-dark p-8 md:p-10 border border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
              <h3 className="font-display text-3xl uppercase text-white group-hover:text-primary transition-colors mb-2">{service.title}</h3>
              <p className="text-primary text-4xl font-bold mb-6 font-display">{service.price}</p>
              <p className="text-slate-400 text-base mb-8 leading-relaxed border-b border-white/10 pb-6">{service.description}</p>
              <div className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-lg mr-2">schedule</span>
                {service.meta}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;