import { useState, useCallback } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  aspectRatio?: 'square' | '3/4' | '4/3';
  showPlaceholder?: boolean;
}

function getProxiedUrl(url: string): string {
  if (!url) return '';
  
  // If already proxied or is a data URL, return as-is
  if (url.startsWith('/api/image-proxy') || url.startsWith('data:')) {
    return url;
  }
  
  // Check if it's a TIRA CDN URL that needs proxying
  if (url.includes('tiraz5.de') || url.includes('tirabeauty.com')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  
  return url;
}

export function ProductImage({ 
  src, 
  alt, 
  className,
  fallbackClassName,
  aspectRatio = 'square',
  showPlaceholder = true,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const proxiedSrc = getProxiedUrl(src || '');
  const aspectClass = {
    'square': 'aspect-square',
    '3/4': 'aspect-[3/4]',
    '4/3': 'aspect-[4/3]',
  }[aspectRatio];

  if (!src || hasError) {
    if (!showPlaceholder) return null;
    
    return (
      <div className={cn(
        'bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 flex items-center justify-center',
        aspectClass,
        fallbackClassName || className
      )}>
        <Package className="w-8 h-8 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-neutral-50 dark:bg-muted', aspectClass, className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 animate-pulse" />
      )}
      <img
        src={proxiedSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-contain p-2 transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        loading="lazy"
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
}

export function ProductImageCarousel({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images.length) {
    return <ProductImage src="" alt={alt} className={className} />;
  }

  return (
    <div className={cn('relative', className)}>
      <ProductImage
        src={images[currentIndex]}
        alt={`${alt} - Image ${currentIndex + 1}`}
        aspectRatio="square"
        className="w-full"
      />
      
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 dark:bg-black/50 rounded-full flex items-center justify-center shadow-sm"
            data-testid="carousel-prev"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentIndex((i) => (i + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 dark:bg-black/50 rounded-full flex items-center justify-center shadow-sm"
            data-testid="carousel-next"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i === currentIndex ? 'bg-primary' : 'bg-white/60'
                )}
                data-testid={`carousel-dot-${i}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
