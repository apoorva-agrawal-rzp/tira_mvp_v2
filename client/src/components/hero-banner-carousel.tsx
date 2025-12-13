import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Zap, Sparkles, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import blackFridayBanner from '@assets/generated_images/black_friday_sale_banner.png';
import tiraBrandBanner from '@assets/generated_images/tira_brand_beauty_banner.png';
import topSellingBanner from '@assets/generated_images/top_selling_products_banner.png';

interface Banner {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  icon: typeof Zap;
  gradient: string;
}

const banners: Banner[] = [
  {
    id: 'black-sale',
    image: blackFridayBanner,
    title: 'Black Friday Sale',
    subtitle: 'Up to 70% OFF on Premium Beauty',
    cta: 'Shop Now',
    ctaLink: '/search?q=sale',
    icon: Gift,
    gradient: 'from-black/70 via-black/50 to-transparent',
  },
  {
    id: 'tira-exclusive',
    image: tiraBrandBanner,
    title: 'Buy at Your Own Price',
    subtitle: 'Set your price & auto-purchase when it drops',
    cta: 'Try Now',
    ctaLink: '/search',
    icon: Zap,
    gradient: 'from-pink-900/70 via-pink-900/50 to-transparent',
  },
  {
    id: 'bestsellers',
    image: topSellingBanner,
    title: 'Top Selling Products',
    subtitle: 'Discover what everyone is loving',
    cta: 'Explore',
    ctaLink: '/search?q=bestseller',
    icon: Sparkles,
    gradient: 'from-purple-900/70 via-purple-900/50 to-transparent',
  },
];

interface HeroBannerCarouselProps {
  compact?: boolean;
}

export function HeroBannerCarousel({ compact = false }: HeroBannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [, setLocation] = useLocation();

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const currentBanner = banners[currentIndex];
  const Icon = currentBanner.icon;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        compact ? 'h-40' : 'h-56 sm:h-64'
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="hero-banner-carousel"
    >
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={cn(
            'absolute inset-0 transition-all duration-700 ease-in-out',
            index === currentIndex
              ? 'opacity-100 translate-x-0'
              : index < currentIndex
              ? 'opacity-0 -translate-x-full'
              : 'opacity-0 translate-x-full'
          )}
        >
          <img
            src={banner.image}
            alt={banner.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className={cn('absolute inset-0 bg-gradient-to-r', banner.gradient)} />
          
          <div className="absolute inset-0 flex flex-col justify-center p-6">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-5 h-5 text-white" />
              <span className="text-white/90 text-sm font-medium">{banner.id === 'black-sale' ? 'Limited Time' : banner.id === 'tira-exclusive' ? 'Exclusive Feature' : 'Trending'}</span>
            </div>
            <h2 className={cn('font-bold text-white mb-1', compact ? 'text-xl' : 'text-2xl sm:text-3xl')}>
              {banner.title}
            </h2>
            <p className={cn('text-white/90 mb-4', compact ? 'text-sm max-w-[200px]' : 'max-w-xs')}>
              {banner.subtitle}
            </p>
            {!compact && (
              <Button
                onClick={() => setLocation(banner.ctaLink)}
                className="w-fit bg-white text-black hover:bg-white/90"
                data-testid={`banner-cta-${banner.id}`}
              >
                {banner.cta}
              </Button>
            )}
          </div>
        </div>
      ))}

      {!compact && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm"
            data-testid="banner-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm"
            data-testid="banner-next"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              index === currentIndex
                ? 'w-6 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/70'
            )}
            data-testid={`banner-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
