/**
 * Type definitions for business info constants
 */

export interface GalleryImage {
  id: number;
  src: string;
  alt?: string;
  title?: string;
  isVertical?: boolean;
}

export interface ServiceItem {
  id: number;
  title: string;
  description: string;
  price?: string;
  duration?: string;
  meta?: string;
}
