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
  Plus
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
  const [qrData, setQrData] = useState<{ qrCode?: string; intentLink?: string; qrImageUrl?: string } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showAddNewMandate, setShowAddNewMandate] = useState(false);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { user, session, mandate, setMandate, setCustomerId: storeSetCustomerId } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    checkMandateStatus();
  }, []);

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

      // Get customer ID from response
      const custId = result.customer?.id || result.customer_id;
      if (custId) {
        setCustomerId(custId);
        storeSetCustomerId?.(custId);
      }

      // Get tokens from saved_payment_methods.items or items
      const tokens: TokenItem[] = result.saved_payment_methods?.items || result.items || [];
      
      // Filter to confirmed tokens only
      const confirmedTokens = tokens.filter((t) => 
        t.recurring_details?.status === 'confirmed' || t.status === 'confirmed'
      );
      
      // Store all tokens for display
      setAllTokens(confirmedTokens);

      // Set the first confirmed token as the active one
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
      // First fetch customer ID if not already set
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

      // Create order with session cookie - this is required for authentication
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

      // Check for error in response
      if (orderResult.error) {
        throw new Error(orderResult.message || 'Failed to create order');
      }

      const orderId = orderResult.id || orderResult.order_id || orderResult.razorpay_order_id;
      
      if (!orderId) {
        throw new Error('No order ID returned');
      }

      // Initiate payment with the order ID
      const paymentResult = await invoke<{ 
        upi_link?: string; 
        short_url?: string;
        qr_code?: string;
        qr_code_url?: string;
        payment_details?: {
          next?: Array<{ url?: string }>;
        };
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

      // Extract intent link and QR code from response
      const intentLink = paymentResult.upi_link || paymentResult.short_url;
      const qrImageUrl = paymentResult.qr_code || paymentResult.qr_code_url;
      
      setQrData({
        intentLink,
        qrCode: intentLink,
        qrImageUrl,
      });

      setIsPolling(true);
      pollMandateStatus();
      
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

  const pollMandateStatus = async () => {
    let attempts = 0;
    const maxAttempts = 60;
    const initialTokenIds = new Set(allTokens.map(t => t.id));
    const initialTokenCount = allTokens.length;
    
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
        
        // Check for new tokens - either count increased or new token IDs
        const newTokenDetected = confirmedTokens.length > initialTokenCount ||
          confirmedTokens.some(t => !initialTokenIds.has(t.id));
        
        if (newTokenDetected && confirmedTokens.length > 0) {
          // Find the newest token (one that wasn't in initial set)
          const newToken = confirmedTokens.find(t => !initialTokenIds.has(t.id)) || confirmedTokens[0];
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

  // Helper to format date from timestamp
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

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-4 py-3 flex items-center gap-3 border-b border-border">
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

              {/* Display QR Code Image if available */}
              {qrData.qrImageUrl && (
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-lg shadow-md">
                    <img 
                      src={qrData.qrImageUrl} 
                      alt="UPI QR Code" 
                      className="w-48 h-48 object-contain"
                      data-testid="img-qr-code"
                    />
                  </div>
                </div>
              )}

              {/* Generate QR from intent link if no image URL */}
              {!qrData.qrImageUrl && qrData.intentLink && (
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-lg shadow-md text-center">
                    <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Use button below to open UPI app</p>
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
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Waiting for confirmation...</span>
                </div>
              )}

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

        {/* Add New Mandate Section - Shows when tokens exist but user wants to add more */}
        {token && !qrData && !showAddNewMandate && (
          <Card className="p-4">
            <Button
              onClick={() => setShowAddNewMandate(true)}
              variant="outline"
              className="w-full py-5"
              data-testid="button-add-mandate"
            >
              <Zap className="w-4 h-4 mr-2" />
              Add Another Reserve Pay Mandate
            </Button>
          </Card>
        )}

        {/* New Mandate Form */}
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
                setShowAddNewMandate(false);
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

        {/* Existing Reserve Pay Tokens */}
        {allTokens.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Your Reserve Pay Mandates</h3>
            </div>
            
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
                      <p className="text-xs font-medium">{formatDate(t.expired_at)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Blocked</p>
                      <p className="font-semibold text-sm">₹{blocked.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Used</p>
                      <p className="font-semibold text-sm">₹{debited.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Available</p>
                      <p className="font-semibold text-sm text-green-600">₹{remaining.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
