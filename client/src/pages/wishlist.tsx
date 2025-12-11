import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { BidCard } from '@/components/bid-card';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/loading-screen';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { PriceBid } from '@shared/schema';
import { Tag, Search, Zap } from 'lucide-react';

export default function WishlistPage() {
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { user, bids, setBids, removeBid } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchBids();
  }, []);

  const fetchBids = async () => {
    if (!user?.phone) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<{ bids?: Array<Record<string, unknown>> }>('tira_list_price_bids', {
        userId: user.phone,
        includeCompleted: true,
      });

      if (result.bids) {
        const mappedBids: PriceBid[] = result.bids.map((b: Record<string, unknown>) => ({
          id: (b.id || b.bidId || String(Date.now())) as string,
          bidId: b.bidId as string | undefined,
          monitorId: b.monitorId as string | undefined,
          product: {
            name: (b.productName || (b.product as { name?: string })?.name || 'Product') as string,
            brand: (b.productBrand || (b.product as { brand?: string })?.brand) as string | undefined,
            image: (b.productImage || (b.product as { image?: string })?.image) as string | undefined,
            slug: (b.productSlug || (b.product as { slug?: string })?.slug || '') as string,
          },
          bidPrice: (b.bidPrice || b.targetPrice) as number,
          currentPrice: (b.currentPrice || b.purchasePrice) as number,
          status: (b.status || 'monitoring') as PriceBid['status'],
          createdAt: (b.createdAt || new Date().toISOString()) as string,
          completedAt: b.completedAt as string | undefined,
          orderId: b.orderId as string | undefined,
        }));
        setBids(mappedBids);
      }
    } catch (err) {
      console.error('Failed to fetch bids:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBid = async (bid: PriceBid) => {
    try {
      if (bid.monitorId) {
        await invoke('tira_delete_price_monitor', {
          monitorId: bid.monitorId,
        });
      }
      
      removeBid(bid.id);
      toast({
        title: 'Bid removed',
        description: 'Your price bid has been cancelled',
      });
    } catch (err) {
      toast({
        title: 'Failed to remove bid',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const activeBids = bids.filter((b) => b.status === 'monitoring' || b.status === 'active');
  const completedBids = bids.filter((b) => b.status === 'completed');

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">My Price Bids</h1>
        </div>
      </header>

      <div className="p-4">
        {activeBids.length > 0 && (
          <section className="mb-6">
            <h2 className="font-semibold text-muted-foreground mb-3">
              Active Bids ({activeBids.length})
            </h2>
            <div className="space-y-3">
              {activeBids.map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  onRemove={() => handleRemoveBid(bid)}
                />
              ))}
            </div>
          </section>
        )}

        {completedBids.length > 0 && (
          <section className="mb-6">
            <h2 className="font-semibold text-muted-foreground mb-3">
              Completed ({completedBids.length})
            </h2>
            <div className="space-y-3">
              {completedBids.map((bid) => (
                <BidCard key={bid.id} bid={bid} completed />
              ))}
            </div>
          </section>
        )}

        {activeBids.length === 0 && completedBids.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No price bids yet</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Set your target price on any product and we'll notify you when it drops!
            </p>
            <Button onClick={() => setLocation('/search')} data-testid="button-browse-products">
              <Search className="w-4 h-4 mr-2" />
              Browse Products
            </Button>
          </div>
        )}
      </div>

      <BottomNav active="wishlist" />
    </div>
  );
}
