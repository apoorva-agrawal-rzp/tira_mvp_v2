import { useLocation } from 'wouter';
import type { Product } from '@shared/schema';
import { Star, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const [, setLocation] = useLocation();
  
  const imageUrl = product.images?.[0]?.url || product.medias?.[0]?.url || '';
  const brandName = product.brand?.name || product.brandName || 'TIRA';
  const effectivePrice = product.price?.effective?.min || product.effectivePrice || 0;
  const markedPrice = product.price?.marked?.min || product.markedPrice;
  const discount = product.discount || (product.discountPercent ? `${product.discountPercent}% OFF` : null);

  const handleClick = () => {
    setLocation(`/product/${product.slug}`);
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-36 flex-shrink-0 text-left group"
        data-testid={`product-card-compact-${product.slug}`}
      >
        <div className="bg-muted rounded-xl aspect-square mb-2 overflow-hidden relative">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
              <Tag className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {discount && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-md font-medium">
              {discount}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{brandName}</p>
        <p className="text-sm font-medium line-clamp-2 leading-tight mb-1">{product.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">₹{effectivePrice.toLocaleString()}</span>
          {markedPrice && markedPrice > effectivePrice && (
            <span className="text-xs text-muted-foreground line-through">₹{markedPrice.toLocaleString()}</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="bg-card rounded-xl overflow-hidden border border-card-border shadow-sm text-left w-full group hover-elevate"
      data-testid={`product-card-${product.slug}`}
    >
      <div className="aspect-[3/4] overflow-hidden relative bg-muted">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
            <Tag className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {discount && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-md font-medium">
            {discount}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-muted-foreground mb-0.5">{brandName}</p>
        <p className="text-sm font-medium line-clamp-2 leading-tight mb-2 min-h-[2.5em]">{product.name}</p>
        
        {product.rating && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{product.rating}</span>
            {product.ratingCount && (
              <span className="text-xs text-muted-foreground">({product.ratingCount})</span>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-primary">₹{effectivePrice.toLocaleString()}</span>
          {markedPrice && markedPrice > effectivePrice && (
            <span className="text-sm text-muted-foreground line-through">₹{markedPrice.toLocaleString()}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="w-36 flex-shrink-0">
        <Skeleton className="aspect-square rounded-xl mb-2" />
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border">
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
