import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { BidCard } from '@/components/bid-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/loading-screen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { PriceBid } from '@shared/schema';
import { Heart, Search, Zap, TrendingDown, Package, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WishlistPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { user, bids, setBids, removeBid } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchBids();
  }, []);

  const fetchBids = async (showRefreshIndicator = false) => {
    if (!user?.phone) {
      setLoading(false);
      return;
    }

    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await invoke<{ bids?: Array<Record<string, unknown>> }>('tira_list_price_bids', {
        userId: user.phone,
        includeCompleted: true,
      });

      if (result.bids) {
        const mappedBids: PriceBid[] = result.bids.map((b: Record<string, unknown>) => {
          const monitorId = (b.monitorId || b.monitor_id || b.priceMonitorId || 
            (b.monitor as { id?: string })?.id || b.bidId) as string | undefined;
          
          const monitorActive = b.monitorActive === true;
          const paymentStatus = b.paymentStatus as string | undefined;
          const hasOrder = Boolean(b.orderId);
          
          // Determine status based on payment and monitoring state
          let status: PriceBid['status'] = 'monitoring';
          
          // Completed: Payment captured + has order (monitoring may or may not be active)
          if (paymentStatus === 'captured' && hasOrder) {
            status = monitorActive ? 'monitoring' : 'completed';
          }
          // Active monitoring: Monitor is active (even if payment pending)
          else if (monitorActive) {
            status = 'monitoring';
          }
          // Failed/Pending payment without monitoring: Mark as inactive
          else if (!monitorActive && !hasOrder) {
            status = 'inactive' as PriceBid['status'];
          }
          // Explicit status from API
          else if (b.status === 'completed' || b.status === 'fulfilled') {
            status = 'completed';
          }
          
          return {
            id: (b.id || b.bidId || String(Date.now())) as string,
            bidId: b.bidId as string | undefined,
            monitorId: monitorId,
            product: {
              name: (b.productName || (b.product as { name?: string })?.name || 'Product') as string,
              brand: (b.productBrand || (b.product as { brand?: string })?.brand) as string | undefined,
              image: (b.productImage || (b.product as { image?: string })?.image) as string | undefined,
              slug: (b.productSlug || (b.product as { slug?: string })?.slug || '') as string,
            },
            bidPrice: (b.bidPrice || b.targetPrice) as number,
            currentPrice: (b.currentPrice || b.purchasePrice) as number,
            status: status,
            createdAt: (b.createdAt || new Date().toISOString()) as string,
            completedAt: (b.completedAt || (status === 'completed' ? new Date().toISOString() : undefined)) as string | undefined,
            orderId: b.orderId as string | undefined,
          };
        });
        
        // Filter out inactive bids (failed/pending without monitoring)
        const filteredBids = mappedBids.filter(bid => bid.status !== 'inactive');
        setBids(filteredBids);
      }
    } catch (err) {
      console.error('Failed to fetch bids:', err);
      toast({
        title: 'Failed to load wishlist',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRemoveBid = async (bid: PriceBid) => {
    try {
      if (bid.monitorId) {
        await invoke('tira_delete_price_monitor', {
          monitorId: bid.monitorId,
        });
        removeBid(bid.id);
        toast({
          title: '✓ Removed from Wishlist',
          description: 'Price tracking has been cancelled',
        });
      } else {
        removeBid(bid.id);
        toast({
          title: 'Removed from Wishlist',
          description: 'Item removed locally',
        });
      }
    } catch (err) {
      console.error('Failed to remove bid:', err);
      removeBid(bid.id);
      toast({
        title: 'Removed from Wishlist',
        description: 'Could not sync with server',
        variant: 'destructive',
      });
    }
  };

  const activeBids = bids.filter((b) => b.status === 'monitoring' || b.status === 'active');
  const completedBids = bids.filter((b) => b.status === 'completed');
  const totalSavings = completedBids.reduce((sum, bid) => sum + (bid.currentPrice - bid.bidPrice), 0);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      {/* Premium Header */}
      <header className="sticky top-0 left-0 right-0 bg-background/80 backdrop-blur-xl z-50 border-b border-border/50 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">My Wishlist</h1>
                <p className="text-xs text-muted-foreground">
                  {activeBids.length + completedBids.length} item{activeBids.length + completedBids.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchBids(true)}
              disabled={refreshing}
              className="rounded-full hover:bg-primary/10"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Stats Summary */}
          {(activeBids.length > 0 || completedBids.length > 0) && (
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center bg-gradient-to-br from-primary/5 to-purple/5">
                <p className="text-xl font-bold text-primary">{activeBids.length}</p>
                <p className="text-xs text-muted-foreground">Watching</p>
              </Card>
              <Card className="p-3 text-center bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                <p className="text-xl font-bold text-green-600">{completedBids.length}</p>
                <p className="text-xs text-muted-foreground">Purchased</p>
              </Card>
              <Card className="p-3 text-center bg-gradient-to-br from-orange-500/5 to-amber-500/5">
                <p className="text-xl font-bold text-orange-600">₹{totalSavings}</p>
                <p className="text-xs text-muted-foreground">Saved</p>
              </Card>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 pb-20">
        {activeBids.length === 0 && completedBids.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-950/30 dark:to-rose-950/30 flex items-center justify-center mx-auto mb-6 relative">
              <Heart className="w-16 h-16 text-pink-400" />
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3">Your Wishlist is Empty</h3>
            <p className="text-muted-foreground mb-8 text-sm max-w-md mx-auto leading-relaxed">
              Set your target price on products and we'll monitor 24/7. Get notified instantly when prices drop to your bid!
            </p>
            <div className="space-y-3 max-w-xs mx-auto">
              <Button 
                onClick={() => setLocation('/search')} 
                data-testid="button-browse-products"
                size="lg"
                className="w-full gap-2"
              >
                <Search className="w-4 h-4" />
                Browse Products
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation('/home')}
                size="lg"
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <div className="border-b border-border bg-muted/30 sticky top-[120px] z-40">
              <TabsList className="w-full grid grid-cols-2 h-12 bg-transparent p-0">
                <TabsTrigger 
                  value="active" 
                  className="rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm relative"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Watching</span>
                    {activeBids.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {activeBids.length}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="completed"
                  className="rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Purchased</span>
                    {completedBids.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {completedBids.length}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="active" className="p-4 mt-0">
              {activeBids.length > 0 ? (
                <>
                  <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-purple/10 rounded-2xl border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <TrendingDown className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-1">Active Price Monitoring</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          We're watching {activeBids.length} product{activeBids.length !== 1 ? 's' : ''} for you. You'll be notified when prices drop!
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {activeBids.map((bid) => (
                      <BidCard
                        key={bid.id}
                        bid={bid}
                        onRemove={() => handleRemoveBid(bid)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">No active price watches</p>
                  <Button onClick={() => setLocation('/search')} variant="outline">
                    <Search className="w-4 h-4 mr-2" />
                    Find Products
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="p-4 mt-0">
              {completedBids.length > 0 ? (
                <>
                  {totalSavings > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Savings</p>
                          <p className="text-3xl font-bold text-green-600">₹{totalSavings.toLocaleString()}</p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                          <Package className="w-8 h-8 text-green-600" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {completedBids.map((bid) => (
                      <BidCard key={bid.id} bid={bid} completed />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">No purchases yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                    When your target price is reached, orders will appear here
                  </p>
                  <Button onClick={() => setLocation('/search')} variant="outline">
                    <Search className="w-4 h-4 mr-2" />
                    Start Shopping
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BottomNav active="wishlist" />
    </div>
  );
}
