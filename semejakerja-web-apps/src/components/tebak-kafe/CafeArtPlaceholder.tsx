import React from 'react';
import { ImageOff } from 'lucide-react';

interface CafeArtPlaceholderProps {
  /** Gradient text layer (rating/price/vibes) rendered over the illustration,
   * same slot a real photo gets in ClueCard. */
  children?: React.ReactNode;
}

// No real cafe photos in the DB yet (images is always []). Generic stand-in
// image so the round card isn't a blank box. Swap this out for a real <img>
// once photo uploads land.
const CafeArtPlaceholder: React.FC<CafeArtPlaceholderProps> = ({ children }) => {
  return (
    <div className="relative rounded-xl overflow-hidden border border-amber-100">
      <img src="/placeholder-image.svg" alt="" className="w-full h-48 object-cover block" />

      <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-black/55 text-white backdrop-blur-sm">
        <ImageOff size={11} /> Ilustrasi — foto menyusul
      </span>

      {children}
    </div>
  );
};

export default CafeArtPlaceholder;
