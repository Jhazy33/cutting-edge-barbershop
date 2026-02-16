'use client'

import ChatInterface from '@/components/concierge/ChatInterface'

export default function HomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-red-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-3xl font-bold text-red-600" style={{ fontFamily: 'Oswald, sans-serif' }}>
                CUTTING EDGE
              </h1>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-300 hover:text-red-500 transition-colors">
                Services
              </a>
              <a href="#about" className="text-gray-300 hover:text-red-500 transition-colors">
                About
              </a>
              <a href="#gallery" className="text-gray-300 hover:text-red-500 transition-colors">
                Gallery
              </a>
              <a href="#contact" className="text-gray-300 hover:text-red-500 transition-colors">
                Contact
              </a>
              <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-sm font-semibold transition-colors">
                Book Now
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-6xl md:text-7xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
                WHERE CRAFT
                <span className="block text-red-600">MEETS</span>
                COMFORT
              </h2>
              <p className="text-xl text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                Premium grooming experience in Plymouth, MA
              </p>
              <div className="flex space-x-4">
                <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-sm font-bold text-lg transition-colors">
                  Book Appointment
                </button>
                <button className="border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-8 py-4 rounded-sm font-bold text-lg transition-colors">
                  View Services
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-red-900 to-gray-900 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-600 text-2xl font-bold">Barbershop Image</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>
              Our Services
            </h2>
            <div className="w-24 h-1 bg-red-600 mx-auto" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Service Card 1 */}
            <div className="bg-black border border-gray-800 hover:border-red-600 transition-colors p-8 rounded-lg">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>
                Haircuts
              </h3>
              <p className="text-gray-400 mb-4">
                Precision cuts tailored to your style
              </p>
              <p className="text-3xl font-bold text-red-600">$35+</p>
            </div>

            {/* Service Card 2 */}
            <div className="bg-black border border-gray-800 hover:border-red-600 transition-colors p-8 rounded-lg">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>
                Beard Trims
              </h3>
              <p className="text-gray-400 mb-4">
                Expert beard shaping and styling
              </p>
              <p className="text-3xl font-bold text-red-600">$25+</p>
            </div>

            {/* Service Card 3 */}
            <div className="bg-black border border-gray-800 hover:border-red-600 transition-colors p-8 rounded-lg">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>
                Hot Towel Shaves
              </h3>
              <p className="text-gray-400 mb-4">
                Traditional hot towel straight razor shaves
              </p>
              <p className="text-3xl font-bold text-red-600">$45+</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Oswald, sans-serif' }}>
                The Cutting Edge Experience
              </h2>
              <div className="w-24 h-1 bg-red-600 mb-8" />
              <p className="text-gray-400 text-lg mb-6">
                At Cutting Edge Barbershop, we believe every client deserves a premium grooming experience. Our skilled barbers combine traditional techniques with modern styles to deliver exceptional results.
              </p>
              <p className="text-gray-400 text-lg mb-8">
                Located in the heart of Plymouth, MA, our shop offers a comfortable atmosphere where you can relax while we transform your look.
              </p>
              <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-sm font-bold text-lg transition-colors">
                Meet Our Team
              </button>
            </div>

            <div className="aspect-square bg-gradient-to-br from-red-900 to-gray-900 rounded-lg overflow-hidden">
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-600 text-2xl font-bold">Shop Interior</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>
              Our Work
            </h2>
            <div className="w-24 h-1 bg-red-600 mx-auto mb-8" />
            <p className="text-gray-400 text-lg">
              Check out some of our latest cuts and styles
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-square bg-gradient-to-br from-red-900 to-gray-900 rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-600 text-xl font-bold">Gallery {i}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact/Footer Section */}
      <section id="contact" className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Oswald, sans-serif' }}>
                Visit Us
              </h3>
              <div className="space-y-4">
                <p className="text-gray-400">
                  <span className="text-red-600 font-bold">Address:</span><br />
                  123 Main Street<br />
                  Plymouth, MA 02360
                </p>
                <p className="text-gray-400">
                  <span className="text-red-600 font-bold">Phone:</span><br />
                  (508) 555-0123
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Oswald, sans-serif' }}>
                Hours
              </h3>
              <div className="space-y-2 text-gray-400">
                <p>Mon - Fri: 9AM - 8PM</p>
                <p>Saturday: 9AM - 6PM</p>
                <p>Sunday: 10AM - 4PM</p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Oswald, sans-serif' }}>
                Follow Us
              </h3>
              <div className="flex space-x-4">
                <a href="#" className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors">
                  <span className="text-white font-bold">IG</span>
                </a>
                <a href="#" className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors">
                  <span className="text-white font-bold">FB</span>
                </a>
                <a href="#" className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors">
                  <span className="text-white font-bold">TW</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-500">
              © 2024 Cutting Edge Barbershop. All rights reserved.
            </p>
          </div>
        </div>
      </section>

      {/* Digital Concierge Chatbot */}
      <div className="fixed bottom-6 right-6 z-40">
        <ChatInterface />
      </div>
    </div>
  )
}
