export interface ServiceItem {
  id: number;
  title: string;
  price: string;
  description: string;
  meta: string;
}

export interface GalleryImage {
  id: number;
  src: string;
  alt: string;
  isVertical?: boolean;
}

export interface NavLink {
  label: string;
  href: string;
}