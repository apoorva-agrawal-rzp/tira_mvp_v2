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
  XCircle,
  BarChart3,
  History,
  Eye,
  TrendingDown,
  Activity,
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

function AdminBidCard({ 
  bid, 
  onTrigger,
  onViewHistory,
  onDelete
}: { 
  bid: PriceBid; 
  onTrigger: (bid: PriceBid, newPrice: number) => void;
  onViewHistory?: (bid: PriceBid) => void;
  onDelete?: (bid: PriceBid) => void;
}) {
  const [newPrice, setNewPrice] = useState(bid.bidPrice.toString());
  const savings = bid.currentPrice - bid.bidPrice;
  const savingsPercent = ((savings / bid.currentPrice) * 100).toFixed(1);

  return (
    <Card className="p-4 bg-gray-900 border-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-medium mb-1 text-gray-100">{bid.product?.name}</p>
          <p className="text-xs text-gray-500 mb-2">
            Slug: {bid.product?.slug?.slice(0, 30)}...
          </p>
        </div>
        <div className="flex gap-1">
          {bid.monitorId && onViewHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewHistory(bid)}
              className="text-gray-400 hover:text-gray-100"
              title="View History"
            >
              <History className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(bid)}
              className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
              title="Delete Bid"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-400">Current:</span>
          <span className="ml-2 font-semibold text-gray-100">₹{bid.currentPrice}</span>
        </div>
        <div>
          <span className="text-gray-400">Bid:</span>
          <span className="ml-2 font-semibold text-green-400">₹{bid.bidPrice}</span>
        </div>
        <div>
          <span className="text-gray-400">Savings:</span>
          <span className="ml-2 font-semibold text-blue-400">₹{savings}</span>
        </div>
        <div>
          <span className="text-gray-400">Discount:</span>
          <span className="ml-2 font-semibold text-purple-400">{savingsPercent}%</span>
        </div>
      </div>

      {bid.monitorId && (
        <div className="text-xs text-gray-500 mb-3">
          Monitor ID: {bid.monitorId.slice(0, 20)}...
        </div>
      }
      
      <div className="flex gap-2">
        <Input
          type="number"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="New price"
          className="flex-1 bg-gray-800 border-gray-700 text-gray-100"
        />
        <Button
          variant="destructive"
          onClick={() => onTrigger(bid, Number(newPrice))}
          className="bg-red-600 hover:bg-red-700"
        >
          TRIGGER
        </Button>
      </div>
    </Card>
  );
}

type TabType = 'bids' | 'monitors' | 'stats';

