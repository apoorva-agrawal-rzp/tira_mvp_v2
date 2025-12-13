import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/product-image';
import { useMCP } from '@/hooks/use-mcp';
import { parseMCPProductResponse } from '@/lib/mcp-parser';
import type { Product } from '@shared/schema';

const productQueries = [
  { id: 'lipstick', name: 'Lipsticks', query: 'lipstick' },
  { id: 'serum', name: 'Serums', query: 'serum skincare' },
  { id: 'perfume', name: 'Perfumes', query: 'perfume fragrance' },
  { id: 'hair', name: 'Hair Care', query: 'shampoo hair' },
  { id: 'eyeshadow', name: 'Eyeshadow', query: 'eyeshadow makeup' },
  { id: 'lotion', name: 'Lotions', query: 'body lotion' },
];

export function ProductImageCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const result = await invoke<unknown>('get_products', {
          query: 'bestseller trending',
          limit: 12,
        });
        const fetchedProducts = parseMCPProductResponse(result);
        setProducts(fetchedProducts.slice(0, 8));
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [invoke]);

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
      <div className="flex items-center justify-between gap-2 mb-3">
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
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4"
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-28">
              <div className="w-28 h-28 rounded-xl bg-muted animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse w-20 mx-auto" />
            </div>
          ))
        ) : products.length > 0 ? (
          products.map((product) => (
            <button
              key={product.slug}
              onClick={() => setLocation(`/product/${product.slug}`)}
              className="flex-shrink-0 group hover-elevate active-elevate-2 rounded-xl w-28"
              data-testid={`product-item-${product.slug}`}
            >
              <div className="w-28 h-28 rounded-xl overflow-hidden mb-2 bg-muted">
                <ProductImage
                  src={product.images?.[0]?.url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs font-medium text-center line-clamp-2 leading-tight px-1">
                {product.name}
              </p>
              <p className="text-xs text-primary font-semibold text-center mt-0.5">
                ₹{(product.effectivePrice || product.price?.effective?.min || 0).toLocaleString()}
              </p>
            </button>
          ))
        ) : (
          <div className="flex items-center justify-center w-full py-8">
            <p className="text-sm text-muted-foreground">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}
