import { GalleryImage, ServiceItem } from "./types";

// Local images for production deployment
export const IMAGES = {
  LOGO: "/logo.png",
  EXTERIOR_HERO: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80",

  CUT_1: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80",
  CUT_2: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80",
  CUT_3: "https://images.unsplash.com/photo-1593702295094-aea8c5c13d73?auto=format&fit=crop&w=800&q=80",
  CUT_4: "https://images.unsplash.com/photo-1503951914875-befbb713346b?auto=format&fit=crop&w=800&q=80"
};

export const SQUIRE_LINK = "https://getsquire.com/discover/barbershop/cutting-edge-plymouth";

export const SERVICES: ServiceItem[] = [
  {
    id: 1,
    title: "Standard Haircut",
    price: "$35.00",
    description: "Classic cut or fade. Includes hot lather neck shave and styling.",
    meta: "30 Mins"
  },
  {
    id: 2,
    title: "Skin Fade",
    price: "$40.00",
    description: "Precision zero/bald fade with foil shaver finish for the cleanest look.",
    meta: "45 Mins"
  },
  {
    id: 3,
    title: "Kids Cut",
    price: "$30.00",
    description: "Specialized patience and style for the little legends (12 & under).",
    meta: "30 Mins"
  },
  {
    id: 4,
    title: "Seniors (65+)",
    price: "$25.00",
    description: "Traditional gentleman's grooming at a respectable rate.",
    meta: "30 Mins"
  },
  {
    id: 5,
    title: "Beard Trim",
    price: "$20.00",
    description: "Sculpting, lining, and length reduction to keep it sharp.",
    meta: "15 Mins"
  },
  {
    id: 6,
    title: "Shape Up / Line Up",
    price: "$20.00",
    description: "Crisp edge-up around the ears and neck only. No length taken off.",
    meta: "15 Mins"
  },
  {
    id: 7,
    title: "Hot Towel Shave",
    price: "$45.00",
    description: "Old school luxury. Hot towels, straight razor, and post-shave treatment.",
    meta: "45 Mins"
  },
  {
    id: 8,
    title: "Custom Designs",
    price: "+$10.00",
    description: "Artistic freestyle designs added to any haircut service.",
    meta: "Add-on"
  }
];

export const GALLERY_ITEMS: GalleryImage[] = [
  { id: 1, src: IMAGES.CUT_1, alt: "Precision Fade" },
  { id: 2, src: IMAGES.CUT_2, alt: "Line Up", isVertical: true },
  { id: 3, src: IMAGES.CUT_3, alt: "Classic Cut" },
  { id: 4, src: IMAGES.CUT_4, alt: "Modern Style" },
];