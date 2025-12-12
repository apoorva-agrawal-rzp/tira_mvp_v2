import { useState } from 'react';
import { useLocation } from 'wouter';
import { X, Info, Zap, QrCode } from 'lucide-react';
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [bidId, setBidId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const { invoke } = useMCP();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, session, addBid, customerId, setCustomerId } = useAppStore();

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

    // Validate required product fields
    if (!product.itemId || !product.articleId) {
      toast({
        title: 'Product unavailable',
        description: 'Price bidding is not available for this product',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Complete Agentic Flow: Use tira_price_bidding
      // This sets up UPI Reserve Pay and automatic purchase when price drops
      
      // Get customer ID if not available
      let custId = customerId;
      if (!custId && user?.phone) {
        try {
          const tokenResult = await invoke<{
            customer?: { id?: string };
          }>('get_token_masked_data', {
            contact: user.phone,
          });
          custId = tokenResult?.customer?.id || null;
          if (custId) {
            setCustomerId(custId);
          }
        } catch (err) {
          console.warn('Failed to fetch customer ID:', err);
        }
      }

      // Call tira_price_bidding with complete agentic flow
      const result = await invoke<{
        success?: boolean;
        status?: string;
        bid?: {
          id?: string;
          productName?: string;
          baseProductPrice?: number;
          baseBidPrice?: number;
          bidAmountWithCharges?: number;
          potentialSavings?: number;
        };
        payment?: {
          id?: string;
          status?: string;
          qrCodeUrl?: string;
          qr_code_url?: string;
          upi_intent_link?: string;
          available_actions?: Array<{
            action?: string;
            url?: string;
            qr_url?: string;
          }>;
        };
        order?: {
          id?: string;
        };
        message?: string;
      }>('tira_price_bidding', {
        productSlug: product.slug,
        productName: product.name,
        productItemId: product.itemId,
        productArticleId: product.articleId,
        purchasePrice: currentPrice,
        bidPrice: finalBidPrice,
        userId: user.phone,
        userPhone: user.phone,
        userEmail: user.email || '',
        sessionCookie: session,
        customerId: custId,
        addressConfirmed: true,
        notificationMethod: 'whatsapp',
        notificationDestination: user.phone,
      });

      console.log('[PriceBid] Result:', result);

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to create price bid');
      }

      const bidIdValue = result?.bid?.id;
      const paymentIdValue = result?.payment?.id;
      
      // Extract QR code URL
      const qrUrl = result?.payment?.qrCodeUrl || 
                   result?.payment?.qr_code_url ||
                   result?.payment?.available_actions?.find(a => a.action === 'intent')?.qr_url;

      // Check if payment is required
      if (result?.status === 'payment_pending' && qrUrl && bidIdValue && paymentIdValue) {
        // Payment required - show QR code
        setQrCodeUrl(qrUrl);
        setPaymentPending(true);
        setBidId(bidIdValue);
        setPaymentId(paymentIdValue);
        
        // Store bid locally with pending status
        addBid({
          id: bidIdValue,
          bidId: bidIdValue,
          paymentId: paymentIdValue,
          product: {
            name: product.name,
            brand: product.brand,
            image: product.image,
            slug: product.slug,
          },
          bidPrice: finalBidPrice,
          currentPrice: currentPrice,
          status: 'payment_pending',
          createdAt: new Date().toISOString(),
        });

        toast({
          title: 'Payment Required',
          description: 'Please scan QR code to complete payment and activate price bidding',
        });
        
        // Don't close - show QR code
        return;
      }

      // If no payment required or already activated
      if (bidIdValue) {
        // Try to activate if payment is already complete
        if (paymentIdValue) {
          try {
            await invoke('tira_activate_price_bidding', {
              bidId: bidIdValue,
              paymentId: paymentIdValue,
            });
          } catch (activateErr) {
            console.warn('Failed to activate bid:', activateErr);
            // Continue anyway
          }
        }

        // Store bid locally
        addBid({
          id: bidIdValue,
          bidId: bidIdValue,
          paymentId: paymentIdValue,
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
          description: `We'll automatically purchase when price drops to ₹${finalBidPrice.toLocaleString()}`,
        });
        
        onClose();
        setLocation('/wishlist');
      }
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

        {paymentPending && qrCodeUrl && (
          <div className="bg-yellow-50 dark:bg-yellow-950/50 rounded-xl p-4 mb-5 border-2 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Complete Payment to Activate</h3>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
              Scan this QR code with your UPI app to set up Reserve Pay and activate price bidding.
            </p>
            <div className="flex justify-center mb-4">
              <img 
                src={qrCodeUrl} 
                alt="UPI QR Code" 
                className="w-48 h-48 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  // Check payment status and activate
                  if (bidId && paymentId) {
                    setLoading(true);
                    try {
                      const result = await invoke<{ success?: boolean }>('tira_activate_price_bidding', {
                        bidId,
                        paymentId,
                      });
                      
                      if (result?.success) {
                        toast({
                          title: 'Price bidding activated!',
                          description: 'Monitoring is now active',
                        });
                        setPaymentPending(false);
                        onClose();
                        setLocation('/wishlist');
                      } else {
                        toast({
                          title: 'Payment not completed',
                          description: 'Please complete payment first',
                          variant: 'destructive',
                        });
                      }
                    } catch (err) {
                      toast({
                        title: 'Payment not completed',
                        description: 'Please complete payment first',
                        variant: 'destructive',
                      });
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Checking...' : 'I\'ve Paid - Activate'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPaymentPending(false);
                  setQrCodeUrl(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!paymentPending && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
