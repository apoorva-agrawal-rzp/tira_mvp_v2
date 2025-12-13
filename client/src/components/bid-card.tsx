import { useLocation } from 'wouter';
import type { PriceBid } from '@shared/schema';
import { RefreshCw, CheckCircle2, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProductImage } from '@/components/product-image';

interface BidCardProps {
  bid: PriceBid;
  onRemove?: () => void;
  onViewHistory?: () => void;
  completed?: boolean;
}

export function BidCard({ bid, onRemove, onViewHistory, completed }: BidCardProps) {
  const [, setLocation] = useLocation();
  const savings = bid.currentPrice - bid.bidPrice;

  const handleProductClick = () => {
    if (bid.product?.slug) {
      setLocation(`/product/${bid.product.slug}`);
    }
  };

  return (
    <Card className="overflow-hidden" data-testid={`bid-card-${bid.id}`}>
      <div className="p-4">
        <div className="flex gap-3">
          <button 
            onClick={handleProductClick}
            className="flex-shrink-0"
          >
            <ProductImage
              src={bid.product?.image}
              alt={bid.product?.name || 'Product'}
              className="w-20 h-20 rounded-lg"
              aspectRatio="square"
            />
          </button>
          
          <div className="flex-1 min-w-0">
            {bid.product?.brand && (
              <p className="text-xs text-muted-foreground">{bid.product.brand}</p>
            )}
            <button 
              onClick={handleProductClick}
              className="text-left"
            >
              <p className="font-medium line-clamp-2 leading-tight">{bid.product?.name}</p>
            </button>

            <div className="mt-2">
              {completed ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-semibold text-sm">Purchased!</span>
                  </div>
                  {savings > 0 && (
                    <span className="text-green-600 text-sm font-medium">
                      Saved ₹{savings.toLocaleString()}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm gap-2 flex-wrap">
                    <span className="text-muted-foreground">
                      Current: ₹{bid.currentPrice.toLocaleString()}
                    </span>
                    <span className="text-primary font-semibold">
                      Your Bid: ₹{bid.bidPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" style={{ animationDuration: '3s' }} />
                    <span className="text-xs text-muted-foreground">Monitoring...</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!completed && (onRemove || onViewHistory) && (
        <div className="border-t border-border">
          <div className={cn(
            "grid",
            onRemove && onViewHistory && bid.monitorId ? "grid-cols-2 divide-x divide-border" : "grid-cols-1"
          )}>
            {onViewHistory && bid.monitorId && (
              <Button
                variant="ghost"
                onClick={onViewHistory}
                className="rounded-none text-primary hover:bg-primary/10"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                onClick={onRemove}
                className="w-full rounded-none text-destructive hover:bg-destructive/10"
                data-testid={`remove-bid-${bid.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
