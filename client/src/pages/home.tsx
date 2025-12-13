import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Search, ShoppingBag, ChevronRight, Zap, Handshake, ChevronLeft } from 'lucide-react';

const FEATURED_SLUGS = [
  "insight-cosmetics-matte-lipstick---high-heels-42g-iyr8yea_ajdt",
  "lottie-london-glitter-switch-glitter-release-liquid-lipstick---killin-it-3ml-vtbdpfcef5v",
  "elle18-liquid-lip-color---orchid-fantasy-56ml-xbtzeu-rh2g",
  "deborah-milano-milano-red-ls---09-cherry-pop-kimono-gpwdecvigzhnl",
  "belora-paris-serum-high-hydration---serum-haute-hydratation-20ml-htzpd1kh6fv",
  "wow-skin-science-brightening-vitamin-c-foaming-face-wash-refill-pack-200ml-zrwl_wutrozn",
  "prolixr-jeju-volcanic-night-cream-50g-lpwm7w5q3h0",
  "ozone-acne-check-face-wash-100ml-ogokfxmoxpsb",
  "insight-cosmetics-pastel-color-nail-polish---32-shade-9ml-ykpisscxhvh2",
  "myglamm-manish-malhotra-gel-finish-nail-lacquer---ballerina-blush-10ml-aiu3q7-agx9i",
  "jaquline-usa-one-stroke-premium-nail-enamel---j56-maroon-martini-8ml-eoxbdhqu7x8",
  "revlon-so-fierce-mascara---blackest-black-75ml-5hote29uxp6",
  "lotus-makeup-colorkick-eyeliner---cl04-smoky-affair-35ml-t0g_pntcrhim",
  "sivanna-colors-velvet-touch-eyeshadow-palette---02-shade-20g-glorqtrc5zgf",
  "tommy-hilfiger-new-holiday-set--eau-de-toilette-deo-2-pcs-xocb205hbfne",
  "jeanne-arthes-love-generation-rock-eau-de-parfum-60ml-rseb8wcpjdst",
  "ajmal-wisal-dhahab-eau-de-parfum-fruity-floral-perfume-and-silver-shade-homme-deodorant-citrus-woody-fragrance---2pcs-refloqpplqxh",
  "too-faced-born-this-way-super-coverage-concealer---porcelain-135ml-yq1we-mkh8vs",
  "mac-studio-fix-24-hour-smooth-wear-concealer---nc42-7ml-4kwwold_8ovt",
  "sivanna-colors-rainbow-baked-blush---05-shade-20g-yc00mcghnwy"
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { user, cart } = useAppStore();

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const allProducts: Product[] = [];
        const queries = ['lipstick', 'serum skincare', 'nail polish', 'eyeshadow mascara', 'fragrance perfume'];
        
        for (const q of queries) {
          const result = await invoke<unknown>('get_products', {
            query: q,
            limit: 4,
          });
          const products = parseMCPProductResponse(result);
          allProducts.push(...products);
        }
        
        cacheProducts(allProducts);
        setFeaturedProducts(allProducts.slice(0, 20));
      } catch (err) {
        console.error('Failed to fetch featured:', err);
      } finally {
        setFeaturedLoading(false);
      }
    };

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

    fetchFeatured();
    fetchTrending();
  }, []);

  useEffect(() => {
    if (featuredProducts.length > 0 && carouselRef.current) {
      autoScrollRef.current = setInterval(() => {
        if (carouselRef.current) {
          const container = carouselRef.current;
          const cardWidth = 140;
          const maxScroll = container.scrollWidth - container.clientWidth;
          const newScroll = container.scrollLeft + cardWidth;
          
          if (newScroll >= maxScroll) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            container.scrollTo({ left: newScroll, behavior: 'smooth' });
          }
        }
      }, 4000);
    }
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [featuredProducts.length]);

  const scrollFeatured = useCallback((direction: 'left' | 'right') => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    if (carouselRef.current) {
      const container = carouselRef.current;
      const scrollAmount = 280;
      const newScroll = direction === 'left' 
        ? container.scrollLeft - scrollAmount 
        : container.scrollLeft + scrollAmount;
      
      const newIndex = direction === 'left' 
        ? Math.max(0, featuredIndex - 2)
        : Math.min(featuredProducts.length - 4, featuredIndex + 2);
      setFeaturedIndex(newIndex);
      container.scrollTo({ left: newScroll, behavior: 'smooth' });
    }
  }, [featuredIndex, featuredProducts.length]);

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

        <section data-testid="featured-products-section">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="font-bold text-lg">Featured For You</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scrollFeatured('left')}
                disabled={featuredIndex === 0}
                data-testid="featured-scroll-left"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scrollFeatured('right')}
                disabled={featuredIndex >= featuredProducts.length - 4}
                data-testid="featured-scroll-right"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {featuredLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <ProductCardSkeleton key={i} compact />
              ))}
            </div>
          ) : (
            <div 
              ref={carouselRef}
              className="flex gap-3 pb-2 -mx-4 px-4 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {featuredProducts.map((product, idx) => (
                <ProductCard 
                  key={product.slug} 
                  product={product} 
                  compact 
                  data-testid={`featured-product-${idx}`}
                />
              ))}
            </div>
          )}
        </section>

        <ProductImageCarousel />

        <InteractiveCategoryGrid />

        <section>
          <div className="flex items-center justify-between mb-4 gap-2">
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

        <section 
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/50"
          data-testid="collaboration-banner"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <Handshake className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">TIRA x Razorpay</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This app is a collaboration between Reliance TIRA and Razorpay to demonstrate the Agentic Payments capability using UPI Reserve Pay.
              </p>
            </div>
          </div>
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
