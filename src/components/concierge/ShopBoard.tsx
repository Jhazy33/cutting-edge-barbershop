import React, { useState } from 'react';
import { Barber } from './types';

interface ShopBoardProps {
  barbers: Barber[];
  onBookSlot?: (barberId: string, time: string, customerName: string, phone: string) => void;
}

export const ShopBoard: React.FC<ShopBoardProps> = ({ barbers, onBookSlot }) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'prices'>('schedule');
  const [bookingModal, setBookingModal] = useState<{barberId: string, barberName: string, time: string} | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const handleSlotClick = (barber: Barber, time: string, isBooked: boolean) => {
      if (isBooked || !barber.isWorking) return;
      setBookingModal({ barberId: barber.id, barberName: barber.name, time });
  };

  const submitBooking = (e: React.FormEvent) => {
      e.preventDefault();
      if (bookingModal && onBookSlot) {
          onBookSlot(bookingModal.barberId, bookingModal.time, customerName, customerPhone);
          setBookingModal(null);
          setCustomerName('');
          setCustomerPhone('');
      }
  };

  return (
    <div className="bg-accent-dark/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden shadow-xl text-slate-300 h-full flex flex-col relative">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'schedule' ? 'bg-slate-700/50 text-white border-b-2 border-red-500' : 'hover:bg-slate-700/30 text-slate-500'
          }`}
        >
          The Board
        </button>
        <button
          onClick={() => setActiveTab('prices')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'prices' ? 'bg-slate-700/50 text-white border-b-2 border-red-500' : 'hover:bg-slate-700/30 text-slate-500'
          }`}
        >
          Price List
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide relative">

        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="flex flex-col border-b border-slate-700/50 pb-2">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold text-white">Today's Roster</h3>
                 <span className="text-xs text-red-400 animate-pulse font-mono">● LIVE</span>
               </div>
               <p className="text-xs text-green-400 font-mono mt-1">
                 Open Today: 9:00 AM - 5:00 PM
               </p>
            </div>

            {/* List Container */}
            <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700/30">
              <h4 className="font-semibold text-slate-100 mb-4 text-sm uppercase tracking-wide opacity-80">Barbers On Deck</h4>

              <div className="space-y-4">
                {barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className={`
                      border-b border-slate-700/50 pb-4 last:pb-0 last:border-0 transition-all duration-300
                      ${!barber.isWorking ? 'opacity-50 grayscale' : ''}
                    `}
                  >
                    {/* Row Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={barber.avatar}
                            alt={barber.name}
                            className="w-10 h-10 rounded-full border border-slate-600 object-cover"
                          />
                          {barber.isWorking && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-slate-900 rounded-full"></div>
                          )}
                        </div>
                        <div>
                           <div className="text-sm font-bold text-white leading-tight">{barber.name}</div>
                           <div className="text-[10px] uppercase text-slate-500 font-bold">{barber.specialty}</div>
                        </div>
                      </div>

                      {!barber.isWorking && (
                        <span className="text-[10px] py-1 px-2 bg-slate-800 rounded text-slate-400 font-mono">OFF DUTY</span>
                      )}
                    </div>

                    {/* Slots Grid */}
                    {barber.isWorking ? (
                      <div className="grid grid-cols-4 gap-2">
                        {barber.schedule.map((slot, idx) => (
                          <button
                            key={idx}
                            disabled={slot.isBooked}
                            onClick={() => handleSlotClick(barber, slot.time, slot.isBooked)}
                            className={`
                              text-[10px] font-mono text-center py-1.5 rounded border select-none transition-all
                              ${slot.isBooked
                                ? 'bg-slate-800/30 border-slate-800 text-slate-600 line-through cursor-not-allowed'
                                : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500 hover:text-slate-900 cursor-pointer hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                              }
                            `}
                          >
                            {slot.time.replace(' AM', 'a').replace(' PM', 'p')}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 italic pl-14">
                        Unavailable today. Check back tomorrow.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prices' && (
           <div className="space-y-4">
            <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700/30">
              <h4 className="font-semibold text-slate-100 mb-2 text-sm uppercase tracking-wide opacity-80">The Cuts</h4>
              <div className="flex justify-between text-sm py-2 border-b border-slate-700/50">
                <span>Brooklyn Fade</span>
                <span className="font-bold text-white">$35</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-700/50">
                <span>Scissor Cut</span>
                <span className="font-bold text-white">$40</span>
              </div>
              <div className="flex justify-between text-sm py-2 last:border-0">
                <span>Buzz / Shape Up</span>
                <span className="font-bold text-white">$20</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700/30">
              <h4 className="font-semibold text-slate-100 mb-2 text-sm uppercase tracking-wide opacity-80">Add-Ons</h4>
               <div className="flex justify-between text-sm py-2 border-b border-slate-700/50">
                <span>Beard Trim & Oil</span>
                <span className="font-bold text-white">$25</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-700/50">
                <span>Hot Towel Shave</span>
                <span className="font-bold text-white">$30</span>
              </div>
               <div className="flex justify-between text-sm py-2 last:border-0">
                <span>Designs / Freestyle</span>
                <span className="font-bold text-white">+$15</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-background-dark/80 border-t border-slate-700">
          <p className="text-xs text-center text-slate-500">
            {activeTab === 'schedule' ? 'Click a time to book instantly.' : 'Prices subject to vibe checks.'}
          </p>
      </div>

      {/* Booking Modal Overlay */}
      {bookingModal && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold text-lg">Confirm Booking</h3>
                  <button onClick={() => setBookingModal(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                 <div className="text-sm text-slate-400 mb-1">Appointment Details</div>
                 <div className="text-white font-bold text-xl">{bookingModal.barberName}</div>
                 <div className="text-red-400 font-mono text-lg">{bookingModal.time}</div>
              </div>

              <form onSubmit={submitBooking} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:border-red-500 outline-none transition-colors"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:border-red-500 outline-none transition-colors"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-red-900/20 transition-all transform active:scale-95"
                  >
                    Confirm Booking
                  </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
