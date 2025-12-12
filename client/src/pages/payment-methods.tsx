import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingScreen, LoadingSpinner } from '@/components/loading-screen';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { MandateToken } from '@shared/schema';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { 
  ArrowLeft, 
  Zap, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  QrCode,
  ExternalLink,
  Shield,
  Wallet,
  Clock,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenItem {
  id: string;
  status?: string;
  max_amount?: number;
  recurring_details?: {
    amount_blocked?: number;
    amount_debited?: number;
    status?: string;
  };
  expired_at?: number;
  created_at?: number;
  vpa?: {
    username?: string;
    handle?: string;
  };
}

export default function PaymentMethodsPage() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<MandateToken | null>(null);
  const [allTokens, setAllTokens] = useState<TokenItem[]>([]);
  const [maxAmount, setMaxAmount] = useState('5000');
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrData, setQrData] = useState<{ qrCode?: string; intentLink?: string; qrImageUrl?: string; orderId?: string } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showAddNewMandate, setShowAddNewMandate] = useState(false);
  const [pollingBaselineTokenIds, setPollingBaselineTokenIds] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState(false);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { user, session, mandate, setMandate, setCustomerId: storeSetCustomerId } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    checkMandateStatus();
  }, []);

  // Check for pending bid activation after payment
  useEffect(() => {
    const checkPendingBidActivation = async () => {
      const pendingActivation = localStorage.getItem('pending_bid_activation');
      if (!pendingActivation) return;

      try {
        const { bidId, paymentId, tempBidId } = JSON.parse(pendingActivation);
        
        // Check if mandate is confirmed (payment completed)
        if (mandate && mandate.status === 'confirmed') {
          // Activate the bid
          try {
            await invoke('tira_activate_price_bidding', {
              bidId: bidId,
              paymentId: paymentId,
            });
            
            // Update bid status
            const { updateBid } = useAppStore.getState();
            updateBid(tempBidId, {
              bidId: bidId,
              status: 'monitoring',
            });
            
            localStorage.removeItem('pending_bid_activation');
            
            toast({
              title: 'Price Bid Activated!',
              description: 'Your price monitoring is now active',
            });
          } catch (err) {
            console.error('Failed to activate bid:', err);
          }
        }
      } catch (err) {
        console.error('Error checking pending bid activation:', err);
      }
    };

    if (mandate) {
      checkPendingBidActivation();
    }
  }, [mandate, invoke, toast]);

  const checkMandateStatus = async () => {
    if (!user?.phone) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<{ 
        customer?: { id?: string }; 
        customer_id?: string;
        saved_payment_methods?: { items?: TokenItem[] };
        items?: TokenItem[];
      }>('get_token_masked_data', {
        contact: user.phone,
      });

      const custId = result.customer?.id || result.customer_id;
      if (custId) {
        setCustomerId(custId);
        storeSetCustomerId?.(custId);
      }

      const tokens: TokenItem[] = result.saved_payment_methods?.items || result.items || [];
      
      const confirmedTokens = tokens.filter((t) => 
        t.recurring_details?.status === 'confirmed' || t.status === 'confirmed'
      );
      
      setAllTokens(confirmedTokens);

      if (confirmedTokens.length > 0) {
        const firstToken = confirmedTokens[0];
        const mappedToken: MandateToken = {
          id: firstToken.id,
          customer_id: custId || '',
          status: firstToken.recurring_details?.status || firstToken.status || 'unknown',
          max_amount: firstToken.max_amount,
          amount_blocked: firstToken.recurring_details?.amount_blocked,
          amount_debited: firstToken.recurring_details?.amount_debited,
        };
        setToken(mappedToken);
        setMandate(mappedToken);
      }
    } catch (err) {
      console.error('Failed to check mandate status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    const amount = Number(maxAmount);
    if (!amount || amount < 100) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter an amount of at least ₹100',
        variant: 'destructive',
      });
      return;
    }

    if (!session) {
      toast({
        title: 'Login required',
        description: 'Please login to setup Reserve Pay',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    setGeneratingQR(true);
    try {
      let custId = customerId;
      if (!custId) {
        const customerResult = await invoke<{ 
          customer?: { id?: string }; 
          customer_id?: string;
        }>('get_token_masked_data', {
          contact: user?.phone,
        });
        custId = customerResult.customer?.id || customerResult.customer_id || null;
        if (custId) {
          setCustomerId(custId);
        }
      }

      const orderResult = await invoke<{ 
        id?: string; 
        order_id?: string;
        razorpay_order_id?: string;
        error?: boolean;
        message?: string;
      }>('create_order_with_masked_data', {
        amount: amount * 100,
        currency: 'INR',
        customer_id: custId,
        method: 'upi',
        session_cookie: session,
        token: {
          max_amount: amount * 100,
          frequency: 'as_presented',
          type: 'single_block_multiple_debit',
        },
      });

      if (orderResult.error) {
        throw new Error(orderResult.message || 'Failed to create order');
      }

      const orderId = orderResult.id || orderResult.order_id || orderResult.razorpay_order_id;
      
      if (!orderId) {
        throw new Error('No order ID returned');
      }

      const paymentResult = await invoke<{ 
        upi_link?: string; 
        short_url?: string;
        qr_code?: string;
        qr_code_url?: string;
        available_actions?: Array<{
          action?: string;
          url?: string;
          qr_url?: string;
          original_upi_url?: string;
        }>;
        payment_details?: {
          next?: Array<{ 
            action?: string;
            url?: string; 
            qr_url?: string;
            original_upi_url?: string;
          }>;
        };
        id?: string;
        payment_id?: string;
        razorpay_payment_id?: string;
      }>('initiate_payment_with_masked_data', {
        amount: amount * 100,
        order_id: orderId,
        customer_id: custId,
        contact: user?.phone,
        recurring: true,
        upi_intent: true,
        force_terminal_id: 'term_RMD93ugGbBOhTp',
        session_cookie: session,
      });

      // Extract QR URL from new response format
      const intentAction = paymentResult.available_actions?.find(a => a.action === 'intent') ||
                          paymentResult.payment_details?.next?.find(a => a.action === 'intent');
      
      const intentLink = intentAction?.url || intentAction?.original_upi_url || 
                        paymentResult.upi_link || paymentResult.short_url;
      
      const qrImageUrl = intentAction?.qr_url || 
                        paymentResult.qr_code || 
                        paymentResult.qr_code_url;
      
      const baselineTokenIds = new Set(allTokens.map(t => t.id));
      const baselineTokenStatuses = new Map(allTokens.map(t => [t.id, t.recurring_details?.status || t.status || '']));
      setPollingBaselineTokenIds(baselineTokenIds);

      // Log for debugging
      console.log('[Payment] QR URL:', qrImageUrl);
      console.log('[Payment] Intent Link:', intentLink);
      console.log('[Payment] Full response:', paymentResult);

      setQrData({
        intentLink,
        qrCode: intentLink,
        qrImageUrl,
        orderId,
      });

      setIsPolling(true);
      pollMandateStatus(baselineTokenIds, baselineTokenStatuses);
      
      toast({
        title: 'QR Generated',
        description: 'Scan with your UPI app or click the button below',
      });
      
    } catch (err) {
      console.error('Failed to generate QR:', err);
      toast({
        title: 'Failed to generate QR',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleCancelSetup = async () => {
    setCancelling(true);
    try {
      setIsPolling(false);
      setQrData(null);
      setShowAddNewMandate(false);
      setMaxAmount('5000');
      
      toast({
        title: 'Setup Cancelled',
        description: 'Reserve Pay setup has been cancelled',
      });
    } finally {
      setCancelling(false);
    }
  };

  // Check for pending bid activation after payment
  useEffect(() => {
    const checkPendingBidActivation = async () => {
      const pendingActivation = localStorage.getItem('pending_bid_activation');
      if (!pendingActivation) return;

      try {
        const { bidId, paymentId, tempBidId } = JSON.parse(pendingActivation);
        
        // Check if mandate is confirmed (payment completed)
        if (mandate && mandate.status === 'confirmed') {
          // Activate the bid
          try {
            await invoke('tira_activate_price_bidding', {
              bidId: bidId,
              paymentId: paymentId,
            });
            
            // Update bid status
            const { updateBid } = useAppStore.getState();
            updateBid(tempBidId, {
              bidId: bidId,
              status: 'monitoring',
            });
            
            localStorage.removeItem('pending_bid_activation');
            
            toast({
              title: 'Price Bid Activated!',
              description: 'Your price monitoring is now active',
            });
          } catch (err) {
            console.error('Failed to activate bid:', err);
          }
        }
      } catch (err) {
        console.error('Error checking pending bid activation:', err);
      }
    };

    if (mandate) {
      checkPendingBidActivation();
    }
  }, [mandate, invoke, toast]);

  const pollMandateStatus = async (baselineTokenIds: Set<string>, baselineTokenStatuses: Map<string, string>) => {
    let attempts = 0;
    const maxAttempts = 60;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsPolling(false);
        toast({
          title: 'Timeout',
          description: 'Please try again if payment was not completed',
          variant: 'destructive',
        });
        return;
      }

      try {
        const result = await invoke<{ 
          customer?: { id?: string };
          saved_payment_methods?: { items?: TokenItem[] };
          items?: TokenItem[];
        }>('get_token_masked_data', {
          contact: user?.phone,
        });

        const tokens: TokenItem[] = result.saved_payment_methods?.items || result.items || [];
        const confirmedTokens = tokens.filter((t) => 
          t.recurring_details?.status === 'confirmed' || t.status === 'confirmed'
        );
        
        const newToken = confirmedTokens.find(t => {
          const isNewId = !baselineTokenIds.has(t.id);
          const statusChanged = baselineTokenStatuses.get(t.id) !== 'confirmed' && 
            (t.recurring_details?.status === 'confirmed' || t.status === 'confirmed');
          return isNewId || statusChanged;
        });
        
        if (newToken) {
          const mappedToken: MandateToken = {
            id: newToken.id,
            customer_id: result.customer?.id || customerId || '',
            status: newToken.recurring_details?.status || newToken.status || 'confirmed',
            max_amount: newToken.max_amount,
            amount_blocked: newToken.recurring_details?.amount_blocked,
            amount_debited: newToken.recurring_details?.amount_debited,
          };
          setToken(mappedToken);
          setMandate(mappedToken);
          setAllTokens(confirmedTokens);
          setQrData(null);
          setIsPolling(false);
          setShowAddNewMandate(false);
          toast({
            title: 'Reserve Pay Active!',
            description: 'Your UPI mandate has been set up successfully',
          });
          return;
        }
      } catch (err) {
        console.error('Poll error:', err);
      }

      attempts++;
      setTimeout(poll, 3000);
    };

    poll();
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const availableAmount = token?.max_amount 
    ? ((token.max_amount - (token.amount_debited || 0)) / 100)
    : 0;

  const totalMandateLimit = allTokens.reduce((sum, t) => sum + ((t.max_amount || 0) / 100), 0);

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-4 py-3 flex items-center gap-3 border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/account')}
          data-testid="button-back-payment"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Payment Methods</h1>
      </header>

      <div className="p-4 space-y-4">
        {qrData ? (
          <Card className="p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-bold">Complete UPI Setup</h2>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Scan QR or click button below to authorize Reserve Pay mandate of ₹{maxAmount}
              </p>

              {qrData.qrImageUrl ? (
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-lg shadow-md">
                    <img 
                      src={qrData.qrImageUrl} 
                      alt="UPI QR Code" 
                      className="w-48 h-48 object-contain"
                      data-testid="img-qr-code"
                      onError={(e) => {
                        console.error('QR image failed to load:', qrData.qrImageUrl);
                        // Fallback to intent link if QR image fails
                        if (qrData.intentLink) {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                </div>
              ) : qrData.intentLink ? (
                <div className="flex justify-center mb-4">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl border-2 border-dashed border-primary/30">
                    <QrCode className="w-24 h-24 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Click below to open UPI app
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center mb-4">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl border-2 border-dashed border-primary/30">
                    <QrCode className="w-24 h-24 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Setting up payment...
                    </p>
                  </div>
                </div>
              )}

              {qrData.intentLink && (
                <a
                  href={qrData.intentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold mb-4 gap-2"
                  data-testid="link-upi-intent"
                >
                  Open UPI App
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {isPolling && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Waiting for confirmation...</span>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleCancelSetup}
                disabled={cancelling}
                className="w-full"
                data-testid="button-cancel-setup"
              >
                {cancelling ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Cancelling...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel Setup
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                Powered by Razorpay Reserve Pay
              </p>
            </div>
          </Card>
        ) : token ? (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold">Reserve Pay Active</h2>
                <p className="text-sm text-muted-foreground">UPI mandate confirmed</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Maximum Limit</span>
                <span className="font-semibold">₹{(token.max_amount || 0) / 100}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Available</span>
                <span className="font-semibold text-green-600">₹{availableAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Active
                </span>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-sm text-green-800 dark:text-green-200 flex gap-2">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Auto-purchase is enabled. When your target price is hit, we'll automatically buy the product!
              </span>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-bold">Reserve Pay</h2>
            </div>

            <p className="text-muted-foreground text-sm mb-6">
              Setup once, and we'll auto-purchase products when your target price is matched!
            </p>

            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-2 block">
                Maximum Amount (₹)
              </label>
              <Input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="e.g., 5000"
                className="h-12"
                data-testid="input-max-amount"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum amount that can be auto-debited for purchases
              </p>
            </div>

            <Button
              onClick={handleGenerateQR}
              disabled={generatingQR}
              className="w-full py-6 text-base font-semibold"
              data-testid="button-generate-qr"
            >
              {generatingQR ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Generating...</span>
                </>
              ) : (
                'SETUP RESERVE PAY'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Powered by Razorpay UPI Reserve Pay
            </p>
          </Card>
        )}

        <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-xl p-4">
          <h3 className="font-semibold mb-2">What is Reserve Pay?</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Reserve Pay is a UPI feature that lets you pre-authorize a maximum amount. When your target price is hit:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>We automatically debit the exact product price</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>No manual payment needed - it's instant!</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>100% secure - you control the maximum limit</span>
            </li>
          </ul>
        </div>

        {token && !qrData && !showAddNewMandate && (
          <Card className="p-4">
            <Button
              onClick={() => {
                setMaxAmount('5000');
                setShowAddNewMandate(true);
              }}
              variant="outline"
              className="w-full py-5"
              data-testid="button-add-mandate"
            >
              <Zap className="w-4 h-4 mr-2" />
              Add Another Reserve Pay Mandate
            </Button>
          </Card>
        )}

        {showAddNewMandate && !qrData && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-bold">New Reserve Pay</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddNewMandate(false)}
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-muted-foreground text-sm mb-6">
              Setup an additional Reserve Pay mandate for higher limits or different UPI accounts.
            </p>

            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-2 block">
                Maximum Amount (₹)
              </label>
              <Input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="e.g., 5000"
                className="h-12"
                data-testid="input-new-max-amount"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum amount that can be auto-debited for purchases
              </p>
            </div>

            <Button
              onClick={() => {
                handleGenerateQR();
              }}
              disabled={generatingQR}
              className="w-full py-6 text-base font-semibold"
              data-testid="button-generate-new-qr"
            >
              {generatingQR ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Generating...</span>
                </>
              ) : (
                'SETUP RESERVE PAY'
              )}
            </Button>
          </Card>
        )}

        {allTokens.length > 0 && (
          <Drawer>
            <DrawerTrigger asChild>
              <Card className="p-4 cursor-pointer hover-elevate" data-testid="button-view-mandates">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Your Reserve Pay Mandates</p>
                      <p className="text-sm text-muted-foreground">
                        {allTokens.length} active mandate{allTokens.length !== 1 ? 's' : ''} • ₹{totalMandateLimit.toLocaleString()} total limit
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Your Reserve Pay Mandates
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-8 space-y-3 max-h-[60vh] overflow-y-auto">
                {allTokens.map((t, idx) => {
                  const blocked = (t.recurring_details?.amount_blocked || t.max_amount || 0) / 100;
                  const debited = (t.recurring_details?.amount_debited || 0) / 100;
                  const remaining = blocked - debited;
                  const vpaDisplay = t.vpa ? `${t.vpa.username}@${t.vpa.handle}` : 'UPI';
                  const status = t.recurring_details?.status || t.status || 'unknown';
                  const isActive = status === 'confirmed';
                  
                  return (
                    <Card key={t.id} className="p-4" data-testid={`token-card-${idx}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                          )}>
                            {isActive ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{vpaDisplay}</p>
                            <p className="text-xs text-muted-foreground">
                              {isActive ? 'Active' : status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Expires</p>
                          <p className="text-sm font-medium">{formatDate(t.expired_at)}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">BLOCKED</p>
                          <p className="font-semibold">₹{blocked}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">USED</p>
                          <p className="font-semibold">₹{debited}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                          <p className="text-xs text-green-600">AVAILABLE</p>
                          <p className="font-semibold text-green-600">₹{remaining}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>
    </div>
  );
}
