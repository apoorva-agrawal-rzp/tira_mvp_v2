import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { TiraLogo } from '@/components/tira-logo';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { parseMCPProductResponse } from '@/lib/mcp-parser';
import { cacheProducts } from '@/lib/product-cache';
import type { Product } from '@shared/schema';
import { Search, Sparkles, ShoppingBag, Scissors, Droplets, Bath, Palette, ChevronRight, Zap, TrendingUp, Star, Gift, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'makeup', name: 'Makeup', icon: Palette, query: 'makeup lipstick', gradient: 'from-pink-500 to-rose-500' },
  { id: 'skincare', name: 'Skincare', icon: Sparkles, query: 'skincare serum', gradient: 'from-purple-500 to-pink-500' },
  { id: 'hair', name: 'Hair Care', icon: Scissors, query: 'shampoo hair', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'fragrance', name: 'Fragrance', icon: Droplets, query: 'perfume fragrance', gradient: 'from-amber-500 to-orange-500' },
  { id: 'bath', name: 'Bath & Body', icon: Bath, query: 'body lotion', gradient: 'from-teal-500 to-emerald-500' },
  { id: 'tools', name: 'Tools', icon: ShoppingBag, query: 'beauty tools brush', gradient: 'from-rose-500 to-pink-500' },
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-20">
      {/* Premium Header */}
      <header className="sticky top-0 left-0 right-0 bg-background/80 backdrop-blur-xl z-50 border-b border-border/50 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <TiraLogo size="lg" />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full hover:bg-primary/10"
              data-testid="notifications-button"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/account/bag')}
              className="relative rounded-full hover:bg-primary/10"
              data-testid="bag-button"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
          
          {/* Search Bar */}
          <button
            onClick={() => setLocation('/search')}
            className="w-full bg-muted/50 backdrop-blur-sm rounded-2xl px-5 py-3.5 text-left text-muted-foreground flex items-center gap-3 hover:bg-muted/70 transition-all duration-300 hover:shadow-lg border border-border/50"
            data-testid="search-button-home"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium">Search beauty products...</span>
              <p className="text-xs text-muted-foreground/70">Makeup • Skincare • Haircare</p>
            </div>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Hero Section - Buy at Your Price */}
        <section className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-pink-500 to-purple-600 opacity-95" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
          
          <div className="relative z-10 p-6">
            <Badge className="mb-3 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Zap className="w-3 h-3 mr-1" />
              Exclusive Feature
            </Badge>
            
            <h2 className="text-3xl font-bold mb-2 text-white">
              Buy at Your Own Price
            </h2>
            <p className="text-white/90 mb-5 text-sm leading-relaxed max-w-md">
              Set your target price & get auto-purchased when price drops. Powered by AI price monitoring.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setLocation('/search')}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-xl"
              >
                Try Now
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                onClick={() => setLocation('/wishlist')}
              >
                My Bids
              </Button>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -right-5 top-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl" />
        </section>

        {/* User Greeting */}
        {user && (
          <Card className="p-5 bg-gradient-to-br from-primary/5 to-purple/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Welcome back,</p>
                <p className="font-bold text-xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {user.name || user.phone}
                </p>
              </div>
              <Button 
                variant="default" 
                onClick={() => setLocation('/wishlist')}
                className="gap-2 shadow-lg"
              >
                <Star className="w-4 h-4" />
                My Wishlist
              </Button>
            </div>
          </Card>
        )}

        {/* Categories Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xl">Shop by Category</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/search')}
              className="text-primary"
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setLocation(`/search?q=${encodeURIComponent(cat.query)}`)}
                  className="group relative overflow-hidden rounded-2xl aspect-square transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  data-testid={`category-${cat.id}`}
                >
                  <div className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-90 group-hover:opacity-100 transition-opacity',
                    cat.gradient
                  )} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  
                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-white text-center leading-tight">
                      {cat.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Trending Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-xl">Trending Now</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/search?q=bestseller')}
              className="text-primary gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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

        {/* How It Works */}
        <section>
          <Card className="overflow-hidden border-2">
            <div className="bg-gradient-to-r from-primary/10 via-purple/10 to-pink/10 px-5 py-4 border-b">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">How "Buy at Your Price" Works</h3>
              </div>
              <p className="text-sm text-muted-foreground">Save money with our AI-powered price bidding</p>
            </div>
            
            <div className="p-5 space-y-5">
              {[
                {
                  step: '1',
                  title: 'Set Your Target Price',
                  desc: 'Choose any price lower than current market price',
                  icon: '🎯'
                },
                {
                  step: '2',
                  title: 'We Monitor 24/7',
                  desc: 'Our AI tracks prices in real-time across the platform',
                  icon: '🤖'
                },
                {
                  step: '3',
                  title: 'Auto-Purchase',
                  desc: 'Order placed automatically using secure UPI Reserve Pay',
                  icon: '⚡'
                }
              ].map((item) => (
                <div key={item.step} className="flex gap-4 group">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>
                    <div className="absolute -right-1 -bottom-1 text-2xl">
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold mb-1">{item.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Bottom Spacing */}
        <div className="h-4" />
      </div>

      <BottomNav active="home" />
    </div>
  );
}
