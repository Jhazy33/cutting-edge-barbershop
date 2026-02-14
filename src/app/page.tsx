import FloatingConciergeButton from '@/components/concierge/FloatingConciergeButton'
import { Scissors, MapPin, Phone, Clock, Star } from 'lucide-react'

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <main className="min-h-screen bg-black">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-primary rounded-2xl shadow-2xl shadow-red-900/50 mb-6">
                <Scissors className="w-12 h-12 text-white" />
              </div>
            </div>

            <h1 className="font-display text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
              CUTTING{' '}
              <span className="text-primary">
                EDGE
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto font-light">
              Precision fades. Urban artistry. Plymouth&rsquo;s finest barbershop experience.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <a
                href="https://getsquire.com/booking/book/cutting-edge-plymouth"
                target="_blank"
                rel="noopener noreferrer"
                className="group px-8 py-4 bg-primary hover:bg-red-700 text-white font-bold rounded-full shadow-lg shadow-red-900/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>Book Now</span>
                <Star className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </a>
              <a
                href="tel:+15082244408"
                className="px-8 py-4 bg-dark-accent hover:bg-gray-800 text-white font-bold rounded-full border border-gray-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                <span>Call Us</span>
              </a>
            </div>

            <div className="flex items-center justify-center gap-6 text-gray-400">
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
            <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex items-start justify-center p-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Our Services</h2>
              <p className="text-xl text-gray-400">Expert cuts, every time</p>
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
                  className="group p-6 bg-dark-accent backdrop-blur border border-gray-800 rounded-2xl hover:border-primary transition-all hover:scale-105"
                >
                  <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                  <p className="text-3xl font-bold text-primary mb-2">{service.price}</p>
                  <p className="text-gray-400 text-sm">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hours Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-dark-accent">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Shop Hours</h2>
              <p className="text-xl text-gray-400">Walk-ins welcome</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-black border border-gray-800 rounded-2xl">
                <Clock className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Monday - Friday</h3>
                <p className="text-2xl text-gray-300">10:00 AM - 8:00 PM</p>
              </div>
              <div className="p-6 bg-black border border-gray-800 rounded-2xl">
                <Clock className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Saturday</h3>
                <p className="text-2xl text-gray-300">9:00 AM - 5:00 PM</p>
              </div>
              <div className="p-6 bg-black border border-gray-800 rounded-2xl md:col-span-2">
                <Clock className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold text-white mb-4">Sunday</h3>
                <p className="text-2xl text-gray-300">11:00 AM - 4:00 PM</p>
                <p className="text-sm text-gray-400 mt-2">Sarah & Devin holding it down</p>
              </div>
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Visit Us</h2>
            <p className="text-xl text-gray-400 mb-8">34 Manomet Point Rd, Plymouth, MA 02360</p>

            <div className="p-8 bg-black border border-gray-800 rounded-2xl inline-block">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <p className="text-2xl text-white font-bold mb-2">Plymouth, MA</p>
              <p className="text-gray-400">In the heart of Manomet</p>
              <a
                href="https://maps.google.com/?q=34+Manomet+Point+Rd+Plymouth+MA+02360"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 px-6 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded-full transition-all hover:scale-105"
              >
                Get Directions
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scissors className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-white">CUTTING EDGE</span>
            </div>
            <p className="text-gray-400">© 2024 Cutting Edge Barbershop. All rights reserved.</p>
            <p className="text-gray-500 text-sm mt-2">Est. 2024 • Plymouth, MA</p>
          </div>
        </footer>
      </main>

      {/* Floating Concierge Button */}
      <FloatingConciergeButton />
    </>
  )
}
