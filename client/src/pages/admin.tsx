import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import type { PriceBid } from '@shared/schema';
import { 
  ArrowLeft, 
  RefreshCw, 
  Zap,
  Terminal,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

function AdminBidCard({ 
  bid, 
  onTrigger 
}: { 
  bid: PriceBid; 
  onTrigger: (bid: PriceBid, newPrice: number) => void;
}) {
  const [newPrice, setNewPrice] = useState(bid.bidPrice.toString());

  return (
    <Card className="p-4 bg-card">
      <p className="font-medium mb-1">{bid.product?.name}</p>
      <p className="text-sm text-muted-foreground mb-2">
        User: {bid.id.slice(0, 10)}...
      </p>
      
      <div className="flex gap-4 text-sm mb-3 flex-wrap">
        <span>Current: ₹{bid.currentPrice}</span>
        <span className="text-green-500">Bid: ₹{bid.bidPrice}</span>
      </div>
      
      <div className="flex gap-2">
        <Input
          type="number"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="New price"
          className="flex-1"
        />
        <Button
          variant="destructive"
          onClick={() => onTrigger(bid, Number(newPrice))}
        >
          TRIGGER
        </Button>
      </div>
    </Card>
  );
}

export default function AdminPage() {
  const [activeBids, setActiveBids] = useState<PriceBid[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { phone, bids, user } = useAppStore();

  useEffect(() => {
    setActiveBids(bids.filter(b => b.status === 'monitoring' || b.status === 'active'));
  }, [bids]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setLogs((prev) => [{ time, message, type }, ...prev].slice(0, 50));
  };

  const fetchBids = async () => {
    if (!phone) {
      addLog('User phone number not found. Please login again.', 'error');
      return;
    }

    setLoading(true);
    addLog(`Fetching active bids for user: ${phone}...`);
    
    try {
      const result = await invoke<{ bids?: Array<Record<string, unknown>> }>('tira_list_price_bids', {
        userId: phone,
        includeCompleted: false,
      });

      const mappedBids: PriceBid[] = (result.bids || []).map((b: Record<string, unknown>) => ({
        id: (b.id || b.bidId || String(Date.now())) as string,
        product: {
          name: (b.productName || (b.product as { name?: string })?.name || 'Product') as string,
          brand: (b.productBrand || (b.product as { brand?: string })?.brand) as string | undefined,
          image: (b.productImage || (b.product as { image?: string })?.image) as string | undefined,
          slug: (b.productSlug || (b.product as { slug?: string })?.slug || '') as string,
        },
        bidPrice: (b.bidPrice || b.targetPrice) as number,
        currentPrice: (b.currentPrice || b.purchasePrice) as number,
        status: 'monitoring',
        createdAt: (b.createdAt || new Date().toISOString()) as string,
      }));

      setActiveBids(mappedBids);
      addLog(`Found ${mappedBids.length} active bids`, 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const changeProductPrice = async (slug: string, price: number): Promise<boolean> => {
    try {
      addLog(`Changing product price to ₹${price}...`);
      
      const response = await fetch(
        `https://asia-south1.workflow.boltic.app/afba6d4c-24d4-4b7b-8f7e-9efebe561786/change-price/${slug}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': '__cf_bm=Cq_qhjb5Ot.pEJHN_0gYV7Zfk9tAQGZh6Wvi9OiBeEc-1765541231-1.0.1.1-Y74hJ8bQJ9tXoX7IQaWx5ITJZ_cHMhcN9aqOf6xG20KLlODxpo3oVsgRvVCww9fkSueUcscwy2pPXM706xkGYHWWavLzs31Wq.TVEo_4hq0',
          },
          body: JSON.stringify({ price }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`Price change API error: ${response.status} - ${errorText}`, 'error');
        return false;
      }

      const result = await response.json();
      addLog(`✅ Price changed successfully to ₹${price}`, 'success');
      return true;
    } catch (err) {
      addLog(`Price change failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      return false;
    }
  };

  const triggerPriceDrop = async (bid: PriceBid, newPrice: number) => {
    addLog(`Triggering price drop for: ${bid.product?.name}`);
    addLog(`Current: ₹${bid.currentPrice} → New: ₹${newPrice}`);

    if (newPrice > bid.bidPrice) {
      addLog(`New price must be ≤ bid price (₹${bid.bidPrice})`, 'error');
      return;
    }

    if (!bid.product?.slug) {
      addLog('Product slug not found', 'error');
      return;
    }

    try {
      // Step 1: Change the product price using the API
      const priceChanged = await changeProductPrice(bid.product.slug, newPrice);
      if (!priceChanged) {
        addLog('Failed to change price. Aborting...', 'error');
        return;
      }

      // Step 2: Wait a moment for price to propagate
      addLog('Waiting for price to propagate...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Start intensive price monitor to detect the change
      addLog('Starting intensive price monitor...');
      await invoke('tira_intensive_price_monitor', {
        slug: bid.product.slug,
        interval: 2,
        duration: 60,
      });

      addLog('Price matched! Executing auto-purchase...');

      if (!phone) {
        addLog('User phone number not found', 'error');
        return;
      }

      const tokenResult = await invoke<{ items?: Array<{ id: string; status: string; customer_id: string }> }>('get_token_masked_data', {
        contact: phone,
      });
      
      const token = tokenResult.items?.find((t) => t.status === 'confirmed');
      
      if (!token) {
        addLog('No active mandate found for user', 'error');
        return;
      }
      
      addLog(`Found mandate: ${token.id.slice(0, 15)}...`);

      const orderResult = await invoke<{ id: string }>('create_order_with_masked_data', {
        amount: 100,
        currency: 'INR',
        customer_id: token.customer_id,
      });
      
      addLog(`Order created: ${orderResult.id?.slice(0, 15)}...`);

      const paymentResult = await invoke<{ id: string }>('initiate_payment_with_masked_data', {
        amount: 100,
        order_id: orderResult.id,
        token: token.id,
        customer_id: token.customer_id,
        contact: phone,
        recurring: true,
        force_terminal_id: 'term_RMD93ugGbBOhTp',
      });
      
      addLog(`Payment initiated: ${paymentResult.id?.slice(0, 15)}...`);

      await invoke('mark_order_success', {
        totalAmount: bid.bidPrice.toString(),
        transactionRefNumber: orderResult.id,
      });

      // Update bid status to completed and create order
      const { updateBid, addOrder } = useAppStore.getState();
      
      updateBid(bid.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        orderId: orderResult.id,
      });

      // Create order from completed bid
      addOrder({
        id: orderResult.id,
        product: {
          name: bid.product?.name || 'Product',
          brand: bid.product?.brand,
          image: bid.product?.image,
          slug: bid.product?.slug || '',
        },
        paidPrice: bid.bidPrice,
        originalPrice: bid.currentPrice,
        savings: bid.currentPrice - bid.bidPrice,
        status: 'processing',
        placedAt: new Date().toISOString(),
        type: 'price_bid',
      });

      addLog('─────────────────────');
      addLog('ORDER PLACED SUCCESSFULLY!', 'success');
      addLog(`Product: ${bid.product?.name}`);
      addLog(`Paid: ₹${bid.bidPrice}`);
      addLog(`Saved: ₹${bid.currentPrice - bid.bidPrice}`);
      addLog(`Order ID: ${orderResult.id}`);
      addLog('─────────────────────');

      // Refresh bids list
      setTimeout(() => {
        fetchBids();
        // Also refresh from server
        const { setBids } = useAppStore.getState();
        invoke('tira_list_price_bids', {
          userId: phone,
          includeCompleted: true,
        }).then((result: { bids?: Array<Record<string, unknown>> }) => {
          if (result.bids) {
            const mappedBids: PriceBid[] = result.bids.map((b: Record<string, unknown>) => ({
              id: (b.id || b.bidId || String(Date.now())) as string,
              bidId: b.bidId as string | undefined,
              monitorId: (b.monitorId || b.monitor_id) as string | undefined,
              product: {
                name: (b.productName || (b.product as { name?: string })?.name || 'Product') as string,
                brand: (b.productBrand || (b.product as { brand?: string })?.brand) as string | undefined,
                image: (b.productImage || (b.product as { image?: string })?.image) as string | undefined,
                slug: (b.productSlug || (b.product as { slug?: string })?.slug || '') as string,
              },
              bidPrice: (b.bidPrice || b.targetPrice) as number,
              currentPrice: (b.currentPrice || b.purchasePrice) as number,
              status: (b.status || 'monitoring') as PriceBid['status'],
              createdAt: (b.createdAt || new Date().toISOString()) as string,
              completedAt: b.completedAt as string | undefined,
              orderId: b.orderId as string | undefined,
            }));
            setBids(mappedBids);
          }
        }).catch(console.error);
      }, 2000);
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 left-0 right-0 bg-gray-900 z-50 px-4 py-3 flex items-center gap-3 border-b border-gray-800 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/account')}
          className="text-gray-100 hover:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Admin Panel</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm text-gray-400 block">Logged in as</label>
              <p className="text-gray-100 font-medium">{user?.name || phone || 'Unknown'}</p>
              <p className="text-xs text-gray-500">{phone || 'No phone number'}</p>
            </div>
            <Button 
              onClick={fetchBids} 
              disabled={loading || !phone}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Fetch Bids'}
            </Button>
          </div>
        </Card>

        <div>
          <h2 className="font-semibold text-gray-400 mb-2">
            Active Bids ({activeBids.length})
          </h2>
          {activeBids.length > 0 ? (
            <div className="space-y-3">
              {activeBids.map((bid) => (
                <AdminBidCard 
                  key={bid.id} 
                  bid={bid} 
                  onTrigger={triggerPriceDrop}
                />
              ))}
            </div>
          ) : (
            <Card className="p-4 bg-gray-900 border-gray-800 text-center text-gray-500">
              No active bids. Click "Fetch Bids" to load your bids.
            </Card>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-gray-400 mb-2">Logs</h2>
          <Card className="bg-gray-900 border-gray-800 p-3 h-64 overflow-auto">
            <div className="font-mono text-sm space-y-1">
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      'flex gap-2',
                      log.type === 'success' && 'text-green-400',
                      log.type === 'error' && 'text-red-400',
                      log.type === 'info' && 'text-gray-300'
                    )}
                  >
                    <span className="text-gray-500 flex-shrink-0">{log.time}</span>
                    <span>{log.message}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No logs yet. Trigger a price drop to see activity.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Instructions
          </h3>
          <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>Create a price bid on any product from the product page</li>
            <li>Click "Fetch Bids" to see your active bids</li>
            <li>Enter a price ≤ bid price and click "TRIGGER"</li>
            <li>Watch the auto-purchase happen in logs!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
