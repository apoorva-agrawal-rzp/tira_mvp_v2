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
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PaymentMethodsPage() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<MandateToken | null>(null);
  const [maxAmount, setMaxAmount] = useState('5000');
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrData, setQrData] = useState<{ qrCode?: string; intentLink?: string } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { user, session, mandate, setMandate } = useAppStore();
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
      const result = await invoke<{ items?: Array<Record<string, unknown>>; customer_id?: string }>('get_token_masked_data', {
        contact: user.phone,
      });

      const tokens = result.items || [];
      const confirmedToken = tokens.find((t: Record<string, unknown>) => t.status === 'confirmed');
      
      if (confirmedToken) {
        const mappedToken: MandateToken = {
          id: confirmedToken.id as string,
          customer_id: (confirmedToken.customer_id || result.customer_id) as string,
          status: confirmedToken.status as string,
          max_amount: confirmedToken.max_amount as number | undefined,
          amount_blocked: confirmedToken.amount_blocked as number | undefined,
          amount_debited: confirmedToken.amount_debited as number | undefined,
          created_at: confirmedToken.created_at as string | undefined,
          expired_at: confirmedToken.expired_at as string | undefined,
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

    setGeneratingQR(true);
    try {
      const customerResult = await invoke<{ customer_id?: string; items?: Array<{ customer_id?: string }> }>('get_token_masked_data', {
        contact: user?.phone,
      });
      
      const customerId = customerResult.customer_id || customerResult.items?.[0]?.customer_id;

      const orderResult = await invoke<{ id: string }>('create_order_with_masked_data', {
        amount: amount * 100,
        currency: 'INR',
        customer_id: customerId,
        method: 'upi',
        token: {
          max_amount: amount * 100,
          frequency: 'as_presented',
          type: 'single_block_multiple_debit',
        },
      });

      const paymentResult = await invoke<{ upi_link?: string; short_url?: string }>('initiate_payment_with_masked_data', {
        amount: 100,
        order_id: orderResult.id,
        customer_id: customerId,
        contact: user?.phone,
        recurring: true,
        upi_intent: true,
        force_terminal_id: 'term_RMD93ugGbBOhTp',
      });

      const intentLink = paymentResult.upi_link || paymentResult.short_url;
      
      setQrData({
        intentLink,
        qrCode: intentLink,
      });

      setIsPolling(true);
      pollMandateStatus();
      
    } catch (err) {
      console.error('Failed to generate QR:', err);
      toast({
        title: 'Failed to generate QR',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setGeneratingQR(false);
    }
  };

  const pollMandateStatus = async () => {
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
        const result = await invoke<{ items?: Array<Record<string, unknown>> }>('get_token_masked_data', {
          contact: user?.phone,
        });

        const tokens = result.items || [];
        const confirmedToken = tokens.find((t: Record<string, unknown>) => t.status === 'confirmed');
        
        if (confirmedToken) {
          const mappedToken: MandateToken = {
            id: confirmedToken.id as string,
            customer_id: confirmedToken.customer_id as string,
            status: confirmedToken.status as string,
            max_amount: confirmedToken.max_amount as number | undefined,
          };
          setToken(mappedToken);
          setMandate(mappedToken);
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
      setTimeout(poll, 2000);
    };

    poll();
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

              <p className="text-sm text-muted-foreground mb-6">
                Scan QR or click button below to authorize Reserve Pay mandate of ₹{maxAmount}
              </p>

              {qrData.intentLink && (
                <a
                  href={qrData.intentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold mb-4 gap-2"
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
      </div>
    </div>
  );
}
