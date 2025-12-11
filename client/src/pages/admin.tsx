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
  const [demoPhone, setDemoPhone] = useState('');
  const [activeBids, setActiveBids] = useState<PriceBid[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { invoke } = useMCP();
  const { phone, bids } = useAppStore();

  useEffect(() => {
    if (phone) {
      setDemoPhone(phone);
    }
    setActiveBids(bids.filter(b => b.status === 'monitoring' || b.status === 'active'));
  }, [phone, bids]);

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
    if (!demoPhone) {
      addLog('Please enter a phone number', 'error');
      return;
    }

    setLoading(true);
    addLog('Fetching active bids...');
    
    try {
      const result = await invoke<{ bids?: Array<Record<string, unknown>> }>('tira_list_price_bids', {
        userId: demoPhone,
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

  const triggerPriceDrop = async (bid: PriceBid, newPrice: number) => {
    addLog(`Triggering price drop for: ${bid.product?.name}`);
    addLog(`Current: ₹${bid.currentPrice} → New: ₹${newPrice}`);

    if (newPrice > bid.bidPrice) {
      addLog(`New price must be ≤ bid price (₹${bid.bidPrice})`, 'error');
      return;
    }

    try {
      addLog('Starting intensive price monitor...');
      await invoke('tira_intensive_price_monitor', {
        slug: bid.product?.slug,
        interval: 2,
        duration: 60,
      });

      addLog('Price matched! Executing auto-purchase...');

      const tokenResult = await invoke<{ items?: Array<{ id: string; status: string; customer_id: string }> }>('get_token_masked_data', {
        contact: demoPhone,
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
        contact: demoPhone,
        recurring: true,
        force_terminal_id: 'term_RMD93ugGbBOhTp',
      });
      
      addLog(`Payment initiated: ${paymentResult.id?.slice(0, 15)}...`);

      await invoke('mark_order_success', {
        totalAmount: bid.bidPrice.toString(),
        transactionRefNumber: orderResult.id,
      });

      addLog('─────────────────────');
      addLog('ORDER PLACED SUCCESSFULLY!', 'success');
      addLog(`Product: ${bid.product?.name}`);
      addLog(`Paid: ₹${bid.bidPrice} (Demo: ₹1 actual)`);
      addLog(`Saved: ₹${bid.currentPrice - bid.bidPrice}`);
      addLog('─────────────────────');

      setTimeout(fetchBids, 2000);
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 bg-gray-900 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-800">
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
          <label className="text-sm text-gray-400 mb-2 block">Demo User Phone</label>
          <div className="flex gap-2">
            <Input
              value={demoPhone}
              onChange={(e) => setDemoPhone(e.target.value)}
              placeholder="Enter phone number"
              className="bg-gray-800 border-gray-700 text-gray-100"
            />
            <Button 
              onClick={fetchBids} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Fetch'}
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
              No active bids. Enter phone number and click Fetch.
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
            Demo Instructions
          </h3>
          <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>User creates a price bid on any product</li>
            <li>Enter the user's phone number above</li>
            <li>Click "Fetch" to see active bids</li>
            <li>Enter a price ≤ bid price and click "TRIGGER"</li>
            <li>Watch the auto-purchase happen in logs!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
