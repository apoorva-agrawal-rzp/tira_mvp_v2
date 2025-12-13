import { useLocation } from 'wouter';
import { Home, Heart, Package, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/home' },
  { id: 'wishlist', icon: Heart, label: 'Wishlist', path: '/wishlist' },
  { id: 'orders', icon: Package, label: 'Orders', path: '/orders' },
  { id: 'account', icon: User, label: 'Account', path: '/account' },
];

interface BottomNavProps {
  active?: string;
}

export function BottomNav({ active }: BottomNavProps) {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { orders } = useAppStore();

  return (
    <nav 
      className={cn(
        "bg-background border-t border-border flex justify-around items-center h-16 z-50 safe-area-bottom",
        isMobile ? "fixed bottom-0 left-0 right-0" : "sticky bottom-0 left-0 right-0"
      )}
      data-testid="bottom-navigation"
    >
      {navItems.map((item) => {
        const isActive = active === item.id;
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => setLocation(item.path)}
            className={cn(
              'flex flex-col items-center py-1 px-3 min-w-[64px] transition-colors relative',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
            data-testid={`nav-${item.id}`}
          >
            <div className="relative">
              <Icon 
                className={cn(
                  'w-6 h-6 mb-0.5',
                  isActive && 'fill-primary/20'
                )} 
              />
              {item.id === 'orders' && orders.length > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium px-1">
                  {orders.length > 99 ? '99+' : orders.length}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
