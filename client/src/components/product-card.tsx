import { useLocation } from 'wouter';
import type { Product } from '@shared/schema';
import { Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
        className="w-40 flex-shrink-0 text-left group bg-white dark:bg-card"
        data-testid={`product-card-compact-${product.slug}`}
      >
        <div className="bg-neutral-50 dark:bg-muted aspect-square mb-3 overflow-hidden relative">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.name} 
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-neutral-100 dark:bg-muted flex items-center justify-center">
              <span className="text-neutral-400 text-xs">No image</span>
            </div>
          )}
        </div>
        {brandName && (
          <p className="text-[11px] text-neutral-500 dark:text-muted-foreground mb-0.5 uppercase tracking-wide">{brandName}</p>
        )}
        <p className="text-sm text-neutral-900 dark:text-foreground line-clamp-2 leading-snug mb-1.5">{product.name}</p>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-neutral-900 dark:text-foreground">₹{effectivePrice.toLocaleString()}</span>
          {hasDiscount && (
            <>
              <span className="text-xs text-neutral-400 dark:text-muted-foreground line-through">₹{markedPrice.toLocaleString()}</span>
              <span className="text-xs text-primary font-medium">({discountPercent}% Off)</span>
            </>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="bg-white dark:bg-card overflow-hidden text-left w-full group"
      data-testid={`product-card-${product.slug}`}
    >
      <div className="aspect-[3/4] overflow-hidden relative bg-neutral-50 dark:bg-muted">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name} 
            className="w-full h-full object-contain p-3"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-neutral-100 dark:bg-muted flex items-center justify-center">
            <span className="text-neutral-400 text-sm">No image</span>
          </div>
        )}
      </div>
      <div className="py-3">
        {brandName && (
          <p className="text-[11px] text-neutral-500 dark:text-muted-foreground mb-0.5 uppercase tracking-wide">{brandName}</p>
        )}
        <p className="text-sm text-neutral-900 dark:text-foreground line-clamp-2 leading-snug mb-1.5 min-h-[2.5em]">{product.name}</p>
        
        {product.rating && (
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-xs font-medium text-neutral-700 dark:text-foreground">{product.rating}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {product.ratingCount && (
              <span className="text-xs text-neutral-400 dark:text-muted-foreground">| {product.ratingCount}</span>
            )}
          </div>
        )}
        
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-neutral-900 dark:text-foreground">₹{effectivePrice.toLocaleString()}</span>
          {hasDiscount && (
            <>
              <span className="text-sm text-neutral-400 dark:text-muted-foreground line-through">₹{markedPrice.toLocaleString()}</span>
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
      <div className="w-40 flex-shrink-0">
        <Skeleton className="aspect-square mb-3" />
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <Skeleton className="aspect-[3/4]" />
      <div className="py-3">
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}
