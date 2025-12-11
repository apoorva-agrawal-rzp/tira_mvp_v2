import { useLocation } from 'wouter';
import type { Product } from '@shared/schema';
import { Star, Heart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/product-image';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const [, setLocation] = useLocation();
  
  const imageUrl = product.images?.[0]?.url || product.medias?.[0]?.url || '';
  const brandName = product.brand?.name || product.brandName || '';
  const effectivePrice = product.price?.effective?.min || product.effectivePrice || 0;
  const markedPrice = product.price?.marked?.min || product.markedPrice;
  const hasDiscount = markedPrice && markedPrice > effectivePrice;
  const discountPercent = hasDiscount ? Math.round((1 - effectivePrice / markedPrice) * 100) : 0;

  const handleClick = () => {
    setLocation(`/product/${product.slug}`);
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-44 flex-shrink-0 text-left group bg-white dark:bg-card rounded-lg overflow-hidden"
        data-testid={`product-card-compact-${product.slug}`}
      >
        <div className="relative">
          <ProductImage
            src={imageUrl}
            alt={product.name}
            aspectRatio="square"
            className="w-full"
          />
          {hasDiscount && discountPercent >= 10 && (
            <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
              {discountPercent}% OFF
            </span>
          )}
        </div>
        <div className="p-2">
          {brandName && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{brandName}</p>
          )}
          <p className="text-sm text-foreground line-clamp-2 leading-tight mb-1.5 min-h-[2.5em]">{product.name}</p>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground">₹{effectivePrice.toLocaleString()}</span>
            {hasDiscount && (
              <span className="text-[10px] text-muted-foreground line-through">₹{markedPrice.toLocaleString()}</span>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="bg-white dark:bg-card overflow-hidden text-left w-full group rounded-lg border border-border/50"
      data-testid={`product-card-${product.slug}`}
    >
      <div className="relative">
        <ProductImage
          src={imageUrl}
          alt={product.name}
          aspectRatio="3/4"
          className="w-full"
        />
        {hasDiscount && discountPercent >= 10 && (
          <span className="absolute top-2 left-2 bg-primary text-white text-xs font-medium px-2 py-0.5 rounded">
            {discountPercent}% OFF
          </span>
        )}
        <button 
          className="absolute top-2 right-2 w-8 h-8 bg-white/80 dark:bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Heart className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="p-3">
        {brandName && (
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{brandName}</p>
        )}
        <p className="text-sm text-foreground line-clamp-2 leading-snug mb-1.5 min-h-[2.5em]">{product.name}</p>
        
        {product.rating && (
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-xs font-medium text-foreground">{product.rating}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {product.ratingCount && (
              <span className="text-xs text-muted-foreground">| {product.ratingCount}</span>
            )}
          </div>
        )}
        
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-foreground">₹{effectivePrice.toLocaleString()}</span>
          {hasDiscount && (
            <>
              <span className="text-sm text-muted-foreground line-through">₹{markedPrice.toLocaleString()}</span>
              <span className="text-sm text-primary font-medium">({discountPercent}% Off)</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="w-44 flex-shrink-0 bg-white dark:bg-card rounded-lg overflow-hidden">
        <Skeleton className="aspect-square" />
        <div className="p-2">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card overflow-hidden rounded-lg border border-border/50">
      <Skeleton className="aspect-[3/4]" />
      <div className="p-3">
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}
