import { useLocation } from 'wouter';
import type { PriceBid } from '@shared/schema';
import { RefreshCw, CheckCircle2, Tag, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BidCardProps {
  bid: PriceBid;
  onRemove?: () => void;
  completed?: boolean;
}

export function BidCard({ bid, onRemove, completed }: BidCardProps) {
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
            {bid.product?.image ? (
              <img
                src={bid.product.image}
                alt={bid.product.name}
                className="w-20 h-20 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <Tag className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
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

      {!completed && onRemove && (
        <div className="border-t border-border">
          <Button
            variant="ghost"
            onClick={onRemove}
            className="w-full rounded-none text-destructive"
            data-testid={`remove-bid-${bid.id}`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Bid
          </Button>
        </div>
      )}
    </Card>
  );
}
