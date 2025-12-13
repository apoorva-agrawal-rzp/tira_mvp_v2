import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-screen';
import { ProductImage } from '@/components/product-image';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Trash2, 
  Plus,
  Minus,
} from 'lucide-react';

export default function BagPage() {
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { session, cart, removeFromCart, updateCartQuantity } = useAppStore();
  const { toast } = useToast();

  const handleRemoveItem = async (itemId: number, articleId: string, name: string) => {
    setRemovingId(itemId);
    try {
      if (session) {
        await invoke('add_to_cart', {
          items: [{
            item_id: itemId,
            article_id: articleId,
            quantity: 0,
          }],
          sessionCookie: session,
        });
      }

      removeFromCart(itemId);
      toast({
        title: 'Item removed',
        description: `${name} has been removed from your bag`,
      });
    } catch (err) {
      console.error('Failed to remove item:', err);
      removeFromCart(itemId);
      toast({
        title: 'Item removed locally',
        description: `${name} has been removed from your bag`,
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateCartQuantity(itemId, newQuantity);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-4 py-3 flex items-center gap-3 border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/account')}
          data-testid="button-back-from-bag"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">My Bag</h1>
        {cart.length > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {cart.length} item{cart.length !== 1 ? 's' : ''}
          </span>
        )}
      </header>

      <div className="p-4 space-y-4">
        {cart.length > 0 ? (
          <>
            <div className="space-y-3">
              {cart.map((item) => (
                <Card key={item.itemId} className="p-3" data-testid={`bag-item-${item.itemId}`}>
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
                        <span className="font-bold">₹{item.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-muted rounded-lg">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.itemId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            data-testid={`button-decrease-${item.itemId}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.itemId, item.quantity + 1)}
                            data-testid={`button-increase-${item.itemId}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.itemId, item.articleId, item.name)}
                          disabled={removingId === item.itemId}
                          className="text-destructive"
                          data-testid={`button-remove-${item.itemId}`}
                        >
                          {removingId === item.itemId ? (
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
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-green-600">FREE</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Button
              className="w-full py-6 text-base font-semibold"
              onClick={() => setLocation('/checkout')}
              data-testid="button-checkout"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Proceed to Checkout
            </Button>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Your bag is empty</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Start shopping and add items to your bag
            </p>
            <Button onClick={() => setLocation('/search')} data-testid="button-start-shopping">
              Start Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
