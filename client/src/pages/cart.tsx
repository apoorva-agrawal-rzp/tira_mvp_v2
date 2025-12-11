import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingScreen, LoadingSpinner } from '@/components/loading-screen';
import { ProductImage } from '@/components/product-image';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Trash2, 
  Plus,
  Minus,
  ShoppingBag
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  price: number;
  mrp?: number;
  quantity: number;
  size?: string;
  articleId?: string;
  itemId?: number;
}

interface CartResponse {
  cart?: {
    items?: Array<{
      item?: {
        uid?: number;
        name?: string;
        brand?: { name?: string };
        images?: Array<{ url?: string }>;
      };
      article?: {
        uid?: string;
        price?: {
          effective?: number;
          marked?: number;
        };
      };
      quantity?: number;
      size?: string;
    }>;
  };
  items?: Array<{
    product?: {
      name?: string;
      brand?: { name?: string };
      images?: Array<{ url?: string }>;
    };
    price?: {
      effective?: number;
      marked?: number;
    };
    quantity?: number;
    article_id?: string;
    item_id?: number;
  }>;
}

export default function CartPage() {
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { session, user } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<CartResponse>('add_to_cart', {
        items: [],
        sessionCookie: session,
        skipAuthCheck: true,
      });

      const items = result.cart?.items || result.items || [];
      const mappedItems: CartItem[] = items.map((item, idx) => {
        const product = (item as { item?: Record<string, unknown> }).item || 
                       (item as { product?: Record<string, unknown> }).product;
        const article = (item as { article?: Record<string, unknown> }).article;
        const brandObj = product?.brand as { name?: string } | undefined;
        const imagesArr = product?.images as Array<{ url?: string }> | undefined;
        const priceObj = article?.price as { effective?: number; marked?: number } | undefined ||
                        (item as { price?: { effective?: number; marked?: number } }).price;
        
        return {
          id: String((product?.uid || (item as { article_id?: string }).article_id || idx)),
          name: String(product?.name || 'Product'),
          brand: brandObj?.name,
          image: imagesArr?.[0]?.url,
          price: priceObj?.effective || 0,
          mrp: priceObj?.marked,
          quantity: (item as { quantity?: number }).quantity || 1,
          size: (item as { size?: string }).size,
          articleId: String(article?.uid || (item as { article_id?: string }).article_id || ''),
          itemId: Number(product?.uid || (item as { item_id?: number }).item_id || 0),
        };
      });

      setCartItems(mappedItems);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
      toast({
        title: 'Failed to load cart',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    setRemovingId(item.id);
    try {
      await invoke('add_to_cart', {
        items: [{
          item_id: item.itemId,
          article_id: item.articleId,
          quantity: 0,
        }],
        sessionCookie: session,
      });

      setCartItems(prev => prev.filter(i => i.id !== item.id));
      toast({
        title: 'Item removed',
        description: `${item.name} has been removed from your cart`,
      });
    } catch (err) {
      console.error('Failed to remove item:', err);
      toast({
        title: 'Failed to remove item',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalSavings = cartItems.reduce((sum, item) => {
    if (item.mrp && item.mrp > item.price) {
      return sum + ((item.mrp - item.price) * item.quantity);
    }
    return sum;
  }, 0);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-3 flex items-center gap-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/account')}
          data-testid="button-back-cart"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">My Cart</h1>
        {cartItems.length > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
          </span>
        )}
      </header>

      <div className="p-4 space-y-4">
        {cartItems.length > 0 ? (
          <>
            <div className="space-y-3">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-3" data-testid={`cart-item-${item.id}`}>
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <ProductImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.brand && (
                        <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
                      )}
                      <p className="font-medium text-sm line-clamp-2 mb-1">{item.name}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold">₹{item.price}</span>
                        {item.mrp && item.mrp > item.price && (
                          <>
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{item.mrp}
                            </span>
                            <span className="text-xs text-green-600 font-medium">
                              {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% off
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-muted rounded-lg">
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item)}
                          disabled={removingId === item.id}
                          className="text-destructive"
                          data-testid={`button-remove-${item.id}`}
                        >
                          {removingId === item.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{totalAmount}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>You Save</span>
                    <span>-₹{totalSavings}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-green-600">FREE</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>₹{totalAmount}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Button
              className="w-full py-6 text-base font-semibold"
              onClick={() => {
                toast({
                  title: 'Coming soon',
                  description: 'Checkout will be available soon',
                });
              }}
              data-testid="button-checkout"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Proceed to Checkout
            </Button>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Start shopping and add items to your cart
            </p>
            <Button onClick={() => setLocation('/search')}>
              Start Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
