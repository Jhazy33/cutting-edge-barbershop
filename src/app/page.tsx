import FloatingConciergeButton from '@/components/concierge/FloatingConciergeButton'
import { Scissors, MapPin, Phone, Clock, Star } from 'lucide-react'

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-red-600 rounded-2xl shadow-2xl shadow-red-900/50 mb-6">
                <Scissors className="w-12 h-12 text-white" />
              </div>
            </div>

            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
              CUTTING{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                EDGE
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto font-light">
              Precision fades. Urban artistry. Plymouth&rsquo;s finest barbershop experience.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <a
                href="https://getsquire.com/booking/book/cutting-edge-plymouth"
                target="_blank"
                rel="noopener noreferrer"
                className="group px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg shadow-red-900/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>Book Now</span>
                <Star className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </a>
              <a
                href="tel:+15082244408"
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-full border border-slate-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                <span>Call Us</span>
              </a>
            </div>

            <div className="flex items-center justify-center gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>Plymouth, MA</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span>#1 Rated Shop</span>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex items-start justify-center p-2">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Services</h2>
              <p className="text-xl text-slate-400">Expert cuts, every time</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Classic Cut', price: '$35', desc: 'Scissors + clippers perfection' },
                { name: 'Skin Fade', price: '$40', desc: 'Seamless blends, clean finish' },
                { name: 'Beard Trim', price: '$20', desc: 'Sharp lines, even length' },
                { name: 'Full Service', price: '$55', desc: 'Hair + beard + styling' },
              ].map((service, i) => (
                <div
                  key={i}
                  className="group p-6 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl hover:border-red-600 transition-all hover:scale-105"
                >
                  <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                  <p className="text-3xl font-bold text-red-500 mb-2">{service.price}</p>
                  <p className="text-slate-400 text-sm">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hours Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Shop Hours</h2>
              <p className="text-xl text-slate-400">Walk-ins welcome</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                <Clock className="w-8 h-8 text-red-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Monday - Friday</h3>
                <p className="text-2xl text-slate-300">10:00 AM - 8:00 PM</p>
              </div>
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                <Clock className="w-8 h-8 text-red-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Saturday</h3>
                <p className="text-2xl text-slate-300">9:00 AM - 5:00 PM</p>
              </div>
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl md:col-span-2">
                <Clock className="w-8 h-8 text-red-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Sunday</h3>
                <p className="text-2xl text-slate-300">11:00 AM - 4:00 PM</p>
                <p className="text-sm text-slate-400 mt-2">Sarah & Devin holding it down</p>
              </div>
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Visit Us</h2>
            <p className="text-xl text-slate-400 mb-8">34 Manomet Point Rd, Plymouth, MA 02360</p>

            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl inline-block">
              <MapPin className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-2xl text-white font-bold mb-2">Plymouth, MA</p>
              <p className="text-slate-400">In the heart of Manomet</p>
              <a
                href="https://maps.google.com/?q=34+Manomet+Point+Rd+Plymouth+MA+02360"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all hover:scale-105"
              >
                Get Directions
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scissors className="w-8 h-8 text-red-600" />
              <span className="text-2xl font-bold text-white">CUTTING EDGE</span>
            </div>
            <p className="text-slate-400">© 2024 Cutting Edge Barbershop. All rights reserved.</p>
            <p className="text-slate-500 text-sm mt-2">Est. 2024 • Plymouth, MA</p>
          </div>
        </footer>
      </main>

      {/* Floating Concierge Button */}
      <FloatingConciergeButton />
    </>
  )
}
