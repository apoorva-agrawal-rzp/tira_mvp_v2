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
import { Search, User, Sparkles, ShoppingBag, Scissors, Droplets, Bath, Palette, ChevronRight, Zap, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'makeup', name: 'Makeup', icon: Palette, query: 'makeup lipstick', color: 'bg-pink-100 dark:bg-pink-900/30' },
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
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-3 border-b border-border">
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
            onClick={() => setLocation('/orders')}
            className="relative"
            data-testid="cart-button"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                {cartCount}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/account')}
            data-testid="account-button"
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <section className="bg-gradient-to-r from-primary to-pink-400 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Exclusive Feature</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Buy at Your Own Price</h2>
            <p className="opacity-90 mb-4 text-sm max-w-xs">
              Set your target price & get auto-purchased when price drops!
            </p>
            <Button
              onClick={() => setLocation('/search')}
              className="bg-white text-primary hover:bg-white/90"
            >
              Try Now
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
        </section>

        <section>
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
                  <div className="w-12 h-12 rounded-full bg-background/60 dark:bg-background/30 flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <span className="text-sm font-medium">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>

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
          <h3 className="font-bold mb-4">How "Buy at Your Price" Works</h3>
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
            <div className="flex items-center justify-between">
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
