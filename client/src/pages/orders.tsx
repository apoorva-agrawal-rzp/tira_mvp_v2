import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/loading-screen';
import { useAppStore } from '@/lib/store';
import { useMCP } from '@/hooks/use-mcp';
import type { Order } from '@shared/schema';
import { Package, CheckCircle2, Truck, Tag, Search, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function OrderCard({ order }: { order: Order }) {
  const [, setLocation] = useLocation();

  const statusConfig = {
    processing: { icon: Package, color: 'text-blue-500', label: 'Processing' },
    shipped: { icon: Truck, color: 'text-orange-500', label: 'Shipped' },
    delivered: { icon: CheckCircle2, color: 'text-green-500', label: 'Delivered' },
    completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  };

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.processing;
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden" data-testid={`order-card-${order.id}`}>
      <div className="bg-muted/50 px-4 py-2 flex justify-between items-center gap-2 border-b border-border">
        <span className="font-mono text-sm">#{order.id.slice(0, 12)}</span>
        <span className="text-sm text-muted-foreground">{formatDate(order.placedAt)}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {order.product?.image ? (
            <img
              src={order.product.image}
              alt={order.product.name}
              className="w-16 h-16 rounded-lg object-cover bg-muted flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Tag className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {order.product?.brand && (
              <p className="text-xs text-muted-foreground">{order.product.brand}</p>
            )}
            <p className="font-medium line-clamp-2 leading-tight">{order.product?.name}</p>
            <p className="text-primary font-bold mt-1">₹{order.paidPrice.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-muted/30 border-t border-border">
        <div className="flex items-center gap-2 text-sm">
          <StatusIcon className={cn('w-4 h-4', status.color)} />
          <span className="capitalize">{status.label}</span>
        </div>
        
        {order.type === 'price_bid' && order.savings && order.savings > 0 && (
          <div className="flex items-center gap-2 mt-1.5 text-green-600">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">
              Saved ₹{order.savings.toLocaleString()} with Price Bid!
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { orders, bids, setOrders, user, session } = useAppStore();
  const { invoke } = useMCP();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllOrders = async () => {
      if (!user?.phone || !session) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Use get_orders tool to fetch orders from Tira
        const result = await invoke<{
          success?: boolean;
          orders?: Array<{
            order_id?: string;
            orderId?: string;
            id?: string;
            status?: string;
            items?: Array<{
              product?: {
                name?: string;
                brand?: string;
                image?: string;
                slug?: string;
              };
              price?: number;
              quantity?: number;
            }>;
            total?: number;
            paid_amount?: number;
            created_at?: string;
            placed_at?: string;
            delivery_date?: string;
            address?: any;
          }>;
          totalOrders?: number;
          page?: number;
        }>('get_orders', {
          cookies: session,
          page_no: 1,
          page_size: 50,
        });

        const allOrders: Order[] = [];

        // Convert Tira orders to our Order format
        if (result.orders && result.orders.length > 0) {
          const tiraOrders: Order[] = result.orders.map((o) => {
            const orderId = o.order_id || o.orderId || o.id || '';
            const firstItem = o.items?.[0];
            const productName = firstItem?.product?.name || 'Product';
            const productBrand = firstItem?.product?.brand;
            const productImage = firstItem?.product?.image;
            const productSlug = firstItem?.product?.slug || '';
            const paidPrice = o.paid_amount || o.total || 0;
            const placedAt = o.placed_at || o.created_at || new Date().toISOString();
            const orderStatus = o.status || 'processing';

            return {
              id: orderId,
              product: {
                name: productName,
                brand: productBrand,
                image: productImage,
                slug: productSlug,
              },
              paidPrice: paidPrice,
              originalPrice: paidPrice, // Tira doesn't provide original price separately
              savings: 0, // Will be calculated if we have bid info
              status: (orderStatus.toLowerCase() as Order['status']) || 'processing',
              placedAt: placedAt,
              type: 'direct' as const, // Default to direct, will update if found in bids
            };
          });

          allOrders.push(...tiraOrders);
        }

        // Also fetch completed bids to merge with orders and calculate savings
        try {
          const bidResult = await invoke<{ bids?: Array<Record<string, unknown>> }>('tira_list_price_bids', {
            userId: user.phone,
            includeCompleted: true,
          });

          if (bidResult.bids) {
            const completedBids = bidResult.bids.filter((b: Record<string, unknown>) => 
              (b.status === 'completed' || b.status === 'fulfilled' || b.status === 'success') && 
              (b.orderId || b.order_id)
            );

            const bidOrders: Order[] = completedBids.map((b: Record<string, unknown>) => {
              const orderId = (b.orderId || b.order_id) as string;
              const bidPrice = (b.bidPrice || b.targetPrice || 0) as number;
              const currentPrice = (b.currentPrice || b.purchasePrice || 0) as number;
              
              return {
                id: orderId,
                product: {
                  name: (b.productName || (b.product as { name?: string })?.name || 'Product') as string,
                  brand: (b.productBrand || (b.product as { brand?: string })?.brand) as string | undefined,
                  image: (b.productImage || (b.product as { image?: string })?.image) as string | undefined,
                  slug: (b.productSlug || (b.product as { slug?: string })?.slug || '') as string,
                },
                paidPrice: bidPrice,
                originalPrice: currentPrice,
                savings: currentPrice > bidPrice ? currentPrice - bidPrice : 0,
                status: 'processing' as const,
                placedAt: (b.completedAt || b.fulfilledAt || b.createdAt || new Date().toISOString()) as string,
                type: 'price_bid' as const,
              };
            });

            // Merge bid orders with Tira orders (bid orders take priority if same ID)
            const orderMap = new Map<string, Order>();
            allOrders.forEach(o => orderMap.set(o.id, o));
            bidOrders.forEach(o => orderMap.set(o.id, o)); // Bid orders override Tira orders
            
            allOrders.splice(0, allOrders.length, ...Array.from(orderMap.values()));
          }
        } catch (bidErr) {
          console.warn('Failed to fetch bids for orders:', bidErr);
          // Continue with just Tira orders
        }

        // Also check local completed bids
        const localCompletedBids = bids.filter((b) => b.status === 'completed' && b.orderId);
        const localOrderIds = new Set(allOrders.map((o) => o.id));
        
        localCompletedBids.forEach((b) => {
          if (!localOrderIds.has(b.orderId!)) {
            allOrders.push({
              id: b.orderId!,
              product: {
                name: b.product.name,
                brand: b.product.brand,
                image: b.product.image,
                slug: b.product.slug,
              },
              paidPrice: b.bidPrice,
              originalPrice: b.currentPrice,
              savings: b.currentPrice - b.bidPrice,
              status: 'processing',
              placedAt: b.completedAt || b.createdAt,
              type: 'price_bid',
            });
          }
        });

        // Sort by date (newest first) and remove duplicates
        const uniqueOrders = Array.from(
          new Map(allOrders.map((o) => [o.id, o])).values()
        ).sort(
          (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
        );

        setOrders(uniqueOrders);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        // Fallback to local orders if server fetch fails
        const localCompletedBids = bids.filter((b) => b.status === 'completed' && b.orderId);
        const localOrders: Order[] = localCompletedBids.map((b) => ({
          id: b.orderId!,
          product: {
            name: b.product.name,
            brand: b.product.brand,
            image: b.product.image,
            slug: b.product.slug,
          },
          paidPrice: b.bidPrice,
          originalPrice: b.currentPrice,
          savings: b.currentPrice - b.bidPrice,
          status: 'processing',
          placedAt: b.completedAt || b.createdAt,
          type: 'price_bid',
        }));
        setOrders(localOrders.sort(
          (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
        ));
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrders();
  }, [user?.phone, session]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-4 py-4 border-b border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">My Orders</h1>
            {orders.length > 0 && (
              <span className="text-sm text-muted-foreground">({orders.length})</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              if (!user?.phone || !session) return;
              
              setLoading(true);
              try {
                // Fetch orders using get_orders tool
                const result = await invoke<{
                  success?: boolean;
                  orders?: Array<{
                    order_id?: string;
                    orderId?: string;
                    id?: string;
                    status?: string;
                    items?: Array<{
                      product?: {
                        name?: string;
                        brand?: string;
                        image?: string;
                        slug?: string;
                      };
                      price?: number;
                      quantity?: number;
                    }>;
                    total?: number;
                    paid_amount?: number;
                    created_at?: string;
                    placed_at?: string;
                  }>;
                }>('get_orders', {
                  cookies: session,
                  page_no: 1,
                  page_size: 50,
                });

                const allOrders: Order[] = [];

                if (result.orders && result.orders.length > 0) {
                  const tiraOrders: Order[] = result.orders.map((o) => {
                    const orderId = o.order_id || o.orderId || o.id || '';
                    const firstItem = o.items?.[0];
                    return {
                      id: orderId,
                      product: {
                        name: firstItem?.product?.name || 'Product',
                        brand: firstItem?.product?.brand,
                        image: firstItem?.product?.image,
                        slug: firstItem?.product?.slug || '',
                      },
                      paidPrice: o.paid_amount || o.total || 0,
                      originalPrice: o.paid_amount || o.total || 0,
                      savings: 0,
                      status: (o.status?.toLowerCase() as Order['status']) || 'processing',
                      placedAt: o.placed_at || o.created_at || new Date().toISOString(),
                      type: 'direct' as const,
                    };
                  });
                  allOrders.push(...tiraOrders);
                }

                // Also fetch completed bids
                try {
                  const bidResult = await invoke<{ bids?: Array<Record<string, unknown>> }>('tira_list_price_bids', {
                    userId: user.phone,
                    includeCompleted: true,
                  });

                  if (bidResult.bids) {
                    const completedBids = bidResult.bids.filter((b: Record<string, unknown>) => 
                      (b.status === 'completed' || b.status === 'fulfilled' || b.status === 'success') && 
                      (b.orderId || b.order_id)
                    );

                    const bidOrders: Order[] = completedBids.map((b: Record<string, unknown>) => {
                      const orderId = (b.orderId || b.order_id) as string;
                      const bidPrice = (b.bidPrice || b.targetPrice || 0) as number;
                      const currentPrice = (b.currentPrice || b.purchasePrice || 0) as number;
                      
                      return {
                        id: orderId,
                        product: {
                          name: (b.productName || (b.product as { name?: string })?.name || 'Product') as string,
                          brand: (b.productBrand || (b.product as { brand?: string })?.brand) as string | undefined,
                          image: (b.productImage || (b.product as { image?: string })?.image) as string | undefined,
                          slug: (b.productSlug || (b.product as { slug?: string })?.slug || '') as string,
                        },
                        paidPrice: bidPrice,
                        originalPrice: currentPrice,
                        savings: currentPrice > bidPrice ? currentPrice - bidPrice : 0,
                        status: 'processing' as const,
                        placedAt: (b.completedAt || b.fulfilledAt || b.createdAt || new Date().toISOString()) as string,
                        type: 'price_bid' as const,
                      };
                    });

                    const orderMap = new Map<string, Order>();
                    allOrders.forEach(o => orderMap.set(o.id, o));
                    bidOrders.forEach(o => orderMap.set(o.id, o));
                    allOrders.splice(0, allOrders.length, ...Array.from(orderMap.values()));
                  }
                } catch (bidErr) {
                  console.warn('Failed to fetch bids:', bidErr);
                }

                const uniqueOrders = Array.from(
                  new Map(allOrders.map((o) => [o.id, o])).values()
                ).sort(
                  (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
                );

                setOrders(uniqueOrders);
              } catch (err) {
                console.error('Failed to refresh orders:', err);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            data-testid="refresh-orders"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <LoadingScreen />
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Your orders will appear here once you make a purchase
            </p>
            <Button onClick={() => setLocation('/search')} data-testid="button-start-shopping">
              <Search className="w-4 h-4 mr-2" />
              Start Shopping
            </Button>
          </div>
        )}
      </div>

      <BottomNav active="orders" />
    </div>
  );
}
