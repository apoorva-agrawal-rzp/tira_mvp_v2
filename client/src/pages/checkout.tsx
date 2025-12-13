import { useState, useEffect } from 'react';
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
  MapPin,
  CreditCard,
  ShoppingBag,
  CheckCircle2,
  Plus,
  Loader2,
  Banknote,
  Smartphone,
  Building2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface Address {
  id: string;
  uid?: number;
  name: string;
  phone: string;
  address: string;
  area: string;
  city: string;
  state: string;
  area_code: string;
  is_default_address?: boolean;
}

type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'NB';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: typeof CreditCard;
}

const paymentOptions: PaymentOption[] = [
  { id: 'UPI', name: 'UPI', description: 'Pay using any UPI app', icon: Smartphone },
  { id: 'CARD', name: 'Credit/Debit Card', description: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'NB', name: 'Net Banking', description: 'All major banks supported', icon: Building2 },
  { id: 'COD', name: 'Cash on Delivery', description: 'Pay when your order arrives', icon: Banknote },
];

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'address' | 'payment' | 'processing' | 'success'>('address');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('COD');
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { session, user, cart, clearCart } = useAppStore();
  const { toast } = useToast();

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  useEffect(() => {
    if (!session) {
      toast({
        title: 'Please login',
        description: 'You need to login to checkout',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add items to your cart before checkout',
        variant: 'destructive',
      });
      setLocation('/account/bag');
      return;
    }

    fetchAddresses();
  }, [session, cart.length]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const result = await invoke<{ 
        addresses?: Array<Record<string, unknown>>; 
        address?: Array<Record<string, unknown>>;
        saved_addresses?: Array<Record<string, unknown>>;
      }>('get_address', {
        cookies: session,
      });

      // Handle nested response structure like addresses.tsx
      let addressList: Array<Record<string, unknown>> = [];
      if (result.addresses && Array.isArray(result.addresses)) {
        addressList = result.addresses;
      } else if (result.addresses && typeof result.addresses === 'object' && 'address' in result.addresses) {
        addressList = (result.addresses as { address: Array<Record<string, unknown>> }).address || [];
      } else if (result.address && Array.isArray(result.address)) {
        addressList = result.address;
      } else if (result.saved_addresses && Array.isArray(result.saved_addresses)) {
        addressList = result.saved_addresses;
      }

      const mappedAddresses: Address[] = addressList.map((a: Record<string, unknown>, idx: number) => ({
        id: String(a.id || a._id || a.uid || `addr-${idx}`),
        uid: a.uid as number | undefined,
        name: (a.name as string) || '',
        phone: ((a.phone || a.mobile) as string) || '',
        address: ((a.address || a.address_line || a.street) as string) || '',
        area: ((a.area || a.locality || a.landmark) as string) || '',
        city: (a.city as string) || '',
        state: (a.state as string) || '',
        area_code: String(a.pincode || a.area_code || a.zip || ''),
        is_default_address: (a.is_default_address || a.isDefault || a.default) as boolean | undefined,
      }));

      setAddresses(mappedAddresses);
      const defaultAddr = mappedAddresses.find((a) => a.is_default_address) || mappedAddresses[0];
      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedAddress) {
      toast({
        title: 'Select address',
        description: 'Please select a delivery address',
        variant: 'destructive',
      });
      return;
    }

    setPaymentStep('payment');
  };

  const handlePlaceOrder = async () => {
    if (!session || !selectedAddress || cart.length === 0) return;

    setCheckingOut(true);
    setPaymentStep('processing');

    try {
      // Add all items to cart via API and capture cart ID
      let cartId = 'default';
      
      for (const item of cart) {
        const addResult = await invoke<{
          cart_details?: { cart?: { id?: string } };
          error?: string;
        }>('add_to_cart', {
          items: [{
            item_id: item.itemId,
            article_id: item.articleId,
            quantity: item.quantity,
          }],
          sessionCookie: session,
        });
        
        if (addResult?.error) {
          throw new Error(`Failed to add ${item.name} to cart`);
        }
        
        if (addResult?.cart_details?.cart?.id) {
          cartId = addResult.cart_details.cart.id;
        }
      }

      // Set delivery mode to non-express before checkout
      await invoke('tira_set_delivery_mode', {
        express: false,
        areaCode: selectedAddress.area_code,
        sessionCookie: session,
      });

      // Create checkout with selected payment method
      const checkoutResult = await invoke<{ 
        success?: boolean;
        order_id?: string;
        cart_details?: { cart?: { id?: string } };
        error?: string;
      }>('checkout', {
        cartId,
        addressId: selectedAddress.id,
        sessionCookie: session,
        paymentMode: selectedPaymentMethod,
        codConfirmed: selectedPaymentMethod === 'COD',
      });

      if (checkoutResult?.success || checkoutResult?.order_id) {
        setPaymentStep('success');
        clearCart();
        
        toast({
          title: 'Order placed successfully!',
          description: `Order ID: ${checkoutResult.order_id || 'Processing'}`,
        });

        setTimeout(() => {
          setLocation('/orders');
        }, 2000);
      } else {
        throw new Error(checkoutResult?.error || 'Checkout failed');
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      setPaymentStep('payment');
      toast({
        title: 'Order failed',
        description: err instanceof Error ? err.message : 'Could not place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (paymentStep === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
        <p className="text-muted-foreground text-center mb-6">
          Your order has been placed successfully. Redirecting to orders...
        </p>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-4 py-3 flex items-center gap-3 border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/account/bag')}
          data-testid="button-back-checkout"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Checkout</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Delivery Address */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Delivery Address</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAddressDrawer(true)}
              data-testid="button-change-address"
            >
              Change
            </Button>
          </div>
          
          {selectedAddress ? (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium">{selectedAddress.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedAddress.address}, {selectedAddress.area}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.area_code}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Phone: {selectedAddress.phone}
              </p>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation('/account/addresses')}
              data-testid="button-add-address"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Delivery Address
            </Button>
          )}
        </Card>

        {/* Order Items */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Order Items ({cart.length})</h3>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.itemId} className="flex gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Payment Method</h3>
          </div>
          <div className="space-y-2">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedPaymentMethod === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedPaymentMethod(option.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover-elevate'
                  )}
                  data-testid={`payment-option-${option.id}`}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    isSelected ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{option.name}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Order Summary */}
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
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-bottom">
        {paymentStep === 'address' ? (
          <Button
            className="w-full py-6 text-base font-semibold"
            onClick={handleProceedToPayment}
            disabled={!selectedAddress}
            data-testid="button-proceed-payment"
          >
            Proceed to Payment
          </Button>
        ) : paymentStep === 'processing' ? (
          <Button className="w-full py-6 text-base font-semibold" disabled>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing Order...
          </Button>
        ) : (
          <Button
            className="w-full py-6 text-base font-semibold"
            onClick={handlePlaceOrder}
            disabled={checkingOut}
            data-testid="button-place-order"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Place Order - ₹{totalAmount.toLocaleString()}
          </Button>
        )}
      </div>

      {/* Address Selection Drawer */}
      <Drawer open={showAddressDrawer} onOpenChange={setShowAddressDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select Delivery Address</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {addresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => {
                  setSelectedAddress(addr);
                  setShowAddressDrawer(false);
                }}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-all',
                  selectedAddress?.id === addr.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover-elevate'
                )}
                data-testid={`address-option-${addr.id}`}
              >
                <p className="font-medium">{addr.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {addr.address}, {addr.area}
                </p>
                <p className="text-sm text-muted-foreground">
                  {addr.city}, {addr.state} - {addr.area_code}
                </p>
              </button>
            ))}
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowAddressDrawer(false);
                setLocation('/account/addresses');
              }}
              data-testid="button-add-new-address"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Address
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
