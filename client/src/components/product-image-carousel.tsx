import { useRef } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import lipstickImg from '@assets/generated_images/lipstick_product_image.png';
import serumImg from '@assets/generated_images/serum_skincare_product.png';
import perfumeImg from '@assets/generated_images/perfume_fragrance_bottle.png';
import hairImg from '@assets/generated_images/hair_care_product.png';
import eyeshadowImg from '@assets/generated_images/makeup_eyeshadow_palette.png';
import lotionImg from '@assets/generated_images/body_lotion_product.png';

interface ProductCategory {
  id: string;
  name: string;
  image: string;
  query: string;
  bgColor: string;
}

const productCategories: ProductCategory[] = [
  { id: 'lipstick', name: 'Lipsticks', image: lipstickImg, query: 'lipstick', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  { id: 'serum', name: 'Serums', image: serumImg, query: 'serum skincare', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { id: 'perfume', name: 'Perfumes', image: perfumeImg, query: 'perfume fragrance', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'hair', name: 'Hair Care', image: hairImg, query: 'shampoo hair', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  { id: 'eyeshadow', name: 'Eyeshadow', image: eyeshadowImg, query: 'eyeshadow makeup', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
  { id: 'lotion', name: 'Lotions', image: lotionImg, query: 'body lotion', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
];

export function ProductImageCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative" data-testid="product-image-carousel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Shop by Product</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            data-testid="carousel-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            data-testid="carousel-next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4"
      >
        {productCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setLocation(`/search?q=${encodeURIComponent(category.query)}`)}
            className="flex-shrink-0 group hover-elevate active-elevate-2 rounded-xl"
            data-testid={`product-category-${category.id}`}
          >
            <div
              className={cn(
                'w-24 h-24 rounded-2xl overflow-hidden mb-2 p-2',
                category.bgColor
              )}
            >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm font-medium text-center">{category.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
