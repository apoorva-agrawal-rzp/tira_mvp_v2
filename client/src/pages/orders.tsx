import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import type { Order } from '@shared/schema';
import { Package, CheckCircle2, Truck, Tag, Search, Zap } from 'lucide-react';
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
  const { orders, bids, setOrders } = useAppStore();

  useEffect(() => {
    const completedBids = bids.filter((b) => b.status === 'completed');
    
    const bidOrders: Order[] = completedBids.map((b) => ({
      id: b.orderId || `TIR${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
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

    const existingOrderIds = new Set(orders.map((o) => o.id));
    const newOrders = bidOrders.filter((o) => !existingOrderIds.has(o.id));
    
    if (newOrders.length > 0) {
      setOrders([...newOrders, ...orders].sort(
        (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
      ));
    }
  }, [bids]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">My Orders</h1>
        </div>
      </header>

      <div className="p-4">
        {orders.length > 0 ? (
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
