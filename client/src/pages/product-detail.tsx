import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/loading-screen';
import { PriceBidSheet } from '@/components/price-bid-sheet';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@shared/schema';
import { 
  ArrowLeft, 
  Star, 
  Heart, 
  Share2, 
  ShoppingBag, 
  Zap, 
  Truck, 
  RefreshCw,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showPriceBidSheet, setShowPriceBidSheet] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const { invoke } = useMCP();
  const { session, addToCart } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      
      setLoading(true);
      try {
        const result = await invoke<{ product?: Record<string, unknown> }>('tira_get_product_by_slug', {
          slug,
        });

        if (result.product) {
          const p = result.product;
          setProduct({
            slug: p.slug as string,
            name: p.name as string,
            brand: p.brand as { name: string } | undefined,
            brandName: (p.brand as { name?: string })?.name,
            images: p.images as Array<{ url: string }> | undefined,
            medias: p.medias as Array<{ url: string }> | undefined,
            price: p.price as { effective?: { min: number }; marked?: { min: number } } | undefined,
            effectivePrice: (p.price as { effective?: { min: number } })?.effective?.min,
            markedPrice: (p.price as { marked?: { min: number } })?.marked?.min,
            discount: p.discount as string | undefined,
            rating: p.rating as number | undefined,
            ratingCount: p.ratingCount as number | undefined,
            description: p.description as string | undefined,
            shortDescription: p.short_description as string | undefined,
            itemId: (p as { item_id?: number }).item_id || (p as { uid?: number }).uid,
            articleId: (p as { article_id?: string }).article_id,
          });
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        toast({
          title: 'Failed to load product',
          description: 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <Tag className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Product not found</p>
        <Button onClick={() => setLocation('/search')}>Browse Products</Button>
      </div>
    );
  }

  const images = product.images?.map(i => i.url) || product.medias?.map(m => m.url) || [];
  const currentImage = images[currentImageIndex] || '';
  const brandName = product.brand?.name || product.brandName || 'TIRA';
  const effectivePrice = product.price?.effective?.min || product.effectivePrice || 0;
  const markedPrice = product.price?.marked?.min || product.markedPrice;
  const hasDiscount = markedPrice && markedPrice > effectivePrice;

  const handleAddToBag = async () => {
    if (!session) {
      toast({
        title: 'Please login',
        description: 'Login to add items to your bag',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    setAddingToCart(true);
    try {
      await invoke('add_to_cart', {
        items: [{
          item_id: product.itemId,
          article_id: product.articleId,
          quantity: 1,
        }],
        sessionCookie: session,
      });

      addToCart({
        itemId: product.itemId || 0,
        articleId: product.articleId || '',
        name: product.name,
        brand: brandName,
        image: currentImage,
        price: effectivePrice,
        quantity: 1,
      });

      toast({
        title: 'Added to bag!',
        description: product.name,
      });
    } catch (err) {
      console.error('Add to cart failed:', err);
      toast({
        title: 'Failed to add to bag',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyAtMyPrice = () => {
    if (!session) {
      toast({
        title: 'Please login',
        description: 'Login to set a price bid',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }
    setShowPriceBidSheet(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-3 flex items-center justify-between border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/search')}
          data-testid="button-back-product"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFavorite(!isFavorite)}
            data-testid="button-favorite"
          >
            <Heart className={cn('w-5 h-5', isFavorite && 'fill-red-500 text-red-500')} />
          </Button>
          <Button variant="ghost" size="icon" data-testid="button-share">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="relative bg-muted aspect-square">
        {currentImage ? (
          <img
            src={currentImage}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
        
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
              onClick={prevImage}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80"
              onClick={nextImage}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === currentImageIndex ? 'bg-primary' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
          </>
        )}
        
        {product.discount && (
          <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-semibold">
            {product.discount}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{brandName}</p>
          <h1 className="text-xl font-bold leading-tight">{product.name}</h1>
        </div>

        {product.rating && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
              <Star className="w-4 h-4 fill-green-600 text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-400">{product.rating}</span>
            </div>
            {product.ratingCount && (
              <span className="text-sm text-muted-foreground">
                {product.ratingCount.toLocaleString()} ratings
              </span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-2xl font-bold text-primary">₹{effectivePrice.toLocaleString()}</span>
          {hasDiscount && (
            <>
              <span className="text-lg text-muted-foreground line-through">
                ₹{markedPrice.toLocaleString()}
              </span>
              <span className="text-green-600 font-semibold text-sm">
                {Math.round(((markedPrice - effectivePrice) / markedPrice) * 100)}% OFF
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck className="w-4 h-4" />
          <span>Free Delivery on orders above ₹499</span>
        </div>

        <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-semibold">Buy at Your Own Price</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Set your target price and we'll auto-purchase when it drops!
          </p>
        </div>

        {product.description && (
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex gap-3 z-40">
        <Button
          variant="outline"
          className="flex-1 py-6"
          onClick={handleAddToBag}
          disabled={addingToCart}
          data-testid="button-add-to-bag"
        >
          {addingToCart ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ShoppingBag className="w-4 h-4 mr-2" />
          )}
          {addingToCart ? 'Adding...' : 'ADD TO BAG'}
        </Button>
        <Button
          className="flex-1 py-6"
          onClick={handleBuyAtMyPrice}
          data-testid="button-buy-at-my-price"
        >
          <Zap className="w-4 h-4 mr-2" />
          BUY AT MY PRICE
        </Button>
      </div>

      {showPriceBidSheet && (
        <PriceBidSheet
          product={{
            slug: product.slug,
            name: product.name,
            brand: brandName,
            image: currentImage,
            price: effectivePrice,
            itemId: product.itemId,
            articleId: product.articleId,
          }}
          onClose={() => setShowPriceBidSheet(false)}
        />
      )}
    </div>
  );
}
