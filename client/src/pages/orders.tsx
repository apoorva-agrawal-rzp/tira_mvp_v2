import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingScreen } from '@/components/loading-screen';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { 
  Package, 
  CheckCircle2, 
  Truck, 
  Tag, 
  Search, 
  Zap, 
  RefreshCw,
  MapPin,
  CreditCard,
  Calendar,
  Box,
  ChevronRight,
  ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderItem {
  name: string;
  brand: string;
  price: number;
  quantity: number;
  image: string;
  slug: string;
}

interface Order {
  order_id: string;
  order_date: string;
  status: string;
  shipment_id: string;
  items_count: number;
  total: number;
  currency: string;
  payment_method: string;
  delivery_address: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: OrderItem[];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusConfig(status: string) {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('confirm') || statusLower.includes('placed')) {
    return { 
      icon: CheckCircle2, 
      color: 'text-green-600 bg-green-50 border-green-200', 
      label: 'Confirmed',
      dotColor: 'bg-green-500'
    };
  }
  if (statusLower.includes('ship') || statusLower.includes('transit')) {
    return { 
      icon: Truck, 
      color: 'text-blue-600 bg-blue-50 border-blue-200', 
      label: 'Shipped',
      dotColor: 'bg-blue-500'
    };
  }
  if (statusLower.includes('deliver')) {
    return { 
      icon: Package, 
      color: 'text-purple-600 bg-purple-50 border-purple-200', 
      label: 'Delivered',
      dotColor: 'bg-purple-500'
    };
  }
  if (statusLower.includes('process')) {
    return { 
      icon: Box, 
      color: 'text-orange-600 bg-orange-50 border-orange-200', 
      label: 'Processing',
      dotColor: 'bg-orange-500'
    };
  }
  return { 
    icon: Package, 
    color: 'text-gray-600 bg-gray-50 border-gray-200', 
    label: status,
    dotColor: 'bg-gray-500'
  };
}

function OrderCard({ order }: { order: Order }) {
  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const firstItem = order.items[0];
  const hasMultipleItems = order.items_count > 1;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`order-card-${order.order_id}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3 border-b border-border">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs font-semibold text-primary">
                #{order.order_id}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(order.order_date)}</span>
              <span>•</span>
              <span>{formatTime(order.order_date)}</span>
            </div>
          </div>
          
          <Badge 
            variant="secondary" 
            className={cn('font-medium gap-1.5 px-3 py-1', statusConfig.color)}
          >
            <span className={cn('w-2 h-2 rounded-full animate-pulse', statusConfig.dotColor)} />
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex gap-4">
          {firstItem?.image ? (
            <div className="relative flex-shrink-0">
              <img
                src={firstItem.image}
                alt={firstItem.name}
                className="w-20 h-20 rounded-xl object-cover bg-muted ring-1 ring-border"
              />
              {hasMultipleItems && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center p-0 rounded-full bg-primary text-white text-xs font-bold"
                >
                  {order.items_count}
                </Badge>
              )}
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ring-1 ring-border">
              <Tag className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {firstItem?.brand && (
              <p className="text-xs font-medium text-primary mb-0.5">
                {firstItem.brand}
              </p>
            )}
            <p className="font-semibold line-clamp-2 leading-tight mb-2 text-sm">
              {firstItem?.name || 'Product'}
            </p>
            
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg font-bold text-primary">
                {order.currency}{order.total.toLocaleString()}
              </span>
            </div>
            
            {firstItem?.quantity > 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                Qty: {firstItem.quantity}
              </p>
            )}
          </div>
        </div>

        {hasMultipleItems && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              + {order.items_count - 1} more item(s)
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Delivery & Payment Info */}
      <div className="px-4 py-3 bg-muted/30 space-y-2">
        {/* Shipment Info */}
        {order.shipment_id && (
          <div className="flex items-center gap-2 text-xs">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Shipment:</span>
            <span className="font-mono font-medium text-xs">{order.shipment_id.slice(0, 16)}...</span>
          </div>
        )}

        {/* Delivery Address */}
        {order.delivery_address && (
          <div className="flex items-start gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium">{order.delivery_address.name}</span>
              <span className="text-muted-foreground"> • </span>
              <span className="text-muted-foreground">
                {order.delivery_address.city}, {order.delivery_address.state}
              </span>
            </div>
          </div>
        )}

        {/* Payment Method */}
        {order.payment_method && (
          <div className="flex items-center gap-2 text-xs">
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Payment:</span>
            <span className="font-medium">{order.payment_method}</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Footer */}
      <div className="px-4 py-3 bg-background">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full group"
          onClick={() => {
            console.log('View order details:', order.order_id);
          }}
        >
          <span>View Order Details</span>
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </Card>
  );
}

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { user, session } = useAppStore();
  const { invoke } = useMCP();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user?.phone || !session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await invoke<{
        success: boolean;
        total_orders: number;
        orders: Order[];
      }>('get_orders', {
        cookies: session,
        page_no: 1,
        page_size: 50,
      });

      console.log('[Orders] API Response:', result);

      if (result.success && result.orders) {
        setOrders(result.orders);
        setTotalOrders(result.total_orders || result.orders.length);
      } else {
        setOrders([]);
        setTotalOrders(0);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.phone, session]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-background/95 backdrop-blur-md z-50 border-b border-border shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">My Orders</h1>
                {totalOrders > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalOrders} order{totalOrders !== 1 ? 's' : ''} found
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchOrders}
              disabled={loading}
              data-testid="refresh-orders"
              className="rounded-full"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 pb-20">
        {loading ? (
          <LoadingScreen />
        ) : error ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="font-semibold mb-2 text-red-700">Failed to Load Orders</h3>
            <p className="text-muted-foreground mb-6 text-sm">{error}</p>
            <Button onClick={fetchOrders} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : orders.length > 0 ? (
          <div className="p-4 space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status.toLowerCase().includes('confirm')).length}
                </p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.status.toLowerCase().includes('ship')).length}
                </p>
                <p className="text-xs text-muted-foreground">Shipped</p>
              </Card>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.order_id} order={order} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <Package className="w-12 h-12 text-primary" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-8 text-sm max-w-sm mx-auto">
              Start your shopping journey! Browse products and place your first order.
            </p>
            <Button 
              onClick={() => setLocation('/search')} 
              data-testid="button-start-shopping"
              size="lg"
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              Start Shopping
            </Button>
          </div>
        )}
      </div>

      <BottomNav active="orders" />
    </div>
  );
}
