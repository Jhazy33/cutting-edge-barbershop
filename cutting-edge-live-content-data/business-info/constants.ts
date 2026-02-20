import { GalleryImage, ServiceItem } from "./types";

// Using Unsplash placeholders to replace broken Facebook CDN links
export const IMAGES = {
  LOGO: "https://i.imgur.com/2ZDJu9w.png",
  EXTERIOR_HERO: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80",

  CUT_1: "/assets/new_content/precision-fade.jpg",
  CUT_2: "/assets/new_content/line-up.jpg",
  CUT_3: "/assets/new_content/hair-design.jpg",
  CUT_4: "/assets/new_content/barber-work.jpg"

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
  { id: 3, src: IMAGES.CUT_3, alt: "Hair Design" },
  { id: 4, src: IMAGES.CUT_4, alt: "Barber at Work" },
];