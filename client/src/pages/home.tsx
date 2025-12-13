import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { TiraLogo } from '@/components/tira-logo';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { HeroBannerCarousel } from '@/components/hero-banner-carousel';
import { ProductImageCarousel } from '@/components/product-image-carousel';
import { InteractiveCategoryGrid } from '@/components/interactive-category-grid';
import { Button } from '@/components/ui/button';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { parseMCPProductResponse } from '@/lib/mcp-parser';
import { cacheProducts } from '@/lib/product-cache';
import type { Product } from '@shared/schema';
import { Search, ShoppingBag, ChevronRight, Zap } from 'lucide-react';

export default function HomePage() {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { user, cart } = useAppStore();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const result = await invoke<unknown>('get_products', {
          query: 'bestseller lipstick',
          limit: 10,
        });

        const products = parseMCPProductResponse(result);
        cacheProducts(products);
        setTrendingProducts(products);
      } catch (err) {
        console.error('Failed to fetch trending:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-4 py-3 border-b border-border shadow-sm">
        <div className="flex items-center gap-3">
          <TiraLogo size="md" />
          <button
            onClick={() => setLocation('/search')}
            className="flex-1 bg-muted rounded-full px-4 py-2.5 text-left text-muted-foreground flex items-center gap-2 hover-elevate"
            data-testid="search-button-home"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search beauty products...</span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/account/bag')}
            className="relative"
            data-testid="bag-button"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <HeroBannerCarousel />

        <ProductImageCarousel />

        <InteractiveCategoryGrid />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Trending Now</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/search?q=bestseller')}
              className="text-primary"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {[1, 2, 3, 4].map((i) => (
                <ProductCardSkeleton key={i} compact />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {trendingProducts.map((product) => (
                <ProductCard key={product.slug} product={product} compact />
              ))}
            </div>
          )}
        </section>

        <section className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            How "Buy at Your Price" Works
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Set Your Target Price</p>
                <p className="text-sm text-muted-foreground">Choose any price lower than current</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                2
              </div>
              <div>
                <p className="font-medium">We Monitor 24/7</p>
                <p className="text-sm text-muted-foreground">Our AI tracks prices in real-time</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Auto-Purchase When Price Drops</p>
                <p className="text-sm text-muted-foreground">Using secure UPI Reserve Pay</p>
              </div>
            </div>
          </div>
        </section>

        {user && (
          <section className="bg-muted/50 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Welcome back,</p>
                <p className="font-bold text-lg">{user.name || user.phone}</p>
              </div>
              <Button variant="outline" onClick={() => setLocation('/wishlist')}>
                My Wishlist
              </Button>
            </div>
          </section>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
