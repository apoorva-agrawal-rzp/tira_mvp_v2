import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { TiraLogo } from '@/components/tira-logo';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { parseMCPProductResponse } from '@/lib/mcp-parser';
import { cacheProducts } from '@/lib/product-cache';
import type { Product } from '@shared/schema';
import { Search, User, Sparkles, ShoppingBag, Scissors, Droplets, Bath, Palette, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'makeup', name: 'Makeup', icon: Palette, query: 'makeup', color: 'bg-pink-100 dark:bg-pink-900/30' },
  { id: 'skincare', name: 'Skincare', icon: Sparkles, query: 'skincare serum', color: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'hair', name: 'Hair Care', icon: Scissors, query: 'shampoo hair', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'fragrance', name: 'Fragrance', icon: Droplets, query: 'perfume fragrance', color: 'bg-amber-100 dark:bg-amber-900/30' },
  { id: 'bath', name: 'Bath & Body', icon: Bath, query: 'body lotion', color: 'bg-teal-100 dark:bg-teal-900/30' },
  { id: 'tools', name: 'Tools', icon: ShoppingBag, query: 'beauty tools brush', color: 'bg-rose-100 dark:bg-rose-900/30' },
];

export default function HomePage() {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { user } = useAppStore();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const result = await invoke<unknown>('get_products', {
          query: 'bestseller lipstick',
          limit: 8,
        });

        const products = parseMCPProductResponse(result);
        // Cache products for use in product detail page
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-3 flex items-center gap-3 border-b border-border">
        <TiraLogo size="md" />
        <button
          onClick={() => setLocation('/search')}
          className="flex-1 bg-muted rounded-full px-4 py-2.5 text-left text-muted-foreground flex items-center gap-2 hover-elevate"
          data-testid="search-button-home"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search products...</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/account')}
          data-testid="account-button"
        >
          <User className="w-5 h-5" />
        </Button>
      </header>

      <div className="p-4">
        <div className="bg-gradient-to-r from-primary to-pink-400 rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">New Feature</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">Buy at Your Own Price</h2>
            <p className="opacity-90 mb-4 text-sm">Set your target price & get auto-notified when it drops!</p>
            <Button
              variant="secondary"
              onClick={() => setLocation('/search')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Try Now
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-2 w-20 h-20 bg-white/10 rounded-full" />
        </div>

        <section className="mb-8">
          <h3 className="font-bold text-lg mb-4">Shop by Category</h3>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setLocation(`/search?q=${encodeURIComponent(cat.query)}`)}
                  className={cn(
                    'rounded-xl p-4 text-center transition-all hover-elevate',
                    cat.color
                  )}
                  data-testid={`category-${cat.id}`}
                >
                  <div className="w-10 h-10 rounded-full bg-background/60 dark:bg-background/30 flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-sm font-medium">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Trending Now</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/search?q=trending')}
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

        <section className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-2xl p-5 mb-6">
          <h3 className="font-bold mb-2">How "Buy at Your Price" Works</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Set Your Target Price</p>
                <p className="text-xs text-muted-foreground">Choose a price you'd like to pay</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-sm">We Monitor Prices 24/7</p>
                <p className="text-xs text-muted-foreground">Our AI tracks prices in real-time</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-sm">Auto-Purchase When Price Drops</p>
                <p className="text-xs text-muted-foreground">Using UPI Reserve Pay for instant checkout</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
