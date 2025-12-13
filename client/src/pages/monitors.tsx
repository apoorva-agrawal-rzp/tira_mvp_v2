import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMCP } from '@/hooks/use-mcp';
import { useAppStore } from '@/lib/store';
import { 
  ArrowLeft, 
  RefreshCw, 
  Activity,
  TrendingDown,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  BarChart3,
  Zap,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Monitor {
  id: string;
  productName: string;
  productSlug: string;
  currentPrice: number;
  targetPrice: number;
  isActive: boolean;
  checkFrequency: string;
  userId: string;
  notificationMethod?: string;
  createdAt: string;
  lastChecked?: string;
}

interface PriceHistoryEntry {
  timestamp: string;
  price: number;
  priceChange: number;
  inStock: boolean;
}

interface PriceHistory {
  success: boolean;
  history: PriceHistoryEntry[];
  statistics: {
    totalChecks: number;
    lowestPrice: number;
    highestPrice: number;
    totalPriceChanges: number;
  };
}

export default function MonitorsPage() {
  const [, setLocation] = useLocation();
  const { invoke, loading } = useMCP();
  const { phone, user } = useAppStore();
  
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [monitorStats, setMonitorStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);

  const fetchMonitors = async () => {
    if (!phone) return;

    try {
      const result = await invoke<{ 
        success?: boolean;
        monitors?: Monitor[];
      }>('tira_list_price_monitors', {
        userId: phone,
        includeInactive: true,
      });

      setMonitors(result.monitors || []);
    } catch (err) {
      console.error('Failed to fetch monitors:', err);
    }
  };

  const fetchMonitorStats = async () => {
    try {
      const result = await invoke<any>('tira_get_monitor_stats');
      setMonitorStats(result);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchPriceHistory = async (monitor: Monitor) => {
    setLoadingHistory(true);
    setSelectedMonitor(monitor);
    
    try {
      const result = await invoke<PriceHistory>('tira_get_price_history', {
        monitorId: monitor.id,
        limit: 50,
      });

      setPriceHistory(result);
    } catch (err) {
      console.error('Failed to fetch price history:', err);
      setPriceHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteMonitor = async (monitor: Monitor) => {
    try {
      await invoke('tira_delete_price_monitor', {
        monitorId: monitor.id,
      });

      setMonitors(prev => prev.filter(m => m.id !== monitor.id));
      
      if (selectedMonitor?.id === monitor.id) {
        setSelectedMonitor(null);
        setPriceHistory(null);
      }
    } catch (err) {
      console.error('Failed to delete monitor:', err);
    }
  };

  useEffect(() => {
    if (phone) {
      fetchMonitors();
      fetchMonitorStats();
    }
  }, [phone]);

  const activeMonitors = monitors.filter(m => m.isActive);
  const inactiveMonitors = monitors.filter(m => !m.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm z-50 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/account')}
            className="text-gray-100 hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Price Monitors</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              fetchMonitors();
              fetchMonitorStats();
            }}
            disabled={loading}
            className="text-gray-300"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats Card */}
        {monitorStats && (
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-100">System Stats</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStats(!showStats)}
                className="text-gray-400"
              >
                {showStats ? <XCircle className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            
            {showStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Total Monitors</div>
                  <div className="text-2xl font-bold text-gray-100">
                    {monitorStats.monitorStats?.totalMonitors || 0}
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Active</div>
                  <div className="text-2xl font-bold text-green-400">
                    {monitorStats.monitorStats?.activeMonitors || 0}
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Service Status</div>
                  <div className={cn(
                    'text-sm font-semibold',
                    monitorStats.serviceStatus?.isRunning ? 'text-green-400' : 'text-red-400'
                  )}>
                    {monitorStats.serviceStatus?.isRunning ? '✓ Running' : '✗ Stopped'}
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Check Interval</div>
                  <div className="text-sm font-semibold text-blue-400">
                    10 seconds
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* User Info */}
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Monitoring for</p>
              <p className="font-semibold text-gray-100">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500">{phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Active / Total</p>
              <p className="text-2xl font-bold text-primary">
                {activeMonitors.length} / {monitors.length}
              </p>
            </div>
          </div>
        </Card>

        {/* Price History Modal */}
        {selectedMonitor && priceHistory && (
          <Card className="p-4 bg-gray-900 border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                Price History
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedMonitor(null);
                  setPriceHistory(null);
                }}
                className="text-gray-400"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-400 mb-3 truncate">{selectedMonitor.productName}</p>

            {/* Stats Grid */}
            {priceHistory.statistics && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-800 rounded-lg p-2">
                  <div className="text-xs text-gray-400">Total Checks</div>
                  <div className="text-lg font-bold text-gray-100">
                    {priceHistory.statistics.totalChecks}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <div className="text-xs text-gray-400">Lowest</div>
                  <div className="text-lg font-bold text-green-400">
                    ₹{priceHistory.statistics.lowestPrice}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <div className="text-xs text-gray-400">Highest</div>
                  <div className="text-lg font-bold text-red-400">
                    ₹{priceHistory.statistics.highestPrice}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <div className="text-xs text-gray-400">Changes</div>
                  <div className="text-lg font-bold text-blue-400">
                    {priceHistory.statistics.totalPriceChanges}
                  </div>
                </div>
              </div>
            )}

            {/* History List */}
            <div className="max-h-64 overflow-auto space-y-2">
              {priceHistory.history?.map((entry, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-400 truncate">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-gray-100">₹{entry.price}</span>
                    {entry.priceChange !== 0 && (
                      <span className={cn(
                        'text-xs',
                        entry.priceChange > 0 ? 'text-red-400' : 'text-green-400'
                      )}>
                        {entry.priceChange > 0 ? '+' : ''}{entry.priceChange}
                      </span>
                    )}
                    {entry.inStock ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Active Monitors */}
        {activeMonitors.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              Active Monitors ({activeMonitors.length})
            </h2>
            <div className="space-y-3">
              {activeMonitors.map((monitor) => (
                <MonitorCard
                  key={monitor.id}
                  monitor={monitor}
                  onViewHistory={fetchPriceHistory}
                  onDelete={handleDeleteMonitor}
                  loadingHistory={loadingHistory && selectedMonitor?.id === monitor.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive Monitors */}
        {inactiveMonitors.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-gray-500" />
              Inactive Monitors ({inactiveMonitors.length})
            </h2>
            <div className="space-y-3">
              {inactiveMonitors.map((monitor) => (
                <MonitorCard
                  key={monitor.id}
                  monitor={monitor}
                  onViewHistory={fetchPriceHistory}
                  onDelete={handleDeleteMonitor}
                  loadingHistory={loadingHistory && selectedMonitor?.id === monitor.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {monitors.length === 0 && !loading && (
          <Card className="p-8 bg-gray-900 border-gray-800 text-center">
            <Activity className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No Price Monitors Yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Start monitoring prices by setting up price bids on products
            </p>
            <Button
              onClick={() => setLocation('/search')}
              className="bg-primary hover:bg-primary/90"
            >
              Browse Products
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function MonitorCard({ 
  monitor, 
  onViewHistory, 
  onDelete,
  loadingHistory 
}: { 
  monitor: Monitor; 
  onViewHistory: (monitor: Monitor) => void;
  onDelete: (monitor: Monitor) => void;
  loadingHistory: boolean;
}) {
  const savings = monitor.currentPrice - monitor.targetPrice;
  const savingsPercent = ((savings / monitor.currentPrice) * 100).toFixed(1);

  return (
    <Card className={cn(
      'p-4 border transition-all',
      monitor.isActive 
        ? 'bg-gradient-to-br from-gray-900 to-gray-900/50 border-primary/30' 
        : 'bg-gray-900 border-gray-800 opacity-60'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-100 mb-1 truncate">
            {monitor.productName}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <Badge 
              variant={monitor.isActive ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                monitor.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
              )}
            >
              {monitor.isActive ? '● Active' : '○ Inactive'}
            </Badge>
            <span className="text-xs text-gray-500">
              Check: {monitor.checkFrequency}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewHistory(monitor)}
            disabled={loadingHistory}
            className="text-gray-400 hover:text-primary"
          >
            {loadingHistory ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(monitor)}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-400">Current:</span>
          <span className="ml-2 font-semibold text-gray-100">₹{monitor.currentPrice}</span>
        </div>
        <div>
          <span className="text-gray-400">Target:</span>
          <span className="ml-2 font-semibold text-green-400">₹{monitor.targetPrice}</span>
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

      {monitor.lastChecked && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          Last checked: {new Date(monitor.lastChecked).toLocaleString()}
        </div>
      )}
    </Card>
  );
}

