import { useState } from 'react';
import { useLocation } from 'wouter';
import { X, Info, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface PriceBidSheetProps {
  product: {
    slug: string;
    name: string;
    brand?: string;
    image?: string;
    price: number;
    itemId?: number;
    articleId?: string;
  };
  onClose: () => void;
}

interface ProbabilityInfo {
  percent: number;
  label: string;
  color: string;
  message: string;
}

const discountOptions = [
  { label: '10% OFF', percent: 10 },
  { label: '20% OFF', percent: 20 },
  { label: '30% OFF', percent: 30 },
];

function calculateProbability(bid: number, currentPrice: number): ProbabilityInfo | null {
  if (!bid || bid >= currentPrice) return null;
  
  const discount = ((currentPrice - bid) / currentPrice) * 100;
  
  if (discount <= 10) {
    return { percent: 95, label: 'Very High', color: '#22C55E', message: 'Almost guaranteed!' };
  }
  if (discount <= 20) {
    return { percent: 75, label: 'High', color: '#84CC16', message: 'High chance in upcoming sales!' };
  }
  if (discount <= 30) {
    return { percent: 50, label: 'Medium', color: '#F59E0B', message: 'Possible during major sales' };
  }
  if (discount <= 40) {
    return { percent: 25, label: 'Low', color: '#EF4444', message: "Unlikely but we'll try!" };
  }
  return { percent: 10, label: 'Very Low', color: '#DC2626', message: 'Very unlikely at this price' };
}

export function PriceBidSheet({ product, onClose }: PriceBidSheetProps) {
  const [bidPrice, setBidPrice] = useState('');
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { invoke } = useMCP();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, session, addBid } = useAppStore();

  const currentPrice = product.price;
  
  const getDiscountPrice = (percent: number) => Math.round(currentPrice * (1 - percent / 100));
  
  const selectedBidPrice = bidPrice ? Number(bidPrice) : selectedDiscount ? getDiscountPrice(selectedDiscount) : null;
  const probability = selectedBidPrice ? calculateProbability(selectedBidPrice, currentPrice) : null;

  const handleQuickSelect = (percent: number) => {
    setSelectedDiscount(percent);
    setBidPrice(getDiscountPrice(percent).toString());
  };

  const handleSubmitBid = async () => {
    const finalBidPrice = Number(bidPrice);

    if (!finalBidPrice || finalBidPrice >= currentPrice) {
      toast({
        title: 'Invalid bid',
        description: 'Bid must be lower than current price',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.phone || !session) {
      toast({
        title: 'Not logged in',
        description: 'Please login to place a bid',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<{ bidId?: string; monitorId?: string }>('tira_price_bidding', {
        productSlug: product.slug,
        productName: product.name,
        productItemId: product.itemId,
        productArticleId: product.articleId,
        purchasePrice: currentPrice,
        bidPrice: finalBidPrice,
        userId: user.phone,
        userPhone: user.phone,
        sessionCookie: session,
        notificationMethod: 'whatsapp',
        notificationDestination: user.phone,
        addressConfirmed: true,
      });

      addBid({
        id: result.bidId || Date.now().toString(),
        bidId: result.bidId,
        monitorId: result.monitorId,
        product: {
          name: product.name,
          brand: product.brand,
          image: product.image,
          slug: product.slug,
        },
        bidPrice: finalBidPrice,
        currentPrice: currentPrice,
        status: 'monitoring',
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Price bid submitted!',
        description: `We'll notify you when the price drops to ₹${finalBidPrice.toLocaleString()}`,
      });
      
      onClose();
      setLocation('/wishlist');
    } catch (err) {
      console.error('Price bid error:', err);
      toast({
        title: 'Failed to submit bid',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-end animate-in fade-in duration-200"
      onClick={onClose}
      data-testid="price-bid-sheet"
    >
      <div 
        className="bg-background w-full rounded-t-3xl p-6 max-h-[85vh] overflow-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Buy at Your Own Price</h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            data-testid="close-bid-sheet"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-muted-foreground mb-4">
          Current Price: <span className="font-bold text-foreground text-lg">₹{currentPrice.toLocaleString()}</span>
        </p>

        <div className="mb-5">
          <p className="text-sm text-muted-foreground mb-2">Quick Select</p>
          <div className="flex gap-2">
            {discountOptions.map((option) => {
              const price = getDiscountPrice(option.percent);
              const isSelected = selectedDiscount === option.percent;
              
              return (
                <button
                  key={option.percent}
                  onClick={() => handleQuickSelect(option.percent)}
                  className={cn(
                    'flex-1 p-3 rounded-xl border-2 text-center transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                  data-testid={`discount-${option.percent}`}
                >
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-primary font-bold">₹{price.toLocaleString()}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-sm text-muted-foreground mb-2">Or enter your price</p>
          <div className="flex border-2 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
            <span className="bg-muted px-4 py-3 font-semibold text-muted-foreground">₹</span>
            <Input
              type="number"
              value={bidPrice}
              onChange={(e) => {
                setBidPrice(e.target.value);
                setSelectedDiscount(null);
              }}
              placeholder="Enter your bid"
              className="border-0 rounded-none focus-visible:ring-0 h-auto py-3"
              data-testid="bid-price-input"
            />
          </div>
        </div>

        {probability && (
          <div className="bg-muted rounded-xl p-4 mb-5">
            <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Success Probability</span>
              <span className="font-bold" style={{ color: probability.color }}>
                {probability.percent}% - {probability.label}
              </span>
            </div>
            <div className="w-full bg-background rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${probability.percent}%`, backgroundColor: probability.color }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{probability.message}</p>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-3 mb-5 text-sm text-blue-800 dark:text-blue-200 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            When price drops to ₹{selectedBidPrice?.toLocaleString() || '___'}, we'll automatically purchase using your Reserve Pay
          </span>
        </div>

        <Button
          onClick={handleSubmitBid}
          disabled={loading || !selectedBidPrice || selectedBidPrice >= currentPrice}
          className="w-full py-6 text-base font-semibold"
          data-testid="submit-bid-button"
        >
          {loading ? 'Submitting...' : 'SUBMIT PRICE BID'}
        </Button>
      </div>
    </div>
  );
}
