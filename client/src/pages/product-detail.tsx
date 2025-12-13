import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/loading-screen';
import { PriceBidSheet } from '@/components/price-bid-sheet';
import { ProductImage, ProductImageCarousel } from '@/components/product-image';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { parseProductDetailMarkdown } from '@/lib/mcp-parser';
import { getCachedProduct, cacheProduct } from '@/lib/product-cache';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Product } from '@shared/schema';
import { 
  ArrowLeft, 
  Star, 
  Heart, 
  Share2, 
  ShoppingBag,
  ShoppingCart,
  Zap, 
  Truck, 
  RefreshCw,
  Tag,
  Package,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtendedProduct extends Product {
  availability?: string;
  stockCount?: number;
  size?: string;
  returnPolicy?: string;
  codAvailable?: boolean;
  deliveryEstimate?: string;
  store?: string;
  seller?: string;
  specifications?: Record<string, string>;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const [product, setProduct] = useState<ExtendedProduct | null>(null);
  const [cachedImages, setCachedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showPriceBidSheet, setShowPriceBidSheet] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const isMobile = useIsMobile();
  const { invoke } = useMCP();
  const { session, user, addToCart, isHydrated, cart } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      
      const cached = getCachedProduct(slug);
      if (cached) {
        const cachedImgUrls = cached.images?.map(i => i.url) || [];
        if (cachedImgUrls.length > 0) {
          setCachedImages(cachedImgUrls);
        }
      }
      
      setLoading(true);
      try {
        const result = await invoke<unknown>('tira_get_product_by_slug', { slug });

        let parsedProduct: ExtendedProduct | null = null;

        if (typeof result === 'string') {
          const parsed = parseProductDetailMarkdown(result);
          if (parsed) {
            parsed.slug = parsed.slug || slug;
            parsedProduct = parsed as ExtendedProduct;
          }
        } else if (typeof result === 'object' && result !== null) {
          const data = result as Record<string, unknown>;
          const p = data.product ? (data.product as Record<string, unknown>) : data;
          
          if (p.name) {
            parsedProduct = {
              slug: (p.slug as string) || slug,
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
            };
          }
        }

        if (parsedProduct) {
          if (cached) {
            if (!parsedProduct.itemId && cached.itemId) parsedProduct.itemId = cached.itemId;
            if (!parsedProduct.articleId && cached.articleId) parsedProduct.articleId = cached.articleId;
            if (!parsedProduct.brandName && cached.brandName) parsedProduct.brandName = cached.brandName;
            if (!parsedProduct.images?.length && cached.images?.length) parsedProduct.images = cached.images;
          }
          setProduct(parsedProduct);
          cacheProduct(parsedProduct);
        } else if (cached) {
          setProduct(cached as ExtendedProduct);
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        if (cached) {
          setProduct(cached as ExtendedProduct);
        } else {
          toast({
            title: 'Failed to load product',
            description: 'Please try again',
            variant: 'destructive',
          });
        }
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

  const productImages = product.images?.map(i => i.url) || product.medias?.map(m => m.url) || [];
  const images = productImages.length > 0 ? productImages : cachedImages;
  const brandName = product.brand?.name || product.brandName || 'TIRA';
  const effectivePrice = product.price?.effective?.min || product.effectivePrice || 0;
  const markedPrice = product.price?.marked?.min || product.markedPrice;
  const hasDiscount = markedPrice && markedPrice > effectivePrice;
  const discountPercent = hasDiscount ? Math.round(((markedPrice - effectivePrice) / markedPrice) * 100) : 0;

  const handleAddToBag = async () => {
    if (!isHydrated) {
      toast({
        title: 'Please wait',
        description: 'Loading your session...',
      });
      return;
    }

    if (!session || !user) {
      toast({
        title: 'Please login',
        description: 'Login to add items to your bag',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    if (!product.itemId || !product.articleId) {
      toast({
        title: 'Product unavailable',
        description: 'This product cannot be added to cart right now',
        variant: 'destructive',
      });
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
        itemId: product.itemId,
        articleId: product.articleId,
        name: product.name,
        brand: brandName,
        image: images[0] || '',
        price: effectivePrice,
        quantity: 1,
      });

      toast({
        title: 'Added to bag!',
        description: product.name,
      });
    } catch (err: unknown) {
      console.error('Add to cart failed:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.toLowerCase().includes('session') || 
          errorMessage.toLowerCase().includes('auth') ||
          errorMessage.toLowerCase().includes('login')) {
        toast({
          title: 'Session expired',
          description: 'Please login again',
          variant: 'destructive',
        });
        setLocation('/login');
      } else {
        addToCart({
          itemId: product.itemId!,
          articleId: product.articleId!,
          name: product.name,
          brand: brandName,
          image: images[0] || '',
          price: effectivePrice,
          quantity: 1,
        });
        toast({
          title: 'Added to bag!',
          description: product.name,
        });
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyAtMyPrice = () => {
    if (!isHydrated) {
      toast({
        title: 'Please wait',
        description: 'Loading your session...',
      });
      return;
    }

    if (!session || !user) {
      toast({
        title: 'Please login',
        description: 'Login to set a price bid',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    if (!product.itemId || !product.articleId) {
      toast({
        title: 'Product unavailable',
        description: 'Price bidding is not available for this product',
        variant: 'destructive',
      });
      return;
    }

    setShowPriceBidSheet(true);
  };

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      <header className="sticky top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-4 py-3 flex items-center justify-between border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation('/search')}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/account/cart')}
            className="relative"
            data-testid="button-cart-header"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                {cart.length > 9 ? '9+' : cart.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      <div className="relative bg-white dark:bg-muted">
        <ProductImageCarousel images={images} alt={product.name} />
        
        {hasDiscount && (
          <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
            {discountPercent}% OFF
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-primary font-medium mb-1">{brandName}</p>
          <h1 className="text-xl font-bold leading-tight text-foreground">{product.name}</h1>
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
          <span className="text-2xl font-bold text-foreground">₹{effectivePrice.toLocaleString()}</span>
          {hasDiscount && (
            <>
              <span className="text-lg text-muted-foreground line-through">
                ₹{markedPrice.toLocaleString()}
              </span>
              <span className="text-green-600 font-semibold text-sm">
                {discountPercent}% OFF
              </span>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 p-3 bg-muted/50 rounded-lg">
            <Truck className="w-5 h-5 text-primary" />
            <span className="text-xs text-center text-muted-foreground">Free Delivery</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 bg-muted/50 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-xs text-center text-muted-foreground">Genuine Product</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 bg-muted/50 rounded-lg">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-xs text-center text-muted-foreground">COD Available</span>
          </div>
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

        {product.availability && (
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">{product.availability}</span>
          </div>
        )}

        {product.deliveryEstimate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="w-4 h-4" />
            <span>Delivery by: {product.deliveryEstimate}</span>
          </div>
        )}

        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-3">Product Details</h3>
            <div className="space-y-2">
              {Object.entries(product.specifications).slice(0, 6).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {product.seller && (
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-2">Sold By</h3>
            <p className="text-sm text-muted-foreground">{product.seller}</p>
          </div>
        )}
      </div>

      <div className={cn(
        "bg-background border-t border-border p-4 flex gap-3 z-40",
        isMobile ? "fixed bottom-0 left-0 right-0" : "sticky bottom-0 left-0 right-0"
      )}>
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
            image: images[0] || '',
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