export default function AdminPage() {
  const [activeBids, setActiveBids] = useState<PriceBid[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [monitorStats, setMonitorStats] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any>(null);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('bids');
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
        includeCompleted: true,
      });

      const mappedBids: PriceBid[] = (result.bids || []).map((b: Record<string, unknown>) => ({
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

      setActiveBids(mappedBids.filter(b => b.status === 'monitoring' || b.status === 'active'));
      addLog(`Found ${mappedBids.length} total bids (${mappedBids.filter(b => b.status === 'monitoring' || b.status === 'active').length} active)`, 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitors = async () => {
    if (!phone) {
      addLog('User phone number not found. Please login again.', 'error');
      return;
    }

    setLoading(true);
    addLog(`Fetching price monitors for user: ${phone}...`);
    
    try {
      const result = await invoke<{ monitors?: Array<Record<string, unknown>> }>('tira_list_price_monitors', {
        userId: phone,
        includeInactive: true,
      });

      setMonitors(result.monitors || []);
      addLog(`Found ${result.monitors?.length || 0} monitors`, 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitorStats = async () => {
    setLoading(true);
    addLog('Fetching monitor statistics...');
    
    try {
      const result = await invoke('tira_get_monitor_stats');
      setMonitorStats(result);
      addLog('Monitor stats fetched successfully', 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async (monitorId: string) => {
    setLoading(true);
    setSelectedMonitorId(monitorId);
    addLog(`Fetching price history for monitor: ${monitorId.slice(0, 10)}...`);
    
    try {
      const result = await invoke('tira_get_price_history', {
        monitorId,
        limit: 50,
      });
      setPriceHistory(result);
      addLog(`Price history fetched: ${result?.history?.length || 0} entries`, 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      setPriceHistory(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (bid: PriceBid) => {
    if (bid.monitorId) {
      fetchPriceHistory(bid.monitorId);
      setActiveTab('monitors');
    } else {
      addLog('No monitor ID found for this bid', 'error');
    }
  };

  const handleDeleteBid = async (bid: PriceBid) => {
    if (!bid.monitorId) {
      addLog('No monitor ID found. Cannot delete bid.', 'error');
      return;
    }

    addLog(`Deleting bid: ${bid.product?.name}...`);
    
    try {
      await invoke('tira_delete_price_monitor', {
        monitorId: bid.monitorId,
      });

      // Remove from local state
      const { removeBid } = useAppStore.getState();
      removeBid(bid.id);

      // Update active bids list
      setActiveBids(prev => prev.filter(b => b.id !== bid.id));

      addLog(`✅ Bid deleted successfully: ${bid.product?.name}`, 'success');
      
      // Refresh bids list
      setTimeout(() => {
        fetchBids();
      }, 1000);
    } catch (err) {
      addLog(`Failed to delete bid: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDeleteMonitor = async (monitor: any) => {
    if (!monitor.id) {
      addLog('No monitor ID found. Cannot delete.', 'error');
      return;
    }

    addLog(`Deleting monitor: ${monitor.productName || monitor.id}...`);
    
    try {
      await invoke('tira_delete_price_monitor', {
        monitorId: monitor.id,
      });

      // Remove from monitors list
      setMonitors(prev => prev.filter(m => m.id !== monitor.id));

      // Clear price history if this monitor was selected
      if (selectedMonitorId === monitor.id) {
        setPriceHistory(null);
        setSelectedMonitorId(null);
      }

      addLog(`✅ Monitor deleted successfully`, 'success');
      
      // Refresh monitors list
      setTimeout(() => {
        fetchMonitors();
      }, 1000);
    } catch (err) {
      addLog(`Failed to delete monitor: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
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
            <div className="flex gap-2">
              <Button 
                onClick={fetchBids} 
                disabled={loading || !phone}
                variant="outline"
                size="sm"
                className="text-gray-300 border-gray-700"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800">
          <Button
            variant="ghost"
            onClick={() => {
              setActiveTab('bids');
              fetchBids();
            }}
            className={cn(
              'rounded-none border-b-2 border-transparent',
              activeTab === 'bids' && 'border-primary text-primary'
            )}
          >
            <Zap className="w-4 h-4 mr-2" />
            Bids ({activeBids.length})
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setActiveTab('monitors');
              fetchMonitors();
            }}
            className={cn(
              'rounded-none border-b-2 border-transparent',
              activeTab === 'monitors' && 'border-primary text-primary'
            )}
          >
            <Activity className="w-4 h-4 mr-2" />
            Monitors ({monitors.length})
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setActiveTab('stats');
              fetchMonitorStats();
            }}
            className={cn(
              'rounded-none border-b-2 border-transparent',
              activeTab === 'stats' && 'border-primary text-primary'
            )}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Stats
          </Button>
        </div>

        {/* Bids Tab */}
        {activeTab === 'bids' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-400">
                Active Bids ({activeBids.length})
              </h2>
              <Button 
                onClick={fetchBids} 
                disabled={loading || !phone}
                variant="outline"
                size="sm"
                className="text-gray-300 border-gray-700"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>
            {activeBids.length > 0 ? (
              <div className="space-y-3">
                {activeBids.map((bid) => (
                  <AdminBidCard 
                    key={bid.id} 
                    bid={bid} 
                    onTrigger={triggerPriceDrop}
                    onViewHistory={handleViewHistory}
                    onDelete={handleDeleteBid}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-4 bg-gray-900 border-gray-800 text-center text-gray-500">
                No active bids. Click "Refresh" to load your bids.
              </Card>
            )}
          </div>
        )}

        {/* Monitors Tab */}
        {activeTab === 'monitors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-400">
                Price Monitors ({monitors.length})
              </h2>
              <Button 
                onClick={fetchMonitors} 
                disabled={loading || !phone}
                variant="outline"
                size="sm"
                className="text-gray-300 border-gray-700"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            {priceHistory && selectedMonitorId && (
              <Card className="p-4 bg-gray-900 border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-300 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Price History
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPriceHistory(null);
                      setSelectedMonitorId(null);
                    }}
                    className="text-gray-400"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
                {priceHistory.statistics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400">Total Checks</div>
                      <div className="text-lg font-bold text-gray-100">{priceHistory.statistics.totalChecks}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400">Lowest Price</div>
                      <div className="text-lg font-bold text-green-400">₹{priceHistory.statistics.lowestPrice}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400">Highest Price</div>
                      <div className="text-lg font-bold text-red-400">₹{priceHistory.statistics.highestPrice}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400">Price Changes</div>
                      <div className="text-lg font-bold text-blue-400">{priceHistory.statistics.totalPriceChanges}</div>
                    </div>
                  </div>
                )}
                <div className="max-h-64 overflow-auto">
                  <div className="space-y-1">
                    {priceHistory.history?.map((entry: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-gray-800">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-400">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-gray-100">₹{entry.price}</span>
                          {entry.priceChange !== 0 && (
                            <span className={cn(
                              'text-xs',
                              entry.priceChange > 0 ? 'text-red-400' : 'text-green-400'
                            )}>
                              {entry.priceChange > 0 ? '+' : ''}{entry.priceChange}
                            </span>
                          )}
                          {entry.inStock && (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {monitors.length > 0 ? (
              <div className="space-y-3">
                {monitors.map((monitor: any) => (
                  <Card key={monitor.id} className="p-4 bg-gray-900 border-gray-800">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-100 mb-1">
                          {monitor.productName || 'Unknown Product'}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">
                          ID: {monitor.id?.slice(0, 20)}...
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchPriceHistory(monitor.id)}
                          className="text-gray-300 border-gray-700"
                          title="View History"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMonitor(monitor)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                          title="Delete Monitor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Current:</span>
                        <span className="ml-2 font-semibold text-gray-100">₹{monitor.currentPrice || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Target:</span>
                        <span className="ml-2 font-semibold text-green-400">₹{monitor.targetPrice || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className={cn(
                          'ml-2 font-semibold',
                          monitor.isActive ? 'text-green-400' : 'text-gray-500'
                        )}>
                          {monitor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Frequency:</span>
                        <span className="ml-2 text-gray-300">{monitor.checkFrequency || 'N/A'}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 bg-gray-900 border-gray-800 text-center text-gray-500">
                No monitors found. Click "Refresh" to load monitors.
              </Card>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-400">Monitor Statistics</h2>
              <Button 
                onClick={fetchMonitorStats} 
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-gray-300 border-gray-700"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            {monitorStats ? (
              <div className="space-y-4">
                <Card className="p-4 bg-gray-900 border-gray-800">
                  <h3 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Overall Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Total Monitors</div>
                      <div className="text-2xl font-bold text-gray-100">
                        {monitorStats.monitorStats?.totalMonitors || 0}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Active</div>
                      <div className="text-2xl font-bold text-green-400">
                        {monitorStats.monitorStats?.activeMonitors || 0}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Inactive</div>
                      <div className="text-2xl font-bold text-gray-500">
                        {monitorStats.monitorStats?.inactiveMonitors || 0}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Last Check</div>
                      <div className="text-sm font-semibold text-gray-300">
                        {monitorStats.monitorStats?.lastCheckTime 
                          ? new Date(monitorStats.monitorStats.lastCheckTime).toLocaleTimeString()
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gray-900 border-gray-800">
                  <h3 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Service Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Service Running:</span>
                      <span className={cn(
                        'font-semibold',
                        monitorStats.serviceStatus?.isRunning ? 'text-green-400' : 'text-red-400'
                      )}>
                        {monitorStats.serviceStatus?.isRunning ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Active Interval Jobs:</span>
                      <span className="text-gray-300">
                        {monitorStats.serviceStatus?.activeIntervalJobs?.join(', ') || 'None'}
                      </span>
                    </div>
                    {monitorStats.serviceStatus?.scheduledFrequencies && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-400 mb-2">Scheduled Frequencies:</div>
                        {monitorStats.serviceStatus.scheduledFrequencies.map((freq: any, idx: number) => (
                          <div key={idx} className="bg-gray-800 rounded p-2 text-sm text-gray-300">
                            {freq.frequency} - {freq.interval}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-4 bg-gray-900 border-gray-800 text-center text-gray-500">
                Click "Refresh" to load statistics.
              </Card>
            )}
          </div>
        )}

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
