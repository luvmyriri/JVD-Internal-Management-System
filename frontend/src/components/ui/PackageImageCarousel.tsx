import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Maximize2, X } from 'lucide-react';

interface PackageImageCarouselProps {
  images?: (string | null | undefined)[];
  alt?: string;
  className?: string;
  badgeText?: string;
  badgeColor?: string;
  autoPlay?: boolean;
  intervalMs?: number;
  showControls?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  showThumbnails?: boolean;
  allowLightbox?: boolean;
}

const resolveImageUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http') || path.startsWith('/')) return path;
  return `/storage/${path}`;
};

export default function PackageImageCarousel({
  images = [],
  alt = 'Package image',
  className = 'h-48 w-full',
  badgeText,
  badgeColor = 'bg-slate-950/80 text-white',
  autoPlay = true,
  intervalMs = 4000,
  showControls = true,
  showDots = true,
  showCounter = true,
  showThumbnails = false,
  allowLightbox = true,
}: PackageImageCarouselProps) {
  // Filter out any null/undefined/empty image values
  const validImages = (images || []).filter((img): img is string => Boolean(img && String(img).trim()));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep index in bounds if validImages array changes
  useEffect(() => {
    if (currentIndex >= validImages.length) {
      setCurrentIndex(Math.max(0, validImages.length - 1));
    }
  }, [validImages.length, currentIndex]);

  // Auto-slideshow timer
  useEffect(() => {
    if (!autoPlay || validImages.length <= 1 || isPaused || isLightboxOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, validImages.length, intervalMs, isPaused, isLightboxOpen]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const handleDotClick = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(index);
  };

  // If no images uploaded
  if (validImages.length === 0) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-gray-800 flex flex-col items-center justify-center p-4 text-slate-400 ${className}`}>
        <ImagePlus className="h-10 w-10 stroke-[1.5] text-slate-300 dark:text-gray-600 mb-1" />
        <span className="text-[11px] font-bold text-slate-400 dark:text-gray-500">No images uploaded</span>
        {badgeText && (
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${badgeColor}`}>
            {badgeText}
          </span>
        )}
      </div>
    );
  }

  const currentSrc = resolveImageUrl(validImages[currentIndex]);

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-2xl bg-slate-900 select-none ${className}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Main Active Image with Smooth Fade */}
        <img
          key={`${currentSrc}-${currentIndex}`}
          src={currentSrc}
          alt={`${alt} - image ${currentIndex + 1}`}
          className="h-full w-full object-cover transition-all duration-500 ease-in-out"
        />

        {/* Top-Left Badge (Optional) */}
        {badgeText && (
          <span className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm ${badgeColor}`}>
            {badgeText}
          </span>
        )}

        {/* Top-Right Counter Pill & Lightbox Button */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          {showCounter && validImages.length > 1 && (
            <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-md">
              {currentIndex + 1} / {validImages.length}
            </span>
          )}
          {allowLightbox && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="rounded-full bg-slate-950/70 p-1.5 text-white backdrop-blur-md opacity-80 hover:opacity-100 transition cursor-pointer"
              title="Expand image fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Navigation Chevrons (Only if > 1 image) */}
        {showControls && validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-950/60 p-2 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-slate-950/90 cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-950/60 p-2 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-slate-950/90 cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Bottom Slide Indicator Dots */}
        {showDots && validImages.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-1.5 px-3">
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleDotClick(idx, e)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'w-5 bg-white shadow-md'
                    : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Optional Thumbnails Row below Carousel */}
      {showThumbnails && validImages.length > 1 && (
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {validImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition cursor-pointer ${
                idx === currentIndex
                  ? 'border-blue-500 ring-2 ring-blue-500/20 opacity-100 scale-105'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={resolveImageUrl(img)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl flex flex-col items-center">
            <img
              src={resolveImageUrl(validImages[currentIndex])}
              alt={alt}
              className="max-h-[80vh] max-w-[85vw] object-contain rounded-xl shadow-2xl"
            />

            {validImages.length > 1 && (
              <div className="mt-4 flex items-center gap-4 text-white">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="rounded-full bg-white/10 p-3 hover:bg-white/20 transition cursor-pointer"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <span className="text-xs font-bold tracking-widest uppercase">
                  Image {currentIndex + 1} of {validImages.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-full bg-white/10 p-3 hover:bg-white/20 transition cursor-pointer"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
