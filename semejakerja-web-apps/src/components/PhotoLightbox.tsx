import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CafePhotoAsset } from '../hooks/useCafePhotos';

interface PhotoLightboxProps {
  photos: CafePhotoAsset[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ photos, index, onIndexChange, onClose }) => {
  const touchStartX = useRef<number | null>(null);
  const photo = photos[index];

  const go = (delta: number) => onIndexChange((index + delta + photos.length) % photos.length);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && photos.length > 1) go(-1);
      if (e.key === 'ArrowRight' && photos.length > 1) go(1);
    };
    window.addEventListener('keydown', onKeyDown);
    // Lightbox sits above everything and covers the map — lock page scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length, onClose]);

  if (!photo) return null;

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || photos.length < 2) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  // Portal to <body>: CafeModal's slide-in panel leaves a lingering
  // transform after its animation ends (fill-mode forwards), which would
  // otherwise become the containing block for position: fixed here.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-fade-in"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0">
        <span className="text-white/80 text-sm font-semibold tabular-nums">
          {photos.length > 1 ? `${index + 1} / ${photos.length}` : ''}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          aria-label="Tutup"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center min-h-0 px-2">
        {photos.length > 1 && (
          <button
            onClick={e => { e.stopPropagation(); go(-1); }}
            aria-label="Foto sebelumnya"
            className="absolute left-2 sm:left-4 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <img
          src={photo.url}
          alt={photo.caption || 'Foto kafe'}
          onClick={e => e.stopPropagation()}
          className="max-w-[92vw] sm:max-w-[85vw] max-h-[72vh] sm:max-h-[78vh] object-contain rounded-lg shadow-2xl"
        />

        {photos.length > 1 && (
          <button
            onClick={e => { e.stopPropagation(); go(1); }}
            aria-label="Foto berikutnya"
            className="absolute right-2 sm:right-4 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      <div className="flex-shrink-0 pb-5 pt-2 flex flex-col items-center gap-3">
        {photo.caption && (
          <p className="text-white/70 text-xs text-center px-6 max-w-md">{photo.caption}</p>
        )}
        {photos.length > 1 && (
          <div className="flex gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={e => { e.stopPropagation(); onIndexChange(i); }}
                aria-label={`Foto ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'bg-white w-5' : 'bg-white/40 w-1.5'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PhotoLightbox;
